import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

describe('Контроллер организаций', () => {
  let controller: TenantsController;
  let service: { findActiveTenants: ReturnType<typeof jest.fn> };

  beforeEach(async () => {
    service = {
      findActiveTenants: jest.fn(),
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
});
