import {
  BadRequestException,
  INestApplication,
  Logger,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Опции общей настройки Nest-приложения.
 */
type ConfigureAppOptions = {
  /** Включить Swagger UI и JSON-документацию. */
  enableDocs?: boolean;
};

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Преобразует ошибки `class-validator` в плоский список полей и сообщений.
 */
function mapValidationErrors(errors: ValidationError[]) {
  return errors.flatMap((error) => {
    const ownConstraints = Object.values(error.constraints ?? {}).map(
      (message) => ({
        field: error.property,
        message,
      }),
    );

    const nestedConstraints = (error.children ?? []).flatMap((child) =>
      Object.values(child.constraints ?? {}).map((message) => ({
        field: `${error.property}.${child.property}`,
        message,
      })),
    );

    return [...ownConstraints, ...nestedConstraints];
  });
}

/**
 * Подключает Swagger-документацию backend API.
 */
function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Flowza Backend API')
    .setDescription('Документация API backend-сервисов Flowza')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
  });
}

/**
 * Применяет общие настройки приложения: CORS, request-id, access-логи,
 * глобальную валидацию, фильтры ошибок и Swagger при необходимости.
 */
export function configureApp(
  app: INestApplication,
  options?: ConfigureAppOptions,
) {
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:4175',
  ]);

  const logger = new Logger('HttpAccess');

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
        origin,
      );

      if (allowedOrigins.has(origin) || isLocalhost) {
        callback(null, true);
        return;
      }

      callback(new Error('Источник запрещен CORS-политикой'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const requestIdHeader = req.header(REQUEST_ID_HEADER);
    const requestId = requestIdHeader?.trim() || randomUUID();
    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const method = req.method;
      const path = req.originalUrl || req.url;
      const statusCode = res.statusCode;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      const line = `${method} ${path} -> ${statusCode} ${durationMs}ms rid=${requestId} ip=${ip}`;
      if (statusCode >= 500) {
        logger.error(line);
      } else if (statusCode >= 400) {
        logger.warn(line);
      } else {
        logger.log(line);
      }
    });

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          message: 'Ошибка валидации',
          errorCode: 'VALIDATION_ERROR',
          details: mapValidationErrors(errors),
        }),
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  if (options?.enableDocs) {
    setupSwagger(app);
  }

  return app;
}
