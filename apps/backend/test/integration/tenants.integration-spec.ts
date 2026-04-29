import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { PrismaService } from '../../src/database/prisma.service';
import { TenantAccessService } from '../../src/tenants/tenant-access.service';

describe('Интеграция tenants', () => {
  let app: INestApplication<App>;
  type TenantFindFirstArgs = {
    where: { slug: string; isActive: boolean };
    select: object;
  };

  const tenantFindManyMock = jest.fn();
  const tenantFindFirstMock = jest.fn();
  const tenantFindUniqueMock = jest.fn();
  const categoryFindManyMock = jest.fn();
  const productFindManyMock = jest.fn();
  const assertCanManageOrganizationMock = jest.fn();
  const normalizeOrganizationIdsMock = jest.fn((organizationIds?: number[]) =>
    [...new Set(organizationIds ?? [])].sort((left, right) => left - right),
  );

  const prismaMock = {
    tenant: {
      findMany: tenantFindManyMock,
      findFirst: tenantFindFirstMock,
      findUnique: tenantFindUniqueMock,
    },
    category: {
      findMany: categoryFindManyMock,
    },
    product: {
      findMany: productFindManyMock,
    },
  } as unknown as PrismaService;

  const tenantAccessServiceMock = {
    assertCanManageOrganization: assertCanManageOrganizationMock,
    normalizeOrganizationIds: normalizeOrganizationIdsMock,
  } as unknown as TenantAccessService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(TenantAccessService)
      .useValue(tenantAccessServiceMock)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: Record<string, string | undefined>;
              user?: {
                userId: number;
                role: UserRole;
                primaryTenantId: number | null;
                organizationIds: number[];
              };
            };
          };
        }) {
          const request = context.switchToHttp().getRequest();
          const roleHeader = request.headers['x-role'];
          const orgsHeader = request.headers['x-orgs'];
          const userIdHeader = request.headers['x-user-id'];

          const role = (roleHeader as UserRole | undefined) ?? UserRole.ADMIN;
          const organizationIds = String(orgsHeader ?? '10')
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0);
          const userId = Number(userIdHeader ?? '101');

          request.user = {
            userId,
            role,
            primaryTenantId: organizationIds[0] ?? null,
            organizationIds,
          };

          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('возвращает публичный список активных организаций и использует tenant-aware фильтр', async () => {
    tenantFindManyMock.mockResolvedValue([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
      },
    ]);

    await request(app.getHttpServer())
      .get('/tenants')
      .expect(200)
      .expect([
        {
          id: 10,
          name: 'Flowza Cafe',
          slug: 'flowza-cafe',
          description: 'Кафе',
        },
      ]);

    expect(tenantFindManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('возвращает tenant-aware каталог по slug и применяет фильтры активности', async () => {
    tenantFindFirstMock.mockResolvedValue({
      id: 10,
      name: 'Flowza Cafe',
      slug: 'flowza-cafe',
      description: 'Кафе',
      heroTitle: null,
      heroSubtitle: null,
      heroDescription: null,
      heroImageUrl: null,
      seoTitle: null,
      seoDescription: null,
      phone: null,
      address: null,
      timezone: 'Europe/Moscow',
      workingHours: null,
      deliveryFee: 199,
      minOrderAmount: 1000,
    });
    categoryFindManyMock.mockResolvedValue([
      {
        id: 501,
        name: 'Пицца',
        description: 'Основное меню',
        imageUrl: null,
        sortOrder: 1,
      },
    ]);
    productFindManyMock.mockResolvedValue([
      {
        id: 701,
        categoryId: 501,
        name: 'Маргарита',
        description: 'Классика',
        imageUrl: null,
        badgeText: null,
        price: 520,
        currency: 'RUB',
      },
    ]);

    await request(app.getHttpServer())
      .get('/tenants/flowza-cafe/catalog')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          tenant: { slug: string };
          categories: Array<{ id: number }>;
          products: Array<{ id: number }>;
        };
        expect(body.tenant.slug).toBe('flowza-cafe');
        expect(body.categories[0]?.id).toBe(501);
        expect(body.products[0]?.id).toBe(701);
      });

    expect(tenantFindFirstMock).toHaveBeenCalledWith({
      where: { slug: 'flowza-cafe', isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        heroTitle: true,
        heroSubtitle: true,
        heroDescription: true,
        heroImageUrl: true,
        seoTitle: true,
        seoDescription: true,
        phone: true,
        address: true,
        timezone: true,
        workingHours: true,
        deliveryFee: true,
        minOrderAmount: true,
      },
    });
    expect(categoryFindManyMock).toHaveBeenCalledWith({
      where: {
        tenantId: 10,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    expect(productFindManyMock).toHaveBeenCalledWith({
      where: {
        tenantId: 10,
        isActive: true,
        category: {
          isActive: true,
        },
      },
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        imageUrl: true,
        badgeText: true,
        price: true,
        currency: true,
      },
      orderBy: [{ name: 'asc' }],
    });
  });

  it('возвращает 404 для каталога несуществующей организации', async () => {
    tenantFindFirstMock.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/tenants/missing/catalog')
      .expect(404);
  });

  it('обрабатывает SQL-like slug как обычную строку и возвращает 404 без raw query', async () => {
    tenantFindFirstMock.mockResolvedValue(null);

    const maliciousSlug = "flowza-cafe' OR '1'='1";

    await request(app.getHttpServer())
      .get(`/tenants/${encodeURIComponent(maliciousSlug)}/catalog`)
      .expect(404);

    const tenantFindFirstCalls = (
      tenantFindFirstMock as jest.Mock<unknown, [TenantFindFirstArgs]>
    ).mock.calls;
    const tenantFindFirstArgs = tenantFindFirstCalls[0]?.[0];
    expect(tenantFindFirstArgs.where).toEqual({
      slug: maliciousSlug,
      isActive: true,
    });
    expect(tenantFindFirstArgs.select).toBeDefined();
    expect(categoryFindManyMock).not.toHaveBeenCalled();
    expect(productFindManyMock).not.toHaveBeenCalled();
  });

  it('возвращает список управляемых организаций для admin и фильтрует по organizationIds', async () => {
    tenantFindManyMock.mockResolvedValue([
      {
        id: 10,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
        isActive: true,
      },
    ]);

    await request(app.getHttpServer())
      .get('/tenants/manageable')
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '11,10,11')
      .expect(200);

    expect(normalizeOrganizationIdsMock).toHaveBeenCalledWith([11, 10, 11]);
    expect(tenantFindManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: [10, 11] },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('возвращает 403 для moderator на /tenants/manageable', async () => {
    await request(app.getHttpServer())
      .get('/tenants/manageable')
      .set('x-role', UserRole.MODERATOR)
      .set('x-orgs', '10')
      .expect(403);
  });

  it('возвращает /tenants/accessible для superAdmin без фильтра по organizationIds', async () => {
    tenantFindManyMock.mockResolvedValue([
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

    await request(app.getHttpServer())
      .get('/tenants/accessible')
      .set('x-role', UserRole.SUPER_ADMIN)
      .set('x-orgs', '')
      .expect(200)
      .expect([
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

    expect(tenantFindManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('возвращает пустой список /tenants/accessible для admin без organizationIds', async () => {
    await request(app.getHttpServer())
      .get('/tenants/accessible')
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '')
      .expect(200)
      .expect([]);

    expect(normalizeOrganizationIdsMock).toHaveBeenCalledWith([]);
    expect(tenantFindManyMock).not.toHaveBeenCalled();
  });

  it('возвращает пустой список /tenants/manageable для admin без organizationIds', async () => {
    await request(app.getHttpServer())
      .get('/tenants/manageable')
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '')
      .expect(200)
      .expect([]);

    expect(normalizeOrganizationIdsMock).toHaveBeenCalledWith([]);
    expect(tenantFindManyMock).not.toHaveBeenCalled();
  });

  it('возвращает management-view для доступной организации и проверяет tenant-изоляцию', async () => {
    tenantFindUniqueMock.mockResolvedValue({
      id: 10,
      name: 'Flowza Cafe',
      slug: 'flowza-cafe',
      description: 'Кафе',
      heroTitle: null,
      heroSubtitle: null,
      heroDescription: null,
      heroImageUrl: null,
      seoTitle: null,
      seoDescription: null,
      isActive: true,
      phone: null,
      address: null,
      timezone: 'Europe/Moscow',
      workingHours: null,
      deliveryFee: 199,
      minOrderAmount: 1000,
      subscription: null,
    });
    categoryFindManyMock.mockResolvedValue([{ id: 501, name: 'Пицца' }]);
    productFindManyMock.mockResolvedValue([{ id: 701, name: 'Маргарита' }]);

    await request(app.getHttpServer())
      .get('/tenants/10/management')
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '10,20')
      .expect(200);

    expect(assertCanManageOrganizationMock).toHaveBeenCalledWith(
      {
        role: UserRole.ADMIN,
        organizationIds: [10, 20],
      },
      10,
    );
    expect(categoryFindManyMock).toHaveBeenCalledWith({
      where: { tenantId: 10 },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    expect(productFindManyMock).toHaveBeenCalledWith({
      where: { tenantId: 10 },
      orderBy: [{ name: 'asc' }],
    });
  });

  it('возвращает 403 при попытке получить management-view чужой организации', async () => {
    assertCanManageOrganizationMock.mockImplementation(() => {
      throw new ForbiddenException(
        'Недостаточно прав для редактирования этой организации',
      );
    });

    await request(app.getHttpServer())
      .get('/tenants/99/management')
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '10,20')
      .expect(403);

    expect(tenantFindUniqueMock).not.toHaveBeenCalled();
  });

  it('возвращает 400 для невалидного tenantId в management-view', async () => {
    await request(app.getHttpServer())
      .get('/tenants/not-a-number/management')
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '10,20')
      .expect(400);

    expect(assertCanManageOrganizationMock).not.toHaveBeenCalled();
  });
});
