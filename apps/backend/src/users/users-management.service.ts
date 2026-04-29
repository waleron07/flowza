import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { TenantActor } from '../tenants/types/tenant-actor.type';
import { AuditService } from '../audit/audit.service';

/**
 * Сервис управления пользователями через админку.
 *
 * Проверяет, может ли текущий actor создать выбранную staff-роль, валидирует
 * уникальность учетных данных и назначает доступные организации.
 */
@Injectable()
export class UsersManagementService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantAccessService: TenantAccessService,
    private readonly auditService: AuditService,
  ) {}

  /** Проверяет, разрешено ли actor создавать пользователя с указанной ролью. */
  private validateRoleCreation(actorRole: UserRole, targetRole: UserRole) {
    if (targetRole === UserRole.USER) {
      throw new BadRequestException(
        'Роль user создается только через публичную регистрацию',
      );
    }

    if (targetRole === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Создание superAdmin через админку запрещено',
      );
    }

    if (targetRole === UserRole.ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Только superAdmin может создавать admin');
    }

    if (
      (targetRole === UserRole.MODERATOR || targetRole === UserRole.OPERATOR) &&
      actorRole !== UserRole.ADMIN &&
      actorRole !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Только admin или superAdmin может создавать operator/moderator',
      );
    }
  }

  /** Создает staff-пользователя с проверкой роли, уникальности и tenant-доступа. */
  async createByPrivilegedUser(
    actor: {
      userId: number;
      role: UserRole;
      primaryTenantId: number | null;
      organizationIds?: number[];
    },
    dto: CreateStaffUserDto,
  ) {
    try {
      this.validateRoleCreation(actor.role, dto.role);
    } catch (error) {
      await this.auditService.log({
        userId: actor.userId,
        action: 'STAFF_USER_CREATE_FORBIDDEN_ROLE',
        entity: 'User',
        entityId: 0,
      });
      throw error;
    }

    const existingUser = await this.usersService.findByPhone(dto.phone);
    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким телефоном уже существует',
      );
    }

    const existingUserByEmail = await this.usersService.findByEmail(dto.email);
    if (existingUserByEmail) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const existingUserByLogin = await this.usersService.findByLogin(dto.login);
    if (existingUserByLogin) {
      throw new ConflictException(
        'Пользователь с таким логином уже существует',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let organizationIds = this.tenantAccessService.normalizeOrganizationIds(
      dto.organizationIds,
    );

    if (!organizationIds.length && dto.primaryTenantId) {
      organizationIds = [dto.primaryTenantId];
    }

    if (!organizationIds.length && actor.role !== UserRole.SUPER_ADMIN) {
      organizationIds = this.tenantAccessService.normalizeOrganizationIds(
        actor.organizationIds,
      );
    }

    if (
      dto.role !== UserRole.USER &&
      dto.role !== UserRole.SUPER_ADMIN &&
      !organizationIds.length
    ) {
      throw new BadRequestException(
        'Нужно указать хотя бы одну организацию для staff-пользователя',
      );
    }

    try {
      this.tenantAccessService.assertCanAssignOrganizations(
        actor as TenantActor,
        organizationIds,
      );
    } catch (error) {
      await this.auditService.log({
        userId: actor.userId,
        action: 'STAFF_USER_CREATE_FORBIDDEN_ORGANIZATION',
        entity: 'User',
        entityId: 0,
      });
      throw error;
    }

    const primaryTenantId =
      organizationIds[0] ?? actor.primaryTenantId ?? undefined;

    const createdUser = await this.usersService.create({
      primaryTenantId,
      organizationIds,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
      login: dto.login,
      isActive: true,
    });
    await this.auditService.log({
      userId: actor.userId,
      action: 'STAFF_USER_CREATED',
      entity: 'User',
      entityId: createdUser.id,
    });

    return createdUser;
  }
}
