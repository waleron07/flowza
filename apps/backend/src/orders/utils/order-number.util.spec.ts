import { generateOrderNumber } from './order-number.util';

describe('generateOrderNumber', () => {
  it('форматирует номер заказа как FD-год-sequence', () => {
    expect(generateOrderNumber(123, new Date('2026-03-31T10:00:00Z'))).toBe(
      'FD-2026-000123',
    );
  });

  it('дополняет короткие sequence нулями', () => {
    expect(generateOrderNumber(1, new Date('2027-01-01T00:00:00Z'))).toBe(
      'FD-2027-000001',
    );
  });

  it('отклоняет неположительные sequence', () => {
    expect(() => generateOrderNumber(0)).toThrow(
      'Порядковый номер заказа должен быть положительным целым числом',
    );
  });
});
