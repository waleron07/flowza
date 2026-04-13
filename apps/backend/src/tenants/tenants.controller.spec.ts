import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { UserRole } from '../common/enums/user-role.enum';

function createTenantFixture(
  overrides?: Partial<Awaited<ReturnType<TenantsService['createTenant']>>>,
) {
  return {
    id: 1,
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
    deliveryFee: 0,
    minOrderAmount: 0,
    subscription: null,
    isActive: true,
    createdAt: new Date('2026-04-12T00:00:00.000Z'),
    updatedAt: new Date('2026-04-12T00:00:00.000Z'),
    ...overrides,
  };
}

function createServiceMock() {
  return {
    findPublicCatalogBySlug: jest.fn<
      ReturnType<TenantsService['findPublicCatalogBySlug']>,
      Parameters<TenantsService['findPublicCatalogBySlug']>
    >(),
    findAccessibleTenantsForActor: jest.fn<
      ReturnType<TenantsService['findAccessibleTenantsForActor']>,
      Parameters<TenantsService['findAccessibleTenantsForActor']>
    >(),
    findManageableTenantsForActor: jest.fn<
      ReturnType<TenantsService['findManageableTenantsForActor']>,
      Parameters<TenantsService['findManageableTenantsForActor']>
    >(),
    findManagementViewByTenantId: jest.fn<
      ReturnType<TenantsService['findManagementViewByTenantId']>,
      Parameters<TenantsService['findManagementViewByTenantId']>
    >(),
    findActiveTenants: jest.fn<
      ReturnType<TenantsService['findActiveTenants']>,
      Parameters<TenantsService['findActiveTenants']>
    >(),
    createTenant: jest.fn<
      ReturnType<TenantsService['createTenant']>,
      Parameters<TenantsService['createTenant']>
    >(),
    updateTenant: jest.fn<
      ReturnType<TenantsService['updateTenant']>,
      Parameters<TenantsService['updateTenant']>
    >(),
    removeTenant: jest.fn<
      ReturnType<TenantsService['removeTenant']>,
      Parameters<TenantsService['removeTenant']>
    >(),
  };
}

