import { linspace, normalizeDensity } from './math.js'

export type Gaussian = { mean: number; sigma: number; weight: number }
export type Mixture = { components: Gaussian[] }

export function normalizeWeights(components: Gaussian[]): Gaussian[] {
  const s = components.reduce((a, c) => a + Math.max(0, c.weight), 0)
  if (s === 0) return components.map(c => ({ ...c, weight: 0 }))
  return components.map(c => ({ ...c, weight: Math.max(0, c.weight) / s }))
}

export function gaussianPDF(x: number, mean: number, sigma: number): number {
  const zs = (x - mean) / sigma
  return Math.exp(-0.5 * zs * zs) / (Math.SQRT2 * Math.sqrt(Math.PI) * sigma)
}

export function mixturePDFAt(x: number, comps: Gaussian[]): number {
  let s = 0
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i]
    s += c.weight * gaussianPDF(x, c.mean, c.sigma)
  }
  return s
}

export function mixturePDFArray(xs: Float64Array, comps: Gaussian[]): Float64Array {
  const out = new Float64Array(xs.length)
  for (let i = 0; i < xs.length; i++) out[i] = mixturePDFAt(xs[i], comps)
  return out
}

export function amplitudeAtMean(c: Gaussian): number {
  return c.weight * gaussianPDF(c.mean, c.mean, c.sigma)
}

export function defaultMixture(kind: 'unimodal' | 'bimodal' | 'trimodal' = 'bimodal'): Gaussian[] {
  if (kind === 'unimodal') return [ { mean: 0, sigma: 0.8, weight: 1 } ]
  if (kind === 'trimodal') return [
    { mean: -2.2, sigma: 0.6, weight: 0.33 },
    { mean: 0.2, sigma: 0.8, weight: 0.34 },
    { mean: 2.5, sigma: 0.7, weight: 0.33 },
  ]
  return [
    { mean: -1.5, sigma: 0.7, weight: 0.5 },
    { mean: 1.2, sigma: 0.9, weight: 0.5 },
  ]
}

export function makeGrid(domain: [number, number], n = 1024) {
  return linspace(domain[0], domain[1], n)
}

export function densityOnGrid(comps: Gaussian[], grid: Float64Array, dx: number): Float64Array {
  const y = mixturePDFArray(grid, normalizeWeights(comps))
  return normalizeDensity(y, dx)
}

// Randoms
function randn(): number {
  // Box–Muller transform
  let u = 0, v = 0
  while (u === 0) u = Math.random() // avoids 0
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function sampleMixture(components: Gaussian[], n: number): Float64Array {
  const comps = normalizeWeights(components)
  const cdf = new Float64Array(comps.length)
  let s = 0
  for (let i = 0; i < comps.length; i++) { s += comps[i].weight; cdf[i] = s }
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const r = Math.random()
    let idx = 0
    while (idx < cdf.length && r > cdf[idx]) idx++
    const c = comps[Math.min(idx, comps.length - 1)]
    out[i] = c.mean + c.sigma * randn()
  }
  return out
}

export function histogramDensity(samples: Float64Array, bins: number, domain: [number, number]): { xs: Float64Array, ys: Float64Array } {
  const [minX, maxX] = domain
  const width = (maxX - minX) / bins
  const xs = new Float64Array(bins)
  const counts = new Float64Array(bins)
  for (let i = 0; i < bins; i++) xs[i] = minX + (i + 0.5) * width
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i]
    const k = Math.floor((x - minX) / width)
    if (k >= 0 && k < bins) counts[k] += 1
  }
  // Convert to density: count / (N * bin_width)
  const ys = new Float64Array(bins)
  const N = samples.length
  const factor = 1 / (N * width)
  for (let i = 0; i < bins; i++) ys[i] = counts[i] * factor
  return { xs, ys }
}
