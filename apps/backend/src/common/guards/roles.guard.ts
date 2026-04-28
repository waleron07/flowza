import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

/**
 * Guard для проверки `@Roles(...)`.
 *
 * Предполагает, что `JwtAuthGuard` уже положил пользователя в `request.user`.
 * Если route не помечен ролями, доступ разрешается.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Проверяет, входит ли роль текущего пользователя в список разрешенных ролей.
   *
   * @throws ForbiddenException если пользователь не аутентифицирован или его роль не разрешена.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: UserRole } }>();
    const userRole = request.user?.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Недостаточно прав доступа');
    }

    return true;
  }
}
