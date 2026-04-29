import { Injectable } from '@nestjs/common';

/**
 * Корневой сервис приложения.
 *
 * Сейчас используется только корневым smoke-check endpoint.
 */
@Injectable()
export class AppService {
  /** Возвращает простое сообщение, подтверждающее работу приложения. */
  getHello(): string {
    return 'Hello World!';
  }
}
