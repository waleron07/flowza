import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { OrdersService } from './orders.service';

describe('Сервис заказов', () => {
  const tenantFindFirstMock = jest.fn();
  const productFindManyMock = jest.fn();
  const orderCreateMock = jest.fn();
  const orderUpdateMock = jest.fn();
  const orderFindManyMock = jest.fn();
  const orderFindUniqueMock = jest.fn();
  const orderCommentFindManyMock = jest.fn();
  const assertCanManageOrganizationMock = jest.fn();

  const prisma = {
    tenant: {
      findFirst: tenantFindFirstMock,
    },
    product: {
      findMany: productFindManyMock,
    },
    order: {
      create: orderCreateMock,
      update: orderUpdateMock,
      findMany: orderFindManyMock,
      findUnique: orderFindUniqueMock,
    },
    orderComment: {
      findMany: orderCommentFindManyMock,
    },
  } as unknown as PrismaService;

  const tenantAccessService = {
    assertCanManageOrganization: assertCanManageOrganizationMock,
  } as unknown as TenantAccessService;

  let service: OrdersService;

  beforeEach(() => {
    tenantFindFirstMock.mockReset();
    productFindManyMock.mockReset();
    orderCreateMock.mockReset();
    orderUpdateMock.mockReset();
    orderFindManyMock.mockReset();
    orderFindUniqueMock.mockReset();
    orderCommentFindManyMock.mockReset();
    assertCanManageOrganizationMock.mockReset();
    service = new OrdersService(prisma, tenantAccessService);
  });

  it('создает заказ по активной организации и товарам', async () => {
    tenantFindFirstMock.mockResolvedValue({
      id: 10,
      name: 'Flowza Cafe',
      slug: 'flowza-cafe',
      deliveryFee: 199,
      minOrderAmount: 500,
    });
    productFindManyMock.mockResolvedValue([
      { id: 7, name: 'Маргарита', price: 520, currency: 'RUB' },
      { id: 8, name: 'Пепперони', price: 650, currency: 'RUB' },
    ]);
    orderCreateMock.mockResolvedValue({
      id: 25,
      createdAt: new Date('2026-04-12T09:00:00.000Z'),
    });
    orderUpdateMock.mockResolvedValue({
      id: 25,
      orderNumber: 'FD-2026-000025',
      tenantId: 10,
      status: 'NEW',
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      currency: 'RUB',
      deliveryAddress: 'Москва, ул. Пушкина, 10',
      subtotal: 1170,
      deliveryFee: 199,
      discountAmount: 0,
      finalAmount: 1369,
      createdAt: new Date('2026-04-12T09:00:00.000Z'),
      tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
      items: [
        {
          id: 1,
          productId: 7,
          productName: 'Маргарита',
          variantName: null,
          quantity: 1,
          unitPrice: 520,
          totalPrice: 520,
        },
        {
          id: 2,
          productId: 8,
          productName: 'Пепперони',
          variantName: null,
          quantity: 1,
          unitPrice: 650,
          totalPrice: 650,
        },
      ],
    });

    await expect(
      service.create(5, {
        tenantId: 10,
        deliveryAddress: 'Москва, ул. Пушкина, 10',
        paymentMethod: PaymentMethod.CASH,
        items: [
          { productId: 7, quantity: 1 },
          { productId: 8, quantity: 1 },
        ],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        orderNumber: 'FD-2026-000025',
        tenantName: 'Flowza Cafe',
        finalAmount: 1369,
      }),
    );
    const createCall = orderCreateMock.mock.calls as Array<
      [
        {
          data: {
            tenantId: number;
            userId: number;
            paymentMethod: PaymentMethod;
            currency: string;
            deliveryAddress: string;
            subtotal: number;
            deliveryFee: number;
            finalAmount: number;
            items: {
              create: Array<{
                productId: number;
                productName: string;
              }>;
            };
          };
          select: {
            id: boolean;
            createdAt: boolean;
          };
        },
      ]
    >;
    expect(createCall[0]?.[0]).toMatchObject({
      data: {
        tenantId: 10,
        userId: 5,
        paymentMethod: PaymentMethod.CASH,
        currency: 'RUB',
        deliveryAddress: 'Москва, ул. Пушкина, 10',
        subtotal: 1170,
        deliveryFee: 199,
        finalAmount: 1369,
        items: {
          create: [
            {
              productId: 7,
              productName: 'Маргарита',
            },
            {
              productId: 8,
              productName: 'Пепперони',
            },
          ],
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });
  });

  it('возвращает ошибку для несуществующей организации', async () => {
    tenantFindFirstMock.mockResolvedValue(null);

    await expect(
      service.create(5, {
        tenantId: 999,
        deliveryAddress: 'Москва',
        paymentMethod: PaymentMethod.CARD,
        items: [{ productId: 7, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('возвращает ошибку если минимальная сумма не набрана', async () => {
    tenantFindFirstMock.mockResolvedValue({
      id: 10,
      name: 'Flowza Cafe',
      slug: 'flowza-cafe',
      deliveryFee: 199,
      minOrderAmount: 1000,
    });
    productFindManyMock.mockResolvedValue([
      { id: 7, name: 'Маргарита', price: 520, currency: 'RUB' },
    ]);

    await expect(
      service.create(5, {
        tenantId: 10,
        deliveryAddress: 'Москва',
        paymentMethod: PaymentMethod.CARD,
        items: [{ productId: 7, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('возвращает заказы пользователя', async () => {
    orderFindManyMock.mockResolvedValue([
      {
        id: 25,
        orderNumber: 'FD-2026-000025',
        tenantId: 10,
        status: 'NEW',
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        currency: 'RUB',
        deliveryAddress: 'Москва',
        subtotal: 1170,
        deliveryFee: 199,
        discountAmount: 0,
        finalAmount: 1369,
        createdAt: new Date('2026-04-12T09:00:00.000Z'),
        tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
        items: [
          {
            id: 1,
            productId: 7,
            productName: 'Маргарита',
            variantName: null,
            quantity: 1,
            unitPrice: 520,
            totalPrice: 520,
          },
        ],
      },
    ]);

    await expect(service.findMine(5)).resolves.toEqual([
      expect.objectContaining({
        orderNumber: 'FD-2026-000025',
        tenantSlug: 'flowza-cafe',
      }),
    ]);
    const findMineCall = orderFindManyMock.mock.calls as Array<
      [
        {
          where: { userId: number; tenantId?: number };
          select: object;
          orderBy: Array<{ createdAt: 'desc' }>;
        },
      ]
    >;
    expect(findMineCall[0]?.[0]).toMatchObject({
      where: { userId: 5 },
      orderBy: [{ createdAt: 'desc' }],
    });
  });

  it('фильтрует историю заказов пользователя по организации', async () => {
    orderFindManyMock.mockResolvedValue([]);

    await expect(service.findMine(5, 10)).resolves.toEqual([]);
    const findMineByTenantCall = orderFindManyMock.mock.calls as Array<
      [
        {
          where: { userId: number; tenantId?: number };
          select: object;
          orderBy: Array<{ createdAt: 'desc' }>;
        },
      ]
    >;
    expect(findMineByTenantCall[0]?.[0]).toMatchObject({
      where: { userId: 5, tenantId: 10 },
      orderBy: [{ createdAt: 'desc' }],
    });
  });

  it('возвращает список заказов организации для staff с доступом', async () => {
    orderFindManyMock.mockResolvedValue([
      {
        id: 30,
        orderNumber: 'FD-2026-000030',
        tenantId: 10,
        status: 'NEW',
        paymentMethod: 'CARD',
        paymentStatus: 'PENDING',
        currency: 'RUB',
        deliveryAddress: 'Москва',
        subtotal: 900,
        deliveryFee: 199,
        discountAmount: 0,
        finalAmount: 1099,
        createdAt: new Date('2026-04-12T10:00:00.000Z'),
        tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
        items: [],
      },
    ]);

    await expect(
      service.findByTenant(
        {
          role: UserRole.ADMIN,
          organizationIds: [10, 12],
        },
        10,
      ),
    ).resolves.toEqual([
      expect.objectContaining({ tenantSlug: 'flowza-cafe' }),
    ]);
    expect(assertCanManageOrganizationMock).toHaveBeenCalledWith(
      {
        role: UserRole.ADMIN,
        organizationIds: [10, 12],
      },
      10,
    );
    const findByTenantCall = orderFindManyMock.mock.calls as Array<
      [
        {
          where: {
            tenantId: number;
            status?: OrderStatus | { in: OrderStatus[] };
          };
          select: object;
          orderBy: Array<{ createdAt: 'desc' | 'asc' }>;
        },
      ]
    >;
    expect(findByTenantCall[0]?.[0]).toMatchObject({
      where: { tenantId: 10 },
      orderBy: [{ createdAt: 'desc' }],
    });
  });

  it('возвращает очередь заказов организации по умолчанию только для активных статусов', async () => {
    orderFindManyMock.mockResolvedValue([]);

    await expect(
      service.findQueue(
        {
          role: UserRole.OPERATOR,
          organizationIds: [10],
        },
        10,
        {},
      ),
    ).resolves.toEqual([]);
    const queueCall = orderFindManyMock.mock.calls as Array<
      [
        {
          where: {
            tenantId: number;
            status?: OrderStatus | { in: OrderStatus[] };
          };
          select: object;
          orderBy: Array<{ createdAt: 'asc' }>;
        },
      ]
    >;
    expect(queueCall[0]?.[0]).toMatchObject({
      where: {
        tenantId: 10,
        status: {
          in: [
            OrderStatus.NEW,
            OrderStatus.CONFIRMED,
            OrderStatus.COOKING,
            OrderStatus.READY,
            OrderStatus.DELIVERING,
          ],
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  });

  it('фильтрует очередь заказов организации по статусу', async () => {
    orderFindManyMock.mockResolvedValue([]);

    await expect(
      service.findQueue(
        {
          role: UserRole.ADMIN,
          organizationIds: [10],
        },
        10,
        { status: OrderStatus.NEW },
      ),
    ).resolves.toEqual([]);
    const queueByStatusCall = orderFindManyMock.mock.calls as Array<
      [
        {
          where: {
            tenantId: number;
            status?: OrderStatus | { in: OrderStatus[] };
          };
          select: object;
          orderBy: Array<{ createdAt: 'asc' }>;
        },
      ]
    >;
    expect(queueByStatusCall[0]?.[0]).toMatchObject({
      where: {
        tenantId: 10,
        status: OrderStatus.NEW,
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  });

  it('применяет расширенные фильтры очереди заказов', async () => {
    orderFindManyMock.mockResolvedValue([]);

    await expect(
      service.findQueue(
        {
          role: UserRole.ADMIN,
          organizationIds: [10],
        },
        10,
        {
          status: OrderStatus.CONFIRMED,
          paymentMethod: PaymentMethod.CARD,
          paymentStatus: PaymentStatus.PENDING,
          search: 'FD-2026-000030',
        },
      ),
    ).resolves.toEqual([]);
    const filteredQueueCall = orderFindManyMock.mock.calls as Array<
      [
        {
          where: {
            tenantId: number;
            status?: OrderStatus | { in: OrderStatus[] };
            paymentMethod?: PaymentMethod;
            paymentStatus?: PaymentStatus;
            OR?: Array<{
              orderNumber?: {
                contains: string;
                mode: 'insensitive';
              };
              deliveryAddress?: {
                contains: string;
                mode: 'insensitive';
              };
            }>;
          };
          select: object;
          orderBy: Array<{ createdAt: 'asc' }>;
        },
      ]
    >;
    expect(filteredQueueCall[0]?.[0]).toMatchObject({
      where: {
        tenantId: 10,
        status: OrderStatus.CONFIRMED,
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: PaymentStatus.PENDING,
        OR: [
          {
            orderNumber: {
              contains: 'FD-2026-000030',
              mode: 'insensitive',
            },
          },
          {
            deliveryAddress: {
              contains: 'FD-2026-000030',
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  });

  it('обновляет статус заказа по допустимому сценарию', async () => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: 30,
      tenantId: 10,
      status: OrderStatus.NEW,
    });
    orderUpdateMock.mockResolvedValue({
      id: 30,
      orderNumber: 'FD-2026-000030',
      tenantId: 10,
      status: OrderStatus.CONFIRMED,
      paymentMethod: 'CARD',
      paymentStatus: 'PENDING',
      currency: 'RUB',
      deliveryAddress: 'Москва',
      subtotal: 900,
      deliveryFee: 199,
      discountAmount: 0,
      finalAmount: 1099,
      createdAt: new Date('2026-04-12T10:00:00.000Z'),
      tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
      items: [],
    });

    await expect(
      service.updateStatus(
        {
          role: UserRole.OPERATOR,
          organizationIds: [10],
        },
        30,
        OrderStatus.CONFIRMED,
      ),
    ).resolves.toEqual(
      expect.objectContaining({ status: OrderStatus.CONFIRMED }),
    );
    expect(assertCanManageOrganizationMock).toHaveBeenCalledWith(
      {
        role: UserRole.OPERATOR,
        organizationIds: [10],
      },
      10,
    );
    const updateStatusCall = orderUpdateMock.mock.calls as Array<
      [
        {
          where: { id: number };
          data: {
            status?: OrderStatus;
            confirmedAt?: Date;
            deliveredAt?: Date;
            cancelledAt?: Date;
            staffComment?: string | null;
          };
          select: object;
        },
      ]
    >;
    expect(updateStatusCall[0]?.[0]).toMatchObject({
      where: { id: 30 },
      data: {
        status: OrderStatus.CONFIRMED,
      },
    });
    expect(updateStatusCall[0]?.[0].data.confirmedAt).toBeInstanceOf(Date);
  });

  it('возвращает историю комментариев к заказу для staff с доступом', async () => {
    orderFindUniqueMock.mockResolvedValue({
      id: 30,
      tenantId: 10,
    });
    orderCommentFindManyMock.mockResolvedValue([
      {
        id: 1,
        comment: 'Позвонить клиенту перед отправкой',
        createdAt: new Date('2026-04-12T10:05:00.000Z'),
        author: {
          id: 11,
          login: 'operator.flowza',
          email: 'operator@flowza.dev',
          role: UserRole.OPERATOR,
        },
      },
    ]);

    await expect(
      service.findComments(
        {
          role: UserRole.ADMIN,
          organizationIds: [10],
        },
        30,
      ),
    ).resolves.toEqual([
      {
        id: 1,
        comment: 'Позвонить клиенту перед отправкой',
        createdAt: new Date('2026-04-12T10:05:00.000Z'),
        author: {
          id: 11,
          login: 'operator.flowza',
          email: 'operator@flowza.dev',
          role: UserRole.OPERATOR,
        },
      },
    ]);
    expect(assertCanManageOrganizationMock).toHaveBeenCalledWith(
      {
        role: UserRole.ADMIN,
        organizationIds: [10],
      },
      10,
    );
    expect(orderCommentFindManyMock).toHaveBeenCalledWith({
      where: { orderId: 30 },
      select: {
        id: true,
        comment: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            login: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  });

  it('запрещает недопустимый переход статуса заказа', async () => {
    orderFindUniqueMock.mockResolvedValue({
      id: 30,
      tenantId: 10,
      status: OrderStatus.NEW,
    });

    await expect(
      service.updateStatus(
        {
          role: UserRole.OPERATOR,
          organizationIds: [10],
        },
        30,
        OrderStatus.READY,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('возвращает ошибку при смене статуса несуществующего заказа', async () => {
    orderFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.updateStatus(
        {
          role: UserRole.ADMIN,
          organizationIds: [10],
        },
        999,
        OrderStatus.CONFIRMED,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('обновляет комментарий к заказу для staff-пользователя', async () => {
    orderFindUniqueMock.mockResolvedValue({
      id: 30,
      tenantId: 10,
    });
    orderUpdateMock.mockResolvedValue({
      id: 30,
      orderNumber: 'FD-2026-000030',
      tenantId: 10,
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
      tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
      items: [],
    });

    await expect(
      service.updateComment(
        {
          role: UserRole.ADMIN,
          organizationIds: [10],
        },
        11,
        30,
        '  Позвонить клиенту за 10 минут  ',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        staffComment: 'Позвонить клиенту за 10 минут',
      }),
    );
    expect(assertCanManageOrganizationMock).toHaveBeenCalledWith(
      {
        role: UserRole.ADMIN,
        organizationIds: [10],
      },
      10,
    );
    const updateCommentCall = orderUpdateMock.mock.calls as Array<
      [
        {
          where: { id: number };
          data: {
            staffComment?: string | null;
            comments?: {
              create: {
                authorId: number;
                comment: string;
              };
            };
          };
          select: object;
        },
      ]
    >;
    expect(updateCommentCall[0]?.[0]).toMatchObject({
      where: { id: 30 },
      data: {
        staffComment: 'Позвонить клиенту за 10 минут',
        comments: {
          create: {
            authorId: 11,
            comment: 'Позвонить клиенту за 10 минут',
          },
        },
      },
    });
  });

  it('очищает комментарий к заказу при пустом значении', async () => {
    orderFindUniqueMock.mockResolvedValue({
      id: 30,
      tenantId: 10,
    });
    orderUpdateMock.mockResolvedValue({
      id: 30,
      orderNumber: 'FD-2026-000030',
      tenantId: 10,
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
      tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
      items: [],
    });

    await expect(
      service.updateComment(
        {
          role: UserRole.ADMIN,
          organizationIds: [10],
        },
        11,
        30,
        '   ',
      ),
    ).resolves.toEqual(expect.objectContaining({ staffComment: null }));
  });
});
