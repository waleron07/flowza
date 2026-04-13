import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { UsersService } from '../../src/users/users.service';
import { EmailSenderService } from '../../src/auth/email-sender.service';
import { CreateUserInput } from '../../src/users/types/create-user.type';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { AuthRateLimiterService } from '../../src/auth/auth-rate-limiter.service';
import { TurnstileCaptchaService } from '../../src/auth/turnstile-captcha.service';
import { configureApp } from '../../src/app.setup';

interface InMemoryUser {
  id: number;
  primaryTenantId: number | null;
  organizationIds: number[];
  email: string;
  emailVerifiedAt: Date | null;
  phone: string;
  passwordHash: string;
  role: UserRole;
  login: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface InMemoryEmailVerificationCode {
  id: number;
  userId: number;
  codeHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
  createdAt: Date;
}

class InMemoryUsersService {
  private users: InMemoryUser[] = [];
  private currentId = 1;
  private emailCodes: InMemoryEmailVerificationCode[] = [];
  private currentEmailCodeId = 1;

  findByPhone(phone: string) {
    return this.users.find((user) => user.phone === phone) ?? null;
  }

  findById(id: number) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  findByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  findByLogin(login: string) {
    return this.users.find((user) => user.login === login) ?? null;
  }

  create(input: CreateUserInput) {
    const organizationIds =
      input.organizationIds ??
      (input.primaryTenantId ? [input.primaryTenantId] : []);

    const user: InMemoryUser = {
      id: this.currentId++,
      primaryTenantId: input.primaryTenantId ?? null,
      organizationIds,
      email: input.email,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      phone: input.phone,
      passwordHash: input.passwordHash,
      role: input.role,
      login: input.login,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  deactivateById(id: number) {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    user.isActive = false;
    user.updatedAt = new Date();
    return user;
  }

  createEmailVerificationCode(input: {
    userId: number;
    codeHash: string;
    expiresAt: Date;
  }) {
    const code: InMemoryEmailVerificationCode = {
      id: this.currentEmailCodeId++,
      userId: input.userId,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      attempts: 0,
      createdAt: new Date(),
    };
    this.emailCodes.push(code);
    return code;
  }

  findLatestEmailVerificationCode(userId: number) {
    return (
      this.emailCodes
        .filter((code) => code.userId === userId)
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        )[0] ?? null
    );
  }

  incrementEmailVerificationAttempts(codeId: number) {
    const code = this.emailCodes.find((item) => item.id === codeId);
    if (!code) {
      return null;
    }

    code.attempts += 1;
    return code;
  }

  markEmailVerificationCodeUsed(codeId: number) {
    const code = this.emailCodes.find((item) => item.id === codeId);
    if (!code) {
      return null;
    }

    code.usedAt = new Date();
    return code;
  }

  invalidateActiveEmailVerificationCodes(userId: number) {
    const now = new Date();
    this.emailCodes
      .filter((code) => code.userId === userId && code.usedAt === null)
      .forEach((code) => {
        code.usedAt = now;
      });
    return { count: this.emailCodes.length };
  }

  markEmailVerified(userId: number) {
    const user = this.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    user.emailVerifiedAt = new Date();
    user.updatedAt = new Date();
    return user;
  }

  seed(
    user: Omit<
      InMemoryUser,
      'id' | 'createdAt' | 'updatedAt' | 'emailVerifiedAt'
    > & {
      emailVerifiedAt?: Date | null;
    },
  ) {
    const createdUser: InMemoryUser = {
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...user,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    };

    this.users.push(createdUser);
    return createdUser;
  }
}

describe('E2E проверки авторизации', () => {
  let app: INestApplication<App>;
  let usersService: InMemoryUsersService;
  let verificationCodesByEmail: Map<string, string>;

  beforeEach(async () => {
    usersService = new InMemoryUsersService();
    verificationCodesByEmail = new Map<string, string>();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersService)
      .overrideProvider(EmailSenderService)
      .useValue({
        sendVerificationCode: jest
          .fn()
          .mockImplementation(
            ({ email, code }: { email: string; code: string }) => {
              verificationCodesByEmail.set(email, code);
              return { sentViaSmtp: false };
            },
          ),
      })
      .overrideProvider(AuthRateLimiterService)
      .useValue({
        hit: jest.fn().mockReturnValue({ allowed: true, retryAfterSec: 0 }),
      })
      .overrideProvider(TurnstileCaptchaService)
      .useValue({
        assertValidToken: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  const buildRegisterPayload = (
    overrides?: Partial<{
      phone: string;
      email: string;
      login: string;
      password: string;
    }>,
  ) => ({
    phone: '+79991234567',
    email: 'user@example.com',
    login: 'user_login',
    password: 'password123',
    consentToPrivacyPolicy: true,
    consentToPersonalData: true,
    agreementVersion: '2026-04-04',
    captchaToken: 'mock-captcha-token',
    ...overrides,
  });

  const registerUser = async (
    overrides?: Partial<{
      phone: string;
      email: string;
      login: string;
      password: string;
    }>,
  ) => {
    const payload = buildRegisterPayload(overrides);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);

    return payload;
  };

  const verifyRegisteredUser = async (email: string) => {
    const code = verificationCodesByEmail.get(email);
    expect(code).toBeDefined();

    const response = await request(app.getHttpServer())
      .post('/auth/register/verify-email')
      .send({
        email,
        code,
      })
      .expect(201);

    return response.body as { accessToken: string };
  };

  const registerAndVerify = async (
    overrides?: Partial<{
      phone: string;
      email: string;
      login: string;
      password: string;
    }>,
  ) => {
    const payload = await registerUser(overrides);
    const verifyBody = await verifyRegisteredUser(payload.email);

    return { payload, accessToken: verifyBody.accessToken };
  };

  it('удаляет свой аккаунт через DELETE /auth/me и блокирует повторный вход', async () => {
    const { accessToken } = await registerAndVerify({
      phone: '+79991234567',
      email: 'user1@example.com',
      login: 'ivan_user',
    });
    expect(accessToken).toBeDefined();

    await request(app.getHttpServer())
      .delete('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({ success: true });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79991234567',
        password: 'password123',
      })
      .expect(401);
  });

  it('запрещает удаление аккаунта без токена', async () => {
    await request(app.getHttpServer()).delete('/auth/me').expect(401);
  });

  it('возвращает единый формат validation-ошибки для /auth/register', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '123',
        email: 'wrong-email',
        login: 'bad login',
        password: '123',
        consentToPrivacyPolicy: 'nope',
        consentToPersonalData: false,
        agreementVersion: '',
        captchaToken: '',
        extraField: 'forbidden',
      })
      .expect(400);

    const body = response.body as {
      success: false;
      statusCode: number;
      errorCode: string;
      message: string;
      path: string;
      details: Array<{ field: string; message: string }>;
    };

    expect(body).toMatchObject({
      success: false,
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      path: '/auth/register',
    });
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  describe('POST /auth/login', () => {
    it('выполняет вход при корректном телефоне и пароле', async () => {
      await registerAndVerify({
        phone: '+79990000001',
        email: 'user2@example.com',
        login: 'alex_user',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000001',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };
      expect(loginBody.accessToken).toBeDefined();
    });

    it('возвращает ошибку при неверном пароле', async () => {
      await registerAndVerify({
        phone: '+79990000002',
        email: 'user3@example.com',
        login: 'maria_user',
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000002',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('возвращает ошибку для неактивного пользователя', async () => {
      const { accessToken } = await registerAndVerify({
        phone: '+79990000003',
        email: 'user4@example.com',
        login: 'olga_user',
      });

      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000003',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('возвращает профиль для валидного токена активного пользователя', async () => {
      const { accessToken } = await registerAndVerify({
        phone: '+79990000004',
        email: 'user5@example.com',
        login: 'elena_user',
      });

      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const meBody = meResponse.body as { phone: string; login: string };
      expect(meBody.phone).toBe('+79990000004');
      expect(meBody.login).toBe('elena_user');
    });

    it('возвращает 401 без токена', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('возвращает 401 для деактивированного пользователя', async () => {
      const { accessToken } = await registerAndVerify({
        phone: '+79990000005',
        email: 'user6@example.com',
        login: 'nikita_user',
      });

      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('POST /users/staff', () => {
    it('возвращает 401 при создании staff-пользователя без токена', async () => {
      await request(app.getHttpServer())
        .post('/users/staff')
        .send({
          phone: '+79990000012',
          email: 'staff-no-token@example.com',
          login: 'staff_no_token',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(401);
    });

    it('разрешает admin создавать operator', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.seed({
        primaryTenantId: 42,
        organizationIds: [42],
        email: 'admin-auth-1@example.com',
        phone: '+79990000006',
        passwordHash,
        role: UserRole.ADMIN,
        login: 'admin_auth_1',
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000006',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      const createResponse = await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000007',
          email: 'operator-created@example.com',
          login: 'operator_created',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(201);

      const createdBody = createResponse.body as {
        role: UserRole;
        primaryTenantId: number;
      };
      expect(createdBody.role).toBe(UserRole.OPERATOR);
      expect(createdBody.primaryTenantId).toBe(42);
    });

    it('запрещает user создавать staff-пользователей', async () => {
      const { accessToken } = await registerAndVerify({
        phone: '+79990000013',
        email: 'user7@example.com',
        login: 'client_user',
      });

      await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          phone: '+79990000014',
          email: 'staff-by-user@example.com',
          login: 'attempt_user',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(403);
    });

    it('запрещает moderator создавать staff-пользователей', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.seed({
        primaryTenantId: 42,
        organizationIds: [42],
        email: 'moderator-auth@example.com',
        phone: '+79990000015',
        passwordHash,
        role: UserRole.MODERATOR,
        login: 'moderator_auth',
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000015',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000016',
          email: 'staff-by-moderator@example.com',
          login: 'moderator_attempt',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(403);
    });

    it('запрещает admin создавать admin', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.seed({
        primaryTenantId: 42,
        organizationIds: [42],
        email: 'admin-auth-2@example.com',
        phone: '+79990000008',
        passwordHash,
        role: UserRole.ADMIN,
        login: 'admin_auth_2',
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000008',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000009',
          email: 'admin-created-by-admin@example.com',
          login: 'new_admin_attempt',
          password: 'password123',
          role: UserRole.ADMIN,
        })
        .expect(403);
    });

    it('разрешает superAdmin создавать admin', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.seed({
        primaryTenantId: null,
        organizationIds: [77],
        email: 'superadmin-auth@example.com',
        phone: '+79990000010',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        login: 'superadmin_auth',
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000010',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      const createResponse = await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000011',
          email: 'admin-created-by-superadmin@example.com',
          login: 'admin_by_superadmin',
          password: 'password123',
          role: UserRole.ADMIN,
          primaryTenantId: 77,
        })
        .expect(201);

      const createdBody = createResponse.body as {
        role: UserRole;
        primaryTenantId: number;
      };
      expect(createdBody.role).toBe(UserRole.ADMIN);
      expect(createdBody.primaryTenantId).toBe(77);
    });

    it('блокирует доступ по старому токену после деактивации пользователя', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const admin = usersService.seed({
        primaryTenantId: 42,
        organizationIds: [42],
        email: 'admin-auth-3@example.com',
        phone: '+79990000017',
        passwordHash,
        role: UserRole.ADMIN,
        login: 'deactivated_admin',
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+79990000017',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      usersService.deactivateById(admin.id);

      await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000018',
          email: 'operator-after-deactivation@example.com',
          login: 'new_operator_after_deactivate',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(401);
    });
  });
});
