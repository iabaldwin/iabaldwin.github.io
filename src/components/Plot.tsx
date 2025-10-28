import React, { useMemo, useRef, useState } from 'react'
import { amplitudeAtMean, Gaussian } from '../lib/mixture'

type PlotProps = {
  width: number
  height: number
  domain: [number, number]
  pX: Float64Array
  pY: Float64Array
  qX: Float64Array
  qY: Float64Array
  pComps: Gaussian[]
  qComps: Gaussian[]
  onDragMean: (which: 'p' | 'q', index: number, newMean: number) => void
  onDragSigma: (which: 'p' | 'q', index: number, newSigma: number) => void
  showSamples?: boolean
  pHist?: { xs: Float64Array, ys: Float64Array }
  qHist?: { xs: Float64Array, ys: Float64Array }
}

function pathFromXY(xs: Float64Array, ys: Float64Array, x2px: (x:number)=>number, y2px: (y:number)=>number) {
  let d = ''
  for (let i = 0; i < xs.length; i++) {
    const x = x2px(xs[i])
    const y = y2px(ys[i])
    d += (i === 0 ? 'M' : 'L') + x + ' ' + y
  }
  return d
}

export default function Plot({ width, height, domain, pX, pY, qX, qY, pComps, qComps, onDragMean, onDragSigma, showSamples, pHist, qHist }: PlotProps) {
  const padding = { left: 50, right: 18, top: 12, bottom: 32 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const [minX, maxX] = domain
  const maxY = useMemo(() => {
    let m = 0
    for (let i = 0; i < pY.length; i++) m = Math.max(m, pY[i], qY[i])
    // Account for histograms if shown
    if (showSamples && pHist && qHist) {
      for (let i = 0; i < pHist.ys.length; i++) m = Math.max(m, pHist.ys[i])
      for (let i = 0; i < qHist.ys.length; i++) m = Math.max(m, qHist.ys[i])
    }
    return m * 1.2 + 1e-6
  }, [pY, qY, pHist, qHist, showSamples])

  const x2px = (x: number) => padding.left + (x - minX) / (maxX - minX) * innerW
  const y2px = (y: number) => padding.top + (1 - y / maxY) * innerH
  const px2x = (px: number) => minX + ((px - padding.left) / innerW) * (maxX - minX)

  const pPath = useMemo(() => pathFromXY(pX, pY, x2px, y2px), [pX, pY])
  const qPath = useMemo(() => pathFromXY(qX, qY, x2px, y2px), [qX, qY])

  // Simple dragging state
  const [dragging, setDragging] = useState<
    | { which: 'p'|'q'; index: number; mode: 'mean'; }
    | { which: 'p'|'q'; index: number; mode: 'sigma'; y0: number; sigma0: number }
    | null
  >(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (dragging.mode === 'mean') {
      const px = e.clientX - rect.left
      const x = px2x(px)
      onDragMean(dragging.which, dragging.index, Math.max(minX, Math.min(maxX, x)))
    } else {
      const py = e.clientY - rect.top
      const dy = py - dragging.y0
      // Exponential scaling: drag down increases sigma, drag up decreases
      const scale = Math.exp(dy * 0.01)
      const newSigma = clamp(dragging.sigma0 * scale, 0.1, 3.0)
      onDragSigma(dragging.which, dragging.index, newSigma)
    }
  }

  function onPointerUp() { setDragging(null) }

  const ticks = useMemo(() => {
    const step = niceStep((maxX - minX) / 8)
    const first = Math.ceil(minX / step) * step
    const ts: number[] = []
    for (let v = first; v <= maxX + 1e-9; v += step) ts.push(+v.toFixed(6))
    return ts
  }, [minX, maxX])

  return (
    <svg ref={svgRef} width={width} height={height} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      {/* axes */}
      <rect x={padding.left} y={padding.top} width={innerW} height={innerH} fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.06)" />
      {/* grid and x ticks */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={x2px(t)} x2={x2px(t)} y1={padding.top} y2={padding.top + innerH} stroke="rgba(255,255,255,0.05)" />
          <text x={x2px(t)} y={height - 10} textAnchor="middle" fontSize={11} fill="#9ca3af">{t}</text>
        </g>
      ))}

      {/* histograms if enabled */}
      {showSamples && pHist && (
        <g>
          {Array.from(pHist.xs).map((x, i) => (
            <rect key={'ph'+i} x={x2px(x) - (innerW / pHist.xs.length)/2} y={y2px(pHist.ys[i])} width={innerW / pHist.xs.length} height={Math.max(0, y2px(0) - y2px(pHist.ys[i]))} fill="rgba(167,139,250,0.18)" />
          ))}
        </g>
      )}
      {showSamples && qHist && (
        <g>
          {Array.from(qHist.xs).map((x, i) => (
            <rect key={'qh'+i} x={x2px(x) - (innerW / qHist.xs.length)/2} y={y2px(qHist.ys[i])} width={innerW / qHist.xs.length} height={Math.max(0, y2px(0) - y2px(qHist.ys[i]))} fill="rgba(103,232,249,0.16)" />
          ))}
        </g>
      )}

      {/* density paths */}
      <path d={qPath} fill="none" stroke="#67e8f9" strokeWidth={2} />
      <path d={pPath} fill="none" stroke="#a78bfa" strokeWidth={2} />

      {/* components markers */}
      {pComps.map((c, i) => {
        const y = amplitudeAtMean(c)
        const cx = x2px(c.mean)
        const cy = y2px(y)
        return (
          <g key={'pc'+i}>
            <line x1={cx} x2={cx} y1={y2px(0)} y2={cy} stroke="#a78bfa55" />
            <circle cx={cx} cy={cy} r={6} fill="#a78bfa" stroke="#fff" strokeOpacity={0.7}
                    style={{cursor: 'ew-resize'}}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      if (e.shiftKey) setDragging({ which:'p', index:i, mode:'sigma', y0: e.clientY - svgRef.current!.getBoundingClientRect().top, sigma0: c.sigma })
                      else setDragging({ which:'p', index:i, mode:'mean' })
                    }} />
          </g>
        )
      })}
      {qComps.map((c, i) => {
        const y = amplitudeAtMean(c)
        const cx = x2px(c.mean)
        const cy = y2px(y)
        return (
          <g key={'qc'+i}>
            <line x1={cx} x2={cx} y1={y2px(0)} y2={cy} stroke="#67e8f955" />
            <rect x={cx-6} y={cy-6} width={12} height={12} rx={2} fill="#67e8f9" stroke="#fff" strokeOpacity={0.7}
                  style={{cursor: 'ew-resize'}}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    if (e.shiftKey) setDragging({ which:'q', index:i, mode:'sigma', y0: e.clientY - svgRef.current!.getBoundingClientRect().top, sigma0: c.sigma })
                    else setDragging({ which:'q', index:i, mode:'mean' })
                  }} />
          </g>
        )
      })}

      {/* y axis label */}
      <text x={padding.left - 36} y={padding.top + 12} fill="#9ca3af" fontSize={11}>density</text>
    </svg>
  )
}

function niceStep(raw: number) {
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)))
  const r = raw / pow10
  const steps = [1, 2, 2.5, 5, 10]
  for (const s of steps) if (r <= s) return s * pow10
  return 10 * pow10
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}
