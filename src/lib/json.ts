/**
 * Reads a JSON column defensively. Depending on the driver and on how a row was written, a JSON
 * value can come back as the object itself or as text (even text inside text): accept both, and
 * fall back instead of crashing a whole page over one odd row.
 */
export function asJson<T>(value: unknown, fallback: T): T {
  let x: unknown = value;
  for (let i = 0; i < 3 && typeof x === "string"; i++) {
    try {
      x = JSON.parse(x);
    } catch {
      return fallback;
    }
  }
  return (x ?? fallback) as T;
}
