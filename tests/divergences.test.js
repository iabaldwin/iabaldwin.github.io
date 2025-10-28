// Node test runner for divergence computations
import test from 'node:test'
import assert from 'node:assert/strict'

import { makeGrid, densityOnGrid } from '../dist-lib/lib/mixture.js'
import { computeAll, jensenShannon, kl, totalVariation, hellingerAndBhattacharyya, wasserstein1, crossEntropy } from '../dist-lib/lib/divergences.js'

function gaussian(mean, sigma, weight = 1) { return [{ mean, sigma, weight }] }

function bimodal(m, sigma = 0.5) {
  return [
    { mean: -m, sigma, weight: 0.5 },
    { mean: +m, sigma, weight: 0.5 },
  ]
}

function entropy(p, dx) {
  // H(P) = -∫ p log p dx
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], 1e-15)
    s += -pi * Math.log(pi)
  }
  return s * dx
}

test('identical distributions yield zero divergences', () => {
  const domain = [-8, 8]
  const grid = makeGrid(domain, 2048)
  const dx = (domain[1] - domain[0]) / (grid.length - 1)
  const pY = densityOnGrid(gaussian(0, 1), grid, dx)
  const qY = densityOnGrid(gaussian(0, 1), grid, dx)
  const m = computeAll(pY, qY, dx)
  assert.ok(Math.abs(m.kl_pq) < 1e-6)
  assert.ok(Math.abs(m.kl_qp) < 1e-6)
  assert.ok(Math.abs(m.js) < 1e-6)
  assert.ok(Math.abs(m.jeffreys) < 1e-6)
  assert.ok(Math.abs(m.tv) < 1e-6)
  assert.ok(Math.abs(m.hellinger) < 1e-6)
  assert.ok(Math.abs(m.bhattacharyya) < 1e-6)
  assert.ok(Math.abs(m.w1) < 1e-6)
})

test('JS divergence is bounded by ln 2 for nearly disjoint distributions', () => {
  const domain = [-20, 20]
  const grid = makeGrid(domain, 4096)
  const dx = (domain[1] - domain[0]) / (grid.length - 1)
  const pY = densityOnGrid(gaussian(-10, 0.3), grid, dx)
  const qY = densityOnGrid(gaussian(+10, 0.3), grid, dx)
  const js = jensenShannon(pY, qY, dx)
  assert.ok(js <= Math.log(2) + 5e-3)
  assert.ok(js >= Math.log(2) - 1e-2) // very close to ln 2
})

test('Wasserstein-1 matches |mean diff| for equal-variance Gaussians', () => {
  const domain = [-10, 10]
  const grid = makeGrid(domain, 4096)
  const dx = (domain[1] - domain[0]) / (grid.length - 1)
  const pY = densityOnGrid(gaussian(-2, 0.8), grid, dx)
  const qY = densityOnGrid(gaussian(+1, 0.8), grid, dx)
  const w1 = wasserstein1(pY, qY, dx)
  assert.ok(Math.abs(w1 - 3) < 5e-2)
})

test('Cross-entropy identity: H(P,Q) = H(P) + KL(P||Q)', () => {
  const domain = [-8, 8]
  const grid = makeGrid(domain, 4096)
  const dx = (domain[1] - domain[0]) / (grid.length - 1)
  const pY = densityOnGrid(gaussian(0.5, 0.9), grid, dx)
  const qY = densityOnGrid(gaussian(-0.3, 1.2), grid, dx)
  const kl_pq = kl(pY, qY, dx)
  const cross = crossEntropy(pY, qY, dx)
  const Hp = entropy(pY, dx)
  assert.ok(Math.abs(cross - (Hp + kl_pq)) < 1e-3)
})

test('KL asymmetry: different optima for bimodal target', () => {
  const domain = [-8, 8]
  const grid = makeGrid(domain, 4096)
  const dx = (domain[1] - domain[0]) / (grid.length - 1)
  const qComps = bimodal(3, 0.5)
  const qY = densityOnGrid(qComps, grid, dx)

  // Sweep mean of a single Gaussian model with fixed sigma
  const sigma = 0.55
  const means = []
  const klpq = []
  const klqp = []
  for (let m = -4; m <= 4; m += 0.05) {
    const pY = densityOnGrid(gaussian(m, sigma), grid, dx)
    const all = computeAll(pY, qY, dx)
    means.push(m)
    klpq.push(all.kl_pq)
    klqp.push(all.kl_qp)
  }
  const argmin = (arr) => arr.reduce((bi, v, i, a) => v < a[bi] ? i : bi, 0)
  const i_pq = argmin(klpq)
  const i_qp = argmin(klqp)
  const m_pq = means[i_pq]
  const m_qp = means[i_qp]
  // Expect KL(P||Q) to be mode-seeking: |m| near target mode ~3
  assert.ok(Math.abs(Math.abs(m_pq) - 3) < 0.3, `KL(P||Q) argmin mean ${m_pq}`)
  // Expect KL(Q||P) to be mode-covering: mean near 0
  assert.ok(Math.abs(m_qp - 0) < 0.3, `KL(Q||P) argmin mean ${m_qp}`)
  // And the locations should be meaningfully different
  assert.ok(Math.abs(m_pq - m_qp) > 1.0)
})

