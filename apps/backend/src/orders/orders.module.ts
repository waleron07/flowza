import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TenantsModule } from '../tenants/tenants.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Модуль заказов.
 *
 * Объединяет клиентское оформление заказа и staff-сценарии управления очередью,
 * статусами, комментариями и оплатой. Доступ к заказам staff-пользователей
 * проверяется через tenant-aware правила из `TenantsModule`.
 */
@Module({
  imports: [TenantsModule, AuditModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
