import { useEffect, useMemo, useRef } from 'react'
import { objectiveValue } from '../lib/optimize'
import { densityOnGrid, Gaussian } from '../lib/mixture'

type Props = {
  width: number
  height: number
  domain: [number, number]
  sigmaRange: [number, number]
  resolution?: { nx: number, ny: number }
  grid: Float64Array
  dx: number
  qY: Float64Array
  objective: import('../lib/optimize').Objective
  path?: { mean: number, sigma: number }[]
  current?: Gaussian
}

// Viridis colormap (perceptual). t in [0,1] → [r,g,b] in [0,1]
function viridis(t: number): [number, number, number] {
  const LUT = [
    [68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142], [33, 144, 141],
    [39, 173, 129], [92, 200, 99], [170, 220, 50], [253, 231, 37]
  ]
  const x = Math.max(0, Math.min(1, t)) * (LUT.length - 1)
  const i = Math.floor(x), f = x - i
  const a = LUT[i], b = LUT[Math.min(LUT.length - 1, i + 1)]
  const r = (a[0] + f * (b[0] - a[0])) / 255
  const g = (a[1] + f * (b[1] - a[1])) / 255
  const bl = (a[2] + f * (b[2] - a[2])) / 255
  return [r, g, bl]
}

export default function ParamHeatmap({ width, height, domain, sigmaRange, resolution = { nx: 72, ny: 54 }, grid, dx, qY, objective, path, current }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pad = { left: 36, right: 12, top: 16, bottom: 26 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const [minMu, maxMu] = domain
  const [minS, maxS] = sigmaRange
  const nx = Math.max(8, resolution.nx)
  const ny = Math.max(8, resolution.ny)

  // Precompute grid of params
  const mus = useMemo(() => {
    const out = new Float64Array(nx)
    for (let i = 0; i < nx; i++) out[i] = minMu + (i / (nx - 1)) * (maxMu - minMu)
    return out
  }, [minMu, maxMu, nx])
  const sigmas = useMemo(() => {
    const out = new Float64Array(ny)
    for (let j = 0; j < ny; j++) out[j] = minS + (j / (ny - 1)) * (maxS - minS)
    return out
  }, [minS, maxS, ny])

  // Compute objective heat values (mu on x, sigma on y)
  const values = useMemo(() => {
    const vals = new Float64Array(nx * ny)
    // Coarse grid density evaluation
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const mu = mus[i]
        const s = sigmas[j]
        const pY = densityOnGrid([{ mean: mu, sigma: s, weight: 1 }], grid, dx)
        const v = objectiveValue(pY, qY, dx, objective)
        vals[j * nx + i] = isFinite(v) ? v : 1e9
      }
    }
    return vals
  }, [mus, sigmas, grid, dx, qY, nx, ny, objective])

  // Robust normalization for color mapping
  const [vmin, v95, vmax, minIdx] = useMemo(() => {
    const arr = Array.from(values)
    let min = Infinity, minI = 0
    for (let i = 0; i < arr.length; i++) if (arr[i] < min) { min = arr[i]; minI = i }
    const sorted = arr.slice().sort((a,b)=>a-b)
    const lo = sorted[0]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const hi = sorted[sorted.length - 1]
    return [lo, p95, hi, minI]
  }, [values])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, width, height)
    // Background panel
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    roundRect(ctx, pad.left-6, pad.top-8, innerW+12, innerH+14, 10)
    ctx.fill()
    ctx.stroke()

    // Draw heatmap pixels into inner area
    const img = ctx.createImageData(innerW, innerH)
    const data = img.data
    const log = (x:number) => Math.log(x + 1e-18)
    // Normalize so that t=0 at global min and t=1 at ~95th percentile
    const lmin = log(vmin)
    const l95 = log(v95)
    const inv = 1 / Math.max(1e-12, (l95 - lmin))
    for (let y = 0; y < innerH; y++) {
      const jy = Math.min(ny - 1, Math.floor((y / (innerH - 1)) * (ny - 1)))
      for (let x = 0; x < innerW; x++) {
        const ix = Math.min(nx - 1, Math.floor((x / (innerW - 1)) * (nx - 1)))
        const v = values[jy * nx + ix]
        const t0 = Math.max(0, Math.min(1, (log(v) - lmin) * inv))
        // Map low (better) → bright (yellow), high → dark (purple)
        const [r, g, b] = viridis(1 - t0)
        const k = (y * innerW + x) * 4
        data[k] = Math.round(r * 255)
        data[k+1] = Math.round(g * 255)
        data[k+2] = Math.round(b * 255)
        data[k+3] = 255
      }
    }
    ctx.putImageData(img, pad.left, pad.top)

    // Axes
    ctx.fillStyle = '#9ca3af'
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('μ (mean)', pad.left + innerW/2 - 20, height - 6)
    ctx.save()
    ctx.translate(8, pad.top + innerH/2 + 20)
    ctx.rotate(-Math.PI/2)
    ctx.fillText('σ (sigma)', 0, 0)
    ctx.restore()
    // Sigma min/max labels to clarify orientation (min at top, max at bottom)
    ctx.fillStyle = '#9ca3af'
    ctx.font = '10px system-ui, sans-serif'
    ctx.fillText(`${minS.toFixed(2)}`, pad.left + 4, pad.top + 10)
    ctx.fillText(`${maxS.toFixed(2)}`, pad.left + 4, pad.top + innerH - 2)

    // Overlay path
    if (path && path.length > 0) {
      ctx.strokeStyle = '#eab308'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let k = 0; k < path.length; k++) {
        const { x, y } = paramToPx(path[k].mean, path[k].sigma, pad, innerW, innerH, minMu, maxMu, minS, maxS)
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // Best (grid min) marker
    if (isFinite(vmin)) {
      const mi = minIdx % nx
      const mj = Math.floor(minIdx / nx)
      const muBest = mus[mi]
      const sBest = sigmas[mj]
      const p = paramToPx(muBest, sBest, pad, innerW, innerH, minMu, maxMu, minS, maxS)
      ctx.fillStyle = '#22c55e'
      drawCross(ctx, p.x, p.y, 6)
    }

    // Current point
    if (current) {
      const { x, y } = paramToPx(current.mean, current.sigma, pad, innerW, innerH, minMu, maxMu, minS, maxS)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, Math.PI*2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.stroke()
    }

    // Colorbar legend (min → 95%)
    const cbx = pad.left
    const cby = pad.top + innerH + 6
    const cbw = Math.min(160, innerW)
    const cbh = 10
    const cbImg = ctx.createImageData(cbw, cbh)
    for (let x = 0; x < cbw; x++) {
      const t = x / (cbw - 1)
      const [r, g, b] = viridis(1 - t)
      for (let y = 0; y < cbh; y++) {
        const k = (y * cbw + x) * 4
        cbImg.data[k] = Math.round(r * 255)
        cbImg.data[k+1] = Math.round(g * 255)
        cbImg.data[k+2] = Math.round(b * 255)
        cbImg.data[k+3] = 255
      }
    }
    ctx.putImageData(cbImg, cbx, cby)
    ctx.fillStyle = '#9ca3af'
    ctx.font = '10px system-ui, sans-serif'
    ctx.fillText('low (best)', cbx, cby + cbh + 11)
    const v95txt = '≈ 95%'
    ctx.fillText(v95txt, cbx + cbw - ctx.measureText(v95txt).width, cby + cbh + 11)
  }, [width, height, pad.left, pad.right, pad.top, pad.bottom, innerW, innerH, values, vmin, vmax, path, current, minMu, maxMu, minS, maxS])

  return (
    <canvas ref={canvasRef} width={width} height={height} style={{ display:'block' }} />
  )
}

function paramToPx(mean: number, sigma: number, pad: any, innerW: number, innerH: number, minMu: number, maxMu: number, minS: number, maxS: number) {
  const x = pad.left + ((mean - minMu) / (maxMu - minMu)) * innerW
  // Map sigma increasing downward (top = min sigma, bottom = max sigma) to match heatmap rasterization
  const y = pad.top + ((sigma - minS) / (maxS - minS)) * innerH
  return { x, y }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save()
  ctx.strokeStyle = '#22c55e'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - r, y)
  ctx.lineTo(x + r, y)
  ctx.moveTo(x, y - r)
  ctx.lineTo(x, y + r)
  ctx.stroke()
  ctx.restore()
}
