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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: { ip?: string }) {
    return this.authService.register(dto, { ip: req.ip });
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register/verify-email')
  verifyEmail(@Body() dto: VerifyEmailCodeDto, @Req() req: { ip?: string }) {
    return this.authService.verifyEmailCode(dto, { ip: req.ip });
  }

  @Post('register/resend-email-code')
  resendEmailCode(@Body() dto: ResendEmailCodeDto) {
    return this.authService.resendEmailCode(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { userId: number } }) {
    return this.authService.me(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteMe(@Req() req: { user: { userId: number } }) {
    return this.authService.deleteMe(req.user.userId);
  }
}
