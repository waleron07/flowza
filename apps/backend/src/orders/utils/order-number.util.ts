export function generateOrderNumber(
  sequence: number,
  issuedAt: Date = new Date(),
): string {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error('Order sequence must be a positive integer');
  }

  const year = issuedAt.getUTCFullYear();
  const paddedSequence = sequence.toString().padStart(6, '0');

  return `FD-${year}-${paddedSequence}`;
}
