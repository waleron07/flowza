import { join } from 'path';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Пути от `apps/backend`: относительные `.env` ломались при другом cwd. Порядок: сначала `.env.<NODE_ENV>`, потом `.env` — merge даёт приоритет значениям из env по NODE_ENV.
      envFilePath: [
        join(__dirname, '..', `.env.${process.env.NODE_ENV ?? 'development'}`),
        join(__dirname, '..', '.env'),
      ],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    TenantsModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
