import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('Контроллер приложения', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('корневой маршрут', () => {
    it('возвращает строку Hello World!', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
