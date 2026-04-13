import {
  BadRequestException,
  ForbiddenException,
  INestApplication,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { OrdersService } from '../../src/orders/orders.service';
import { UsersService } from '../../src/users/users.service';
import { CreateUserInput } from '../../src/users/types/create-user.type';

interface InMemoryUser {
  id: number;
  primaryTenantId: number | null;
  organizationIds: number[];
  email: string;
  emailVerifiedAt: Date | null;
  phone: string;
  passwordHash: string;
  role: UserRole;
  login: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class InMemoryUsersService {
  private users: InMemoryUser[] = [];
  private currentId = 1;

  findByPhone(phone: string) {
    return this.users.find((user) => user.phone === phone) ?? null;
  }

  findById(id: number) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  findByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  create(input: CreateUserInput) {
    const organizationIds =
      input.organizationIds ??
      (input.primaryTenantId ? [input.primaryTenantId] : []);

    const user: InMemoryUser = {
      id: this.currentId++,
      primaryTenantId: input.primaryTenantId ?? null,
      organizationIds,
      email: input.email,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      phone: input.phone,
      passwordHash: input.passwordHash,
      role: input.role,
      login: input.login,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  deactivateById(id: number) {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    user.isActive = false;
    user.updatedAt = new Date();
    return user;
  }

  seed(
    user: Omit<
      InMemoryUser,
      'id' | 'createdAt' | 'updatedAt' | 'emailVerifiedAt'
    > & {
      emailVerifiedAt?: Date | null;
    },
  ) {
    const createdUser: InMemoryUser = {
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...user,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    };

    this.users.push(createdUser);
    return createdUser;
  }
}

describe('E2E проверки заказов', () => {
  let app: INestApplication<App>;
  let usersService: InMemoryUsersService;
  let ordersService: {
    updatePaymentStatus: jest.Mock;
    updateStatus: jest.Mock;
    applyAction: jest.Mock;
    findByTenant: jest.Mock;
    findComments: jest.Mock;
    updateComment: jest.Mock;
    findQueue: jest.Mock;
    findTimeline: jest.Mock;
  };

  beforeEach(async () => {
    usersService = new InMemoryUsersService();
    ordersService = createOrdersServiceMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersService)
      .overrideProvider(OrdersService)
      .useValue(ordersService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  function createOrdersServiceMock() {
    const allowedStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
      NEW: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.COOKING, OrderStatus.CANCELLED],
      COOKING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.DELIVERING, OrderStatus.CANCELLED],
      DELIVERING: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      COMPLETED: [],
      CANCELLED: [],
    };

    const orders = new Map<
      number,
      { tenantId: number; status: OrderStatus; staffComment: string | null }
    >([
      [31, { tenantId: 10, status: OrderStatus.NEW, staffComment: null }],
      [32, { tenantId: 11, status: OrderStatus.NEW, staffComment: null }],
      [35, { tenantId: 10, status: OrderStatus.CONFIRMED, staffComment: null }],
    ]);
    const queueOrders = [
      {
        id: 31,
        orderNumber: 'FD-2026-000031',
        tenantId: 10,
        tenantName: 'Flowza Cafe',
        tenantSlug: 'flowza-cafe',
        status: OrderStatus.NEW,
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: PaymentStatus.PENDING,
        currency: 'RUB',
        deliveryAddress: 'Москва',
        staffComment: null,
        subtotal: 1300,
        deliveryFee: 199,
        discountAmount: 0,
        finalAmount: 1499,
        createdAt: new Date('2026-04-12T11:00:00.000Z'),
        items: [],
      },
      {
        id: 33,
        orderNumber: 'FD-2026-000033',
        tenantId: 10,
        tenantName: 'Flowza Cafe',
        tenantSlug: 'flowza-cafe',
        status: OrderStatus.CONFIRMED,
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PAID,
        currency: 'RUB',
        deliveryAddress: 'Химки',
        staffComment: null,
        subtotal: 900,
        deliveryFee: 199,
        discountAmount: 0,
        finalAmount: 1099,
        createdAt: new Date('2026-04-12T12:00:00.000Z'),
        items: [],
      },
      {
        id: 34,
        orderNumber: 'FD-2026-000034',
        tenantId: 11,
        tenantName: 'Another Cafe',
        tenantSlug: 'another-cafe',
        status: OrderStatus.NEW,
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: PaymentStatus.PENDING,
        currency: 'RUB',
        deliveryAddress: 'Красногорск',
        staffComment: null,
        subtotal: 700,
        deliveryFee: 199,
        discountAmount: 0,
        finalAmount: 899,
        createdAt: new Date('2026-04-12T13:00:00.000Z'),
        items: [],
      },
    ];

    const assertTenantAccess = (
      actor: { role: UserRole; organizationIds: number[] },
      tenantId: number,
    ) => {
      if (actor.role === UserRole.SUPER_ADMIN) {
        return;
      }

      if (!actor.organizationIds.includes(tenantId)) {
        throw new ForbiddenException('Доступ к организации запрещен');
      }
    };

    return {
      updatePaymentStatus: jest.fn().mockResolvedValue({
        id: 31,
        orderNumber: 'FD-2026-000031',
        tenantId: 10,
        tenantName: 'Flowza Cafe',
        tenantSlug: 'flowza-cafe',
        status: 'CONFIRMED',
        paymentMethod: 'CARD',
        paymentStatus: PaymentStatus.PAID,
        currency: 'RUB',
        deliveryAddress: 'Москва',
        staffComment: null,
        subtotal: 1300,
        deliveryFee: 199,
        discountAmount: 0,
        finalAmount: 1499,
        createdAt: new Date('2026-04-12T11:00:00.000Z'),
        items: [],
      }),
      updateStatus: jest
        .fn()
        .mockImplementation(
          (
            actor: { role: UserRole; organizationIds: number[] },
            orderId: number,
            status: OrderStatus,
          ) => {
            const order = orders.get(orderId);

            if (!order) {
              throw new ForbiddenException('Заказ не найден');
            }

            assertTenantAccess(actor, order.tenantId);

            if (order.status !== status) {
              if (!allowedStatusTransitions[order.status].includes(status)) {
                throw new BadRequestException(
                  `Переход из статуса ${order.status} в ${status} запрещен`,
                );
              }

              order.status = status;
            }

            return {
              id: orderId,
              tenantId: order.tenantId,
              status: order.status,
            };
          },
        ),
      applyAction: jest
        .fn()
        .mockImplementation(
          (
            actor: { role: UserRole; organizationIds: number[] },
            orderId: number,
            action:
              | 'START_COOKING'
              | 'MARK_READY'
              | 'START_DELIVERY'
              | 'COMPLETE_DELIVERY'
              | 'CANCEL_ORDER',
            actorUserId?: number,
          ) => {
            const actionToStatusMap: Record<string, OrderStatus> = {
              START_COOKING: OrderStatus.COOKING,
              MARK_READY: OrderStatus.READY,
              START_DELIVERY: OrderStatus.DELIVERING,
              COMPLETE_DELIVERY: OrderStatus.COMPLETED,
              CANCEL_ORDER: OrderStatus.CANCELLED,
            };

            const targetStatus = actionToStatusMap[action];
            if (!targetStatus) {
              throw new BadRequestException('Неизвестное действие заказа');
            }

            return (
              ordersService.updateStatus as (...args: unknown[]) => unknown
            )(actor, orderId, targetStatus, actorUserId);
          },
        ),
      updateComment: jest
        .fn()
        .mockImplementation(
          (
            actor: { role: UserRole; organizationIds: number[] },
            _authorUserId: number,
            orderId: number,
            comment?: string,
          ) => {
            const order = orders.get(orderId);

            if (!order) {
              throw new ForbiddenException('Заказ не найден');
            }

            assertTenantAccess(actor, order.tenantId);

            const trimmedComment = comment?.trim();
            order.staffComment = trimmedComment ? trimmedComment : null;

            return {
              id: orderId,
              tenantId: order.tenantId,
              status: order.status,
              staffComment: order.staffComment,
            };
          },
        ),
      findQueue: jest.fn().mockImplementation(
        (
          actor: { role: UserRole; organizationIds: number[] },
          tenantId: number,
          filters?: {
            status?: OrderStatus;
            paymentMethod?: PaymentMethod;
            paymentStatus?: PaymentStatus;
            search?: string;
          },
        ) => {
          assertTenantAccess(actor, tenantId);

          return queueOrders.filter((order) => {
            if (order.tenantId !== tenantId) {
              return false;
            }

            if (filters?.status && order.status !== filters.status) {
              return false;
            }

            if (
              filters?.paymentMethod &&
              order.paymentMethod !== filters.paymentMethod
            ) {
              return false;
            }

            if (
              filters?.paymentStatus &&
              order.paymentStatus !== filters.paymentStatus
            ) {
              return false;
            }

            if (filters?.search) {
              const search = filters.search.toLowerCase();
              return (
                order.orderNumber.toLowerCase().includes(search) ||
                order.deliveryAddress.toLowerCase().includes(search)
              );
            }

            return true;
          });
        },
      ),
      findByTenant: jest
        .fn()
        .mockImplementation(
          (
            actor: { role: UserRole; organizationIds: number[] },
            tenantId: number,
          ) => {
            assertTenantAccess(actor, tenantId);

            return queueOrders.filter((order) => order.tenantId === tenantId);
          },
        ),
      findComments: jest
        .fn()
        .mockImplementation(
          (
            actor: { role: UserRole; organizationIds: number[] },
            orderId: number,
          ) => {
            const order = orders.get(orderId);

            if (!order) {
              return [];
            }

            assertTenantAccess(actor, order.tenantId);

            return [
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
            ];
          },
        ),
      findTimeline: jest
        .fn()
        .mockImplementation(
          (
            actor: { role: UserRole; organizationIds: number[] },
            orderId: number,
            type: 'ALL' | 'EVENT' | 'COMMENT' = 'ALL',
          ) => {
            const order = orders.get(orderId);

            if (!order) {
              return [];
            }

            assertTenantAccess(actor, order.tenantId);

            const entries = [
              {
                id: 1,
                type: 'EVENT' as const,
                message: 'Статус изменен: NEW -> CONFIRMED',
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
                type: 'COMMENT' as const,
                message: 'Позвонить клиенту перед отправкой',
                createdAt: new Date('2026-04-12T10:06:00.000Z'),
                author: {
                  id: 11,
                  login: 'operator.flowza',
                  email: 'operator@flowza.dev',
                  role: UserRole.OPERATOR,
                },
              },
            ];

            if (type === 'ALL') {
              return entries;
            }

            return entries.filter((entry) => entry.type === type);
          },
        ),
    };
  }

  it('запрещает смену статуса оплаты без токена', async () => {
    await request(app.getHttpServer())
      .patch('/orders/31/payment-status')
      .send({ paymentStatus: PaymentStatus.PAID })
      .expect(401);
  });

  it('запрещает клиенту менять статус оплаты заказа', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'user-orders@example.com',
      phone: '+79990000300',
      passwordHash,
      role: UserRole.USER,
      login: 'user_orders',
      isActive: true,
      emailVerifiedAt: new Date(),
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000300',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/31/payment-status')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ paymentStatus: PaymentStatus.PAID })
      .expect(403);
  });

  it('разрешает operator менять статус оплаты заказа', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-orders@example.com',
      phone: '+79990000301',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_orders',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000301',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/31/payment-status')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ paymentStatus: PaymentStatus.PAID })
      .expect(200)
      .expect((response) => {
        const body = response.body as { paymentStatus: PaymentStatus };
        expect(body.paymentStatus).toBe(PaymentStatus.PAID);
      });

    expect(ordersService.updatePaymentStatus).toHaveBeenCalledWith(
      {
        role: UserRole.OPERATOR,
        organizationIds: [10],
      },
      31,
      PaymentStatus.PAID,
      1,
    );
  });

  it('разрешает operator менять статус заказа по допустимому переходу', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-status-ok@example.com',
      phone: '+79990000302',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_status_ok',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000302',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/31/status')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ status: OrderStatus.CONFIRMED })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.CONFIRMED);
      });
  });

  it('возвращает 400 при запрещенном переходе статуса заказа', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-status-bad@example.com',
      phone: '+79990000303',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_status_bad',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000303',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/31/status')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ status: OrderStatus.READY })
      .expect(400);
  });

  it('разрешает staff читать комментарии заказа своей организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'admin-comments-ok@example.com',
      phone: '+79990000304',
      passwordHash,
      role: UserRole.ADMIN,
      login: 'admin_comments_ok',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000304',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/31/comments')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ comment: string }>;
        expect(body[0]?.comment).toBe('Позвонить клиенту перед отправкой');
      });
  });

  it('возвращает 403 при чтении комментариев заказа чужой организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-comments-forbidden@example.com',
      phone: '+79990000305',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_comments_forbidden',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000305',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/32/comments')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });

  it('разрешает staff обновлять комментарий заказа своей организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-comment-own@example.com',
      phone: '+79990000306',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_comment_own',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000306',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/31/comment')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ comment: '  Позвонить перед доставкой  ' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { staffComment: string | null };
        expect(body.staffComment).toBe('Позвонить перед доставкой');
      });
  });

  it('возвращает 403 при обновлении комментария заказа чужой организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-comment-foreign@example.com',
      phone: '+79990000307',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_comment_foreign',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000307',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/32/comment')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ comment: 'Чужой tenant' })
      .expect(403);
  });

  it('очищает комментарий заказа при пустом значении', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-comment-empty@example.com',
      phone: '+79990000308',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_comment_empty',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000308',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/31/comment')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ comment: '   ' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { staffComment: string | null };
        expect(body.staffComment).toBeNull();
      });
  });

  it('разрешает staff читать очередь заказов своей организации с фильтрами', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-queue-own@example.com',
      phone: '+79990000309',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_queue_own',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000309',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({
        tenantId: '10',
        status: OrderStatus.NEW,
        paymentMethod: PaymentMethod.CARD,
        paymentStatus: PaymentStatus.PENDING,
        search: '000031',
      })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ orderNumber: string }>;
        expect(body).toHaveLength(1);
        expect(body[0]?.orderNumber).toBe('FD-2026-000031');
      });
  });

  it('возвращает 403 при чтении очереди заказов чужой организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-queue-foreign@example.com',
      phone: '+79990000310',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_queue_foreign',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000310',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({ tenantId: '11' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });

  it('возвращает 400 при невалидном tenantId для очереди заказов', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-queue-invalid-tenant@example.com',
      phone: '+79990000311',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_queue_invalid_tenant',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000311',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({ tenantId: 'abc' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(400);
  });

  it('возвращает 400 при отсутствии tenantId для очереди заказов', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-queue-missing-tenant@example.com',
      phone: '+79990000322',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_queue_missing_tenant',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000322',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/queue')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(400);
  });

  it('возвращает 400 при невалидном status для очереди заказов', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-queue-invalid-status@example.com',
      phone: '+79990000323',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_queue_invalid_status',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000323',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({ tenantId: '10', status: 'UNKNOWN' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(400);
  });

  it('возвращает 400 при невалидном paymentMethod для очереди заказов', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-queue-invalid-payment-method@example.com',
      phone: '+79990000324',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_queue_invalid_payment_method',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000324',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({ tenantId: '10', paymentMethod: 'INVALID' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(400);
  });

  it('возвращает 400 при невалидном paymentStatus для очереди заказов', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-queue-invalid-payment-status@example.com',
      phone: '+79990000325',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_queue_invalid_payment_status',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000325',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/queue')
      .query({ tenantId: '10', paymentStatus: 'INVALID' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(400);
  });

  it('разрешает super_admin читать staff-список заказов произвольной организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: null,
      organizationIds: [],
      email: 'superadmin-orders-tenant@example.com',
      phone: '+79990000318',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      login: 'superadmin_orders_tenant',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000318',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/tenant')
      .query({ tenantId: '11' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ tenantId: number }>;
        expect(body.length).toBeGreaterThan(0);
        expect(body.every((order) => order.tenantId === 11)).toBe(true);
      });
  });

  it('возвращает 403 для user при попытке читать staff-список заказов tenant', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'user-orders-tenant-forbidden@example.com',
      phone: '+79990000319',
      passwordHash,
      role: UserRole.USER,
      login: 'user_orders_tenant_forbidden',
      isActive: true,
      emailVerifiedAt: new Date(),
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000319',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/tenant')
      .query({ tenantId: '10' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });

  it('возвращает 400 при отсутствии tenantId для staff-списка заказов tenant', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-orders-tenant-missing@example.com',
      phone: '+79990000320',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_orders_tenant_missing',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000320',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/tenant')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(400);
  });

  it('возвращает 400 при невалидном tenantId для staff-списка заказов tenant', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-orders-tenant-invalid@example.com',
      phone: '+79990000321',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_orders_tenant_invalid',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000321',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/tenant')
      .query({ tenantId: 'abc' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(400);
  });

  it('разрешает staff читать таймлайн заказа своей организации с фильтром EVENT', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-timeline-own@example.com',
      phone: '+79990000312',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_timeline_own',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000312',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/31/timeline')
      .query({ type: 'EVENT' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ type: 'EVENT' | 'COMMENT' }>;
        expect(body).toHaveLength(1);
        expect(body[0]?.type).toBe('EVENT');
      });
  });

  it('возвращает 403 при чтении таймлайна заказа чужой организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-timeline-foreign@example.com',
      phone: '+79990000313',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_timeline_foreign',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000313',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/32/timeline')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });

  it('возвращает 400 при невалидном фильтре type в таймлайне заказа', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-timeline-invalid@example.com',
      phone: '+79990000314',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_timeline_invalid',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000314',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/orders/31/timeline')
      .query({ type: 'UNKNOWN' })
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(400);
  });

  it('разрешает operator выполнять операционное действие по заказу своей организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-action-own@example.com',
      phone: '+79990000315',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_action_own',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000315',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/35/action')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ action: 'START_COOKING' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: OrderStatus };
        expect(body.status).toBe(OrderStatus.COOKING);
      });
  });

  it('возвращает 403 при выполнении действия по заказу чужой организации', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-action-foreign@example.com',
      phone: '+79990000316',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_action_foreign',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000316',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/32/action')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ action: 'START_COOKING' })
      .expect(403);
  });

  it('возвращает 400 при запрещенном действии по заказу в текущем статусе', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.seed({
      primaryTenantId: 10,
      organizationIds: [10],
      email: 'operator-action-invalid-transition@example.com',
      phone: '+79990000317',
      passwordHash,
      role: UserRole.OPERATOR,
      login: 'operator_action_invalid_transition',
      isActive: true,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: '+79990000317',
        password: 'password123',
      })
      .expect(201);

    const loginBody = loginResponse.body as { accessToken: string };

    await request(app.getHttpServer())
      .patch('/orders/31/action')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({ action: 'START_COOKING' })
      .expect(400);
  });
});
