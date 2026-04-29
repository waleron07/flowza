import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { EmailSenderService } from '../email/email-sender.service';
import { AuthRateLimiterService } from './auth-rate-limiter.service';
import { TurnstileCaptchaService } from './turnstile-captcha.service';
import { AuditService } from '../audit/audit.service';

describe('Сервис авторизации', () => {
  const findByPhoneMock = jest.fn();
  const findByEmailMock = jest.fn();
  const findByLoginMock = jest.fn();
  const createUserMock = jest.fn();
  const findByIdMock = jest.fn();
  const deactivateByIdMock = jest.fn();
  const createEmailVerificationCodeMock = jest.fn();
  const findLatestEmailVerificationCodeMock = jest.fn();
  const incrementEmailVerificationAttemptsMock = jest.fn();
  const markEmailVerificationCodeUsedMock = jest.fn();
  const invalidateActiveEmailVerificationCodesMock = jest.fn();
  const markEmailVerifiedMock = jest.fn();
  const jwtSignAsyncMock = jest.fn().mockResolvedValue('mock.jwt.token');
  const sendVerificationCodeMock = jest
    .fn()
    .mockResolvedValue({ sentViaSmtp: true });
  const rateLimiterHitMock = jest
    .fn()
    .mockReturnValue({ allowed: true, retryAfterSec: 0 });
  const configGetMock = jest.fn();
  const assertValidCaptchaTokenMock = jest.fn((token: string) => {
    if (token !== 'mock-captcha-token') {
      return Promise.reject(
        new UnauthorizedException('Токен капчи недействителен'),
      );
    }

    return Promise.resolve();
  });
  const auditLogMock = jest.fn().mockResolvedValue(undefined);

  const usersService = {
    findByPhone: findByPhoneMock,
    findByEmail: findByEmailMock,
    findByLogin: findByLoginMock,
    create: createUserMock,
    findById: findByIdMock,
    deactivateById: deactivateByIdMock,
    createEmailVerificationCode: createEmailVerificationCodeMock,
    findLatestEmailVerificationCode: findLatestEmailVerificationCodeMock,
    incrementEmailVerificationAttempts: incrementEmailVerificationAttemptsMock,
    markEmailVerificationCodeUsed: markEmailVerificationCodeUsedMock,
    invalidateActiveEmailVerificationCodes:
      invalidateActiveEmailVerificationCodesMock,
    markEmailVerified: markEmailVerifiedMock,
  } as unknown as UsersService;

  const jwtService = {
    signAsync: jwtSignAsyncMock,
  } as unknown as JwtService;

  const emailSenderService = {
    sendVerificationCode: sendVerificationCodeMock,
  } as unknown as EmailSenderService;

  const authRateLimiterService = {
    hit: rateLimiterHitMock,
  } as unknown as AuthRateLimiterService;

  const configService = {
    get: configGetMock,
  } as unknown as ConfigService;

  const turnstileCaptchaService = {
    assertValidToken: assertValidCaptchaTokenMock,
  } as unknown as TurnstileCaptchaService;

  const auditService = {
    log: auditLogMock,
  } as unknown as AuditService;

  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(
      usersService,
      jwtService,
      emailSenderService,
      authRateLimiterService,
      configService,
      turnstileCaptchaService,
      auditService,
    );
  });

  it('регистрирует нового пользователя и отправляет email-код', async () => {
    findByPhoneMock.mockResolvedValue(null);
    findByEmailMock.mockResolvedValue(null);
    findByLoginMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: 10,
      primaryTenantId: null,
      organizationIds: [],
      email: 'ivan@example.com',
      emailVerifiedAt: null,
      phone: '+79991234567',
      login: 'ivan_login',
      role: UserRole.USER,
      passwordHash: 'hash',
      isActive: true,
    });

    const result = await authService.register({
      phone: '+79991234567',
      email: 'ivan@example.com',
      login: 'ivan_login',
      password: 'password123',
      consentToPrivacyPolicy: true,
      consentToPersonalData: true,
      agreementVersion: '2026-04-04',
      captchaToken: 'mock-captcha-token',
    });

    expect(result.success).toBe(true);
    expect(result.verificationRequired).toBe(true);
    expect(createUserMock).toHaveBeenCalledTimes(1);
    expect(createEmailVerificationCodeMock).toHaveBeenCalledTimes(1);
    expect(sendVerificationCodeMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock).toHaveBeenCalledWith({
      userId: 10,
      action: 'AUTH_REGISTER_SUCCESS',
      entity: 'User',
      entityId: 10,
    });
  });

  it('отклоняет регистрацию без согласия с политикой конфиденциальности', async () => {
    await expect(
      authService.register({
        phone: '+79991234567',
        email: 'ivan@example.com',
        login: 'ivan_login',
        password: 'password123',
        consentToPrivacyPolicy: false,
        consentToPersonalData: true,
        agreementVersion: '2026-04-04',
        captchaToken: 'mock-captcha-token',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет регистрацию при невалидном российском номере телефона', async () => {
    await expect(
      authService.register({
        phone: '89991234567',
        email: 'ivan@example.com',
        login: 'ivan_login',
        password: 'password123',
        consentToPrivacyPolicy: true,
        consentToPersonalData: true,
        agreementVersion: '2026-04-04',
        captchaToken: 'mock-captcha-token',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет регистрацию при дублирующемся номере телефона', async () => {
    findByPhoneMock.mockResolvedValue({ id: 1 });

    await expect(
      authService.register({
        phone: '+79991234567',
        email: 'ivan@example.com',
        login: 'ivan_login',
        password: 'password123',
        consentToPrivacyPolicy: true,
        consentToPersonalData: true,
        agreementVersion: '2026-04-04',
        captchaToken: 'mock-captcha-token',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('отклоняет регистрацию при дублирующемся email', async () => {
    findByPhoneMock.mockResolvedValue(null);
    findByEmailMock.mockResolvedValue({ id: 2 });

    await expect(
      authService.register({
        phone: '+79991234567',
        email: 'ivan@example.com',
        login: 'ivan_login',
        password: 'password123',
        consentToPrivacyPolicy: true,
        consentToPersonalData: true,
        agreementVersion: '2026-04-04',
        captchaToken: 'mock-captcha-token',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('отклоняет регистрацию без согласия на обработку персональных данных', async () => {
    await expect(
      authService.register({
        phone: '+79991234567',
        email: 'ivan@example.com',
        login: 'ivan_login',
        password: 'password123',
        consentToPrivacyPolicy: true,
        consentToPersonalData: false,
        agreementVersion: '2026-04-04',
        captchaToken: 'mock-captcha-token',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет регистрацию при невалидном captcha токене', async () => {
    await expect(
      authService.register({
        phone: '+79991234567',
        email: 'ivan@example.com',
        login: 'ivan_login',
        password: 'password123',
        consentToPrivacyPolicy: true,
        consentToPersonalData: true,
        agreementVersion: '2026-04-04',
        captchaToken: 'invalid-captcha-token',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ограничивает частые register-запросы', async () => {
    rateLimiterHitMock
      .mockReturnValueOnce({ allowed: false, retryAfterSec: 30 })
      .mockReturnValueOnce({ allowed: true, retryAfterSec: 0 });

    await expect(
      authService.register({
        phone: '+79991234567',
        email: 'ivan@example.com',
        login: 'ivan_login',
        password: 'password123',
        consentToPrivacyPolicy: true,
        consentToPersonalData: true,
        agreementVersion: '2026-04-04',
        captchaToken: 'mock-captcha-token',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(auditLogMock).toHaveBeenCalledWith({
      action: 'AUTH_REGISTER_RATE_LIMITED',
      entity: 'Auth',
      entityId: 0,
    });
  });

  it('выполняет вход пользователя с валидными учетными данными', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    findByPhoneMock.mockResolvedValue({
      id: 11,
      primaryTenantId: null,
      organizationIds: [],
      email: 'ivan@example.com',
      emailVerifiedAt: new Date(),
      phone: '+79991234567',
      login: 'ivan_login',
      role: UserRole.USER,
      passwordHash,
      isActive: true,
    });

    const result = await authService.login({
      identifier: '+79991234567',
      password: 'password123',
    });

    expect(result.accessToken).toBe('mock.jwt.token');
    expect(result.user.id).toBe(11);
    expect(auditLogMock).toHaveBeenCalledWith({
      userId: 11,
      action: 'AUTH_LOGIN_SUCCESS',
      entity: 'User',
      entityId: 11,
    });
  });

  it('отклоняет вход с неверным паролем', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    findByPhoneMock.mockResolvedValue({
      id: 11,
      primaryTenantId: null,
      organizationIds: [],
      email: 'ivan@example.com',
      emailVerifiedAt: new Date(),
      phone: '+79991234567',
      login: 'ivan_login',
      role: UserRole.USER,
      passwordHash,
      isActive: true,
    });

    await expect(
      authService.login({
        identifier: '+79991234567',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditLogMock).toHaveBeenCalledWith({
      userId: 11,
      action: 'AUTH_LOGIN_FAILED',
      entity: 'User',
      entityId: 11,
    });
  });

  it('ограничивает частые login-запросы до поиска пользователя', async () => {
    rateLimiterHitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSec: 60,
    });

    await expect(
      authService.login({
        identifier: '+79991234567',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(findByPhoneMock).not.toHaveBeenCalled();
    expect(findByEmailMock).not.toHaveBeenCalled();
    expect(findByLoginMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith({
      action: 'AUTH_LOGIN_RATE_LIMITED',
      entity: 'Auth',
      entityId: 0,
    });
  });

  it('блокирует вход user до подтверждения email', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    findByPhoneMock.mockResolvedValue({
      id: 12,
      primaryTenantId: null,
      organizationIds: [],
      email: 'unverified@example.com',
      emailVerifiedAt: null,
      phone: '+79990000099',
      login: 'unverified_login',
      role: UserRole.USER,
      passwordHash,
      isActive: true,
    });

    await expect(
      authService.login({
        identifier: '+79990000099',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('подтверждает email-код и выдает токен', async () => {
    const user = {
      id: 21,
      primaryTenantId: null,
      organizationIds: [],
      email: 'verify@example.com',
      emailVerifiedAt: null,
      phone: '+79990000121',
      login: 'verify_login',
      role: UserRole.USER,
      passwordHash: 'hash',
      isActive: true,
    };
    const code = '123456';
    const codeHash = createHash('sha256').update(code).digest('hex');

    findByEmailMock.mockResolvedValue(user);
    findLatestEmailVerificationCodeMock.mockResolvedValue({
      id: 5,
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      usedAt: null,
      attempts: 0,
      createdAt: new Date(),
    });
    markEmailVerifiedMock.mockResolvedValue({
      ...user,
      emailVerifiedAt: new Date(),
    });

    const result = await authService.verifyEmailCode({
      email: user.email,
      code,
    });

    expect(result.accessToken).toBe('mock.jwt.token');
    expect(invalidateActiveEmailVerificationCodesMock).toHaveBeenCalledWith(
      user.id,
    );
    expect(markEmailVerifiedMock).toHaveBeenCalledWith(user.id);
    expect(auditLogMock).toHaveBeenCalledWith({
      userId: user.id,
      action: 'AUTH_VERIFY_EMAIL_SUCCESS',
      entity: 'User',
      entityId: user.id,
    });
  });

  it('ограничивает частые verify-запросы', async () => {
    rateLimiterHitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSec: 10,
    });

    await expect(
      authService.verifyEmailCode({
        email: 'verify@example.com',
        code: '123456',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(auditLogMock).toHaveBeenCalledWith({
      action: 'AUTH_VERIFY_EMAIL_RATE_LIMITED',
      entity: 'Auth',
      entityId: 0,
    });
  });

  it('ограничивает частые resend-запросы', async () => {
    findByEmailMock.mockResolvedValue({
      id: 50,
      primaryTenantId: null,
      organizationIds: [],
      email: 'cooldown@example.com',
      emailVerifiedAt: null,
      phone: '+79990000050',
      login: 'cooldown_login',
      role: UserRole.USER,
      passwordHash: 'hash',
      isActive: true,
    });
    findLatestEmailVerificationCodeMock.mockResolvedValue({
      id: 10,
      userId: 50,
      codeHash: 'hash',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      usedAt: null,
      attempts: 0,
      createdAt: new Date(),
    });

    await expect(
      authService.resendEmailCode({ email: 'cooldown@example.com' }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(auditLogMock).toHaveBeenCalledWith({
      userId: 50,
      action: 'AUTH_RESEND_EMAIL_RATE_LIMITED',
      entity: 'User',
      entityId: 50,
    });
  });

  it('деактивирует собственный аккаунт', async () => {
    findByIdMock.mockResolvedValue({
      id: 15,
      organizationIds: [],
      email: 'ivan@example.com',
      emailVerifiedAt: new Date(),
      phone: '+79991234567',
      login: 'ivan_login',
      role: UserRole.USER,
      isActive: true,
      primaryTenantId: null,
    });
    deactivateByIdMock.mockResolvedValue({
      id: 15,
      isActive: false,
    });

    const result = await authService.deleteMe(15);

    expect(deactivateByIdMock).toHaveBeenCalledTimes(1);
    expect(deactivateByIdMock).toHaveBeenCalledWith(15);
    expect(result).toEqual({ success: true });
  });

  it('не удаляет аккаунт, если пользователь не найден', async () => {
    findByIdMock.mockResolvedValue(null);

    await expect(authService.deleteMe(999)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('возвращает профиль активного пользователя', async () => {
    findByIdMock.mockResolvedValue({
      id: 17,
      primaryTenantId: null,
      organizationIds: [],
      email: 'pavel@example.com',
      emailVerifiedAt: new Date(),
      phone: '+79990000017',
      login: 'pavel_login',
      role: UserRole.USER,
      isActive: true,
    });

    const result = await authService.me(17);

    expect(result.id).toBe(17);
    expect(result.phone).toBe('+79990000017');
  });

  it('не возвращает профиль неактивного пользователя', async () => {
    findByIdMock.mockResolvedValue({
      id: 18,
      primaryTenantId: null,
      organizationIds: [],
      email: 'sergey@example.com',
      emailVerifiedAt: new Date(),
      phone: '+79990000018',
      login: 'sergey_login',
      role: UserRole.USER,
      isActive: false,
    });

    await expect(authService.me(18)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
