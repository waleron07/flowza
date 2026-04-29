import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserInput } from './types/create-user.type';
import { UserRecord } from './types/user-record.type';
import { UserRole } from '../common/enums/user-role.enum';

type UserPersistenceRecord = {
  id: number;
  primaryTenantId: number | null;
  email: string | null;
  emailVerifiedAt: Date | null;
  phone: string;
  passwordHash: string;
  role: string;
  login?: string | null;
  firstName?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type LoginUserRepository = {
  user: {
    findUnique(args: {
      where: { login: string };
    }): Promise<UserPersistenceRecord | null>;
  };
};

type UserCreateTransaction = {
  user: {
    create(args: {
      data: {
        primaryTenantId: number | undefined;
        email: string;
        emailVerifiedAt: Date | null | undefined;
        phone: string;
        passwordHash: string;
        role: UserRole;
        login: string;
        isActive: boolean;
      };
    }): Promise<UserPersistenceRecord>;
  };
  userTenantAccess: {
    createMany(args: {
      data: Array<{ userId: number; tenantId: number }>;
      skipDuplicates: boolean;
    }): Promise<unknown>;
  };
};

/**
 * Низкоуровневый сервис пользователей.
 *
 * Инкапсулирует Prisma-доступ к пользователям, staff-назначениям организаций и
 * кодам подтверждения email.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Возвращает актуальный login с поддержкой старого поля `firstName` в данных. */
  private normalizeLogin(user: { login?: string; firstName?: string }): string {
    return user.login ?? user.firstName ?? '';
  }

  /** Возвращает организации пользователя или fallback на основную организацию. */
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

  /** Приводит запись Prisma к внутреннему формату пользователя приложения. */
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
      role: user.role as UserRole,
      login: user.login,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /** Ищет пользователя по телефону. */
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

  /** Ищет пользователя по email. */
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

  /** Ищет пользователя по login. */
  async findByLogin(login: string): Promise<UserRecord | null> {
    const userRepository = this.prisma as unknown as LoginUserRepository;
    const user = await userRepository.user.findUnique({
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

  /** Ищет пользователя по ID. */
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

  /** Возвращает ID организаций, доступных пользователю по роли и staff-назначениям. */
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

  /** Деактивирует пользователя без удаления учетной записи. */
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

  /** Создает пользователя и его staff-доступы к организациям в одной транзакции. */
  async create(input: CreateUserInput): Promise<UserRecord> {
    const organizationIds = [...new Set(input.organizationIds ?? [])].sort(
      (left, right) => left - right,
    );
    const primaryTenantId = input.primaryTenantId ?? organizationIds[0];

    const user = await this.prisma.$transaction(
      async (tx): Promise<UserPersistenceRecord> => {
        const userTransaction = tx as unknown as UserCreateTransaction;
        const createdUser = await userTransaction.user.create({
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
          await userTransaction.userTenantAccess.createMany({
            data: organizationIds.map((organizationId) => ({
              userId: createdUser.id,
              tenantId: organizationId,
            })),
            skipDuplicates: true,
          });
        }

        return createdUser;
      },
    );

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

  /** Создает одноразовый код подтверждения email. */
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

  /** Возвращает последний код подтверждения email пользователя. */
  async findLatestEmailVerificationCode(userId: number) {
    return this.prisma.emailVerificationCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Увеличивает счетчик попыток ввода email-кода. */
  async incrementEmailVerificationAttempts(codeId: number) {
    return this.prisma.emailVerificationCode.update({
      where: { id: codeId },
      data: { attempts: { increment: 1 } },
    });
  }

  /** Помечает email-код использованным. */
  async markEmailVerificationCodeUsed(codeId: number) {
    return this.prisma.emailVerificationCode.update({
      where: { id: codeId },
      data: { usedAt: new Date() },
    });
  }

  /** Инвалидирует все активные email-коды пользователя. */
  async invalidateActiveEmailVerificationCodes(userId: number) {
    return this.prisma.emailVerificationCode.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
  }

  /** Фиксирует успешное подтверждение email пользователя. */
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
