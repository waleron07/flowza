import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantActor } from './types/tenant-actor.type';
import { TenantAccessService } from './tenant-access.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  async findActiveTenants() {
    return this.prisma.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findManageableTenantsForActor(actor: TenantActor) {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return this.prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    const organizationIds = this.tenantAccessService.normalizeOrganizationIds(
      actor.organizationIds,
    );

    if (organizationIds.length === 0) {
      return [];
    }

    return this.prisma.tenant.findMany({
      where: {
        id: { in: organizationIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findPublicCatalogBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        heroTitle: true,
        heroSubtitle: true,
        heroDescription: true,
        heroImageUrl: true,
        seoTitle: true,
        seoDescription: true,
        phone: true,
        address: true,
        timezone: true,
        workingHours: true,
        deliveryFee: true,
        minOrderAmount: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Организация не найдена');
    }

    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.product.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
          category: {
            isActive: true,
          },
        },
        select: {
          id: true,
          categoryId: true,
          name: true,
          description: true,
          imageUrl: true,
          badgeText: true,
          price: true,
          currency: true,
        },
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    return {
      tenant,
      categories,
      products,
    };
  }

  async findManagementViewByTenantId(tenantId: number, actor: TenantActor) {
    this.tenantAccessService.assertCanManageOrganization(actor, tenantId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        heroTitle: true,
        heroSubtitle: true,
        heroDescription: true,
        heroImageUrl: true,
        seoTitle: true,
        seoDescription: true,
        isActive: true,
        phone: true,
        address: true,
        timezone: true,
        workingHours: true,
        deliveryFee: true,
        minOrderAmount: true,
        subscription: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Организация не найдена');
    }

    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({
        where: { tenantId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.product.findMany({
        where: { tenantId },
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    return {
      tenant,
      categories,
      products,
    };
  }

  async findAccessibleTenantsForActor(actor: TenantActor) {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return this.findActiveTenants();
    }

    const organizationIds = this.tenantAccessService.normalizeOrganizationIds(
      actor.organizationIds,
    );

    if (organizationIds.length === 0) {
      return [];
    }

    return this.prisma.tenant.findMany({
      where: {
        isActive: true,
        id: { in: organizationIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTenant(dto: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        heroTitle: dto.heroTitle,
        heroSubtitle: dto.heroSubtitle,
        heroDescription: dto.heroDescription,
        heroImageUrl: dto.heroImageUrl,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        phone: dto.phone,
        address: dto.address,
        timezone: dto.timezone ?? 'UTC',
        workingHours: dto.workingHours as Prisma.InputJsonValue | undefined,
        deliveryFee: dto.deliveryFee ?? 0,
        minOrderAmount: dto.minOrderAmount ?? 0,
        ...(dto.subscription
          ? { subscription: new Date(dto.subscription) }
          : {}),
      },
    });
  }

  async updateTenant(
    tenantId: number,
    actor: TenantActor,
    dto: UpdateTenantDto,
  ) {
    this.tenantAccessService.assertCanManageOrganization(actor, tenantId);

    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      (dto.isActive !== undefined || dto.subscription !== undefined)
    ) {
      throw new ForbiddenException(
        'Только superAdmin может изменять статус активности и подписку организации',
      );
    }

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!existingTenant) {
      throw new NotFoundException('Организация не найдена');
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        heroTitle: dto.heroTitle,
        heroSubtitle: dto.heroSubtitle,
        heroDescription: dto.heroDescription,
        heroImageUrl: dto.heroImageUrl,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        phone: dto.phone,
        address: dto.address,
        timezone: dto.timezone,
        workingHours: dto.workingHours as Prisma.InputJsonValue | undefined,
        deliveryFee: dto.deliveryFee,
        minOrderAmount: dto.minOrderAmount,
        isActive: dto.isActive,
        ...(dto.subscription !== undefined
          ? { subscription: new Date(dto.subscription) }
          : {}),
      },
    });
  }

  async removeTenant(tenantId: number) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!existingTenant) {
      throw new NotFoundException('Организация не найдена');
    }

    return this.prisma.tenant.delete({
      where: { id: tenantId },
    });
  }
}
