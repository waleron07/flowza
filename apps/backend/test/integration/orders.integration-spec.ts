import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { PrismaService } from '../../src/database/prisma.service';
import { TenantAccessService } from '../../src/tenants/tenant-access.service';

describe('Интеграция orders', () => {
  let app: INestApplication<App>;

  const createUpdatedOrderView = (orderId: number, status: OrderStatus) => ({
    id: orderId,
    orderNumber: `FD-2026-${String(orderId).padStart(6, '0')}`,
    tenantId: 10,
    status,
    paymentMethod: PaymentMethod.CARD,
    paymentStatus: PaymentStatus.PENDING,
    currency: 'RUB',
    deliveryAddress: 'Москва',
    staffComment: null,
    subtotal: 1000,
    deliveryFee: 199,
    discountAmount: 0,
    finalAmount: 1199,
    createdAt: new Date('2026-04-12T11:00:00.000Z'),
    tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
    items: [],
  });

  const createPaymentStatusOrderView = (
    orderId: number,
    paymentStatus: PaymentStatus,
  ) => ({
    id: orderId,
    orderNumber: `FD-2026-${String(orderId).padStart(6, '0')}`,
    tenantId: 10,
    status: OrderStatus.CONFIRMED,
    paymentMethod: PaymentMethod.CARD,
    paymentStatus,
    currency: 'RUB',
    deliveryAddress: 'Москва',
    staffComment: null,
    subtotal: 1000,
    deliveryFee: 199,
    discountAmount: 0,
    finalAmount: 1199,
    createdAt: new Date('2026-04-12T11:00:00.000Z'),
    tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
    items: [],
  });

  const mockActionTransition = (
    orderId: number,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
  ) => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: orderId,
      tenantId: 10,
      status: fromStatus,
    });
    orderUpdateMock.mockResolvedValueOnce(
      createUpdatedOrderView(orderId, toStatus),
    );
  };

  const orderFindUniqueMock = jest.fn();
  const orderFindManyMock = jest.fn();
  const orderUpdateMock = jest.fn();
  const orderCommentFindManyMock = jest.fn();

  const prismaMock = {
    order: {
      findUnique: orderFindUniqueMock,
      findMany: orderFindManyMock,
      update: orderUpdateMock,
    },
    orderComment: {
      findMany: orderCommentFindManyMock,
    },
  } as unknown as PrismaService;

  const assertCanManageOrganizationMock = jest.fn();

  const tenantAccessServiceMock = {
    assertCanManageOrganization: assertCanManageOrganizationMock,
  } as unknown as TenantAccessService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(TenantAccessService)
      .useValue(tenantAccessServiceMock)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: Record<string, string | undefined>;
              user?: {
                userId: number;
                role: UserRole;
                primaryTenantId: number | null;
                organizationIds: number[];
              };
            };
          };
        }) {
          const request = context.switchToHttp().getRequest();
          const roleHeader = request.headers['x-role'];
          const orgsHeader = request.headers['x-orgs'];
          const userIdHeader = request.headers['x-user-id'];

          const role =
            (roleHeader as UserRole | undefined) ?? UserRole.OPERATOR;
          const organizationIds = String(orgsHeader ?? '10')
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0);
          const userId = Number(userIdHeader ?? '101');

          request.user = {
            userId,
            role,
            primaryTenantId: organizationIds[0] ?? null,
            organizationIds,
          };

          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('выполняет операционное действие START_COOKING по допустимому переходу', async () => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: 35,
      tenantId: 10,
      status: OrderStatus.CONFIRMED,
    });
    orderUpdateMock.mockResolvedValue({
      id: 35,
      orderNumber: 'FD-2026-000035',
      tenantId: 10,
      status: OrderStatus.COOKING,
      paymentMethod: PaymentMethod.CARD,
      paymentStatus: PaymentStatus.PENDING,
      currency: 'RUB',
      deliveryAddress: 'Москва',
      staffComment: null,
      subtotal: 1000,
      deliveryFee: 199,
      discountAmount: 0,
      finalAmount: 1199,
      createdAt: new Date('2026-04-12T11:00:00.000Z'),
      tenant: { id: 10, name: 'Flowza Cafe', slug: 'flowza-cafe' },
      items: [],
    });

    await request(app.getHttpServer())
      .patch('/orders/35/action')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .set('x-user-id', '501')
      .send({ action: 'START_COOKING' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.COOKING);
      });

    expect(assertCanManageOrganizationMock).toHaveBeenCalledWith(
      {
        role: UserRole.OPERATOR,
        organizationIds: [10],
      },
      10,
    );
  });

  it('возвращает 400 для недопустимого перехода через action', async () => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: 36,
      tenantId: 10,
      status: OrderStatus.NEW,
    });

    await request(app.getHttpServer())
      .patch('/orders/36/action')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ action: 'START_DELIVERY' })
      .expect(400);
  });

  it('выполняет операционное действие MARK_READY по допустимому переходу', async () => {
    mockActionTransition(37, OrderStatus.COOKING, OrderStatus.READY);

    await request(app.getHttpServer())
      .patch('/orders/37/action')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ action: 'MARK_READY' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.READY);
      });
  });

  it('выполняет операционное действие START_DELIVERY по допустимому переходу', async () => {
    mockActionTransition(38, OrderStatus.READY, OrderStatus.DELIVERING);

    await request(app.getHttpServer())
      .patch('/orders/38/action')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ action: 'START_DELIVERY' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.DELIVERING);
      });
  });

  it('выполняет операционное действие COMPLETE_DELIVERY по допустимому переходу', async () => {
    mockActionTransition(39, OrderStatus.DELIVERING, OrderStatus.COMPLETED);

    await request(app.getHttpServer())
      .patch('/orders/39/action')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ action: 'COMPLETE_DELIVERY' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.COMPLETED);
      });
  });

  it('выполняет операционное действие CANCEL_ORDER по допустимому переходу', async () => {
    mockActionTransition(40, OrderStatus.CONFIRMED, OrderStatus.CANCELLED);

    await request(app.getHttpServer())
      .patch('/orders/40/action')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ action: 'CANCEL_ORDER' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.CANCELLED);
      });
  });

  it('разрешает MODERATOR выполнять операционное действие по заказу', async () => {
    mockActionTransition(41, OrderStatus.COOKING, OrderStatus.READY);

    await request(app.getHttpServer())
      .patch('/orders/41/action')
      .set('x-role', UserRole.MODERATOR)
      .set('x-orgs', '10')
      .send({ action: 'MARK_READY' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.READY);
      });
  });

  it('разрешает SUPER_ADMIN выполнять операционное действие без списка организаций', async () => {
    mockActionTransition(42, OrderStatus.READY, OrderStatus.DELIVERING);

    await request(app.getHttpServer())
      .patch('/orders/42/action')
      .set('x-role', UserRole.SUPER_ADMIN)
      .set('x-orgs', '')
      .send({ action: 'START_DELIVERY' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.DELIVERING);
      });
  });

  it('возвращает 403 для USER при попытке выполнить операционное действие', async () => {
    await request(app.getHttpServer())
      .patch('/orders/43/action')
      .set('x-role', UserRole.USER)
      .set('x-orgs', '10')
      .send({ action: 'START_COOKING' })
      .expect(403);
  });

  it('возвращает 403 для MODERATOR при действии по заказу чужой организации', async () => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: 45,
      tenantId: 99,
      status: OrderStatus.COOKING,
    });
    assertCanManageOrganizationMock.mockImplementationOnce(() => {
      throw new ForbiddenException('Доступ к организации запрещен');
    });

    await request(app.getHttpServer())
      .patch('/orders/45/action')
      .set('x-role', UserRole.MODERATOR)
      .set('x-orgs', '10')
      .send({ action: 'MARK_READY' })
      .expect(403);
  });

  it('возвращает 404 при выполнении action для несуществующего заказа', async () => {
    orderFindUniqueMock.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .patch('/orders/9999/action')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ action: 'START_COOKING' })
      .expect(404);
  });

  it('возвращает 404 при смене payment-status для несуществующего заказа', async () => {
    orderFindUniqueMock.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .patch('/orders/9999/payment-status')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ paymentStatus: PaymentStatus.PAID })
      .expect(404);
  });

  it('возвращает 400 при недопустимом переходе payment-status', async () => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: 47,
      tenantId: 10,
      paymentStatus: PaymentStatus.PAID,
    });

    await request(app.getHttpServer())
      .patch('/orders/47/payment-status')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ paymentStatus: PaymentStatus.FAILED })
      .expect(400);
  });

  it('возвращает 200 без update при idempotent смене payment-status', async () => {
    orderFindUniqueMock
      .mockResolvedValueOnce({
        id: 48,
        tenantId: 10,
        paymentStatus: PaymentStatus.PAID,
      })
      .mockResolvedValueOnce(
        createPaymentStatusOrderView(48, PaymentStatus.PAID),
      );

    await request(app.getHttpServer())
      .patch('/orders/48/payment-status')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .send({ paymentStatus: PaymentStatus.PAID })
      .expect(200)
      .expect((response) => {
        const body = response.body as { paymentStatus: PaymentStatus };
        expect(body.paymentStatus).toBe(PaymentStatus.PAID);
      });

    expect(orderUpdateMock).not.toHaveBeenCalled();
  });

  it('возвращает пустую очередь при валидных фильтрах без совпадений', async () => {
    orderFindManyMock.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({
        tenantId: '10',
        status: OrderStatus.NEW,
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: PaymentStatus.PENDING,
        search: 'NO_MATCH_ORDER',
      })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown[];
        expect(body).toEqual([]);
      });

    const findManyCalls = orderFindManyMock.mock.calls as Array<
      [
        {
          where: {
            tenantId: number;
            status: OrderStatus;
          };
          orderBy: Array<{ createdAt: 'asc' }>;
        },
      ]
    >;
    const findManyCallArgs = findManyCalls[0]?.[0];
    expect(findManyCallArgs).toBeDefined();
    expect(findManyCallArgs.where.tenantId).toBe(10);
    expect(findManyCallArgs.where.status).toBe(OrderStatus.NEW);
    expect(findManyCallArgs.orderBy).toEqual([{ createdAt: 'asc' }]);
  });

  it('возвращает 400 при невалидном status в фильтрах очереди', async () => {
    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({
        tenantId: '10',
        status: 'INVALID_STATUS',
      })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(400);
  });

  it('возвращает 400 при невалидном paymentMethod в фильтрах очереди', async () => {
    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({
        tenantId: '10',
        paymentMethod: 'INVALID_PAYMENT_METHOD',
      })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(400);
  });

  it('возвращает 400 при невалидном paymentStatus в фильтрах очереди', async () => {
    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({
        tenantId: '10',
        paymentStatus: 'INVALID_PAYMENT_STATUS',
      })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(400);
  });

  it('возвращает 400 при отсутствии tenantId в фильтрах очереди', async () => {
    await request(app.getHttpServer())
      .get('/orders/queue')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(400);
  });

  it('возвращает 400 при отсутствии tenantId для staff-списка заказов tenant', async () => {
    await request(app.getHttpServer())
      .get('/orders/tenant')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(400);
  });

  it('возвращает 400 при невалидном tenantId для staff-списка заказов tenant', async () => {
    await request(app.getHttpServer())
      .get('/orders/tenant')
      .query({ tenantId: 'abc' })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(400);
  });

  it('возвращает пустой staff-список заказов tenant при валидном tenantId', async () => {
    orderFindManyMock.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/orders/tenant')
      .query({ tenantId: '10' })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown[];
        expect(body).toEqual([]);
      });

    const findManyCalls = orderFindManyMock.mock.calls as Array<
      [
        {
          where: {
            tenantId: number;
          };
          orderBy: Array<{ createdAt: 'desc' }>;
        },
      ]
    >;
    const findManyCallArgs = findManyCalls[0]?.[0];
    expect(findManyCallArgs).toBeDefined();
    expect(findManyCallArgs.where.tenantId).toBe(10);
    expect(findManyCallArgs.orderBy).toEqual([{ createdAt: 'desc' }]);
  });

  it('возвращает 403 при попытке читать staff-список заказов чужой организации', async () => {
    assertCanManageOrganizationMock.mockImplementationOnce(() => {
      throw new ForbiddenException('Доступ к организации запрещен');
    });

    await request(app.getHttpServer())
      .get('/orders/tenant')
      .query({ tenantId: '99' })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(403);

    expect(orderFindManyMock).not.toHaveBeenCalled();
  });

  it('возвращает 403 для USER при попытке читать staff-список заказов tenant', async () => {
    await request(app.getHttpServer())
      .get('/orders/tenant')
      .query({ tenantId: '10' })
      .set('x-role', UserRole.USER)
      .set('x-orgs', '10')
      .expect(403);

    expect(orderFindManyMock).not.toHaveBeenCalled();
  });

  it('разрешает SUPER_ADMIN читать staff-список заказов для произвольной организации', async () => {
    orderFindManyMock.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/orders/tenant')
      .query({ tenantId: '99' })
      .set('x-role', UserRole.SUPER_ADMIN)
      .set('x-orgs', '')
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown[];
        expect(body).toEqual([]);
      });

    expect(orderFindManyMock).toHaveBeenCalledTimes(1);
  });

  it('нормализует whitespace search в очереди без добавления OR-фильтра', async () => {
    orderFindManyMock.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({
        tenantId: '10',
        search: '   ',
      })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown[];
        expect(body).toEqual([]);
      });

    const findManyCalls = orderFindManyMock.mock.calls as Array<
      [
        {
          where: {
            status: {
              in: OrderStatus[];
            };
            OR?: unknown;
          };
        },
      ]
    >;
    const findManyCallArgs = findManyCalls[0]?.[0];
    expect(findManyCallArgs).toBeDefined();
    expect(findManyCallArgs.where.status).toEqual({
      in: [
        OrderStatus.NEW,
        OrderStatus.CONFIRMED,
        OrderStatus.COOKING,
        OrderStatus.READY,
        OrderStatus.DELIVERING,
      ],
    });
    expect(findManyCallArgs.where.OR).toBeUndefined();
  });

  it('trim-нормализует search с пробелами по краям для фильтра очереди', async () => {
    orderFindManyMock.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({
        tenantId: '10',
        search: '  000031  ',
      })
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown[];
        expect(body).toEqual([]);
      });

    const findManyCalls = orderFindManyMock.mock.calls as Array<
      [
        {
          where: {
            OR?: Array<
              | { orderNumber: { contains: string; mode: 'insensitive' } }
              | { deliveryAddress: { contains: string; mode: 'insensitive' } }
            >;
          };
        },
      ]
    >;

    const findManyCallArgs = findManyCalls[0]?.[0];
    expect(findManyCallArgs).toBeDefined();
    expect(findManyCallArgs.where.OR).toBeDefined();

    const firstOrCondition = findManyCallArgs.where.OR?.[0];
    expect(firstOrCondition).toBeDefined();
    if (firstOrCondition && 'orderNumber' in firstOrCondition) {
      expect(firstOrCondition.orderNumber.contains).toBe('000031');
    }
  });

  it('возвращает таймлайн заказа с фильтром EVENT', async () => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: 30,
      tenantId: 10,
    });
    orderCommentFindManyMock.mockResolvedValue([
      {
        id: 1,
        comment: 'Статус изменен: NEW -> CONFIRMED',
        createdAt: new Date('2026-04-12T10:05:00.000Z'),
        author: {
          id: 11,
          login: 'operator.flowza',
          email: 'operator@flowza.dev',
          role: UserRole.OPERATOR,
        },
      },
      {
        id: 2,
        comment: 'Позвонить клиенту перед отправкой',
        createdAt: new Date('2026-04-12T10:06:00.000Z'),
        author: {
          id: 11,
          login: 'operator.flowza',
          email: 'operator@flowza.dev',
          role: UserRole.OPERATOR,
        },
      },
    ]);

    await request(app.getHttpServer())
      .get('/orders/30/timeline')
      .query({ type: 'EVENT' })
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '10,12')
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ type: 'EVENT' | 'COMMENT' }>;
        expect(body).toHaveLength(1);
        expect(body[0]?.type).toBe('EVENT');
      });
  });

  it('возвращает 400 при невалидном type в таймлайне', async () => {
    await request(app.getHttpServer())
      .get('/orders/30/timeline')
      .query({ type: 'INVALID' })
      .expect(400);
  });

  it('разрешает MODERATOR читать таймлайн заказа с фильтром COMMENT', async () => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: 44,
      tenantId: 10,
    });
    orderCommentFindManyMock.mockResolvedValueOnce([
      {
        id: 3,
        comment: 'Статус изменен: COOKING -> READY',
        createdAt: new Date('2026-04-12T10:10:00.000Z'),
        author: {
          id: 12,
          login: 'moderator.flowza',
          email: 'moderator@flowza.dev',
          role: UserRole.MODERATOR,
        },
      },
      {
        id: 4,
        comment: 'Упаковать отдельно соусы',
        createdAt: new Date('2026-04-12T10:11:00.000Z'),
        author: {
          id: 12,
          login: 'moderator.flowza',
          email: 'moderator@flowza.dev',
          role: UserRole.MODERATOR,
        },
      },
    ]);

    await request(app.getHttpServer())
      .get('/orders/44/timeline')
      .query({ type: 'COMMENT' })
      .set('x-role', UserRole.MODERATOR)
      .set('x-orgs', '10')
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ type: 'EVENT' | 'COMMENT' }>;
        expect(body).toHaveLength(1);
        expect(body[0]?.type).toBe('COMMENT');
      });
  });

  it('возвращает 403 для USER при попытке читать таймлайн заказа', async () => {
    await request(app.getHttpServer())
      .get('/orders/44/timeline')
      .set('x-role', UserRole.USER)
      .set('x-orgs', '10')
      .expect(403);
  });

  it('возвращает 403 для ADMIN при чтении таймлайна заказа чужой организации', async () => {
    orderFindUniqueMock.mockResolvedValueOnce({
      id: 46,
      tenantId: 99,
    });
    assertCanManageOrganizationMock.mockImplementationOnce(() => {
      throw new ForbiddenException('Доступ к организации запрещен');
    });

    await request(app.getHttpServer())
      .get('/orders/46/timeline')
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '10')
      .expect(403);
  });

  it('возвращает 404 при чтении таймлайна несуществующего заказа', async () => {
    orderFindUniqueMock.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/orders/9999/timeline')
      .set('x-role', UserRole.ADMIN)
      .set('x-orgs', '10')
      .expect(404);
  });

  it('возвращает 404 при чтении комментариев несуществующего заказа', async () => {
    orderFindUniqueMock.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/orders/9999/comments')
      .set('x-role', UserRole.OPERATOR)
      .set('x-orgs', '10')
      .expect(404);
  });
});
