import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UsersManagementService } from './users-management.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersManagementService: UsersManagementService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('staff')
  createStaffUser(
    @Req() req: { user: JwtPayload },
    @Body() dto: CreateStaffUserDto,
  ) {
    return this.usersManagementService.createByPrivilegedUser(
      {
        role: req.user.role,
        tenantId: req.user.tenantId,
      },
      dto,
    );
  }
}
