import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { UsersService } from '../../src/users/users.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { EmailSenderService } from '../../src/email/email-sender.service';
import { UserRole } from '../../src/common/enums/user-role.enum';

describe('Интеграция auth', () => {
  let app: INestApplication<App>;

  const findByIdMock = jest.fn();
  const findByPhoneMock = jest.fn();
  const findByEmailMock = jest.fn();
  const findByLoginMock = jest.fn();
  const createMock = jest.fn();
  const deactivateByIdMock = jest.fn();
  const createEmailVerificationCodeMock = jest.fn();
  const findLatestEmailVerificationCodeMock = jest.fn();
  const incrementEmailVerificationAttemptsMock = jest.fn();
  const markEmailVerificationCodeUsedMock = jest.fn();
  const invalidateActiveEmailVerificationCodesMock = jest.fn();
  const markEmailVerifiedMock = jest.fn();

  const usersServiceMock = {
    findById: findByIdMock,
    findByPhone: findByPhoneMock,
    findByEmail: findByEmailMock,
    findByLogin: findByLoginMock,
    create: createMock,
    deactivateById: deactivateByIdMock,
    createEmailVerificationCode: createEmailVerificationCodeMock,
    findLatestEmailVerificationCode: findLatestEmailVerificationCodeMock,
    incrementEmailVerificationAttempts: incrementEmailVerificationAttemptsMock,
    markEmailVerificationCodeUsed: markEmailVerificationCodeUsedMock,
    invalidateActiveEmailVerificationCodes:
      invalidateActiveEmailVerificationCodesMock,
    markEmailVerified: markEmailVerifiedMock,
  } as unknown as UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersServiceMock)
      .overrideProvider(EmailSenderService)
      .useValue({
        sendVerificationCode: jest
          .fn()
          .mockResolvedValue({ sentViaSmtp: false }),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp: () => {
            getRequest: () => {
              user: { userId: number; role: UserRole; tenantId: null };
            };
          };
        }) {
          const request = context.switchToHttp().getRequest();
          request.user = {
            userId: 100,
            role: UserRole.USER,
            tenantId: null,
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  describe('POST /auth/register', () => {
    it('регистрирует пользователя с валидными данными', async () => {
      findByPhoneMock.mockResolvedValue(null);
      createMock.mockResolvedValue({
        id: 201,
        tenantId: null,
        phone: '+79990000201',
        login: 'integration_register',
        email: 'integration-register@example.com',
        emailVerifiedAt: null,
        organizationIds: [],
        role: UserRole.USER,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000201',
          login: 'integration_register',
          email: 'integration-register@example.com',
          password: 'password123',
          consentToPrivacyPolicy: true,
          consentToPersonalData: true,
          agreementVersion: '2026-04-04',
          captchaToken: 'mock-captcha-token',
        })
        .expect(201);

      const body = response.body as {
        success: boolean;
        verificationRequired: boolean;
      };
      expect(body.success).toBe(true);
      expect(body.verificationRequired).toBe(true);
    });

    it('возвращает 400 без согласия с политикой конфиденциальности', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000202',
          login: 'no_consent',
          email: 'no-consent@example.com',
          password: 'password123',
          consentToPrivacyPolicy: false,
          consentToPersonalData: true,
          agreementVersion: '2026-04-04',
          captchaToken: 'mock-captcha-token',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('выполняет вход пользователя с корректными данными', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      findByPhoneMock.mockResolvedValue({
        id: 301,
        tenantId: null,
        phone: '+79990000301',
        login: 'integration_login',
        email: 'integration-login@example.com',
        emailVerifiedAt: new Date(),
        organizationIds: [],
        role: UserRole.USER,
        isActive: true,
        passwordHash,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000301',
          password: 'password123',
        })
        .expect(201);

      const body = response.body as {
        accessToken: string;
        user: { id: number; phone: string };
      };
      expect(body.accessToken).toBeDefined();
      expect(body.user.id).toBe(301);
    });

    it('возвращает 401 при неверном пароле', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      findByPhoneMock.mockResolvedValue({
        id: 302,
        tenantId: null,
        phone: '+79990000302',
        login: 'wrong_password_login',
        email: 'wrong-password@example.com',
        emailVerifiedAt: new Date(),
        organizationIds: [],
        role: UserRole.USER,
        isActive: true,
        passwordHash,
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000302',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('возвращает 401 для неактивного пользователя', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      findByPhoneMock.mockResolvedValue({
        id: 303,
        tenantId: null,
        phone: '+79990000303',
        login: 'inactive_login',
        email: 'inactive-login@example.com',
        emailVerifiedAt: new Date(),
        organizationIds: [],
        role: UserRole.USER,
        isActive: false,
        passwordHash,
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000303',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('возвращает профиль активного пользователя', async () => {
      findByIdMock.mockResolvedValue({
        id: 100,
        tenantId: null,
        phone: '+79990000100',
        login: 'integration_me',
        email: 'integration-me@example.com',
        emailVerifiedAt: new Date(),
        organizationIds: [],
        role: UserRole.USER,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(200);

      const body = response.body as { phone: string; login: string };
      expect(body.phone).toBe('+79990000100');
      expect(body.login).toBe('integration_me');
    });

    it('возвращает 401 для неактивного пользователя', async () => {
      findByIdMock.mockResolvedValue({
        id: 100,
        tenantId: null,
        phone: '+79990000101',
        login: 'inactive_me',
        email: 'inactive-me@example.com',
        emailVerifiedAt: new Date(),
        organizationIds: [],
        role: UserRole.USER,
        isActive: false,
      });

      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('DELETE /auth/me', () => {
    it('деактивирует собственного пользователя', async () => {
      findByIdMock.mockResolvedValue({
        id: 100,
        tenantId: null,
        phone: '+79990000102',
        login: 'delete_me',
        email: 'delete-me@example.com',
        emailVerifiedAt: new Date(),
        organizationIds: [],
        role: UserRole.USER,
        isActive: true,
      });
      deactivateByIdMock.mockResolvedValue({
        id: 100,
        isActive: false,
      });

      await request(app.getHttpServer())
        .delete('/auth/me')
        .expect(200)
        .expect({ success: true });

      expect(deactivateByIdMock).toHaveBeenCalledWith(100);
    });

    it('возвращает 401 если пользователь не найден', async () => {
      findByIdMock.mockResolvedValue(null);

      await request(app.getHttpServer()).delete('/auth/me').expect(401);
    });
  });
});
