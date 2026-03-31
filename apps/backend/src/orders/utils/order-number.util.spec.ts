import { generateOrderNumber } from './order-number.util';

describe('generateOrderNumber', () => {
  it('formats order number as FD-year-sequence', () => {
    expect(generateOrderNumber(123, new Date('2026-03-31T10:00:00Z'))).toBe(
      'FD-2026-000123',
    );
  });

  it('pads small sequence values', () => {
    expect(generateOrderNumber(1, new Date('2027-01-01T00:00:00Z'))).toBe(
      'FD-2027-000001',
    );
  });

  it('rejects non-positive sequence values', () => {
    expect(() => generateOrderNumber(0)).toThrow(
      'Order sequence must be a positive integer',
    );
  });
});
