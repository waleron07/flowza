import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard для маршрутов, требующих валидный Bearer JWT.
 *
 * Фактическая валидация payload и состояния пользователя выполняется в
 * `JwtStrategy`; guard только подключает passport strategy `jwt` к маршруту.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
