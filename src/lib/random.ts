/** Seudo-random determinístico (mulberry32). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashCode(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = (hash * 33) ^ text.charCodeAt(i);
  return hash >>> 0;
}

export function pick<T>(rand: () => number, values: readonly T[]): T {
  const value = values[Math.floor(rand() * values.length) % values.length];
  return value ?? (values[0] as T);
}
