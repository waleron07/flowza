import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersManagementService } from './users-management.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersManagementService, RolesGuard],
  exports: [UsersService, UsersManagementService],
})
export class UsersModule {}
