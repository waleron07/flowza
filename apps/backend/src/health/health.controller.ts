import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Публичный health endpoint.
 *
 * Используется локально, в CI и потенциально в инфраструктуре (Docker/K8s) для
 * проверки, что backend-процесс жив и отвечает.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** `GET /health` — быстрый health-check без авторизации. */
  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }
}
