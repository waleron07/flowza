import { IsEmail, Matches } from 'class-validator';

/**
 * Payload подтверждения email одноразовым кодом.
 *
 * Код хранится в БД только в виде hash, поэтому в сервис передается raw-код,
 * введенный пользователем.
 */
export class VerifyEmailCodeDto {
  /** Email пользователя, ожидающего подтверждение. */
  @IsEmail()
  email: string;

  /** Шестизначный код из письма. */
  @Matches(/^\d{6}$/, {
    message: 'Код подтверждения должен содержать 6 цифр',
  })
  code: string;
}
