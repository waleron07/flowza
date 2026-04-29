import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

/**
 * Точка входа backend-приложения.
 *
 * Создает Nest-приложение, применяет общие настройки и запускает HTTP-сервер.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app, { enableDocs: true });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
