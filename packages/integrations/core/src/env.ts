/**
 * A missing OAuth/API credential must fail loudly at connect time with a
 * named error, not silently degrade into an empty string that produces an
 * opaque 401 from the marketplace. Never use `process.env[name] ?? ''`
 * for connector credentials — use `requireEnv` instead.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * `connect(params: Record<string, string>)` yields `string | undefined` per
 * key under `noUncheckedIndexedAccess`. A missing OAuth `code` (or other
 * required param) means the callback is malformed and must fail loudly,
 * not silently coerce to `''` or be asserted non-null with `!`.
 */
export function requireParam(
  params: Record<string, string>,
  key: string,
  context: string,
): string {
  const value = params[key]
  if (!value) {
    throw new Error(`${context}: missing required parameter "${key}"`)
  }
  return value
}
