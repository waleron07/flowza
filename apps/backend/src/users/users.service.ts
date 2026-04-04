import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserInput } from './types/create-user.type';
import { UserRecord } from './types/user-record.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLogin(user: { login?: string; firstName?: string }): string {
    return user.login ?? user.firstName ?? '';
  }

  private async getOrganizationIdsForUser(
    userId: number,
    fallbackPrimaryTenantId: number | null,
  ): Promise<number[]> {
    const assignments = await this.prisma.userTenantAccess.findMany({
      where: { userId },
      select: { tenantId: true },
      orderBy: { tenantId: 'asc' },
    });

    if (assignments.length > 0) {
      return assignments.map((assignment) => assignment.tenantId);
    }

    return fallbackPrimaryTenantId ? [fallbackPrimaryTenantId] : [];
  }

  private mapUserRecord(user: {
    id: number;
    primaryTenantId: number | null;
    email: string | null;
    emailVerifiedAt: Date | null;
    phone: string;
    passwordHash: string;
    role: string;
    login: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    organizationIds: number[];
  }): UserRecord {
    return {
      id: user.id,
      primaryTenantId: user.primaryTenantId,
      organizationIds: user.organizationIds,
      email: user.email ?? '',
      emailVerifiedAt: user.emailVerifiedAt,
      phone: user.phone,
      passwordHash: user.passwordHash,
      role: user.role,
      login: user.login,
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
      user.primaryTenantId,
    );
    const normalizedLogin = this.normalizeLogin(
      user as { login?: string; firstName?: string },
    );

    return this.mapUserRecord({
      ...user,
      login: normalizedLogin,
      organizationIds,
    });
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return null;
    }

    const organizationIds = await this.getOrganizationIdsForUser(
      user.id,
      user.primaryTenantId,
    );
    const normalizedLogin = this.normalizeLogin(
      user as { login?: string; firstName?: string },
    );

    return this.mapUserRecord({
      ...user,
      login: normalizedLogin,
      organizationIds,
    });
  }

  async findByLogin(login: string): Promise<UserRecord | null> {
    const prismaAny = this.prisma as any;
    const user = await prismaAny.user.findUnique({
      where: { login },
    });
    if (!user) {
      return null;
    }

    const organizationIds = await this.getOrganizationIdsForUser(
      user.id,
      user.primaryTenantId,
    );
    const normalizedLogin = this.normalizeLogin(
      user as { login?: string; firstName?: string },
    );

    return this.mapUserRecord({
      ...user,
      login: normalizedLogin,
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
      user.primaryTenantId,
    );
    const normalizedLogin = this.normalizeLogin(
      user as { login?: string; firstName?: string },
    );

    return this.mapUserRecord({
      ...user,
      login: normalizedLogin,
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
      user.primaryTenantId,
    );
    const normalizedLogin = this.normalizeLogin(
      user as { login?: string; firstName?: string },
    );

    return this.mapUserRecord({
      ...user,
      login: normalizedLogin,
      organizationIds,
    });
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const organizationIds = [...new Set(input.organizationIds ?? [])].sort(
      (left, right) => left - right,
    );
    const primaryTenantId = input.primaryTenantId ?? organizationIds[0];

    const user = await this.prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      const createdUser = await txAny.user.create({
        data: {
          primaryTenantId,
          email: input.email,
          emailVerifiedAt: input.emailVerifiedAt,
          phone: input.phone,
          passwordHash: input.passwordHash,
          role: input.role,
          login: input.login,
          isActive: input.isActive ?? true,
        },
      });

      if (organizationIds.length > 0) {
        await txAny.userTenantAccess.createMany({
          data: organizationIds.map((organizationId) => ({
            userId: createdUser.id,
            tenantId: organizationId,
          })),
          skipDuplicates: true,
        });
      }

      return createdUser;
    });

    const normalizedLogin = this.normalizeLogin(
      user as { login?: string; firstName?: string },
    );

    return this.mapUserRecord({
      ...user,
      login: normalizedLogin,
      organizationIds: organizationIds.length
        ? organizationIds
        : primaryTenantId
          ? [primaryTenantId]
          : [],
    });
  }

  async createEmailVerificationCode(input: {
    userId: number;
    codeHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.emailVerificationCode.create({
      data: {
        userId: input.userId,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findLatestEmailVerificationCode(userId: number) {
    return this.prisma.emailVerificationCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementEmailVerificationAttempts(codeId: number) {
    return this.prisma.emailVerificationCode.update({
      where: { id: codeId },
      data: { attempts: { increment: 1 } },
    });
  }

  async markEmailVerificationCodeUsed(codeId: number) {
    return this.prisma.emailVerificationCode.update({
      where: { id: codeId },
      data: { usedAt: new Date() },
    });
  }

  async invalidateActiveEmailVerificationCodes(userId: number) {
    return this.prisma.emailVerificationCode.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
  }

  async markEmailVerified(userId: number): Promise<UserRecord> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });

    const organizationIds = await this.getOrganizationIdsForUser(
      user.id,
      user.primaryTenantId,
    );
    const normalizedLogin = this.normalizeLogin(
      user as { login?: string; firstName?: string },
    );

    return this.mapUserRecord({
      ...user,
      login: normalizedLogin,
      organizationIds,
    });
  }
}
