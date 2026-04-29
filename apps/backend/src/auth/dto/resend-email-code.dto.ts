import { IsEmail } from 'class-validator';

/**
 * Payload повторной отправки кода подтверждения email.
 *
 * Ответ сервиса остается нейтральным, чтобы не раскрывать существование
 * аккаунта по email.
 */
export class ResendEmailCodeDto {
  /** Email, указанный при регистрации. */
  @IsEmail({}, { message: 'Email должен быть валидным адресом' })
  email: string;
}
