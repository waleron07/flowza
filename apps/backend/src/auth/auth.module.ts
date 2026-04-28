import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { JwtStrategy } from './jwt.strategy';
import { AuthRateLimiterService } from './auth-rate-limiter.service';
import { TurnstileCaptchaService } from './turnstile-captcha.service';

/**
 * Модуль авторизации.
 *
 * Собирает публичные auth-endpoint'ы, JWT strategy, rate limiter и проверку
 * Turnstile. Отправка писем вынесена в `EmailModule`, чтобы SMTP-инфраструктура
 * не была частью домена auth.
 */
@Module({
  imports: [
    ConfigModule,
    UsersModule,
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev_jwt_secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AuthRateLimiterService,
    TurnstileCaptchaService,
  ],
})
export class AuthModule {}
