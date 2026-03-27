import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { UsersService } from '../../src/users/users.service';
import { CreateUserInput } from '../../src/users/types/create-user.type';
import { UserRole } from '../../src/common/enums/user-role.enum';

interface InMemoryUser {
  id: number;
  tenantId: number | null;
  email: string | null;
  phone: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class InMemoryUsersService {
  private users: InMemoryUser[] = [];
  private currentId = 1;

  findByPhone(phone: string) {
    return this.users.find((user) => user.phone === phone) ?? null;
  }

  findById(id: number) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  create(input: CreateUserInput) {
    const user: InMemoryUser = {
      id: this.currentId++,
      tenantId: input.tenantId ?? null,
      email: input.email ?? null,
      phone: input.phone,
      passwordHash: input.passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
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

  seed(user: Omit<InMemoryUser, 'id' | 'createdAt' | 'updatedAt'>) {
    const createdUser: InMemoryUser = {
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...user,
    };

    this.users.push(createdUser);
    return createdUser;
  }
}

describe('E2E проверки авторизации', () => {
  let app: INestApplication<App>;
  let usersService: InMemoryUsersService;

  beforeEach(async () => {
    usersService = new InMemoryUsersService();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('удаляет свой аккаунт через DELETE /auth/me и блокирует повторный вход', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '+79991234567',
        firstName: 'Иван',
        password: 'password123',
        consentToPrivacyPolicy: true,
      })
      .expect(201);

    const registerBody = registerResponse.body as { accessToken: string };
    const accessToken = registerBody.accessToken;
    expect(accessToken).toBeDefined();

    await request(app.getHttpServer())
      .delete('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({ success: true });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone: '+79991234567',
        password: 'password123',
      })
      .expect(401);
  });

  it('запрещает удаление аккаунта без токена', async () => {
    await request(app.getHttpServer()).delete('/auth/me').expect(401);
  });

  describe('POST /auth/login', () => {
    it('выполняет вход при корректном телефоне и пароле', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000001',
          firstName: 'Алексей',
          password: 'password123',
          consentToPrivacyPolicy: true,
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000001',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };
      expect(loginBody.accessToken).toBeDefined();
    });

    it('возвращает ошибку при неверном пароле', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000002',
          firstName: 'Мария',
          password: 'password123',
          consentToPrivacyPolicy: true,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000002',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('возвращает ошибку для неактивного пользователя', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000003',
          firstName: 'Ольга',
          password: 'password123',
          consentToPrivacyPolicy: true,
        })
        .expect(201);

      const registerBody = registerResponse.body as { accessToken: string };

      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Authorization', `Bearer ${registerBody.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000003',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('возвращает профиль для валидного токена активного пользователя', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000004',
          firstName: 'Елена',
          password: 'password123',
          consentToPrivacyPolicy: true,
        })
        .expect(201);

      const registerBody = registerResponse.body as { accessToken: string };

      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${registerBody.accessToken}`)
        .expect(200);

      const meBody = meResponse.body as { phone: string; firstName: string };
      expect(meBody.phone).toBe('+79990000004');
      expect(meBody.firstName).toBe('Елена');
    });

    it('возвращает 401 без токена', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('возвращает 401 для деактивированного пользователя', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000005',
          firstName: 'Никита',
          password: 'password123',
          consentToPrivacyPolicy: true,
        })
        .expect(201);

      const registerBody = registerResponse.body as { accessToken: string };

      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Authorization', `Bearer ${registerBody.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${registerBody.accessToken}`)
        .expect(401);
    });
  });

  describe('POST /users/staff', () => {
    it('возвращает 401 при создании staff-пользователя без токена', async () => {
      await request(app.getHttpServer())
        .post('/users/staff')
        .send({
          phone: '+79990000012',
          firstName: 'Без токена',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(401);
    });

    it('разрешает admin создавать operator', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.seed({
        tenantId: 42,
        email: null,
        phone: '+79990000006',
        passwordHash,
        role: UserRole.ADMIN,
        firstName: 'Админ',
        lastName: null,
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000006',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      const createResponse = await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000007',
          firstName: 'Оператор',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(201);

      const createdBody = createResponse.body as {
        role: UserRole;
        tenantId: number;
      };
      expect(createdBody.role).toBe(UserRole.OPERATOR);
      expect(createdBody.tenantId).toBe(42);
    });

    it('запрещает user создавать staff-пользователей', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: '+79990000013',
          firstName: 'Клиент',
          password: 'password123',
          consentToPrivacyPolicy: true,
        })
        .expect(201);

      const registerBody = registerResponse.body as { accessToken: string };

      await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${registerBody.accessToken}`)
        .send({
          phone: '+79990000014',
          firstName: 'Попытка',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(403);
    });

    it('запрещает moderator создавать staff-пользователей', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.seed({
        tenantId: 42,
        email: null,
        phone: '+79990000015',
        passwordHash,
        role: UserRole.MODERATOR,
        firstName: 'Модератор',
        lastName: null,
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000015',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000016',
          firstName: 'Попытка модератора',
          password: 'password123',
          role: UserRole.OPERATOR,
        })
        .expect(403);
    });

    it('запрещает admin создавать admin', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.seed({
        tenantId: 42,
        email: null,
        phone: '+79990000008',
        passwordHash,
        role: UserRole.ADMIN,
        firstName: 'Админ',
        lastName: null,
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000008',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000009',
          firstName: 'Новый админ',
          password: 'password123',
          role: UserRole.ADMIN,
        })
        .expect(403);
    });

    it('разрешает superAdmin создавать admin', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      usersService.seed({
        tenantId: null,
        email: null,
        phone: '+79990000010',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        firstName: 'Суперадмин',
        lastName: null,
        isActive: true,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '+79990000010',
          password: 'password123',
        })
        .expect(201);

      const loginBody = loginResponse.body as { accessToken: string };

      const createResponse = await request(app.getHttpServer())
        .post('/users/staff')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({
          phone: '+79990000011',
          firstName: 'Админ организации',
          password: 'password123',
          role: UserRole.ADMIN,
          tenantId: 77,
        })
        .expect(201);

      const createdBody = createResponse.body as {
        role: UserRole;
        tenantId: number;
      };
      expect(createdBody.role).toBe(UserRole.ADMIN);
      expect(createdBody.tenantId).toBe(77);
    });
  });
});
