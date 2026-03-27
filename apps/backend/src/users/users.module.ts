import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersManagementService } from './users-management.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersManagementService, RolesGuard],
  exports: [UsersService, UsersManagementService],
})
export class UsersModule {}
