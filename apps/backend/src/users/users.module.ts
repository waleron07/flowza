import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersManagementService } from './users-management.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantsModule } from '../tenants/tenants.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Модуль пользователей.
 *
 * Экспортирует базовый сервис пользователей и сервис управления staff-учетками,
 * а также подключает tenant-доступ для проверок организаций.
 */
@Module({
  imports: [TenantsModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService, UsersManagementService, RolesGuard],
  exports: [UsersService, UsersManagementService],
})
export class UsersModule {}
