import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { TenantsModule } from '../tenants/tenants.module';

/**
 * Модуль продуктов меню.
 *
 * Подключает `TenantsModule`, чтобы сервис продуктов мог проверять права
 * управления организациями перед изменением меню.
 */
@Module({
  imports: [TenantsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
