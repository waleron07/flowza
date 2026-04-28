import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Глобальный модуль доступа к базе данных.
 *
 * Экспортирует один `PrismaService`, чтобы остальные модули могли внедрять его
 * без повторного импорта `DatabaseModule`. Это центральная точка подключения к
 * Prisma Client в backend-приложении.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
