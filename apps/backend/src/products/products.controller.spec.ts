import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('Контроллер продуктов', () => {
  let controller: ProductsController;
  let service: {
    findAll: jest.Mock<
      Promise<Array<{ id: number; name: string }>>,
      [{ role: UserRole; organizationIds: number[] }, number]
    >;
    create: jest.Mock<
      Promise<{ id: number; name: string; currency?: string }>,
      [{ role: UserRole; organizationIds: number[] }, CreateProductDto]
    >;
    update: jest.Mock<
      Promise<{ id: number; name: string; currency?: string }>,
      [{ role: UserRole; organizationIds: number[] }, number, UpdateProductDto]
    >;
    remove: jest.Mock<
      Promise<{ id: number; isActive: boolean }>,
      [{ role: UserRole; organizationIds: number[] }, number]
    >;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('возвращает продукты организации', async () => {
    service.findAll.mockResolvedValue([{ id: 1, name: 'Маргарита' }]);

    await expect(
      controller.findAll(
        {
          user: {
            userId: 1,
            role: UserRole.ADMIN,
            primaryTenantId: 10,
            organizationIds: [10],
          },
        },
        10,
      ),
    ).resolves.toEqual([{ id: 1, name: 'Маргарита' }]);
  });

  it('создает продукт', async () => {
    service.create.mockResolvedValue({
      id: 1,
      name: 'Маргарита',
      currency: 'RUB',
    });

    await expect(
      controller.create(
        {
          user: {
            userId: 1,
            role: UserRole.ADMIN,
            primaryTenantId: 10,
            organizationIds: [10],
          },
        },
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
  });

  it('обновляет продукт', async () => {
    service.update.mockResolvedValue({
      id: 1,
      name: 'Обновлено',
      currency: 'USD',
    });

    await expect(
      controller.update(
        {
          user: {
            userId: 1,
            role: UserRole.MODERATOR,
            primaryTenantId: 10,
            organizationIds: [10],
          },
        },
        1,
        { name: 'Обновлено', currency: 'USD' },
      ),
    ).resolves.toEqual({
      id: 1,
      name: 'Обновлено',
      currency: 'USD',
    });
  });

  it('деактивирует продукт', async () => {
    service.remove.mockResolvedValue({ id: 1, isActive: false });

    await expect(
      controller.remove(
        {
          user: {
            userId: 1,
            role: UserRole.MODERATOR,
            primaryTenantId: 10,
            organizationIds: [10],
          },
        },
        1,
      ),
    ).resolves.toEqual({ id: 1, isActive: false });
  });
});
