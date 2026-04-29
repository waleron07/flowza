import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantActor } from './types/tenant-actor.type';

/**
 * Сервис проверки доступа к организациям.
 *
 * Централизует правила: superAdmin видит все, остальные staff-пользователи
 * работают только с организациями из JWT payload.
 */
@Injectable()
export class TenantAccessService {
  /** Убирает дубли ID организаций и возвращает стабильный отсортированный список. */
  normalizeOrganizationIds(organizationIds?: number[]): number[] {
    return [...new Set(organizationIds ?? [])].sort(
      (left, right) => left - right,
    );
  }

  /** Проверяет, может ли actor работать с конкретной организацией. */
  hasOrganizationAccess(actor: TenantActor, tenantId: number): boolean {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    return actor.organizationIds.includes(tenantId);
  }

  /** Бросает ошибку, если actor не может управлять организацией. */
  assertCanManageOrganization(actor: TenantActor, tenantId: number) {
    if (!this.hasOrganizationAccess(actor, tenantId)) {
      throw new ForbiddenException(
        'Недостаточно прав для редактирования этой организации',
      );
    }
  }

  /** Проверяет, что actor может назначать сотрудника во все указанные организации. */
  assertCanAssignOrganizations(actor: TenantActor, organizationIds: number[]) {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (
      organizationIds.some(
        (organizationId) => !actor.organizationIds.includes(organizationId),
      )
    ) {
      throw new ForbiddenException(
        'Нельзя назначить сотрудника в недоступную организацию',
      );
    }
  }
}
