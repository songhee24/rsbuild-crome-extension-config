/**
 * Heavy Calculation — plain TypeScript, no React.
 * Loaded lazily via dynamic import.
 */

export function processData(input: number[]): number {
  if (input.length === 0) return 0;

  const min = Math.min(...input);
  const max = Math.max(...input);
  const range = max - min || 1;

  const normalized = input.map((v) => (v - min) / range);

  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < normalized.length; i++) {
    const weight = Math.exp(-i * 0.1);
    sum += normalized[i] * weight;
    weightSum += weight;
  }

  return Math.round((sum / weightSum) * 10000) / 100;
}

export function parseCSV(raw: string): string[][] {
  return raw
    .trim()
    .split("\n")
    .map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
    );
}

export function formatCurrency(
  value: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
