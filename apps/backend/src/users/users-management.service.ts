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

@Injectable()
export class UsersManagementService {
  constructor(private readonly usersService: UsersService) {}

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
    actor: { role: UserRole; tenantId: number | null },
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

    const tenantId: number | undefined =
      actor.role === UserRole.SUPER_ADMIN
        ? dto.tenantId
        : (actor.tenantId ?? undefined);

    return this.usersService.create({
      tenantId,
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
