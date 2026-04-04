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
import { EmailSenderService } from './email-sender.service';
import { AuthRateLimiterService } from './auth-rate-limiter.service';
import { TurnstileCaptchaService } from './turnstile-captcha.service';

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

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailSenderService: EmailSenderService,
    private readonly authRateLimiterService: AuthRateLimiterService,
    private readonly configService: ConfigService,
    private readonly turnstileCaptchaService: TurnstileCaptchaService,
  ) {
    this.emailCodeTtlMinutes = this.getLimitFromEnv(
      'AUTH_EMAIL_CODE_TTL_MINUTES',
      15,
    );
    this.resendCooldownSeconds = this.getLimitFromEnv(
      'AUTH_RESEND_COOLDOWN_SECONDS',
      60,
    );
    this.maxVerifyAttempts = this.getLimitFromEnv('AUTH_MAX_VERIFY_ATTEMPTS', 5);
    this.registerRateLimit = this.getLimitFromEnv('AUTH_REGISTER_RATE_LIMIT', 5);
    this.registerRateWindowSec = this.getLimitFromEnv(
      'AUTH_REGISTER_RATE_WINDOW_SEC',
      10 * 60,
    );
    this.verifyRateLimit = this.getLimitFromEnv('AUTH_VERIFY_RATE_LIMIT', 10);
    this.verifyRateWindowSec = this.getLimitFromEnv(
      'AUTH_VERIFY_RATE_WINDOW_SEC',
      5 * 60,
    );
  }

  private getLimitFromEnv(key: string, fallback: number): number {
    const rawValue = this.configService.get<string>(key);
    const parsed = Number(rawValue);

    if (!rawValue || !Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private createEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashEmailCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private isEmailCodeValid(rawCode: string, codeHash: string): boolean {
    const actualHash = Buffer.from(this.hashEmailCode(rawCode));
    const expectedHash = Buffer.from(codeHash);

    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(actualHash, expectedHash);
  }

  private tooManyRequests(message: string): HttpException {
    return new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }

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

  async register(dto: RegisterDto, context?: { ip?: string }) {
    if (!dto.consentToPrivacyPolicy) {
      throw new BadRequestException('Privacy policy consent is required');
    }
    if (!dto.consentToPersonalData) {
      throw new BadRequestException('Personal data consent is required');
    }
    if (!dto.agreementVersion.trim()) {
      throw new BadRequestException('Agreement version is required');
    }
    await this.turnstileCaptchaService.assertValidToken(
      dto.captchaToken,
      context?.ip,
    );

    if (!/^\+7\d{10}$/.test(dto.phone)) {
      throw new BadRequestException('Phone must be a valid RU number');
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
        `Register rate limit exceeded for phone=${dto.phone} email=${dto.email} ip=${ipAddress ?? 'unknown'} retryAfterSec=${retryAfterSec}`,
      );
      throw this.tooManyRequests('Register is temporarily blocked');
    }

    const existingUser = await this.usersService.findByPhone(dto.phone);
    if (existingUser) {
      throw new ConflictException('User with this phone already exists');
    }

    const existingByEmail = await this.usersService.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const existingByLogin = await this.usersService.findByLogin(dto.login);
    if (existingByLogin) {
      throw new ConflictException('User with this login already exists');
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

    return {
      success: true,
      message: sentViaSmtp
        ? 'Verification code sent to email'
        : 'Verification code created (email not sent: SMTP not configured)',
      emailSentViaSmtp: sentViaSmtp,
      verificationRequired: true,
      verificationTtlSec: this.emailCodeTtlMinutes * 60,
      resendAvailableInSec: this.resendCooldownSeconds,
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const isPhone = /^\+7\d{10}$/.test(identifier);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const user = isPhone
      ? await this.usersService.findByPhone(identifier)
      : isEmail
        ? await this.usersService.findByEmail(identifier)
        : await this.usersService.findByLogin(identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    if (user.role === UserRole.USER && !user.emailVerifiedAt) {
      throw new UnauthorizedException('Email is not verified');
    }

    const payload = this.createPayload(user);

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

  async me(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
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

  async deleteMe(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.usersService.deactivateById(userId);

    return { success: true };
  }

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
        `Verify rate limit exceeded for email=${dto.email} ip=${ipAddress ?? 'unknown'} retryAfterSec=${retryAfterSec}`,
      );
      throw this.tooManyRequests('Too many verify attempts');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.role !== UserRole.USER) {
      this.logger.warn(`Verify attempt for unknown email=${dto.email}`);
      throw new UnauthorizedException('Invalid verification code');
    }

    if (user.emailVerifiedAt) {
      const payload = this.createPayload(user);
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
      this.logger.warn(`Verify attempt without active code for userId=${user.id}`);
      throw new UnauthorizedException('Invalid verification code');
    }

    if (latestCode.attempts >= this.maxVerifyAttempts) {
      this.logger.warn(
        `Max verify attempts exceeded for userId=${user.id}, codeId=${latestCode.id}`,
      );
      throw this.tooManyRequests('Too many verification attempts');
    }

    if (latestCode.expiresAt.getTime() <= Date.now()) {
      this.logger.warn(`Expired verification code for userId=${user.id}`);
      throw new UnauthorizedException('Verification code expired');
    }

    const isValidCode = this.isEmailCodeValid(dto.code, latestCode.codeHash);
    if (!isValidCode) {
      await this.usersService.incrementEmailVerificationAttempts(latestCode.id);
      this.logger.warn(`Invalid verification code for userId=${user.id}`);
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.usersService.invalidateActiveEmailVerificationCodes(user.id);
    const verifiedUser = await this.usersService.markEmailVerified(user.id);

    const payload = this.createPayload(verifiedUser);

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

  async resendEmailCode(dto: ResendEmailCodeDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.role !== UserRole.USER || user.emailVerifiedAt) {
      return {
        success: true,
        message: 'If account exists, code has been sent',
        resendAvailableInSec: this.resendCooldownSeconds,
      };
    }

    const latestCode = await this.usersService.findLatestEmailVerificationCode(
      user.id,
    );
    if (latestCode) {
      const availableAt =
        latestCode.createdAt.getTime() +
        this.resendCooldownSeconds * 1000;
      const retryInMs = availableAt - Date.now();
      if (retryInMs > 0) {
        this.logger.warn(
          `Resend temporarily blocked for userId=${user.id} retryInMs=${retryInMs}`,
        );
        throw this.tooManyRequests('Resend is temporarily blocked');
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

    return {
      success: true,
      message: sentViaSmtp
        ? 'If account exists, code has been sent'
        : 'If account exists, code was created (email not sent: SMTP not configured)',
      emailSentViaSmtp: sentViaSmtp,
      resendAvailableInSec: this.resendCooldownSeconds,
    };
  }
}
