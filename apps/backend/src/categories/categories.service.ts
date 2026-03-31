import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { TenantActor } from '../tenants/types/tenant-actor.type';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async findAll(actor: TenantActor, tenantId: number) {
    this.tenantAccessService.assertCanManageOrganization(actor, tenantId);

    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(actor: TenantActor, dto: CreateCategoryDto) {
    this.tenantAccessService.assertCanManageOrganization(actor, dto.tenantId);

    return this.prisma.category.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(actor: TenantActor, categoryId: number, dto: UpdateCategoryDto) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, tenantId: true },
    });

    if (!existingCategory) {
      throw new NotFoundException('Категория не найдена');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingCategory.tenantId,
    );

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async remove(actor: TenantActor, categoryId: number) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, tenantId: true },
    });

    if (!existingCategory) {
      throw new NotFoundException('Категория не найдена');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingCategory.tenantId,
    );

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        isActive: false,
      },
    });
  }
}
