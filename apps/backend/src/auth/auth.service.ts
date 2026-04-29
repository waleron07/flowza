import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from './types/jwt-payload.type';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';
import { ResendEmailCodeDto } from './dto/resend-email-code.dto';
import { EmailSenderService } from '../email/email-sender.service';
import { AuthRateLimiterService } from './auth-rate-limiter.service';
import { TurnstileCaptchaService } from './turnstile-captcha.service';
import { AuditService } from '../audit/audit.service';

/**
 * Основной доменный сервис auth-сценариев.
 *
 * Отвечает за регистрацию клиента, login, восстановление текущего пользователя,
 * soft-delete аккаунта и подтверждение email одноразовым кодом. Здесь же
 * собраны auth-specific лимиты, но инфраструктура писем и CAPTCHA вынесены в
 * отдельные сервисы.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly emailCodeTtlMinutes: number;
  private readonly resendCooldownSeconds: number;
  private readonly maxVerifyAttempts: number;
  private readonly registerRateLimit: number;
  private readonly registerRateWindowSec: number;
  private readonly verifyRateLimit: number;
  private readonly verifyRateWindowSec: number;
  private readonly loginRateLimit: number;
  private readonly loginRateWindowSec: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailSenderService: EmailSenderService,
    private readonly authRateLimiterService: AuthRateLimiterService,
    private readonly configService: ConfigService,
    private readonly turnstileCaptchaService: TurnstileCaptchaService,
    private readonly auditService: AuditService,
  ) {
    this.emailCodeTtlMinutes = this.getLimitFromEnv(
      'AUTH_EMAIL_CODE_TTL_MINUTES',
      15,
    );
    this.resendCooldownSeconds = this.getLimitFromEnv(
      'AUTH_RESEND_COOLDOWN_SECONDS',
      60,
    );
    this.maxVerifyAttempts = this.getLimitFromEnv(
      'AUTH_MAX_VERIFY_ATTEMPTS',
      5,
    );
    this.registerRateLimit = this.getLimitFromEnv(
      'AUTH_REGISTER_RATE_LIMIT',
      5,
    );
    this.registerRateWindowSec = this.getLimitFromEnv(
      'AUTH_REGISTER_RATE_WINDOW_SEC',
      10 * 60,
    );
    this.verifyRateLimit = this.getLimitFromEnv('AUTH_VERIFY_RATE_LIMIT', 10);
    this.verifyRateWindowSec = this.getLimitFromEnv(
      'AUTH_VERIFY_RATE_WINDOW_SEC',
      5 * 60,
    );
    this.loginRateLimit = this.getLimitFromEnv('AUTH_LOGIN_RATE_LIMIT', 10);
    this.loginRateWindowSec = this.getLimitFromEnv(
      'AUTH_LOGIN_RATE_WINDOW_SEC',
      5 * 60,
    );
  }

  /**
   * Читает положительный integer из env или возвращает fallback.
   *
   * Используется для TTL/cooldown/rate-limit настроек, чтобы битое значение в
   * окружении не выключило защиту случайным образом.
   */
  private getLimitFromEnv(key: string, fallback: number): number {
    const rawValue = this.configService.get<string>(key);
    const parsed = Number(rawValue);

    if (!rawValue || !Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  /** Генерирует шестизначный код подтверждения email. */
  private createEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /** Хеширует код перед записью в БД: raw-код никогда не хранится. */
  private hashEmailCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /** Сравнивает введенный код с hash из БД без утечек по таймингу. */
  private isEmailCodeValid(rawCode: string, codeHash: string): boolean {
    const actualHash = Buffer.from(this.hashEmailCode(rawCode));
    const expectedHash = Buffer.from(codeHash);

    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(actualHash, expectedHash);
  }

  /** Возвращает HTTP 429 с единым для auth-сценариев форматом ошибки. */
  private tooManyRequests(message: string): HttpException {
    return new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }

  /** Собирает минимальный JWT payload из user record. */
  private createPayload(user: {
    id: number;
    primaryTenantId: number | null;
    organizationIds?: number[];
    role: string;
  }): JwtPayload {
    return {
      userId: user.id,
      primaryTenantId: user.primaryTenantId,
      organizationIds: user.organizationIds ?? [],
      role: user.role as UserRole,
    };
  }

  /**
   * Регистрирует клиента и запускает email-верификацию.
   *
   * Инварианты:
   * - согласия и captcha обязательны;
   * - телефон/email/login должны быть уникальными;
   * - email остается неподтвержденным до успешного ввода кода;
   * - в ответе `emailSentViaSmtp=false` означает, что код создан, но письмо не ушло.
   */
  async register(dto: RegisterDto, context?: { ip?: string }) {
    if (!dto.consentToPrivacyPolicy) {
      throw new BadRequestException(
        'Необходимо согласие с политикой конфиденциальности',
      );
    }
    if (!dto.consentToPersonalData) {
      throw new BadRequestException(
        'Необходимо согласие на обработку персональных данных',
      );
    }
    if (!dto.agreementVersion.trim()) {
      throw new BadRequestException('Не указана версия согласия');
    }
    await this.turnstileCaptchaService.assertValidToken(
      dto.captchaToken,
      context?.ip,
    );

    if (!/^\+7\d{10}$/.test(dto.phone)) {
      throw new BadRequestException(
        'Телефон должен быть номером РФ в формате +79XXXXXXXXX',
      );
    }

    const registerEmailKey = `register:email:${dto.email.trim().toLowerCase()}`;
    const registerPhoneKey = `register:phone:${dto.phone}`;
    const emailLimit = this.authRateLimiterService.hit(
      registerEmailKey,
      this.registerRateLimit,
      this.registerRateWindowSec,
    );
    const phoneLimit = this.authRateLimiterService.hit(
      registerPhoneKey,
      this.registerRateLimit,
      this.registerRateWindowSec,
    );
    const ipAddress = context?.ip?.trim();
    const ipLimit =
      ipAddress && ipAddress.length > 0
        ? this.authRateLimiterService.hit(
            `register:ip:${ipAddress}`,
            this.registerRateLimit,
            this.registerRateWindowSec,
          )
        : { allowed: true, retryAfterSec: 0 };
    if (!emailLimit.allowed || !phoneLimit.allowed || !ipLimit.allowed) {
      const retryAfterSec = Math.max(
        emailLimit.retryAfterSec,
        phoneLimit.retryAfterSec,
        ipLimit.retryAfterSec,
      );
      this.logger.warn(
        `Превышен лимит регистрации для phone=${dto.phone} email=${dto.email} ip=${ipAddress ?? 'unknown'} retryAfterSec=${retryAfterSec}`,
      );
      await this.auditService.log({
        action: 'AUTH_REGISTER_RATE_LIMITED',
        entity: 'Auth',
        entityId: 0,
      });
      throw this.tooManyRequests('Регистрация временно заблокирована');
    }

    const existingUser = await this.usersService.findByPhone(dto.phone);
    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким телефоном уже существует',
      );
    }

    const existingByEmail = await this.usersService.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const existingByLogin = await this.usersService.findByLogin(dto.login);
    if (existingByLogin) {
      throw new ConflictException(
        'Пользователь с таким логином уже существует',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      emailVerifiedAt: null,
      phone: dto.phone,
      login: dto.login,
      passwordHash,
      role: UserRole.USER,
      isActive: true,
    });

    const code = this.createEmailCode();
    const expiresAt = new Date(
      Date.now() + this.emailCodeTtlMinutes * 60 * 1000,
    );
    await this.usersService.createEmailVerificationCode({
      userId: user.id,
      codeHash: this.hashEmailCode(code),
      expiresAt,
    });

    const { sentViaSmtp } = await this.emailSenderService.sendVerificationCode({
      email: dto.email,
      code,
      ttlMinutes: this.emailCodeTtlMinutes,
    });
    await this.auditService.log({
      userId: user.id,
      action: 'AUTH_REGISTER_SUCCESS',
      entity: 'User',
      entityId: user.id,
    });

    return {
      success: true,
      message: sentViaSmtp
        ? 'Код подтверждения отправлен на email'
        : 'Код подтверждения создан, но письмо не отправлено: SMTP не настроен',
      emailSentViaSmtp: sentViaSmtp,
      verificationRequired: true,
      verificationTtlSec: this.emailCodeTtlMinutes * 60,
      resendAvailableInSec: this.resendCooldownSeconds,
    };
  }

  /**
   * Выполняет login по телефону, email или login.
   *
   * Для роли `user` вход запрещен до подтверждения email. Staff-пользователи
   * входят без этого ограничения, так как создаются админским flow. Попытки
   * входа лимитируются до поиска пользователя, чтобы не раскрывать существование
   * аккаунта через brute force.
   */
  async login(dto: LoginDto, context?: { ip?: string }) {
    const identifier = dto.identifier.trim();
    const normalizedIdentifier = identifier.toLowerCase();
    const identifierLimit = this.authRateLimiterService.hit(
      `login:identifier:${normalizedIdentifier}`,
      this.loginRateLimit,
      this.loginRateWindowSec,
    );
    const ipAddress = context?.ip?.trim();
    const ipLimit =
      ipAddress && ipAddress.length > 0
        ? this.authRateLimiterService.hit(
            `login:ip:${ipAddress}`,
            this.loginRateLimit,
            this.loginRateWindowSec,
          )
        : { allowed: true, retryAfterSec: 0 };

    if (!identifierLimit.allowed || !ipLimit.allowed) {
      const retryAfterSec = Math.max(
        identifierLimit.retryAfterSec,
        ipLimit.retryAfterSec,
      );
      this.logger.warn(
        `Превышен лимит входа для identifier=${normalizedIdentifier} ip=${ipAddress ?? 'unknown'} retryAfterSec=${retryAfterSec}`,
      );
      await this.auditService.log({
        action: 'AUTH_LOGIN_RATE_LIMITED',
        entity: 'Auth',
        entityId: 0,
      });
      throw this.tooManyRequests('Вход временно заблокирован');
    }

    const isPhone = /^\+7\d{10}$/.test(identifier);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const user = isPhone
      ? await this.usersService.findByPhone(identifier)
      : isEmail
        ? await this.usersService.findByEmail(identifier)
        : await this.usersService.findByLogin(identifier);
    if (!user) {
      await this.auditService.log({
        action: 'AUTH_LOGIN_FAILED',
        entity: 'Auth',
        entityId: 0,
      });
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.auditService.log({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
      });
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    if (!user.isActive) {
      await this.auditService.log({
        userId: user.id,
        action: 'AUTH_LOGIN_INACTIVE_USER',
        entity: 'User',
        entityId: user.id,
      });
      throw new UnauthorizedException('Пользователь деактивирован');
    }

    if (user.role === UserRole.USER && !user.emailVerifiedAt) {
      await this.auditService.log({
        userId: user.id,
        action: 'AUTH_LOGIN_UNVERIFIED_EMAIL',
        entity: 'User',
        entityId: user.id,
      });
      throw new UnauthorizedException('Email не подтвержден');
    }

    const payload = this.createPayload(user);
    await this.auditService.log({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
    });

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        phone: user.phone,
        login: user.login,
        role: user.role,
        primaryTenantId: user.primaryTenantId,
        organizationIds: user.organizationIds ?? [],
      },
    };
  }

  /**
   * Возвращает профиль пользователя из активной JWT-сессии.
   *
   * Перечитывает пользователя из БД, чтобы soft-delete (`isActive=false`)
   * сразу блокировал доступ даже со старым токеном.
   */
  async me(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Пользователь деактивирован');
    }

    return {
      id: user.id,
      phone: user.phone,
      login: user.login,
      role: user.role,
      primaryTenantId: user.primaryTenantId,
      organizationIds: user.organizationIds ?? [],
      isActive: user.isActive,
    };
  }

  /**
   * Soft-delete текущего пользователя.
   *
   * Запись остается в БД, но `isActive=false` запрещает дальнейший login и
   * использование существующих JWT.
   */
  async deleteMe(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    await this.usersService.deactivateById(userId);

    return { success: true };
  }

  /**
   * Подтверждает email одноразовым кодом.
   *
   * Проверяет rate limit, наличие активного кода, TTL, максимальное количество
   * попыток и затем инвалидирует все активные коды пользователя.
   */
  async verifyEmailCode(dto: VerifyEmailCodeDto, context?: { ip?: string }) {
    const verifyKey = `verify:${dto.email.trim().toLowerCase()}`;
    const verifyLimit = this.authRateLimiterService.hit(
      verifyKey,
      this.verifyRateLimit,
      this.verifyRateWindowSec,
    );
    const ipAddress = context?.ip?.trim();
    const verifyIpLimit =
      ipAddress && ipAddress.length > 0
        ? this.authRateLimiterService.hit(
            `verify:ip:${ipAddress}`,
            this.verifyRateLimit,
            this.verifyRateWindowSec,
          )
        : { allowed: true, retryAfterSec: 0 };
    if (!verifyLimit.allowed || !verifyIpLimit.allowed) {
      const retryAfterSec = Math.max(
        verifyLimit.retryAfterSec,
        verifyIpLimit.retryAfterSec,
      );
      this.logger.warn(
        `Превышен лимит проверки email=${dto.email} ip=${ipAddress ?? 'unknown'} retryAfterSec=${retryAfterSec}`,
      );
      await this.auditService.log({
        action: 'AUTH_VERIFY_EMAIL_RATE_LIMITED',
        entity: 'Auth',
        entityId: 0,
      });
      throw this.tooManyRequests('Слишком много попыток подтверждения');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.role !== UserRole.USER) {
      this.logger.warn(
        `Попытка подтверждения для неизвестного email=${dto.email}`,
      );
      await this.auditService.log({
        action: 'AUTH_VERIFY_EMAIL_FAILED',
        entity: 'Auth',
        entityId: 0,
      });
      throw new UnauthorizedException('Неверный код подтверждения');
    }

    if (user.emailVerifiedAt) {
      const payload = this.createPayload(user);
      await this.auditService.log({
        userId: user.id,
        action: 'AUTH_VERIFY_EMAIL_ALREADY_VERIFIED',
        entity: 'User',
        entityId: user.id,
      });
      return {
        success: true,
        accessToken: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          login: user.login,
          role: user.role,
          primaryTenantId: user.primaryTenantId,
          organizationIds: user.organizationIds ?? [],
        },
      };
    }

    const latestCode = await this.usersService.findLatestEmailVerificationCode(
      user.id,
    );
    if (!latestCode || latestCode.usedAt) {
      this.logger.warn(
        `Попытка подтверждения без активного кода для userId=${user.id}`,
      );
      await this.auditService.log({
        userId: user.id,
        action: 'AUTH_VERIFY_EMAIL_FAILED',
        entity: 'User',
        entityId: user.id,
      });
      throw new UnauthorizedException('Неверный код подтверждения');
    }

    if (latestCode.attempts >= this.maxVerifyAttempts) {
      this.logger.warn(
        `Превышен лимит попыток подтверждения для userId=${user.id}, codeId=${latestCode.id}`,
      );
      await this.auditService.log({
        userId: user.id,
        action: 'AUTH_VERIFY_EMAIL_RATE_LIMITED',
        entity: 'User',
        entityId: user.id,
      });
      throw this.tooManyRequests('Слишком много попыток подтверждения');
    }

    if (latestCode.expiresAt.getTime() <= Date.now()) {
      this.logger.warn(`Истек срок действия кода для userId=${user.id}`);
      await this.auditService.log({
        userId: user.id,
        action: 'AUTH_VERIFY_EMAIL_EXPIRED',
        entity: 'User',
        entityId: user.id,
      });
      throw new UnauthorizedException('Код подтверждения истек');
    }

    const isValidCode = this.isEmailCodeValid(dto.code, latestCode.codeHash);
    if (!isValidCode) {
      await this.usersService.incrementEmailVerificationAttempts(latestCode.id);
      this.logger.warn(`Неверный код подтверждения для userId=${user.id}`);
      await this.auditService.log({
        userId: user.id,
        action: 'AUTH_VERIFY_EMAIL_FAILED',
        entity: 'User',
        entityId: user.id,
      });
      throw new UnauthorizedException('Неверный код подтверждения');
    }

    await this.usersService.invalidateActiveEmailVerificationCodes(user.id);
    const verifiedUser = await this.usersService.markEmailVerified(user.id);

    const payload = this.createPayload(verifiedUser);
    await this.auditService.log({
      userId: verifiedUser.id,
      action: 'AUTH_VERIFY_EMAIL_SUCCESS',
      entity: 'User',
      entityId: verifiedUser.id,
    });

    return {
      success: true,
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        phone: verifiedUser.phone,
        login: verifiedUser.login,
        role: verifiedUser.role,
        primaryTenantId: verifiedUser.primaryTenantId,
        organizationIds: verifiedUser.organizationIds ?? [],
      },
    };
  }

  /**
   * Повторно создает код подтверждения email.
   *
   * Для неизвестного или уже подтвержденного email возвращает нейтральный ответ,
   * чтобы публичный API не раскрывал существование аккаунта.
   */
  async resendEmailCode(dto: ResendEmailCodeDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.role !== UserRole.USER || user.emailVerifiedAt) {
      return {
        success: true,
        message: 'Если аккаунт существует, код был отправлен',
        resendAvailableInSec: this.resendCooldownSeconds,
      };
    }

    const latestCode = await this.usersService.findLatestEmailVerificationCode(
      user.id,
    );
    if (latestCode) {
      const availableAt =
        latestCode.createdAt.getTime() + this.resendCooldownSeconds * 1000;
      const retryInMs = availableAt - Date.now();
      if (retryInMs > 0) {
        this.logger.warn(
          `Повторная отправка временно заблокирована для userId=${user.id} retryInMs=${retryInMs}`,
        );
        await this.auditService.log({
          userId: user.id,
          action: 'AUTH_RESEND_EMAIL_RATE_LIMITED',
          entity: 'User',
          entityId: user.id,
        });
        throw this.tooManyRequests('Повторная отправка временно заблокирована');
      }
    }

    const code = this.createEmailCode();
    const expiresAt = new Date(
      Date.now() + this.emailCodeTtlMinutes * 60 * 1000,
    );

    await this.usersService.createEmailVerificationCode({
      userId: user.id,
      codeHash: this.hashEmailCode(code),
      expiresAt,
    });
    const { sentViaSmtp } = await this.emailSenderService.sendVerificationCode({
      email: dto.email,
      code,
      ttlMinutes: this.emailCodeTtlMinutes,
    });
    await this.auditService.log({
      userId: user.id,
      action: 'AUTH_RESEND_EMAIL_SENT',
      entity: 'User',
      entityId: user.id,
    });

    return {
      success: true,
      message: sentViaSmtp
        ? 'Если аккаунт существует, код был отправлен'
        : 'Если аккаунт существует, код был создан, но письмо не отправлено: SMTP не настроен',
      emailSentViaSmtp: sentViaSmtp,
      resendAvailableInSec: this.resendCooldownSeconds,
    };
  }
}
