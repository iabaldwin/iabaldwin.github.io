import { densityOnGrid, Gaussian, normalizeWeights } from './mixture.js'
import { computeAll } from './divergences.js'

export type Objective = 'kl_pq' | 'kl_qp' | 'js' | 'tv' | 'hellinger' | 'bhattacharyya' | 'w1'
export type ModelType = { kind: 'gaussian' } | { kind: 'gmm', k: number }

export function objectiveValue(p: Float64Array, q: Float64Array, dx: number, obj: Objective): number {
  const m = computeAll(p, q, dx)
  switch (obj) {
    case 'kl_pq': return m.kl_pq
    case 'kl_qp': return m.kl_qp
    case 'js': return m.js
    case 'tv': return m.tv
    case 'hellinger': return m.hellinger
    case 'bhattacharyya': return m.bhattacharyya
    case 'w1': return m.w1
  }
}

// Parameterization
// gaussian: theta = [ mean, log_sigma ]
// gmm(k): theta = [ means(k), log_sigmas(k), logits(k) ] with weights = softmax(logits)

export function packParams(model: ModelType, comps: Gaussian[]): Float64Array {
  if (model.kind === 'gaussian') {
    const c = comps[0] ?? { mean: 0, sigma: 1, weight: 1 }
    return new Float64Array([ c.mean, Math.log(c.sigma) ])
  }
  const k = model.k
  const cs = normalizeWeights(comps).slice(0, k)
  while (cs.length < k) cs.push({ mean: 0, sigma: 1, weight: 1 / k })
  const theta = new Float64Array(3 * k)
  for (let i = 0; i < k; i++) theta[i] = cs[i].mean
  for (let i = 0; i < k; i++) theta[k + i] = Math.log(cs[i].sigma)
  for (let i = 0; i < k; i++) theta[2 * k + i] = Math.log(cs[i].weight + 1e-12)
  return theta
}

function softmax(logits: Float64Array): Float64Array {
  const max = Math.max(...Array.from(logits))
  const exps = logits.map(v => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return Float64Array.from(exps.map(v => v / sum))
}

export function unpackParams(model: ModelType, theta: Float64Array): Gaussian[] {
  if (model.kind === 'gaussian') {
    const mean = theta[0]
    const sigma = Math.max(1e-3, Math.exp(theta[1]))
    return [ { mean, sigma, weight: 1 } ]
  }
  const k = model.k
  const means = theta.slice(0, k)
  const logSigmas = theta.slice(k, 2 * k)
  const logits = theta.slice(2 * k, 3 * k)
  const weights = softmax(logits as Float64Array)
  const comps: Gaussian[] = []
  for (let i = 0; i < k; i++) comps.push({ mean: means[i], sigma: Math.max(1e-3, Math.exp(logSigmas[i])), weight: weights[i] })
  return comps
}

export type FitOptions = {
  model: ModelType
  initial: Gaussian[]
  targetY: Float64Array
  grid: Float64Array
  dx: number
  objective: Objective
  steps: number
  lr: number
  domain: [number, number]
  onUpdate?: (comps: Gaussian[], step: number, value: number) => void
  abortSignal?: () => boolean
}

export async function fitModelToTarget(opts: FitOptions): Promise<{ comps: Gaussian[], history: number[] } > {
  const { model, initial, targetY, grid, dx, objective, steps, lr, domain, onUpdate, abortSignal } = opts
  let theta = packParams(model, initial)
  const eps = makeEps(model, domain)
  const history: number[] = []

  for (let t = 0; t < steps; t++) {
    if (abortSignal && abortSignal()) break
    const grad = finiteDiffGrad(theta, eps, (th) => objectiveForTheta(model, th, targetY, grid, dx, objective))
    for (let i = 0; i < theta.length; i++) theta[i] -= lr * grad[i]
    // Clamp means into domain to avoid drifting too far
    clampMeansInPlace(model, theta, domain)

    const comps = unpackParams(model, theta)
    const value = objectiveForTheta(model, theta, targetY, grid, dx, objective)
    history.push(value)
    if (onUpdate) onUpdate(comps, t, value)
    // Yield: RAF in browser, setImmediate/timeout in Node
    await yieldTick()
  }

  return { comps: unpackParams(model, theta), history }
}

function objectiveForTheta(model: ModelType, theta: Float64Array, targetY: Float64Array, grid: Float64Array, dx: number, obj: Objective): number {
  const comps = unpackParams(model, theta)
  const pY = densityOnGrid(comps, grid, dx)
  return objectiveValue(pY, targetY, dx, obj)
}

function finiteDiffGrad(theta: Float64Array, eps: Float64Array, f: (th: Float64Array) => number): Float64Array {
  const g = new Float64Array(theta.length)
  for (let i = 0; i < theta.length; i++) {
    const e = eps[i]
    const tp = theta.slice() as Float64Array
    const tm = theta.slice() as Float64Array
    tp[i] += e
    tm[i] -= e
    const fp = f(tp)
    const fm = f(tm)
    g[i] = (fp - fm) / (2 * e)
  }
  return g
}

function makeEps(model: ModelType, domain: [number, number]): Float64Array {
  if (model.kind === 'gaussian') {
    const w = domain[1] - domain[0]
    return new Float64Array([ 1e-3 * w, 5e-3 ])
  }
  const k = model.k
  const w = domain[1] - domain[0]
  const eps = new Float64Array(3 * k)
  for (let i = 0; i < k; i++) eps[i] = 1e-3 * w
  for (let i = 0; i < k; i++) eps[k + i] = 5e-3
  for (let i = 0; i < k; i++) eps[2 * k + i] = 5e-3
  return eps
}

function clampMeansInPlace(model: ModelType, theta: Float64Array, domain: [number, number]) {
  if (model.kind === 'gaussian') {
    theta[0] = Math.max(domain[0], Math.min(domain[1], theta[0]))
    return
  }
  const k = model.k
  for (let i = 0; i < k; i++) theta[i] = Math.max(domain[0], Math.min(domain[1], theta[i]))
}

async function yieldTick(): Promise<void> {
  const hasRAF = typeof (globalThis as any).requestAnimationFrame === 'function'
  if (hasRAF) {
    await new Promise<void>(resolve => (globalThis as any).requestAnimationFrame(() => resolve()))
    return
  }
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}
