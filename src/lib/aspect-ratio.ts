function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function computeAspectRatio(width: number, height: number): string {
  const d = gcd(width, height);
  const w = width / d;
  const h = height / d;
  const known: Record<string, string> = {
    '16:9': '16:9', '9:16': '9:16', '1:1': '1:1',
    '4:5': '4:5', '5:4': '5:4', '4:3': '4:3', '3:4': '3:4',
  };
  const ratio = `${w}:${h}`;
  return known[ratio] ?? ratio;
}

export function computeDimensionsLabel(width: number, height: number): string {
  return `${width}×${height}`;
}

export function computeFileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