describe('Контроллер организаций', () => {
  let controller: TenantsController;
  let service: ReturnType<typeof createServiceMock>;

  beforeEach(async () => {
    service = createServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TenantsController>(TenantsController);
  });

  it('возвращает список активных организаций', async () => {
    const tenants = [
      {
        id: 1,
        name: 'Roma Pizza',
        slug: 'roma-pizza',
        description: 'Итальянская пицца',
      },
      {
        id: 2,
        name: 'Tokyo Roll',
        slug: 'tokyo-roll',
        description: 'Азиатская кухня',
      },
    ];

    service.findActiveTenants.mockResolvedValue(tenants);

    await expect(controller.getActiveTenants()).resolves.toEqual(tenants);
    expect(service.findActiveTenants).toHaveBeenCalledTimes(1);
  });

  it('возвращает публичный каталог организации по slug', async () => {
    const catalog = {
      tenant: {
        id: 1,
        name: 'Roma Pizza',
        slug: 'roma-pizza',
        description: 'Итальянская пицца',
        heroTitle: 'Лучшая пицца района',
        heroSubtitle: 'Доставка за 30 минут',
        heroDescription: 'Свежая пицца каждый день',
        heroImageUrl: 'https://example.com/hero.jpg',
        seoTitle: 'Roma Pizza',
        seoDescription: 'Пицца в Москве',
        phone: '+79990000000',
        address: 'Москва',
        timezone: 'Europe/Moscow',
        workingHours: { mon: '10:00-22:00' },
        deliveryFee: 199,
        minOrderAmount: 1000,
      },
      categories: [
        {
          id: 5,
          name: 'Пицца',
          description: 'Основное меню',
          imageUrl: 'https://example.com/category.jpg',
          sortOrder: 1,
        },
      ],
      products: [
        {
          id: 7,
          categoryId: 5,
          name: 'Маргарита',
          description: 'Классика',
          imageUrl: 'https://example.com/product.jpg',
          badgeText: 'Хит',
          price: 520,
          currency: 'RUB',
        },
      ],
    };

    service.findPublicCatalogBySlug.mockResolvedValue(catalog);

    await expect(controller.getPublicCatalog('roma-pizza')).resolves.toEqual(
      catalog,
    );
    expect(service.findPublicCatalogBySlug).toHaveBeenCalledWith('roma-pizza');
  });

  it('возвращает доступные сотруднику организации', async () => {
    const tenants = [
      {
        id: 5,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
      },
    ];
    service.findAccessibleTenantsForActor.mockResolvedValue(tenants);

    await expect(
      controller.getAccessibleTenants({
        user: {
          userId: 10,
          role: UserRole.ADMIN,
          primaryTenantId: 5,
          organizationIds: [5, 6],
        },
      }),
    ).resolves.toEqual(tenants);
    expect(service.findAccessibleTenantsForActor).toHaveBeenCalledWith({
      role: UserRole.ADMIN,
      organizationIds: [5, 6],
    });
  });

  it('возвращает управляемые сотруднику организации', async () => {
    const tenants = [
      {
        id: 5,
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
        isActive: true,
      },
    ];
    service.findManageableTenantsForActor.mockResolvedValue(tenants);

    await expect(
      controller.getManageableTenants({
        user: {
          userId: 10,
          role: UserRole.ADMIN,
          primaryTenantId: 5,
          organizationIds: [5, 6],
        },
      }),
    ).resolves.toEqual(tenants);
    expect(service.findManageableTenantsForActor).toHaveBeenCalledWith({
      role: UserRole.ADMIN,
      organizationIds: [5, 6],
    });
  });

  it('возвращает management-view организации', async () => {
    const managementView = {
      tenant: {
        id: 5,
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
      },
      categories: [],
      products: [],
    };
    service.findManagementViewByTenantId.mockResolvedValue(managementView);

    await expect(
      controller.getManagementView(5, {
        user: {
          userId: 10,
          role: UserRole.MODERATOR,
          primaryTenantId: 5,
          organizationIds: [5, 6],
        },
      }),
    ).resolves.toEqual(managementView);
    expect(service.findManagementViewByTenantId).toHaveBeenCalledWith(5, {
      role: UserRole.MODERATOR,
      organizationIds: [5, 6],
    });
  });

  it('создает организацию', async () => {
    const tenant = createTenantFixture({ id: 3, name: 'Flowza Cafe' });
    service.createTenant.mockResolvedValue(tenant);

    await expect(
      controller.createTenant({
        name: 'Flowza Cafe',
        slug: 'flowza-cafe',
        description: 'Кафе',
        timezone: 'Europe/Moscow',
      }),
    ).resolves.toEqual(tenant);
    expect(service.createTenant).toHaveBeenCalledTimes(1);
  });

  it('редактирует организацию с учетом контекста пользователя', async () => {
    const tenant = createTenantFixture({ id: 5, name: 'Updated Tenant' });
    service.updateTenant.mockResolvedValue(tenant);

    await expect(
      controller.updateTenant(
        5,
        {
          user: {
            userId: 10,
            role: UserRole.ADMIN,
            primaryTenantId: 5,
            organizationIds: [5, 6],
          },
        },
        { name: 'Updated Tenant' },
      ),
    ).resolves.toEqual(tenant);
    expect(service.updateTenant).toHaveBeenCalledWith(
      5,
      { role: UserRole.ADMIN, organizationIds: [5, 6] },
      { name: 'Updated Tenant' },
    );
  });

  it('удаляет организацию', async () => {
    service.removeTenant.mockResolvedValue(createTenantFixture({ id: 7 }));

    await expect(controller.removeTenant(7)).resolves.toEqual(
      createTenantFixture({ id: 7 }),
    );
    expect(service.removeTenant).toHaveBeenCalledWith(7);
  });
});
