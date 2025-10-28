import test from 'node:test'
import assert from 'node:assert/strict'

import { makeGrid, densityOnGrid } from '../dist-lib/lib/mixture.js'
import { computeAll } from '../dist-lib/lib/divergences.js'
import { fitModelToTarget } from '../dist-lib/lib/optimize.js'

function gaussian(mean, sigma, weight = 1) { return [{ mean, sigma, weight }] }
function bimodal(m1, s1, w1, m2, s2, w2) {
  return [
    { mean: m1, sigma: s1, weight: w1 },
    { mean: m2, sigma: s2, weight: w2 },
  ]
}

function argminGridKL_PQ(domain, gridN, qComps) {
  const grid = makeGrid(domain, gridN)
  const dx = (domain[1] - domain[0]) / (gridN - 1)
  const qY = densityOnGrid(qComps, grid, dx)
  let best = { v: Infinity, mu: 0, sigma: 1 }
  for (let mu = domain[0]; mu <= domain[1] + 1e-9; mu += (domain[1]-domain[0]) / 80) {
    for (let sigma = 0.25; sigma <= 2.5 + 1e-9; sigma += 0.05) {
      const pY = densityOnGrid(gaussian(mu, sigma), grid, dx)
      const v = computeAll(pY, qY, dx).kl_pq
      if (v < best.v) best = { v, mu, sigma }
    }
  }
  return { ...best, grid, dx, qY }
}

test('optimizer moves toward grid minimum for KL(P||Q)', async () => {
  const domain = [-6, 6]
  const gridN = 1024
  // Asymmetric bimodal Q similar to app defaults
  const qComps = bimodal(-1.5, 0.55, 0.873, 1.2, 0.75, 0.166)
  const { mu, sigma, v: vMin, grid, dx, qY } = argminGridKL_PQ(domain, gridN, qComps)

  // Start P away from min
  const init = [{ mean: 0, sigma: 0.8, weight: 1 }]
  const pY0 = densityOnGrid(init, grid, dx)
  const v0 = computeAll(pY0, qY, dx).kl_pq

  const { comps: finalComps } = await fitModelToTarget({
    model: { kind: 'gaussian' },
    initial: init,
    targetY: qY,
    grid,
    dx,
    objective: 'kl_pq',
    steps: 140,
    lr: 0.1,
    domain,
  })

  const pf = finalComps[0]
  const pYf = densityOnGrid(finalComps, grid, dx)
  const vf = computeAll(pYf, qY, dx).kl_pq

  // Objective should decrease
  assert.ok(vf < v0, `KL did not decrease: v0=${v0}, vf=${vf}`)
  // Final should be closer to grid argmin than initial (in mean and sigma)
  const d0 = Math.hypot(init[0].mean - mu, Math.log(init[0].sigma) - Math.log(sigma))
  const df = Math.hypot(pf.mean - mu, Math.log(pf.sigma) - Math.log(sigma))
  assert.ok(df < d0, `Final params not closer to grid min: d0=${d0}, df=${df}, min=(${mu},${sigma}), final=(${pf.mean},${pf.sigma})`)
  // Close to within reasonable tolerance of grid min
  assert.ok(vf <= vMin * 1.25 + 1e-3, `Final KL not near grid min: vf=${vf}, vMin=${vMin}`)
})

test('optimizer decreases KL(Q||P) from off-center start', async () => {
  const domain = [-6, 6]
  const gridN = 1024
  const qComps = bimodal(-1.5, 0.55, 0.873, 1.2, 0.75, 0.166)
  const grid = makeGrid(domain, gridN)
  const dx = (domain[1] - domain[0]) / (gridN - 1)
  const qY = densityOnGrid(qComps, grid, dx)

  const init = [{ mean: 2.0, sigma: 0.5, weight: 1 }]
  const pY0 = densityOnGrid(init, grid, dx)
  const v0 = computeAll(pY0, qY, dx).kl_qp

  const { comps: finalComps } = await fitModelToTarget({
    model: { kind: 'gaussian' },
    initial: init,
    targetY: qY,
    grid,
    dx,
    objective: 'kl_qp',
    steps: 120,
    lr: 0.12,
    domain,
  })
  const pYf = densityOnGrid(finalComps, grid, dx)
  const vf = computeAll(pYf, qY, dx).kl_qp
  assert.ok(vf < v0, `KL(Q||P) did not decrease: v0=${v0}, vf=${vf}`)
})
