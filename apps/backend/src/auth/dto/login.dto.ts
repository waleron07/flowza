import { IsNotEmpty } from 'class-validator';

/**
 * Payload входа.
 *
 * `identifier` намеренно универсальный: backend сам определяет, является ли
 * значение телефоном, email или login.
 */
export class LoginDto {
  /** Телефон `+79...`, email или login. */
  @IsNotEmpty({ message: 'Идентификатор входа обязателен' })
  identifier: string;

  /** Пароль пользователя. */
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;
}
