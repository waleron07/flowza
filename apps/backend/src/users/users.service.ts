import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserInput } from './types/create-user.type';
import { UserRecord } from './types/user-record.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrganizationIdsForUser(
    userId: number,
    fallbackTenantId: number | null,
  ): Promise<number[]> {
    const assignments = await this.prisma.userTenantAccess.findMany({
      where: { userId },
      select: { tenantId: true },
      orderBy: { tenantId: 'asc' },
    });

    if (assignments.length > 0) {
      return assignments.map((assignment) => assignment.tenantId);
    }

    return fallbackTenantId ? [fallbackTenantId] : [];
  }

  private mapUserRecord(user: {
    id: number;
    tenantId: number | null;
    email: string | null;
    phone: string;
    passwordHash: string;
    role: string;
    firstName: string;
    lastName: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    organizationIds: number[];
  }): UserRecord {
    return {
      id: user.id,
      tenantId: user.tenantId,
      organizationIds: user.organizationIds,
      email: user.email,
      phone: user.phone,
      passwordHash: user.passwordHash,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findByPhone(phone: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });
    if (!user) {
      return null;
    }

    const organizationIds = await this.getOrganizationIdsForUser(
      user.id,
      user.tenantId,
    );

    return this.mapUserRecord({
      ...user,
      organizationIds,
    });
  }

  async findById(id: number): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      return null;
    }

    const organizationIds = await this.getOrganizationIdsForUser(
      user.id,
      user.tenantId,
    );

    return this.mapUserRecord({
      ...user,
      organizationIds,
    });
  }

  async findAccessibleTenantIds(
    userId: number,
    role: string,
  ): Promise<number[]> {
    if (role === 'superAdmin') {
      const tenants = await this.prisma.tenant.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      return tenants.map((tenant) => tenant.id);
    }

    const assignments = await this.prisma.userTenantAccess.findMany({
      where: { userId },
      select: { tenantId: true },
      orderBy: { tenantId: 'asc' },
    });
    return assignments.map((assignment) => assignment.tenantId);
  }

  async deactivateById(id: number): Promise<UserRecord> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    const organizationIds = await this.getOrganizationIdsForUser(
      user.id,
      user.tenantId,
    );

    return this.mapUserRecord({
      ...user,
      organizationIds,
    });
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const organizationIds = [...new Set(input.organizationIds ?? [])].sort(
      (left, right) => left - right,
    );
    const tenantId = input.tenantId ?? organizationIds[0];

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          tenantId,
          email: input.email,
          phone: input.phone,
          passwordHash: input.passwordHash,
          role: input.role,
          firstName: input.firstName,
          lastName: input.lastName,
          isActive: input.isActive ?? true,
        },
      });

      if (organizationIds.length > 0) {
        await tx.userTenantAccess.createMany({
          data: organizationIds.map((organizationId) => ({
            userId: createdUser.id,
            tenantId: organizationId,
          })),
          skipDuplicates: true,
        });
      }

      return createdUser;
    });

    return this.mapUserRecord({
      ...user,
      organizationIds: organizationIds.length
        ? organizationIds
        : tenantId
          ? [tenantId]
          : [],
    });
  }
}
