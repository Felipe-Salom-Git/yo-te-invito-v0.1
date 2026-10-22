/** Whole pesos typed by admin («50.000», «50000») → cents string. Non-digits ignored. */
export function pesosInputToCentsString(pesos: string): string {
  const digits = pesos.replace(/\D/g, '');
  if (!digits) return '0';
  return (BigInt(digits) * BigInt(100)).toString();
}
