export function pickFields<T extends object>(
  body: unknown,
  allowedKeys: readonly (keyof T & string)[]
): Partial<T> {
  const updates: Partial<T> = {};

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return updates;
  }

  const source = body as Record<string, unknown>;
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      Object.assign(updates, { [key]: source[key] });
    }
  }

  return updates;
}
