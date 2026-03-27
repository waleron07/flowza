import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { UsersService } from '../../src/users/users.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { UserRole } from '../../src/common/enums/user-role.enum';

describe('Интеграция auth', () => {
  let app: INestApplication<App>;

  const findByIdMock = jest.fn();
  const findByPhoneMock = jest.fn();
  const createMock = jest.fn();
  const deactivateByIdMock = jest.fn();

  const usersServiceMock = {
    findById: findByIdMock,
    findByPhone: findByPhoneMock,
    create: createMock,
    deactivateById: deactivateByIdMock,
  } as unknown as UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersServiceMock)
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
    await app.init();
  });

  describe('POST /auth/register', () => {
    it('регистрирует пользователя с валидными данными', async () => {
      findByPhoneMock.mockResolvedValue(null);
      createMock.mockResolvedValue({
        id: 201,
        tenantId: null,
        phone: '+79990000201',
        firstName: 'Регистрация',
        lastName: null,
        role: UserRole.USER,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000201',
          firstName: 'Регистрация',
          password: 'password123',
          consentToPrivacyPolicy: true,
        })
        .expect(201);

      const body = response.body as {
        accessToken: string;
        user: { phone: string; role: UserRole };
      };
      expect(body.accessToken).toBeDefined();
      expect(body.user.phone).toBe('+79990000201');
      expect(body.user.role).toBe(UserRole.USER);
    });

    it('возвращает 400 без согласия с политикой конфиденциальности', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000202',
          firstName: 'Без согласия',
          password: 'password123',
          consentToPrivacyPolicy: false,
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
        firstName: 'Логин',
        lastName: null,
        role: UserRole.USER,
        isActive: true,
        passwordHash,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000301',
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
        firstName: 'Неверный пароль',
        lastName: null,
        role: UserRole.USER,
        isActive: true,
        passwordHash,
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000302',
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
        firstName: 'Неактивный логин',
        lastName: null,
        role: UserRole.USER,
        isActive: false,
        passwordHash,
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000303',
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
        firstName: 'Интеграция',
        lastName: 'Тест',
        role: UserRole.USER,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(200);

      const body = response.body as { phone: string; firstName: string };
      expect(body.phone).toBe('+79990000100');
      expect(body.firstName).toBe('Интеграция');
    });

    it('возвращает 401 для неактивного пользователя', async () => {
      findByIdMock.mockResolvedValue({
        id: 100,
        tenantId: null,
        phone: '+79990000101',
        firstName: 'Неактивный',
        lastName: null,
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
        firstName: 'Удаление',
        lastName: null,
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
