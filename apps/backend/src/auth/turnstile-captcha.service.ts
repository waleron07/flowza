import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Серверная проверка Cloudflare Turnstile.
 *
 * Frontend-токен нельзя считать доверенным: сервис всегда проверяет его через
 * Cloudflare `siteverify`. Если `TURNSTILE_SECRET_KEY` не задан, разрешается
 * только dev mock-token из `CAPTCHA_MOCK_VALID_TOKEN`.
 */
@Injectable()
export class TurnstileCaptchaService {
  private readonly logger = new Logger(TurnstileCaptchaService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Проверяет captcha-token регистрации.
   *
   * @param token Значение, полученное от Turnstile на frontend.
   * @param remoteIp IP пользователя; передается Cloudflare как дополнительный сигнал.
   * @throws UnauthorizedException если токен пустой, просрочен или отклонен.
   * @throws InternalServerErrorException если запрос к Cloudflare не удался.
   */
  async assertValidToken(token: string, remoteIp?: string): Promise<void> {
    const trimmed = token?.trim();
    if (!trimmed) {
      throw new UnauthorizedException('Токен капчи недействителен');
    }

    const secret = this.configService.get<string>('TURNSTILE_SECRET_KEY')?.trim();
    const mockToken =
      this.configService.get<string>('CAPTCHA_MOCK_VALID_TOKEN') ??
      'mock-captcha-token';

    if (!secret) {
      if (trimmed === mockToken) {
        return;
      }
      throw new UnauthorizedException('Токен капчи недействителен');
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
          `Проверка Turnstile не пройдена: ${JSON.stringify(data['error-codes'])}`,
        );
        throw new UnauthorizedException('Токен капчи недействителен');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Запрос проверки Turnstile завершился ошибкой', error);
      throw new InternalServerErrorException('Не удалось проверить капчу');
    }
  }
}
