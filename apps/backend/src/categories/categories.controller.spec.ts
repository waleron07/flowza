import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('Контроллер категорий', () => {
  let controller: CategoriesController;
  let service: {
    findAll: jest.Mock<Promise<Array<{ id: number; name: string }>>, [ { role: UserRole; organizationIds: number[] }, number ]>;
    create: jest.Mock<Promise<{ id: number; name: string }>, [ { role: UserRole; organizationIds: number[] }, CreateCategoryDto ]>;
    update: jest.Mock<Promise<{ id: number; name: string }>, [ { role: UserRole; organizationIds: number[] }, number, UpdateCategoryDto ]>;
    remove: jest.Mock<Promise<{ id: number; isActive: boolean }>, [ { role: UserRole; organizationIds: number[] }, number ]>;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('возвращает категории организации', async () => {
    service.findAll.mockResolvedValue([{ id: 1, name: 'Пицца' }]);

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
    ).resolves.toEqual([{ id: 1, name: 'Пицца' }]);
  });

  it('создает категорию', async () => {
    service.create.mockResolvedValue({ id: 1, name: 'Пицца' });

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
          name: 'Пицца',
        },
      ),
    ).resolves.toEqual({ id: 1, name: 'Пицца' });
  });

  it('обновляет категорию', async () => {
    service.update.mockResolvedValue({ id: 1, name: 'Обновлено' });

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
        { name: 'Обновлено' },
      ),
    ).resolves.toEqual({ id: 1, name: 'Обновлено' });
  });

  it('деактивирует категорию', async () => {
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
