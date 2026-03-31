import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { CategoriesService } from './categories.service';

describe('Сервис категорий', () => {
  const categoryFindManyMock = jest.fn();
  const categoryCreateMock = jest.fn();
  const categoryFindUniqueMock = jest.fn();
  const categoryUpdateMock = jest.fn();

  const prisma = {
    category: {
      findMany: categoryFindManyMock,
      create: categoryCreateMock,
      findUnique: categoryFindUniqueMock,
      update: categoryUpdateMock,
    },
  } as unknown as PrismaService;

  const tenantAccessService = {
    assertCanManageOrganization: jest.fn(),
  } as unknown as TenantAccessService;

  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantAccessService.assertCanManageOrganization = jest.fn() as never;
    service = new CategoriesService(prisma, tenantAccessService);
  });

  it('возвращает категории организации', async () => {
    categoryFindManyMock.mockResolvedValue([{ id: 1, name: 'Пицца' }]);

    await expect(
      service.findAll(
        { role: UserRole.ADMIN, organizationIds: [10] },
        10,
      ),
    ).resolves.toEqual([{ id: 1, name: 'Пицца' }]);
  });

  it('создает категорию в доступной организации', async () => {
    categoryCreateMock.mockResolvedValue({ id: 1, name: 'Пицца' });

    await expect(
      service.create(
        { role: UserRole.ADMIN, organizationIds: [10] },
        {
          tenantId: 10,
          name: 'Пицца',
          description: 'Горячая пицца',
          sortOrder: 1,
        },
      ),
    ).resolves.toEqual({ id: 1, name: 'Пицца' });
  });

  it('запрещает создавать категорию в чужой организации', async () => {
    tenantAccessService.assertCanManageOrganization = jest.fn(() => {
      throw new ForbiddenException('Недостаточно прав');
    }) as never;

    await expect(
      service.create(
        { role: UserRole.ADMIN, organizationIds: [10] },
        {
          tenantId: 20,
          name: 'Пицца',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('обновляет существующую категорию', async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: 1, tenantId: 10 });
    categoryUpdateMock.mockResolvedValue({ id: 1, name: 'Обновлено' });

    await expect(
      service.update(
        { role: UserRole.ADMIN, organizationIds: [10] },
        1,
        { name: 'Обновлено' },
      ),
    ).resolves.toEqual({ id: 1, name: 'Обновлено' });
  });

  it('возвращает ошибку при обновлении несуществующей категории', async () => {
    categoryFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.update(
        { role: UserRole.ADMIN, organizationIds: [10] },
        1,
        { name: 'Обновлено' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('деактивирует категорию вместо физического удаления', async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: 1, tenantId: 10 });
    categoryUpdateMock.mockResolvedValue({ id: 1, isActive: false });

    await expect(
      service.remove(
        { role: UserRole.MODERATOR, organizationIds: [10] },
        1,
      ),
    ).resolves.toEqual({ id: 1, isActive: false });
    expect(categoryUpdateMock).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: false },
    });
  });
});
