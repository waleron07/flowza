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
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, {
    message: 'Телефон должен быть номером РФ в формате +79XXXXXXXXX',
  })
  phone: string;

  /** Публичный логин клиента: только латиница, цифры, `_` и `-`. */
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Логин может содержать только латинские буквы, цифры, _ и -',
  })
  login: string;

  /** Email, на который отправляется код подтверждения. */
  @IsEmail()
  email: string;

  /** Пароль клиента; хешируется в `AuthService`, в БД не хранится открыто. */
  @MinLength(8)
  password: string;

  /** Согласие с политикой конфиденциальности. */
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  consentToPrivacyPolicy: boolean;

  /** Согласие на обработку персональных данных. */
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  consentToPersonalData: boolean;

  /** Версия документа согласия, которую видел пользователь. */
  @IsNotEmpty()
  agreementVersion: string;

  /** Клиентский токен Cloudflare Turnstile (или dev mock-token без секрета). */
  @IsNotEmpty()
  captchaToken: string;
}
