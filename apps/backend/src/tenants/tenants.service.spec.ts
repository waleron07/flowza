import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantAccessService } from './tenant-access.service';

describe('Сервис организаций', () => {
  const tenantFindManyMock = jest.fn();
  const tenantCreateMock = jest.fn();
  const tenantFindUniqueMock = jest.fn();
  const tenantUpdateMock = jest.fn();
  const tenantDeleteMock = jest.fn();

  const prisma = {
    tenant: {
      findMany: tenantFindManyMock,
      create: tenantCreateMock,
      findUnique: tenantFindUniqueMock,
      update: tenantUpdateMock,
      delete: tenantDeleteMock,
    },
  } as unknown as PrismaService;

  const tenantAccessService = {
    normalizeOrganizationIds: jest.fn((organizationIds?: number[]) =>
      [...new Set(organizationIds ?? [])].sort((left, right) => left - right),
    ),
    assertCanManageOrganization: jest.fn(),
  } as unknown as TenantAccessService;

  let service: TenantsService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantAccessService.normalizeOrganizationIds = jest.fn(
      (organizationIds?: number[]) =>
        [...new Set(organizationIds ?? [])].sort((left, right) => left - right),
    ) as never;
    tenantAccessService.assertCanManageOrganization = jest.fn() as never;
    service = new TenantsService(prisma, tenantAccessService);
  });

  it('возвращает список активных организаций', async () => {
    tenantFindManyMock.mockResolvedValue([{ id: 1, name: 'Roma Pizza' }]);

    await expect(service.findActiveTenants()).resolves.toEqual([
      { id: 1, name: 'Roma Pizza' },
    ]);
  });

  it('создает организацию', async () => {
    tenantCreateMock.mockResolvedValue({ id: 1, name: 'Roma Pizza' });

    await expect(
      service.createTenant({
        name: 'Roma Pizza',
        slug: 'roma-pizza',
        description: 'Итальянская кухня',
        subscription: '2026-12-31T00:00:00.000Z',
      }),
    ).resolves.toEqual({ id: 1, name: 'Roma Pizza' });
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
    expect(tenantAccessService.assertCanManageOrganization).toHaveBeenCalledWith(
      { role: UserRole.ADMIN, organizationIds: [10, 20] },
      10,
    );
  });

  it('запрещает admin редактировать недоступную организацию', async () => {
    tenantAccessService.assertCanManageOrganization = jest.fn(() => {
      throw new ForbiddenException('Недостаточно прав для редактирования этой организации');
    }) as never;

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
        },
      ),
    ).resolves.toEqual({ id: 10, isActive: false });
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
