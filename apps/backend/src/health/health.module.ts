import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Модуль health-check'а.
 *
 * Не зависит от auth и доменных модулей, чтобы endpoint `/health` оставался
 * максимально простым и доступным даже при проблемах в бизнес-логике.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
