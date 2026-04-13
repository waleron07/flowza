import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { UsersService } from '../../src/users/users.service';
import { CreateUserInput } from '../../src/users/types/create-user.type';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { TenantsService } from '../../src/tenants/tenants.service';

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

class InMemoryUsersService {
  private users: InMemoryUser[] = [];
  private currentId = 1;

  findByPhone(phone: string) {
    return this.users.find((user) => user.phone === phone) ?? null;
  }

  findById(id: number) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  findByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
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

describe('E2E проверки организаций', () => {
  let app: INestApplication<App>;
  let usersService: InMemoryUsersService;

  const tenantsServiceMock = {
    findPublicCatalogBySlug: jest.fn(),
    findAccessibleTenantsForActor: jest.fn(),
    findManageableTenantsForActor: jest.fn(),
    findActiveTenants: jest.fn(),
    findManagementViewByTenantId: jest.fn(),
    createTenant: jest.fn(),
    updateTenant: jest.fn(),
    removeTenant: jest.fn(),
  };

  beforeEach(async () => {
    usersService = new InMemoryUsersService();

    Object.values(tenantsServiceMock).forEach((mockFn) => mockFn.mockReset());

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersService)
      .overrideProvider(TenantsService)
      .useValue(tenantsServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  async function loginAs(role: UserRole, organizationIds: number[]) {
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    const phone = `+7999${Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0')}`;

    usersService.seed({
      primaryTenantId: organizationIds[0] ?? null,
      organizationIds,
      email: `${role}-${Date.now()}@example.com`,
      phone,
      passwordHash,
      role,
      login: `${role}_login_${Date.now()}`,
      isActive: true,
      emailVerifiedAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: phone, password })
      .expect(201);

    return (response.body as { accessToken: string }).accessToken;
  }

  it('возвращает публичный список активных организаций', async () => {
    tenantsServiceMock.findActiveTenants.mockResolvedValue([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/tenants')
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
      },
    ]);
    expect(tenantsServiceMock.findActiveTenants).toHaveBeenCalledTimes(1);
  });

  it('возвращает публичный каталог организации по slug', async () => {
    tenantsServiceMock.findPublicCatalogBySlug.mockResolvedValue({
      tenant: {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
      },
      categories: [],
      products: [],
    });

    const response = await request(app.getHttpServer())
      .get('/tenants/flowza-cafe/catalog')
      .expect(200);

    expect(response.body).toEqual({
      tenant: {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
      },
      categories: [],
      products: [],
    });
    expect(tenantsServiceMock.findPublicCatalogBySlug).toHaveBeenCalledWith(
      'flowza-cafe',
    );
  });

  it('возвращает 404 для каталога несуществующей организации', async () => {
    tenantsServiceMock.findPublicCatalogBySlug.mockRejectedValue(
      new NotFoundException('Организация не найдена'),
    );

    await request(app.getHttpServer())
      .get('/tenants/missing/catalog')
      .expect(404);
  });

  it('возвращает список управляемых организаций для admin', async () => {
    tenantsServiceMock.findManageableTenantsForActor.mockResolvedValue([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
        isActive: true,
      },
    ]);

    const token = await loginAs(UserRole.ADMIN, [10, 11]);

    const response = await request(app.getHttpServer())
      .get('/tenants/manageable')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
        isActive: true,
      },
    ]);
    expect(
      tenantsServiceMock.findManageableTenantsForActor,
    ).toHaveBeenCalledWith({
      role: UserRole.ADMIN,
      organizationIds: [10, 11],
    });
  });

  it('запрещает доступ к /tenants/manageable для moderator', async () => {
    const token = await loginAs(UserRole.MODERATOR, [10]);

    await request(app.getHttpServer())
      .get('/tenants/manageable')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(
      tenantsServiceMock.findManageableTenantsForActor,
    ).not.toHaveBeenCalled();
  });

  it('разрешает доступ к /tenants/accessible для operator', async () => {
    tenantsServiceMock.findAccessibleTenantsForActor.mockResolvedValue([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
      },
    ]);

    const token = await loginAs(UserRole.OPERATOR, [10]);

    const response = await request(app.getHttpServer())
      .get('/tenants/accessible')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
      },
    ]);
    expect(
      tenantsServiceMock.findAccessibleTenantsForActor,
    ).toHaveBeenCalledWith({
      role: UserRole.OPERATOR,
      organizationIds: [10],
    });
  });

  it('возвращает доступные организации для superAdmin без organizationIds', async () => {
    tenantsServiceMock.findAccessibleTenantsForActor.mockResolvedValue([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
      },
      {
        id: 11,
        name: 'Another Cafe',
        slug: 'another-cafe',
        description: 'Кафе 2',
      },
    ]);

    const token = await loginAs(UserRole.SUPER_ADMIN, []);

    const response = await request(app.getHttpServer())
      .get('/tenants/accessible')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
      },
      {
        id: 11,
        name: 'Another Cafe',
        slug: 'another-cafe',
        description: 'Кафе 2',
      },
    ]);
    expect(
      tenantsServiceMock.findAccessibleTenantsForActor,
    ).toHaveBeenCalledWith({
      role: UserRole.SUPER_ADMIN,
      organizationIds: [],
    });
  });

  it('возвращает пустой список /tenants/accessible для admin без organizationIds', async () => {
    tenantsServiceMock.findAccessibleTenantsForActor.mockResolvedValue([]);

    const token = await loginAs(UserRole.ADMIN, []);

    const response = await request(app.getHttpServer())
      .get('/tenants/accessible')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([]);
    expect(
      tenantsServiceMock.findAccessibleTenantsForActor,
    ).toHaveBeenCalledWith({
      role: UserRole.ADMIN,
      organizationIds: [],
    });
  });

  it('возвращает пустой список /tenants/manageable для admin без organizationIds', async () => {
    tenantsServiceMock.findManageableTenantsForActor.mockResolvedValue([]);

    const token = await loginAs(UserRole.ADMIN, []);

    const response = await request(app.getHttpServer())
      .get('/tenants/manageable')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([]);
    expect(
      tenantsServiceMock.findManageableTenantsForActor,
    ).toHaveBeenCalledWith({
      role: UserRole.ADMIN,
      organizationIds: [],
    });
  });

  it('возвращает management-view для moderator своей организации', async () => {
    tenantsServiceMock.findManagementViewByTenantId.mockResolvedValue({
      tenant: {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
      },
      categories: [],
      products: [],
    });

    const token = await loginAs(UserRole.MODERATOR, [10]);

    const response = await request(app.getHttpServer())
      .get('/tenants/10/management')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      tenant: {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
      },
      categories: [],
      products: [],
    });
    expect(
      tenantsServiceMock.findManagementViewByTenantId,
    ).toHaveBeenCalledWith(10, {
      role: UserRole.MODERATOR,
      organizationIds: [10],
    });
  });

  it('запрещает доступ к /tenants/:tenantId/management для operator', async () => {
    const token = await loginAs(UserRole.OPERATOR, [10]);

    await request(app.getHttpServer())
      .get('/tenants/10/management')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(
      tenantsServiceMock.findManagementViewByTenantId,
    ).not.toHaveBeenCalled();
  });

  it('возвращает 400 для невалидного tenantId в management-view', async () => {
    const token = await loginAs(UserRole.ADMIN, [10]);

    await request(app.getHttpServer())
      .get('/tenants/not-a-number/management')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(
      tenantsServiceMock.findManagementViewByTenantId,
    ).not.toHaveBeenCalled();
  });
});
