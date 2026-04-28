import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';
import { ResendEmailCodeDto } from './dto/resend-email-code.dto';

/**
 * HTTP-контроллер auth API.
 *
 * Содержит только transport-слой: DTO, guards и извлечение IP/userId из
 * request. Вся доменная логика регистрации, login и email-верификации живет
 * в `AuthService`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Регистрирует клиента и запускает шаг подтверждения email-кодом. */
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: { ip?: string }) {
    return this.authService.register(dto, { ip: req.ip });
  }

  /** Выполняет login по email/телефону/login + password. */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Подтверждает email одноразовым кодом и возвращает auth-session. */
  @Post('register/verify-email')
  verifyEmail(@Body() dto: VerifyEmailCodeDto, @Req() req: { ip?: string }) {
    return this.authService.verifyEmailCode(dto, { ip: req.ip });
  }

  /** Повторно создает и отправляет код подтверждения при соблюдении cooldown. */
  @Post('register/resend-email-code')
  resendEmailCode(@Body() dto: ResendEmailCodeDto) {
    return this.authService.resendEmailCode(dto);
  }

  /** Возвращает текущего пользователя из JWT-сессии. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { userId: number } }) {
    return this.authService.me(req.user.userId);
  }

  /** Soft-delete текущего аккаунта. */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteMe(@Req() req: { user: { userId: number } }) {
    return this.authService.deleteMe(req.user.userId);
  }
}
