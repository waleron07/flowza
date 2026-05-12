import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UsersManagementService } from './users-management.service';

/**
 * HTTP-контроллер пользователей.
 *
 * Сейчас содержит защищенный endpoint для создания staff-пользователей через
 * админку с учетом роли текущего пользователя.
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersManagementService: UsersManagementService,
  ) {}

  /** Возвращает активных admin-пользователей для назначения владельцем организации. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin-candidates')
  getAdminCandidates() {
    return this.usersManagementService.findAdminCandidates();
  }

  /** Создает staff-пользователя от имени admin или superAdmin. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('staff')
  createStaffUser(
    @Req() req: { user: JwtPayload },
    @Body() dto: CreateStaffUserDto,
  ) {
    return this.usersManagementService.createByPrivilegedUser(
      {
        userId: req.user.userId,
        role: req.user.role,
        primaryTenantId: req.user.primaryTenantId,
        organizationIds: req.user.organizationIds,
      },
      dto,
    );
  }
}
