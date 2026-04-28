import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Payload, который подписывается в JWT.
 *
 * `organizationIds` нужен staff-ролям с доступом к нескольким организациям.
 * Для обычного клиента (`user`) список обычно пустой, а `primaryTenantId`
 * может быть `null`.
 */
export interface JwtPayload {
  /** ID пользователя в БД. */
  userId: number;
  /** Основная организация/tenant пользователя, если есть. */
  primaryTenantId: number | null;
  /** Доступные организации для staff-сценариев. */
  organizationIds: number[];
  /** Роль пользователя на момент выдачи токена. */
  role: UserRole;
}
