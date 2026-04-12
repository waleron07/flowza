import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { TenantActor } from '../tenants/types/tenant-actor.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { generateOrderNumber } from './utils/order-number.util';

type OrderView = {
  id: number;
  orderNumber: string;
  tenantId: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  currency: string;
  deliveryAddress: string;
  staffComment: string | null;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  finalAmount: number;
  createdAt: Date;
  tenant: { id: number; name: string; slug: string };
  items: Array<{
    id: number;
    productId: number;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

type OrderQueueFilters = {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  search?: string;
};

type OrderCommentView = {
  id: number;
  comment: string;
  createdAt: Date;
  author: {
    id: number;
    login: string;
    email: string;
    role: string;
  } | null;
};

type OrderCommentRepository = {
  findMany(args: {
    where: { orderId: number };
    select: object;
    orderBy: Array<{ createdAt: 'asc' }>;
  }): Promise<OrderCommentView[]>;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  private readonly orderSelect = {
    id: true,
    orderNumber: true,
    tenantId: true,
    status: true,
    paymentMethod: true,
    paymentStatus: true,
    currency: true,
    deliveryAddress: true,
    staffComment: true,
    subtotal: true,
    deliveryFee: true,
    discountAmount: true,
    finalAmount: true,
    createdAt: true,
    tenant: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
    items: {
      select: {
        id: true,
        productId: true,
        productName: true,
        variantName: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
      },
      orderBy: [{ id: 'asc' as const }],
    },
  };

  private readonly allowedStatusTransitions: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    NEW: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    CONFIRMED: [OrderStatus.COOKING, OrderStatus.CANCELLED],
    COOKING: [OrderStatus.READY, OrderStatus.CANCELLED],
    READY: [OrderStatus.DELIVERING, OrderStatus.CANCELLED],
    DELIVERING: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: [],
  };

  private readonly defaultQueueStatuses = [
    OrderStatus.NEW,
    OrderStatus.CONFIRMED,
    OrderStatus.COOKING,
    OrderStatus.READY,
    OrderStatus.DELIVERING,
  ];

  private readonly orderCommentSelect = {
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
  };

  async create(userId: number, dto: CreateOrderDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: dto.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        deliveryFee: true,
        minOrderAmount: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Организация не найдена или недоступна');
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId: dto.tenantId,
        isActive: true,
        category: {
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Часть товаров не найдена или недоступна');
    }

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    const currencies = [
      ...new Set(products.map((product) => product.currency)),
    ];

    if (currencies.length !== 1) {
      throw new BadRequestException(
        'Заказ должен содержать товары в одной валюте',
      );
    }

    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(`Товар ${item.productId} не найден`);
      }

      const unitPrice = product.price;
      const totalPrice = unitPrice * item.quantity;

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        originalPrice: unitPrice,
        totalPrice,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = tenant.deliveryFee;
    const finalAmount = subtotal + deliveryFee;

    if (subtotal < tenant.minOrderAmount) {
      throw new BadRequestException(
        `Минимальная сумма заказа: ${tenant.minOrderAmount}`,
      );
    }

    const createdOrder = await this.prisma.order.create({
      data: {
        orderNumber: this.createTemporaryOrderNumber(userId),
        tenantId: tenant.id,
        userId,
        paymentMethod: dto.paymentMethod,
        currency: currencies[0],
        deliveryAddress: dto.deliveryAddress,
        subtotal,
        deliveryFee,
        finalAmount,
        items: {
          create: orderItems,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    const order = await this.prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        orderNumber: generateOrderNumber(
          createdOrder.id,
          createdOrder.createdAt,
        ),
      },
      select: this.orderSelect,
    });

    return this.mapOrder(order);
  }

  async findMine(userId: number, tenantId?: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        ...(tenantId !== undefined ? { tenantId } : {}),
      },
      select: this.orderSelect,
      orderBy: [{ createdAt: 'desc' }],
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async findByTenant(actor: TenantActor, tenantId: number) {
    this.tenantAccessService.assertCanManageOrganization(actor, tenantId);

    const orders = await this.prisma.order.findMany({
      where: { tenantId },
      select: this.orderSelect,
      orderBy: [{ createdAt: 'desc' }],
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async findQueue(
    actor: TenantActor,
    tenantId: number,
    filters: OrderQueueFilters = {},
  ) {
    this.tenantAccessService.assertCanManageOrganization(actor, tenantId);

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        status: filters.status ?? { in: this.defaultQueueStatuses },
        ...(filters.paymentMethod !== undefined
          ? { paymentMethod: filters.paymentMethod }
          : {}),
        ...(filters.paymentStatus !== undefined
          ? { paymentStatus: filters.paymentStatus }
          : {}),
        ...(filters.search !== undefined
          ? {
              OR: [
                {
                  orderNumber: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  deliveryAddress: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      select: this.orderSelect,
      orderBy: [{ createdAt: 'asc' }],
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async findComments(actor: TenantActor, orderId: number) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Заказ не найден');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingOrder.tenantId,
    );

    const orderCommentRepository = this.prisma as PrismaService & {
      orderComment: OrderCommentRepository;
    };
    const comments = await orderCommentRepository.orderComment.findMany({
      where: { orderId },
      select: this.orderCommentSelect,
      orderBy: [{ createdAt: 'asc' }],
    });

    return comments.map((comment) => this.mapOrderComment(comment));
  }

  async updateStatus(actor: TenantActor, orderId: number, status: OrderStatus) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        tenantId: true,
        status: true,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Заказ не найден');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingOrder.tenantId,
    );

    if (existingOrder.status === status) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: this.orderSelect,
      });

      if (!order) {
        throw new NotFoundException('Заказ не найден');
      }

      return this.mapOrder(order);
    }

    if (!this.allowedStatusTransitions[existingOrder.status].includes(status)) {
      throw new BadRequestException(
        `Переход из статуса ${existingOrder.status} в ${status} запрещен`,
      );
    }

    const now = new Date();
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === OrderStatus.CONFIRMED ? { confirmedAt: now } : {}),
        ...(status === OrderStatus.COMPLETED ? { deliveredAt: now } : {}),
        ...(status === OrderStatus.CANCELLED ? { cancelledAt: now } : {}),
      },
      select: this.orderSelect,
    });

    return this.mapOrder(order);
  }

  async updateComment(
    actor: TenantActor,
    authorUserId: number,
    orderId: number,
    comment?: string,
  ) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Заказ не найден');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingOrder.tenantId,
    );

    const trimmedComment = comment?.trim();
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        staffComment: trimmedComment ? trimmedComment : null,
        ...(trimmedComment
          ? {
              comments: {
                create: {
                  authorId: authorUserId,
                  comment: trimmedComment,
                },
              },
            }
          : {}),
      } as never,
      select: this.orderSelect,
    });

    return this.mapOrder(order as OrderView);
  }

  private createTemporaryOrderNumber(userId: number) {
    return `TMP-${Date.now()}-${userId}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private mapOrder(order: OrderView) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      tenantId: order.tenantId,
      tenantName: order.tenant.name,
      tenantSlug: order.tenant.slug,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      deliveryAddress: order.deliveryAddress,
      staffComment: order.staffComment,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      createdAt: order.createdAt,
      items: order.items,
    };
  }

  private mapOrderComment(comment: OrderCommentView) {
    return {
      id: comment.id,
      comment: comment.comment,
      createdAt: comment.createdAt,
      author: comment.author
        ? {
            id: comment.author.id,
            login: comment.author.login,
            email: comment.author.email,
            role: comment.author.role,
          }
        : null,
    };
  }
}
