import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type AuditLogInput = {
  userId?: number | null;
  action: string;
  entity: string;
  entityId: number;
};

/**
 * Сервис записи audit log.
 *
 * Аудит не должен ломать основной пользовательский сценарий, поэтому ошибки
 * записи логируются, но не пробрасываются наружу.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Записывает audit-событие в БД, если persistence доступен. */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Не удалось записать audit log action=${input.action} entity=${input.entity} entityId=${input.entityId}`,
        error,
      );
    }
  }
}
