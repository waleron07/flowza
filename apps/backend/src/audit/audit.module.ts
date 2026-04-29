import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Модуль audit log.
 *
 * Экспортирует `AuditService` для доменных модулей, которым нужно фиксировать
 * security-значимые события.
 */
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
