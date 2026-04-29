import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantAccessService } from './tenant-access.service';

/**
 * Модуль организаций.
 *
 * Экспортирует сервисы организаций и проверки доступа, чтобы другие домены
 * могли валидировать работу staff-пользователей в рамках организаций.
 */
@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantAccessService],
  exports: [TenantsService, TenantAccessService],
})
export class TenantsModule {}
