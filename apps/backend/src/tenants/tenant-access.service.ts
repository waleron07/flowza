import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantActor } from './types/tenant-actor.type';

@Injectable()
export class TenantAccessService {
  normalizeOrganizationIds(organizationIds?: number[]): number[] {
    return [...new Set(organizationIds ?? [])].sort((left, right) => left - right);
  }

  hasOrganizationAccess(actor: TenantActor, tenantId: number): boolean {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    return actor.organizationIds.includes(tenantId);
  }

  assertCanManageOrganization(actor: TenantActor, tenantId: number) {
    if (!this.hasOrganizationAccess(actor, tenantId)) {
      throw new ForbiddenException(
        'Недостаточно прав для редактирования этой организации',
      );
    }
  }

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
