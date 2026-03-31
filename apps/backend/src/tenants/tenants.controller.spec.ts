import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

describe('Контроллер организаций', () => {
  let controller: TenantsController;
  let service: {
    findAccessibleTenantsForActor: jest.Mock<
      Promise<
        Array<{
          id: number;
          name: string;
          slug: string;
          description: string | null;
        }>
      >,
      [{ role: UserRole; organizationIds: number[] }]
    >;
    findActiveTenants: jest.Mock<
      Promise<
        Array<{
          id: number;
          name: string;
          slug: string;
          description: string | null;
        }>
      >,
      []
    >;
    createTenant: jest.Mock<
      Promise<{ id: number; name: string }>,
      [CreateTenantDto]
    >;
    updateTenant: jest.Mock<
      Promise<{ id: number; name: string }>,
      [
        number,
        { role: UserRole; organizationIds: number[] },
        UpdateTenantDto,
      ]
    >;
    removeTenant: jest.Mock<Promise<{ id: number }>, [number]>;
  };

  beforeEach(async () => {
    service = {
      findAccessibleTenantsForActor: jest.fn(),
      findActiveTenants: jest.fn(),
      createTenant: jest.fn(),
      updateTenant: jest.fn(),
      removeTenant: jest.fn(),
    };

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

  it('создает организацию', async () => {
    const tenant = { id: 3, name: 'Flowza Cafe' };
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
    const tenant = { id: 5, name: 'Updated Tenant' };
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
    service.removeTenant.mockResolvedValue({ id: 7 });

    await expect(controller.removeTenant(7)).resolves.toEqual({ id: 7 });
    expect(service.removeTenant).toHaveBeenCalledWith(7);
  });
});
