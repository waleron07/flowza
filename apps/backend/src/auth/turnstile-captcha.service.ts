import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

@Injectable()
export class TurnstileCaptchaService {
  private readonly logger = new Logger(TurnstileCaptchaService.name);

  constructor(private readonly configService: ConfigService) {}

  async assertValidToken(token: string, remoteIp?: string): Promise<void> {
    const trimmed = token?.trim();
    if (!trimmed) {
      throw new UnauthorizedException('Captcha token is invalid');
    }

    const secret = this.configService.get<string>('TURNSTILE_SECRET_KEY')?.trim();
    const mockToken =
      this.configService.get<string>('CAPTCHA_MOCK_VALID_TOKEN') ??
      'mock-captcha-token';

    if (!secret) {
      if (trimmed === mockToken) {
        return;
      }
      throw new UnauthorizedException('Captcha token is invalid');
    }

    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', trimmed);
    const ip = remoteIp?.trim();
    if (ip) {
      body.set('remoteip', ip);
    }

    try {
      const res = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = (await res.json()) as {
        success: boolean;
        'error-codes'?: string[];
      };
      if (!data.success) {
        this.logger.warn(
          `Turnstile verification failed: ${JSON.stringify(data['error-codes'])}`,
        );
        throw new UnauthorizedException('Captcha token is invalid');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Turnstile request failed', error);
      throw new InternalServerErrorException('Captcha verification failed');
    }
  }
}
