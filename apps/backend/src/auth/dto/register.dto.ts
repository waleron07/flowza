import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * Payload публичной регистрации клиента (`user`).
 *
 * Регистрация создает пользователя без подтвержденного email и запускает
 * сценарий отправки одноразового кода. Согласия и `captchaToken` обязательны:
 * backend повторно проверяет их независимо от frontend-валидации.
 */
export class RegisterDto {
  /** Телефон РФ в формате `+79XXXXXXXXX`. */
  @IsNotEmpty({ message: 'Телефон обязателен' })
  @Matches(/^\+7\d{10}$/, {
    message: 'Телефон должен быть номером РФ в формате +79XXXXXXXXX',
  })
  phone: string;

  /** Публичный логин клиента: только латиница, цифры, `_` и `-`. */
  @IsNotEmpty({ message: 'Логин обязателен' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Логин может содержать только латинские буквы, цифры, _ и -',
  })
  login: string;

  /** Email, на который отправляется код подтверждения. */
  @IsEmail({}, { message: 'Email должен быть валидным адресом' })
  email: string;

  /** Пароль клиента; хешируется в `AuthService`, в БД не хранится открыто. */
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  password: string;

  /** Согласие с политикой конфиденциальности. */
  @IsBoolean({ message: 'Согласие с политикой должно быть булевым значением' })
  @Transform(({ value }) => value === true || value === 'true')
  consentToPrivacyPolicy: boolean;

  /** Согласие на обработку персональных данных. */
  @IsBoolean({
    message:
      'Согласие на обработку персональных данных должно быть булевым значением',
  })
  @Transform(({ value }) => value === true || value === 'true')
  consentToPersonalData: boolean;

  /** Версия документа согласия, которую видел пользователь. */
  @IsNotEmpty({ message: 'Версия согласия обязательна' })
  agreementVersion: string;

  /** Клиентский токен Cloudflare Turnstile (или dev mock-token без секрета). */
  @IsNotEmpty({ message: 'Captcha-токен обязателен' })
  captchaToken: string;
}
