import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { ProductsService } from './products.service';

/**
 * Unit-тесты сервиса продуктов.
 *
 * Покрывают проверку прав на организацию, валидацию категории продукта и
 * soft-delete через перевод продукта в неактивное состояние.
 */
describe('Сервис продуктов', () => {
  type ProductCreateArgs = {
    data: {
      tenantId: number;
      categoryId: number;
      price: number;
      currency: string;
    };
  };
  type ProductUpdateArgs = {
    where: { id: number };
    data: {
      name: string;
      currency: string;
    };
  };

  /** Моки Prisma-методов, через которые сервис работает с продуктами и категориями. */
  const productFindManyMock = jest.fn();
  const productCreateMock = jest.fn();
  const productFindUniqueMock = jest.fn();
  const productUpdateMock = jest.fn();
  const categoryFindUniqueMock = jest.fn();

  const prisma = {
    product: {
      findMany: productFindManyMock,
      create: productCreateMock,
      findUnique: productFindUniqueMock,
      update: productUpdateMock,
    },
    category: {
      findUnique: categoryFindUniqueMock,
    },
  } as unknown as PrismaService;

  const tenantAccessService = {
    assertCanManageOrganization: jest.fn(),
  } as unknown as TenantAccessService;

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantAccessService.assertCanManageOrganization = jest.fn() as never;
    service = new ProductsService(prisma, tenantAccessService);
  });

  it('возвращает продукты организации', async () => {
    productFindManyMock.mockResolvedValue([{ id: 1, name: 'Маргарита' }]);

    await expect(
      service.findAll({ role: UserRole.ADMIN, organizationIds: [10] }, 10),
    ).resolves.toEqual([{ id: 1, name: 'Маргарита' }]);
  });

  it('создает продукт в своей категории', async () => {
    categoryFindUniqueMock.mockResolvedValue({
      id: 5,
      tenantId: 10,
      isActive: true,
    });
    productCreateMock.mockResolvedValue({
      id: 1,
      name: 'Маргарита',
      currency: 'RUB',
    });

    await expect(
      service.create(
        { role: UserRole.ADMIN, organizationIds: [10] },
        {
          tenantId: 10,
          categoryId: 5,
          name: 'Маргарита',
          price: 500,
        },
      ),
    ).resolves.toEqual({
      id: 1,
      name: 'Маргарита',
      currency: 'RUB',
    });
    const productCreateCalls = (
      productCreateMock as jest.Mock<unknown, [ProductCreateArgs]>
    ).mock.calls;
    const createArgs = productCreateCalls[0]?.[0];
    expect(createArgs.data).toMatchObject({
      tenantId: 10,
      categoryId: 5,
      price: 500,
      currency: 'RUB',
    });
  });

  it('запрещает создавать продукт в категории другой организации', async () => {
    categoryFindUniqueMock.mockResolvedValue({
      id: 5,
      tenantId: 20,
      isActive: true,
    });

    await expect(
      service.create(
        { role: UserRole.ADMIN, organizationIds: [10] },
        {
          tenantId: 10,
          categoryId: 5,
          name: 'Маргарита',
          price: 500,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('запрещает создавать продукт в неактивной категории', async () => {
    categoryFindUniqueMock.mockResolvedValue({
      id: 5,
      tenantId: 10,
      isActive: false,
    });

    await expect(
      service.create(
        { role: UserRole.ADMIN, organizationIds: [10] },
        {
          tenantId: 10,
          categoryId: 5,
          name: 'Маргарита',
          price: 500,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('обновляет продукт', async () => {
    productFindUniqueMock.mockResolvedValue({
      id: 1,
      tenantId: 10,
      categoryId: 5,
    });
    productUpdateMock.mockResolvedValue({
      id: 1,
      name: 'Обновлено',
      currency: 'USD',
    });

    await expect(
      service.update({ role: UserRole.MODERATOR, organizationIds: [10] }, 1, {
        name: 'Обновлено',
        currency: 'USD',
      }),
    ).resolves.toEqual({ id: 1, name: 'Обновлено', currency: 'USD' });
    const productUpdateCalls = (
      productUpdateMock as jest.Mock<unknown, [ProductUpdateArgs]>
    ).mock.calls;
    const updateArgs = productUpdateCalls[0]?.[0];
    expect(updateArgs).toMatchObject({
      where: { id: 1 },
    });
    expect(updateArgs.data).toMatchObject({
      name: 'Обновлено',
      currency: 'USD',
    });
  });

  it('возвращает ошибку при обновлении несуществующего продукта', async () => {
    productFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.update({ role: UserRole.ADMIN, organizationIds: [10] }, 1, {
        name: 'Обновлено',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('запрещает привязывать продукт к категории другой организации', async () => {
    productFindUniqueMock.mockResolvedValue({
      id: 1,
      tenantId: 10,
      categoryId: 5,
    });
    categoryFindUniqueMock.mockResolvedValue({
      id: 6,
      tenantId: 20,
      isActive: true,
    });

    await expect(
      service.update({ role: UserRole.ADMIN, organizationIds: [10] }, 1, {
        categoryId: 6,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('деактивирует продукт вместо физического удаления', async () => {
    productFindUniqueMock.mockResolvedValue({
      id: 1,
      tenantId: 10,
    });
    productUpdateMock.mockResolvedValue({ id: 1, isActive: false });

    await expect(
      service.remove({ role: UserRole.MODERATOR, organizationIds: [10] }, 1),
    ).resolves.toEqual({ id: 1, isActive: false });
  });

  it('пробрасывает запрет доступа к чужой организации', async () => {
    tenantAccessService.assertCanManageOrganization = jest.fn(() => {
      throw new ForbiddenException('Недостаточно прав');
    }) as never;

    await expect(
      service.findAll({ role: UserRole.ADMIN, organizationIds: [10] }, 20),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
