import { HealthService } from './health.service';

describe('Сервис проверки состояния', () => {
  it('возвращает статус ok', () => {
    const service = new HealthService();

    expect(service.getHealth()).toEqual({ status: 'ok' });
  });
});
