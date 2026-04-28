import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './types/jwt-payload.type';
import { UsersService } from '../users/users.service';

/**
 * Passport strategy для проверки Bearer JWT.
 *
 * Помимо проверки подписи/срока жизни токена, strategy перечитывает
 * пользователя из БД: так деактивация аккаунта начинает действовать сразу,
 * даже если старый JWT еще формально не истек.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev_jwt_secret'),
    });
  }

  /**
   * Валидирует payload после проверки подписи Passport'ом.
   *
   * @throws UnauthorizedException если payload битый, пользователь удален или деактивирован.
   * @returns объект, который Nest положит в `req.user`.
   */
  async validate(payload: JwtPayload) {
    if (!payload?.userId) {
      throw new UnauthorizedException('Некорректные данные токена');
    }

    const user = await this.usersService.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Пользователь деактивирован');
    }

    return {
      userId: user.id,
      primaryTenantId: user.primaryTenantId,
      organizationIds: user.organizationIds ?? [],
      role: user.role,
    };
  }
}
