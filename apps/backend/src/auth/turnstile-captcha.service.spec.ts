import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TurnstileCaptchaService } from './turnstile-captcha.service';

describe('TurnstileCaptchaService', () => {
  it('принимает mock-токен, если секрет Turnstile не задан', async () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'TURNSTILE_SECRET_KEY') {
          return undefined;
        }
        if (key === 'CAPTCHA_MOCK_VALID_TOKEN') {
          return 'mock-captcha-token';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new TurnstileCaptchaService(configService);
    await expect(
      service.assertValidToken('mock-captcha-token'),
    ).resolves.toBeUndefined();
  });

  it('отклоняет неверный токен без секрета Turnstile', async () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'TURNSTILE_SECRET_KEY') {
          return undefined;
        }
        if (key === 'CAPTCHA_MOCK_VALID_TOKEN') {
          return 'mock-captcha-token';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new TurnstileCaptchaService(configService);
    await expect(service.assertValidToken('wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
