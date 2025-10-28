export function linspace(min: number, max: number, n: number): Float64Array {
  const arr = new Float64Array(n)
  const step = (max - min) / (n - 1)
  for (let i = 0; i < n; i++) arr[i] = min + i * step
  return arr
}

export function trapz(y: Float64Array, dx: number): number {
  let s = 0
  for (let i = 1; i < y.length; i++) s += (y[i - 1] + y[i]) * 0.5
  return s * dx
}

export function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}

export function sum(y: Float64Array, dx: number): number {
  let s = 0
  for (let i = 0; i < y.length; i++) s += y[i]
  return s * dx
}

export function cumsum(y: Float64Array, dx: number): Float64Array {
  const out = new Float64Array(y.length)
  let s = 0
  for (let i = 0; i < y.length; i++) {
    s += y[i] * dx
    out[i] = s
  }
  // Normalize any tiny numerical drift
  const norm = out[out.length - 1]
  if (norm > 0) {
    for (let i = 0; i < out.length; i++) out[i] /= norm
  }
  return out
}

export function normalizeDensity(y: Float64Array, dx: number): Float64Array {
  const s = sum(y, dx)
  const out = new Float64Array(y.length)
  const inv = s > 0 ? 1 / s : 1
  for (let i = 0; i < y.length; i++) out[i] = y[i] * inv
  return out
}

