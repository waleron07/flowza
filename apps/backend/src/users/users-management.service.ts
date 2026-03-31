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

@Injectable()
export class UsersManagementService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

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

  async createByPrivilegedUser(
    actor: {
      userId: number;
      role: UserRole;
      tenantId: number | null;
      organizationIds?: number[];
    },
    dto: CreateStaffUserDto,
  ) {
    this.validateRoleCreation(actor.role, dto.role);

    const existingUser = await this.usersService.findByPhone(dto.phone);
    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким телефоном уже существует',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let organizationIds = this.tenantAccessService.normalizeOrganizationIds(
      dto.organizationIds,
    );

    if (!organizationIds.length && dto.tenantId) {
      organizationIds = [dto.tenantId];
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

    this.tenantAccessService.assertCanAssignOrganizations(
      actor as TenantActor,
      organizationIds,
    );

    const tenantId = organizationIds[0] ?? actor.tenantId ?? undefined;

    return this.usersService.create({
      tenantId,
      organizationIds,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: true,
    });
  }
}
