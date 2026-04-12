import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

function createServiceMock() {
  return {
    create: jest.fn<
      ReturnType<OrdersService['create']>,
      Parameters<OrdersService['create']>
    >(),
    findMine: jest.fn<
      ReturnType<OrdersService['findMine']>,
      Parameters<OrdersService['findMine']>
    >(),
    findByTenant: jest.fn<
      ReturnType<OrdersService['findByTenant']>,
      Parameters<OrdersService['findByTenant']>
    >(),
    findQueue: jest.fn<
      ReturnType<OrdersService['findQueue']>,
      Parameters<OrdersService['findQueue']>
    >(),
    findComments: jest.fn<
      ReturnType<OrdersService['findComments']>,
      Parameters<OrdersService['findComments']>
    >(),
    updateStatus: jest.fn<
      ReturnType<OrdersService['updateStatus']>,
      Parameters<OrdersService['updateStatus']>
    >(),
    updateComment: jest.fn<
      ReturnType<OrdersService['updateComment']>,
      Parameters<OrdersService['updateComment']>
    >(),
  };
}

describe('Контроллер заказов', () => {
  let controller: OrdersController;
  let service: ReturnType<typeof createServiceMock>;

  beforeEach(async () => {
    service = createServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('создает заказ для текущего пользователя', async () => {
    service.create.mockResolvedValue({
      id: 25,
      orderNumber: 'FD-2026-000025',
      tenantId: 10,
      tenantName: 'Flowza Cafe',
      tenantSlug: 'flowza-cafe',
      status: 'NEW',
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      currency: 'RUB',
      deliveryAddress: 'Москва',
      staffComment: null,
      subtotal: 1170,
      deliveryFee: 199,
      discountAmount: 0,
      finalAmount: 1369,
      createdAt: new Date('2026-04-12T09:00:00.000Z'),
      items: [],
    });

    await expect(
      controller.create(
        {
          user: {
            userId: 5,
            primaryTenantId: null,
            organizationIds: [],
            role: 'user' as never,
          },
        },
        {
          tenantId: 10,
          deliveryAddress: 'Москва',
          paymentMethod: PaymentMethod.CASH,
          items: [{ productId: 7, quantity: 1 }],
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({ orderNumber: 'FD-2026-000025' }),
    );
    expect(service.create).toHaveBeenCalledWith(5, {
      tenantId: 10,
      deliveryAddress: 'Москва',
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 7, quantity: 1 }],
    });
  });

  it('возвращает заказы текущего пользователя', async () => {
    service.findMine.mockResolvedValue([
      {
        id: 25,
        orderNumber: 'FD-2026-000025',
        tenantId: 10,
        tenantName: 'Flowza Cafe',
        tenantSlug: 'flowza-cafe',
        status: 'NEW',
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        currency: 'RUB',
        deliveryAddress: 'Москва',
        staffComment: null,
        subtotal: 1170,
        deliveryFee: 199,
        discountAmount: 0,
        finalAmount: 1369,
        createdAt: new Date('2026-04-12T09:00:00.000Z'),
        items: [],
      },
    ]);

    await expect(
      controller.findMine({
        user: {
          userId: 5,
          primaryTenantId: null,
          organizationIds: [],
          role: 'user' as never,
        },
      }),
    ).resolves.toEqual([
      expect.objectContaining({ tenantSlug: 'flowza-cafe' }),
    ]);
    expect(service.findMine).toHaveBeenCalledWith(5, undefined);
  });

  it('передает tenantId при фильтрации заказов по организации', async () => {
    service.findMine.mockResolvedValue([]);

    await expect(
      controller.findMine(
        {
          user: {
            userId: 5,
            primaryTenantId: null,
            organizationIds: [],
            role: 'user' as never,
          },
        },
        '10',
      ),
    ).resolves.toEqual([]);
    expect(service.findMine).toHaveBeenCalledWith(5, 10);
  });

  it('возвращает список заказов организации для staff-пользователя', async () => {
    service.findByTenant.mockResolvedValue([
      {
        id: 30,
        orderNumber: 'FD-2026-000030',
        tenantId: 10,
        tenantName: 'Flowza Cafe',
        tenantSlug: 'flowza-cafe',
        status: 'NEW',
        paymentMethod: 'CARD',
        paymentStatus: 'PENDING',
        currency: 'RUB',
        deliveryAddress: 'Москва',
        staffComment: null,
        subtotal: 900,
        deliveryFee: 199,
        discountAmount: 0,
        finalAmount: 1099,
        createdAt: new Date('2026-04-12T10:00:00.000Z'),
        items: [],
      },
    ]);

    await expect(
      controller.findByTenant(
        {
          user: {
            userId: 11,
            primaryTenantId: 10,
            organizationIds: [10, 12],
            role: 'admin' as never,
          },
        },
        '10',
      ),
    ).resolves.toEqual([
      expect.objectContaining({ orderNumber: 'FD-2026-000030' }),
    ]);
    expect(service.findByTenant).toHaveBeenCalledWith(
      {
        role: 'admin',
        organizationIds: [10, 12],
      },
      10,
    );
  });

  it('обновляет статус заказа для staff-пользователя', async () => {
    service.updateStatus.mockResolvedValue({
      id: 30,
      orderNumber: 'FD-2026-000030',
      tenantId: 10,
      tenantName: 'Flowza Cafe',
      tenantSlug: 'flowza-cafe',
      status: 'CONFIRMED',
      paymentMethod: 'CARD',
      paymentStatus: 'PENDING',
      currency: 'RUB',
      deliveryAddress: 'Москва',
      staffComment: null,
      subtotal: 900,
      deliveryFee: 199,
      discountAmount: 0,
      finalAmount: 1099,
      createdAt: new Date('2026-04-12T10:00:00.000Z'),
      items: [],
    });

    await expect(
      controller.updateStatus(
        {
          user: {
            userId: 11,
            primaryTenantId: 10,
            organizationIds: [10, 12],
            role: 'operator' as never,
          },
        },
        30,
        { status: OrderStatus.CONFIRMED },
      ),
    ).resolves.toEqual(expect.objectContaining({ status: 'CONFIRMED' }));
    expect(service.updateStatus).toHaveBeenCalledWith(
      {
        role: 'operator',
        organizationIds: [10, 12],
      },
      30,
      OrderStatus.CONFIRMED,
    );
  });

  it('возвращает историю комментариев к заказу для staff-пользователя', async () => {
    service.findComments.mockResolvedValue([
      {
        id: 1,
        comment: 'Позвонить клиенту перед отправкой',
        createdAt: new Date('2026-04-12T10:05:00.000Z'),
        author: {
          id: 11,
          login: 'operator.flowza',
          email: 'operator@flowza.dev',
          role: 'operator',
        },
      },
    ]);

    await expect(
      controller.findComments(
        {
          user: {
            userId: 11,
            primaryTenantId: 10,
            organizationIds: [10, 12],
            role: 'operator' as never,
          },
        },
        30,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        comment: 'Позвонить клиенту перед отправкой',
      }),
    ]);
    expect(service.findComments).toHaveBeenCalledWith(
      {
        role: 'operator',
        organizationIds: [10, 12],
      },
      30,
    );
  });

  it('возвращает очередь заказов организации с фильтром по статусу', async () => {
    service.findQueue.mockResolvedValue([]);

    await expect(
      controller.findQueue(
        {
          user: {
            userId: 11,
            primaryTenantId: 10,
            organizationIds: [10, 12],
            role: 'operator' as never,
          },
        },
        {
          tenantId: '10',
          status: 'NEW',
        },
      ),
    ).resolves.toEqual([]);
    expect(service.findQueue).toHaveBeenCalledWith(
      {
        role: 'operator',
        organizationIds: [10, 12],
      },
      10,
      {
        status: OrderStatus.NEW,
        paymentMethod: undefined,
        paymentStatus: undefined,
        search: undefined,
      },
    );
  });

  it('передает расширенные фильтры очереди заказов', async () => {
    service.findQueue.mockResolvedValue([]);

    await expect(
      controller.findQueue(
        {
          user: {
            userId: 11,
            primaryTenantId: 10,
            organizationIds: [10, 12],
            role: 'operator' as never,
          },
        },
        {
          tenantId: '10',
          status: 'CONFIRMED',
          paymentMethod: 'CARD',
          paymentStatus: 'PENDING',
          search: ' FD-2026-000030 ',
        },
      ),
    ).resolves.toEqual([]);
    expect(service.findQueue).toHaveBeenCalledWith(
      {
        role: 'operator',
        organizationIds: [10, 12],
      },
      10,
      {
        status: OrderStatus.CONFIRMED,
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: PaymentStatus.PENDING,
        search: 'FD-2026-000030',
      },
    );
  });

  it('обновляет комментарий к заказу для staff-пользователя', async () => {
    service.updateComment.mockResolvedValue({
      id: 30,
      orderNumber: 'FD-2026-000030',
      tenantId: 10,
      tenantName: 'Flowza Cafe',
      tenantSlug: 'flowza-cafe',
      status: 'CONFIRMED',
      paymentMethod: 'CARD',
      paymentStatus: 'PENDING',
      currency: 'RUB',
      deliveryAddress: 'Москва',
      staffComment: 'Позвонить клиенту за 10 минут',
      subtotal: 900,
      deliveryFee: 199,
      discountAmount: 0,
      finalAmount: 1099,
      createdAt: new Date('2026-04-12T10:00:00.000Z'),
      items: [],
    });

    await expect(
      controller.updateComment(
        {
          user: {
            userId: 11,
            primaryTenantId: 10,
            organizationIds: [10, 12],
            role: 'admin' as never,
          },
        },
        30,
        { comment: 'Позвонить клиенту за 10 минут' },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        staffComment: 'Позвонить клиенту за 10 минут',
      }),
    );
    expect(service.updateComment).toHaveBeenCalledWith(
      {
        role: 'admin',
        organizationIds: [10, 12],
      },
      11,
      30,
      'Позвонить клиенту за 10 минут',
    );
  });
});
