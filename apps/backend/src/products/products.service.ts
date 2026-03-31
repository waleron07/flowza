import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { TenantActor } from '../tenants/types/tenant-actor.type';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async findAll(actor: TenantActor, tenantId: number) {
    this.tenantAccessService.assertCanManageOrganization(actor, tenantId);

    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(actor: TenantActor, dto: CreateProductDto) {
    this.tenantAccessService.assertCanManageOrganization(actor, dto.tenantId);

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true, tenantId: true, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    if (category.tenantId !== dto.tenantId) {
      throw new BadRequestException(
        'Нельзя создать продукт в категории другой организации',
      );
    }

    if (!category.isActive) {
      throw new BadRequestException(
        'Нельзя создать продукт в неактивной категории',
      );
    }

    return this.prisma.product.create({
      data: {
        tenantId: dto.tenantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? 'RUB',
        ...(dto.discountAll !== undefined ? { discountAll: dto.discountAll } : {}),
        ...(dto.discountStaff !== undefined
          ? { discountStaff: dto.discountStaff }
          : {}),
        ...(dto.discountDay !== undefined ? { discountDay: dto.discountDay } : {}),
        ...(dto.discountWeek !== undefined
          ? { discountWeek: dto.discountWeek }
          : {}),
        ...(dto.discountMonth !== undefined
          ? { discountMonth: dto.discountMonth }
          : {}),
      },
    });
  }

  async update(actor: TenantActor, productId: number, dto: UpdateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        tenantId: true,
        categoryId: true,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Продукт не найден');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingProduct.tenantId,
    );

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true, tenantId: true, isActive: true },
      });

      if (!category) {
        throw new NotFoundException('Категория не найдена');
      }

      if (category.tenantId !== existingProduct.tenantId) {
        throw new BadRequestException(
          'Нельзя привязать продукт к категории другой организации',
        );
      }

      if (!category.isActive) {
        throw new BadRequestException(
          'Нельзя привязать продукт к неактивной категории',
        );
      }
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        isActive: dto.isActive,
        ...(dto.discountAll !== undefined ? { discountAll: dto.discountAll } : {}),
        ...(dto.discountStaff !== undefined
          ? { discountStaff: dto.discountStaff }
          : {}),
        ...(dto.discountDay !== undefined ? { discountDay: dto.discountDay } : {}),
        ...(dto.discountWeek !== undefined
          ? { discountWeek: dto.discountWeek }
          : {}),
        ...(dto.discountMonth !== undefined
          ? { discountMonth: dto.discountMonth }
          : {}),
      },
    });
  }

  async remove(actor: TenantActor, productId: number) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, tenantId: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Продукт не найден');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingProduct.tenantId,
    );

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        isActive: false,
      },
    });
  }
}
