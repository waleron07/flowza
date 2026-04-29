import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Нормализованная запись пользователя внутри backend.
 *
 * Скрывает различия Prisma-модели и legacy-полей, чтобы auth и users-сервисы
 * работали с единым контрактом.
 */
export interface UserRecord {
  /** ID пользователя. */
  id: number;

  /** Основная организация пользователя. */
  primaryTenantId: number | null;

  /** Организации, доступные пользователю. */
  organizationIds: number[];

  /** Email пользователя. */
  email: string;

  /** Дата подтверждения email. */
  emailVerifiedAt: Date | null;

  /** Телефон пользователя. */
  phone: string;

  /** Bcrypt-хэш пароля. */
  passwordHash: string;

  /** Роль пользователя. */
  role: UserRole;

  /** Login пользователя. */
  login: string;

  /** Флаг активности учетной записи. */
  isActive: boolean;

  /** Дата создания пользователя. */
  createdAt: Date;

  /** Дата последнего обновления пользователя. */
  updatedAt: Date;
}
