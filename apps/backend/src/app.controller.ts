import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Корневой контроллер приложения.
 *
 * Используется как простой smoke-check endpoint для проверки, что backend
 * запущен и отвечает на HTTP-запросы.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Возвращает базовое приветствие приложения. */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
