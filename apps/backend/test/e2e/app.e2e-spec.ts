import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

describe('E2E проверки приложения', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, { enableDocs: true });
    await app.init();
  });

  it('GET /health возвращает статус ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /health добавляет x-request-id в ответ', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /unknown возвращает единый формат 404 ошибки', async () => {
    const response = await request(app.getHttpServer())
      .get('/unknown')
      .expect(404);

    const body = response.body as {
      success: false;
      statusCode: number;
      errorCode: string;
      path: string;
      message: string;
      timestamp: string;
    };

    expect(body).toMatchObject({
      success: false,
      statusCode: 404,
      errorCode: 'NOT_FOUND',
      path: '/unknown',
    });
    expect(body.message).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('GET /docs-json возвращает openapi документ', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);

    const body = response.body as {
      openapi: string;
      info?: {
        title?: string;
      };
    };

    expect(body.openapi).toBeDefined();
    expect(body.info?.title).toBe('Flowza Backend API');
  });
});
