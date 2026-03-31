import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async findAccessibleTenantsForActor(actor: TenantActor) {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return this.findActiveTenants();
    }

    const organizationIds =
      this.tenantAccessService.normalizeOrganizationIds(actor.organizationIds);

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
