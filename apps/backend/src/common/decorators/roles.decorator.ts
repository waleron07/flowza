import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

/** Metadata key, по которому `RolesGuard` читает список разрешенных ролей. */
export const ROLES_KEY = 'roles';

/**
 * Декоратор ограничения доступа по ролям.
 *
 * Можно ставить на контроллер или отдельный handler. `RolesGuard` объединяет
 * metadata с метода и класса через `getAllAndOverride`.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
