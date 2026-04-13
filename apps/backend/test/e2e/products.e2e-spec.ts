import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { UsersService } from '../../src/users/users.service';
import { CreateUserInput } from '../../src/users/types/create-user.type';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { ProductsService } from '../../src/products/products.service';

interface InMemoryUser {
  id: number;
  primaryTenantId: number | null;
  organizationIds: number[];
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  login: string;
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
    const organizationIds =
      input.organizationIds ??
      (input.primaryTenantId ? [input.primaryTenantId] : []);

    const user: InMemoryUser = {
      id: this.currentId++,
      primaryTenantId: input.primaryTenantId ?? null,
      organizationIds,
      email: input.email,
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

describe('E2E проверки продуктов', () => {
  let app: INestApplication<App>;
  let usersService: InMemoryUsersService;

  const productsService = {
    findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'Маргарита' }]),
    create: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Маргарита',
      currency: 'RUB',
    }),
    update: jest.fn().mockResolvedValue({ id: 1, name: 'Обновлено' }),
    remove: jest.fn().mockResolvedValue({ id: 1, isActive: false }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    usersService = new InMemoryUsersService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersService)
      .overrideProvider(ProductsService)
      .useValue(productsService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('запрещает доступ к продуктам без токена', async () => {
    await request(app.getHttpServer()).get('/products?tenantId=10').expect(401);
  });

  it('разрешает moderator создавать продукт', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'moderator-products@example.com',
      phone: '+79990000200',
      passwordHash,
      role: UserRole.MODERATOR,
      login: 'moderator_products',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000200',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        tenantId: 10,
        categoryId: 5,
        name: 'Маргарита',
        price: 500,
      })
      .expect(201);
  });

  it('запрещает operator создавать продукт', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-products@example.com',
      phone: '+79990000201',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_products',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000201',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        tenantId: 10,
        categoryId: 5,
        name: 'Маргарита',
        price: 500,
      })
      .expect(403);
  });
});
