import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { TenantsModule } from '../tenants/tenants.module';

/**
 * Модуль управления категориями меню.
 *
 * Категории принадлежат конкретной организации (`tenantId`), поэтому модуль
 * импортирует `TenantsModule` и использует `TenantAccessService` для проверки
 * прав staff-пользователей.
 */
@Module({
  imports: [TenantsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
