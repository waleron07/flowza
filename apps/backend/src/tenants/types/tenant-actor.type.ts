import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Минимальный контекст пользователя для проверки доступа к организациям.
 *
 * Формируется из JWT payload и используется сервисами без зависимости от
 * HTTP-слоя.
 */
export interface TenantActor {
  /** Роль пользователя в системе. */
  role: UserRole;

  /** ID организаций, доступных пользователю по staff-назначениям. */
  organizationIds: number[];
}
