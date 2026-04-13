import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantActor } from '../tenants/types/tenant-actor.type';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderAction, OrdersService } from './orders.service';

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

class UpdateOrderCommentDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

class UpdateOrderPaymentStatusDto {
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;
}

class UpdateOrderActionDto {
  @IsEnum(OrderAction)
  action!: OrderAction;
}

type OrderQueueQuery = {
  tenantId?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  search?: string;
};

type OrderTimelineQuery = {
  type?: string;
};

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private parseTenantIdQuery(tenantId?: string) {
    if (tenantId === undefined) {
      return undefined;
    }

    const parsedTenantId = Number(tenantId);

    if (!Number.isInteger(parsedTenantId) || parsedTenantId <= 0) {
      throw new BadRequestException('tenantId must be a positive integer');
    }

    return parsedTenantId;
  }

  private parseOrderStatusQuery(status?: string) {
    if (status === undefined) {
      return undefined;
    }

    const values = Object.values(OrderStatus) as string[];

    if (!values.includes(status)) {
      throw new BadRequestException('status must be a valid OrderStatus');
    }

    return status as OrderStatus;
  }

  private parsePaymentMethodQuery(paymentMethod?: string) {
    if (paymentMethod === undefined) {
      return undefined;
    }

    const values = Object.values(PaymentMethod) as string[];

    if (!values.includes(paymentMethod)) {
      throw new BadRequestException(
        'paymentMethod must be a valid PaymentMethod',
      );
    }

    return paymentMethod as PaymentMethod;
  }

  private parsePaymentStatusQuery(paymentStatus?: string) {
    if (paymentStatus === undefined) {
      return undefined;
    }

    const values = Object.values(PaymentStatus) as string[];

    if (!values.includes(paymentStatus)) {
      throw new BadRequestException(
        'paymentStatus must be a valid PaymentStatus',
      );
    }

    return paymentStatus as PaymentStatus;
  }

  private parseSearchQuery(search?: string) {
    const trimmedSearch = search?.trim();

    return trimmedSearch ? trimmedSearch : undefined;
  }

  private parseTimelineTypeQuery(type?: string) {
    if (type === undefined) {
      return 'ALL' as const;
    }

    const normalizedType = type.toUpperCase();
    if (
      normalizedType !== 'ALL' &&
      normalizedType !== 'EVENT' &&
      normalizedType !== 'COMMENT'
    ) {
      throw new BadRequestException('type must be one of: ALL, EVENT, COMMENT');
    }

    return normalizedType;
  }

  @Post()
  create(@Req() req: { user: JwtPayload }, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, dto);
  }

  @Get('my')
  findMine(
    @Req() req: { user: JwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.ordersService.findMine(
      req.user.userId,
      this.parseTenantIdQuery(tenantId),
    );
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Get('tenant')
  findByTenant(
    @Req() req: { user: JwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const parsedTenantId = this.parseTenantIdQuery(tenantId);
    const actor: TenantActor = {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    };

    if (parsedTenantId === undefined) {
      throw new BadRequestException('tenantId query parameter is required');
    }

    return this.ordersService.findByTenant(actor, parsedTenantId);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Get('queue')
  findQueue(@Req() req: { user: JwtPayload }, @Query() query: OrderQueueQuery) {
    const parsedTenantId = this.parseTenantIdQuery(query.tenantId);

    if (parsedTenantId === undefined) {
      throw new BadRequestException('tenantId query parameter is required');
    }

    const actor: TenantActor = {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    };

    return this.ordersService.findQueue(actor, parsedTenantId, {
      status: this.parseOrderStatusQuery(query.status),
      paymentMethod: this.parsePaymentMethodQuery(query.paymentMethod),
      paymentStatus: this.parsePaymentStatusQuery(query.paymentStatus),
      search: this.parseSearchQuery(query.search),
    });
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Get(':orderId/comments')
  findComments(
    @Req() req: { user: JwtPayload },
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const actor: TenantActor = {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    };

    return this.ordersService.findComments(actor, orderId);
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Get(':orderId/timeline')
  findTimeline(
    @Req() req: { user: JwtPayload },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: OrderTimelineQuery,
  ) {
    const actor: TenantActor = {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    };

    return this.ordersService.findTimeline(
      actor,
      orderId,
      this.parseTimelineTypeQuery(query.type),
    );
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Patch(':orderId/status')
  updateStatus(
    @Req() req: { user: JwtPayload },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const actor: TenantActor = {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    };

    return this.ordersService.updateStatus(
      actor,
      orderId,
      dto.status,
      req.user.userId,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Patch(':orderId/comment')
  updateComment(
    @Req() req: { user: JwtPayload },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderCommentDto,
  ) {
    const actor: TenantActor = {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    };

    return this.ordersService.updateComment(
      actor,
      req.user.userId,
      orderId,
      dto.comment,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Patch(':orderId/payment-status')
  updatePaymentStatus(
    @Req() req: { user: JwtPayload },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderPaymentStatusDto,
  ) {
    const actor: TenantActor = {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    };

    return this.ordersService.updatePaymentStatus(
      actor,
      orderId,
      dto.paymentStatus,
      req.user.userId,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Patch(':orderId/action')
  applyAction(
    @Req() req: { user: JwtPayload },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderActionDto,
  ) {
    const actor: TenantActor = {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    };

    return this.ordersService.applyAction(
      actor,
      orderId,
      dto.action,
      req.user.userId,
    );
  }
}
