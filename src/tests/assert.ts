export class AssertError extends Error {}

export function approxEqual(a: number, b: number, eps = 1e-3) {
  if (!isFinite(a) || !isFinite(b) || Math.abs(a - b) > eps) {
    throw new AssertError(`Expected ${a} ≈ ${b} (±${eps})`)
  }
}

export function greaterEqual(a: number, b: number) {
  if (!(a >= b)) throw new AssertError(`Expected ${a} >= ${b}`)
}

export function lessEqual(a: number, b: number) {
  if (!(a <= b)) throw new AssertError(`Expected ${a} <= ${b}`)
}

export function nearZero(a: number, eps = 1e-3) {
  if (!isFinite(a) || Math.abs(a) > eps) throw new AssertError(`Expected ${a} ≈ 0 (±${eps})`)
}

export function between(x: number, lo: number, hi: number) {
  if (!(x >= lo && x <= hi)) throw new AssertError(`Expected ${x} in [${lo}, ${hi}]`)
}

export type TestResult = { name: string; passed: boolean; durationMs: number; message?: string }

export async function runTest(name: string, fn: () => void | Promise<void>): Promise<TestResult> {
  const t0 = performance.now()
  try {
    await fn()
    return { name, passed: true, durationMs: performance.now() - t0 }
  } catch (e: any) {
    const msg = e instanceof AssertError ? e.message : String(e)
    return { name, passed: false, message: msg, durationMs: performance.now() - t0 }
  }
}

