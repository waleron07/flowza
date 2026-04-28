/**
 * Генерирует человекочитаемый номер заказа.
 *
 * Формат: `FD-YYYY-000001`, где `sequence` обычно равен ID заказа из БД.
 * Год берется в UTC, чтобы номер не зависел от timezone сервера.
 */
export function generateOrderNumber(
  sequence: number,
  issuedAt: Date = new Date(),
): string {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error('Порядковый номер заказа должен быть положительным целым числом');
  }

  const year = issuedAt.getUTCFullYear();
  const paddedSequence = sequence.toString().padStart(6, '0');

  return `FD-${year}-${paddedSequence}`;
}
