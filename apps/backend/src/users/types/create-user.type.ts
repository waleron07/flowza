import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Внутренний payload создания пользователя.
 *
 * Используется сервисным слоем после валидации DTO и подготовки `passwordHash`.
 */
export interface CreateUserInput {
  /** Основная организация пользователя. */
  primaryTenantId?: number;

  /** Организации, к которым пользователь получает staff-доступ. */
  organizationIds?: number[];

  /** Email пользователя. */
  email: string;

  /** Дата подтверждения email, если пользователь создается уже подтвержденным. */
  emailVerifiedAt?: Date | null;

  /** Телефон пользователя. */
  phone: string;

  /** Bcrypt-хэш пароля пользователя. */
  passwordHash: string;

  /** Роль пользователя в системе. */
  role: UserRole;

  /** Login пользователя для входа. */
  login: string;

  /** Флаг активности учетной записи. */
  isActive?: boolean;
}
