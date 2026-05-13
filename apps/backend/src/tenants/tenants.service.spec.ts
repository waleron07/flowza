import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantAccessService } from './tenant-access.service';

/**
 * Unit-тесты сервиса организаций.
 *
 * Покрывают публичные и админские выборки, создание/обновление организаций и
 * ограничения доступа для staff-ролей.
 */
describe('Сервис организаций', () => {
  /** Моки Prisma-методов, через которые сервис работает с организациями и меню. */
  const tenantFindManyMock = jest.fn();
  const tenantCreateMock = jest.fn();
  const tenantFindFirstMock = jest.fn();
  const tenantFindUniqueMock = jest.fn();
  const tenantUpdateMock = jest.fn();
  const tenantDeleteMock = jest.fn();
  const userFindUniqueMock = jest.fn();
  const userUpdateMock = jest.fn();
  const userTenantAccessCreateMock = jest.fn();
  const transactionMock = jest.fn();
  const categoryFindManyMock = jest.fn();
  const productFindManyMock = jest.fn();
  const normalizeOrganizationIdsMock = jest.fn((organizationIds?: number[]) =>
    [...new Set(organizationIds ?? [])].sort((left, right) => left - right),
  );
  const assertCanManageOrganizationMock = jest.fn();

  const prisma = {
    tenant: {
      findMany: tenantFindManyMock,
      create: tenantCreateMock,
      findFirst: tenantFindFirstMock,
      findUnique: tenantFindUniqueMock,
      update: tenantUpdateMock,
      delete: tenantDeleteMock,
    },
    category: {
      findMany: categoryFindManyMock,
    },
    product: {
      findMany: productFindManyMock,
    },
    user: {
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
    },
    userTenantAccess: {
      create: userTenantAccessCreateMock,
    },
    $transaction: transactionMock,
  } as unknown as PrismaService;

  const tenantAccessService = {
    normalizeOrganizationIds: normalizeOrganizationIdsMock,
    assertCanManageOrganization: assertCanManageOrganizationMock,
  } as unknown as TenantAccessService;

  let service: TenantsService;

  beforeEach(() => {
    tenantFindManyMock.mockReset();
    tenantCreateMock.mockReset();
    tenantFindFirstMock.mockReset();
    tenantFindUniqueMock.mockReset();
    tenantUpdateMock.mockReset();
    tenantDeleteMock.mockReset();
    userFindUniqueMock.mockReset();
    userUpdateMock.mockReset();
    userTenantAccessCreateMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockImplementation((callback) => callback(prisma));
    categoryFindManyMock.mockReset();
    productFindManyMock.mockReset();
    normalizeOrganizationIdsMock.mockReset();
    normalizeOrganizationIdsMock.mockImplementation(
      (organizationIds?: number[]) =>
        [...new Set(organizationIds ?? [])].sort((left, right) => left - right),
    );
    assertCanManageOrganizationMock.mockReset();
    service = new TenantsService(prisma, tenantAccessService);
  });

  it('возвращает список активных организаций', async () => {
    tenantFindManyMock.mockResolvedValue([{ id: 1, name: 'Roma Pizza' }]);

    await expect(service.findActiveTenants()).resolves.toEqual([
      { id: 1, name: 'Roma Pizza' },
    ]);
  });

  it('возвращает публичный каталог активной организации по slug', async () => {
    tenantFindFirstMock.mockResolvedValue({
      id: 10,
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
    });
    categoryFindManyMock.mockResolvedValue([
      {
        id: 5,
        name: 'Пицца',
        description: 'Основное меню',
        imageUrl: 'https://example.com/category.jpg',
        sortOrder: 1,
      },
    ]);
    productFindManyMock.mockResolvedValue([
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
    ]);

    await expect(
      service.findPublicCatalogBySlug('roma-pizza'),
    ).resolves.toEqual({
      tenant: {
        id: 10,
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
    });
    expect(tenantFindFirstMock).toHaveBeenCalledWith({
      where: { slug: 'roma-pizza', isActive: true },
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

  it('возвращает ошибку для каталога несуществующей организации', async () => {
    tenantFindFirstMock.mockResolvedValue(null);

    await expect(
      service.findPublicCatalogBySlug('missing-tenant'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('создает организацию', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 15,
      role: UserRole.ADMIN,
      isActive: true,
      primaryTenantId: null,
    });
    tenantCreateMock.mockResolvedValue({ id: 1, name: 'Roma Pizza' });
    userTenantAccessCreateMock.mockResolvedValue({ userId: 15, tenantId: 1 });
    userUpdateMock.mockResolvedValue({ id: 15 });

    await expect(
      service.createTenant({
        adminUserId: 15,
        name: 'Roma Pizza',
        slug: 'roma-pizza',
        description: 'Итальянская кухня',
        subscription: '2026-12-31T00:00:00.000Z',
        timezone: 'Europe/Moscow',
        deliveryFee: '199',
        minOrderAmount: '1000',
      }),
    ).resolves.toEqual({ id: 1, name: 'Roma Pizza' });
    const createTenantMockState = tenantCreateMock.mock as {
      lastCall?: [
        {
          data?: {
            timezone?: string;
            deliveryFee?: string;
            minOrderAmount?: string;
          };
        },
      ];
    };
    const createTenantArg = createTenantMockState.lastCall?.[0];
    expect(createTenantArg).toMatchObject({
      data: {
        timezone: 'Europe/Moscow',
        deliveryFee: '199',
        minOrderAmount: '1000',
      },
    });
    expect(userTenantAccessCreateMock).toHaveBeenCalledWith({
      data: { userId: 15, tenantId: 1 },
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 15 },
      data: { primaryTenantId: 1 },
    });
  });

  it('не создает организацию без активного admin-пользователя', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 15,
      role: UserRole.OPERATOR,
      isActive: true,
      primaryTenantId: null,
    });

    await expect(
      service.createTenant({
        adminUserId: 15,
        name: 'Roma Pizza',
        slug: 'roma-pizza',
        description: 'Итальянская кухня',
        subscription: '2026-12-31T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tenantCreateMock).not.toHaveBeenCalled();
  });

  it('возвращает доступные организации сотрудника', async () => {
    tenantFindManyMock.mockResolvedValue([{ id: 10, name: 'Roma Pizza' }]);

    await expect(
      service.findAccessibleTenantsForActor({
        role: UserRole.ADMIN,
        organizationIds: [20, 10],
      }),
    ).resolves.toEqual([{ id: 10, name: 'Roma Pizza' }]);
  });

  it('возвращает все активные организации для superAdmin', async () => {
    tenantFindManyMock.mockResolvedValue([{ id: 1, name: 'Roma Pizza' }]);

    await expect(
      service.findAccessibleTenantsForActor({
        role: UserRole.SUPER_ADMIN,
        organizationIds: [],
      }),
    ).resolves.toEqual([{ id: 1, name: 'Roma Pizza' }]);
  });

  it('возвращает управляемые организации для admin', async () => {
    tenantFindManyMock.mockResolvedValue([{ id: 10, name: 'Roma Pizza' }]);

    await expect(
      service.findManageableTenantsForActor({
        role: UserRole.ADMIN,
        organizationIds: [20, 10],
      }),
    ).resolves.toEqual([{ id: 10, name: 'Roma Pizza' }]);
    expect(tenantFindManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: [10, 20] },
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

  it('запрещает moderator получать список управляемых организаций', async () => {
    await expect(
      service.findManageableTenantsForActor({
        role: UserRole.MODERATOR,
        organizationIds: [10],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tenantFindManyMock).not.toHaveBeenCalled();
  });

  it('возвращает management-view для доступной организации', async () => {
    tenantFindUniqueMock.mockResolvedValue({
      id: 10,
      name: 'Roma Pizza',
      slug: 'roma-pizza',
      description: 'Итальянская пицца',
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
    categoryFindManyMock.mockResolvedValue([{ id: 1, name: 'Пицца' }]);
    productFindManyMock.mockResolvedValue([{ id: 2, name: 'Маргарита' }]);

    await expect(
      service.findManagementViewByTenantId(10, {
        role: UserRole.MODERATOR,
        organizationIds: [10],
      }),
    ).resolves.toEqual({
      tenant: {
        id: 10,
        name: 'Roma Pizza',
        slug: 'roma-pizza',
        description: 'Итальянская пицца',
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
      categories: [{ id: 1, name: 'Пицца' }],
      products: [{ id: 2, name: 'Маргарита' }],
    });
    expect(assertCanManageOrganizationMock).toHaveBeenCalledWith(
      { role: UserRole.MODERATOR, organizationIds: [10] },
      10,
    );
  });

  it('возвращает ошибку при запросе management-view несуществующей организации', async () => {
    tenantFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.findManagementViewByTenantId(10, {
        role: UserRole.SUPER_ADMIN,
        organizationIds: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('разрешает admin редактировать доступную организацию', async () => {
    tenantFindUniqueMock.mockResolvedValue({ id: 10 });
    tenantUpdateMock.mockResolvedValue({ id: 10, name: 'Updated' });

    await expect(
      service.updateTenant(
        10,
        { role: UserRole.ADMIN, organizationIds: [10, 20] },
        { name: 'Updated' },
      ),
    ).resolves.toEqual({ id: 10, name: 'Updated' });
    expect(assertCanManageOrganizationMock).toHaveBeenCalledWith(
      { role: UserRole.ADMIN, organizationIds: [10, 20] },
      10,
    );
  });

  it('запрещает admin редактировать недоступную организацию', async () => {
    assertCanManageOrganizationMock.mockImplementation(() => {
      throw new ForbiddenException(
        'Недостаточно прав для редактирования этой организации',
      );
    });

    await expect(
      service.updateTenant(
        99,
        { role: UserRole.ADMIN, organizationIds: [10, 20] },
        { name: 'Updated' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('запрещает admin менять isActive организации', async () => {
    await expect(
      service.updateTenant(
        10,
        { role: UserRole.ADMIN, organizationIds: [10, 20] },
        { isActive: false },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('запрещает admin менять subscription организации', async () => {
    await expect(
      service.updateTenant(
        10,
        { role: UserRole.ADMIN, organizationIds: [10, 20] },
        { subscription: '2026-12-31T00:00:00.000Z' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('возвращает ошибку при редактировании несуществующей организации', async () => {
    tenantFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.updateTenant(
        10,
        { role: UserRole.SUPER_ADMIN, organizationIds: [] },
        { name: 'Updated' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('разрешает superAdmin менять isActive и subscription организации', async () => {
    tenantFindUniqueMock.mockResolvedValue({ id: 10 });
    tenantUpdateMock.mockResolvedValue({ id: 10, isActive: false });

    await expect(
      service.updateTenant(
        10,
        { role: UserRole.SUPER_ADMIN, organizationIds: [] },
        {
          isActive: false,
          subscription: '2026-12-31T00:00:00.000Z',
          timezone: 'Europe/Moscow',
          workingHours: { from: '08:00', to: '22:00' },
          deliveryFee: '250',
        },
      ),
    ).resolves.toEqual({ id: 10, isActive: false });
    const updateTenantMockState = tenantUpdateMock.mock as {
      lastCall?: [
        {
          where?: { id?: number };
          data?: {
            timezone?: string;
            deliveryFee?: string;
            workingHours?: { from: string; to: string };
            isActive?: boolean;
          };
        },
      ];
    };
    const updateTenantArg = updateTenantMockState.lastCall?.[0];
    expect(updateTenantArg).toMatchObject({
      where: { id: 10 },
      data: {
        timezone: 'Europe/Moscow',
        workingHours: { from: '08:00', to: '22:00' },
        deliveryFee: '250',
        isActive: false,
      },
    });
  });

  it('удаляет существующую организацию', async () => {
    tenantFindUniqueMock.mockResolvedValue({ id: 10 });
    tenantDeleteMock.mockResolvedValue({ id: 10 });

    await expect(service.removeTenant(10)).resolves.toEqual({ id: 10 });
  });

  it('возвращает ошибку при удалении несуществующей организации', async () => {
    tenantFindUniqueMock.mockResolvedValue(null);

    await expect(service.removeTenant(10)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
