import { cumsum, normalizeDensity } from './math.js'

// Use an extremely small epsilon to avoid biasing KL(Q||P) in low-probability regions.
// Too-large EPS can flip expected KL asymmetry (mode-covering vs mode-seeking).
const EPS = 1e-300

export type DivergenceResult = {
  kl_pq: number
  kl_qp: number
  js: number
  jeffreys: number
  cross_pq: number
  cross_qp: number
  tv: number
  hellinger: number
  bhattacharyya: number
  w1: number
}

// Helpers operate on discrete densities on a uniform grid with spacing dx

export function computeAll(p: Float64Array, q: Float64Array, dx: number): DivergenceResult {
  const pn = normalizeDensity(p, dx)
  const qn = normalizeDensity(q, dx)

  const kl_pq = kl(pn, qn, dx)
  const kl_qp = kl(qn, pn, dx)
  const cross_pq = crossEntropy(pn, qn, dx)
  const cross_qp = crossEntropy(qn, pn, dx)
  const js = jensenShannon(pn, qn, dx)
  const jeffreys = kl_pq + kl_qp
  const tv = totalVariation(pn, qn, dx)
  const { hellinger, bhattacharyya } = hellingerAndBhattacharyya(pn, qn, dx)
  const w1 = wasserstein1(pn, qn, dx)
  return { kl_pq, kl_qp, js, jeffreys, cross_pq, cross_qp, tv, hellinger, bhattacharyya, w1 }
}

export function kl(p: Float64Array, q: Float64Array, dx: number): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], 0)
    const qi = Math.max(q[i], EPS)
    if (pi > 0) s += pi * Math.log(pi / qi)
  }
  return s * dx
}

export function crossEntropy(p: Float64Array, q: Float64Array, dx: number): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], 0)
    const qi = Math.max(q[i], EPS)
    if (pi > 0) s += -pi * Math.log(qi)
  }
  return s * dx
}

export function jensenShannon(p: Float64Array, q: Float64Array, dx: number): number {
  const m = new Float64Array(p.length)
  for (let i = 0; i < p.length; i++) m[i] = 0.5 * (p[i] + q[i])
  return 0.5 * kl(p, m, dx) + 0.5 * kl(q, m, dx)
}

export function totalVariation(p: Float64Array, q: Float64Array, dx: number): number {
  let s = 0
  for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i])
  return 0.5 * s * dx
}

export function hellingerAndBhattacharyya(p: Float64Array, q: Float64Array, dx: number): { hellinger: number, bhattacharyya: number } {
  let bc = 0 // Bhattacharyya coefficient ∫ sqrt(pq)
  for (let i = 0; i < p.length; i++) bc += Math.sqrt(Math.max(0, p[i] * q[i]))
  bc *= dx
  const h2 = Math.max(0, 1 - bc)
  const hellinger = Math.sqrt(h2)
  const bhattacharyya = -Math.log(Math.max(bc, EPS))
  return { hellinger, bhattacharyya }
}

export function wasserstein1(p: Float64Array, q: Float64Array, dx: number): number {
  const cp = cumsum(p, dx)
  const cq = cumsum(q, dx)
  let s = 0
  for (let i = 0; i < p.length; i++) s += Math.abs(cp[i] - cq[i])
  return s * dx
}
