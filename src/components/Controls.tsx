import React from 'react'
import { Gaussian } from '../lib/mixture'
import type { Objective } from '../lib/optimize'

type CompListProps = {
  title: string
  colorDotClass: string
  comps: Gaussian[]
  onChange: (index: number, patch: Partial<Gaussian>) => void
  onAdd: () => void
  onRemove: (index: number) => void
  disabled?: boolean
  hideWeight?: boolean
  maxComponents?: number
}

export function ComponentList({ title, colorDotClass, comps, onChange, onAdd, onRemove, disabled, hideWeight, maxComponents = 6 }: CompListProps) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="legend" style={{marginBottom:8}}>
        <span className={`dot ${colorDotClass}`}></span>
        <span>Drag markers in plot to move means</span>
      </div>
      <div className="grid2">
        {comps.map((c, i) => (
          <div className="comp-item" key={i}>
            <h4>Component {i+1}</h4>
            <div className="row"><label>Mean</label><span className="value">{c.mean.toFixed(2)}</span></div>
            <div className="row">
              <label>Sigma</label>
              <input className="sl" type="range" min={0.1} max={3.0} step={0.01} value={c.sigma} disabled={disabled}
                     onChange={e => onChange(i, { sigma: +e.target.value })} />
              <span className="value">{c.sigma.toFixed(2)}</span>
            </div>
            {!hideWeight && (
              <div className="row">
                <label>Weight</label>
                <input className="sl" type="range" min={0} max={1} step={0.001} value={c.weight} disabled={disabled}
                       onChange={e => onChange(i, { weight: +e.target.value })} />
                <span className="value">{c.weight.toFixed(3)}</span>
              </div>
            )}
            <div className="row">
              <span></span>
              <button className="ghost" onClick={() => onRemove(i)} disabled={disabled || comps.length <= 1}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="row" style={{marginTop:8}}>
        <span></span>
        <button onClick={onAdd} disabled={disabled || comps.length >= maxComponents}>Add component</button>
      </div>
    </div>
  )
}

type MetricsProps = {
  units: 'nats' | 'bits'
  values: {
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
}

export function MetricsTable({ units, values }: MetricsProps) {
  const baseFactor = units === 'bits' ? 1 / Math.log(2) : 1
  const fmt = (x: number) => (isFinite(x) ? (x * baseFactor).toFixed(4) : '∞')
  return (
    <div className="panel">
      <h3>Metrics ({units})</h3>
      <table className="metrics-table">
        <tbody>
          <tr><td className="metrics-label">KL(P || Q)</td><td className="metrics-value">{fmt(values.kl_pq)}</td></tr>
          <tr><td className="metrics-label">KL(Q || P)</td><td className="metrics-value">{fmt(values.kl_qp)}</td></tr>
          <tr><td className="metrics-label">Jeffreys (KL sym)</td><td className="metrics-value">{fmt(values.jeffreys)}</td></tr>
          <tr><td className="metrics-label">Jensen–Shannon</td><td className="metrics-value">{fmt(values.js)}</td></tr>
          <tr><td className="metrics-label">Cross-Entropy H(P,Q)</td><td className="metrics-value">{fmt(values.cross_pq)}</td></tr>
          <tr><td className="metrics-label">Cross-Entropy H(Q,P)</td><td className="metrics-value">{fmt(values.cross_qp)}</td></tr>
          <tr><td className="metrics-label">Total Variation</td><td className="metrics-value">{values.tv.toFixed(4)}</td></tr>
          <tr><td className="metrics-label">Hellinger</td><td className="metrics-value">{values.hellinger.toFixed(4)}</td></tr>
          <tr><td className="metrics-label">Bhattacharyya</td><td className="metrics-value">{values.bhattacharyya.toFixed(4)}</td></tr>
          <tr><td className="metrics-label">Wasserstein-1</td><td className="metrics-value">{values.w1.toFixed(4)}</td></tr>
        </tbody>
      </table>
      <div className="row" style={{marginTop:8, color:'#9ca3af', fontSize:12}}>
        <span>Mutual Information I(X;Y)</span>
        <span className="value">≈ JS in {units}</span>
      </div>
    </div>
  )
}

type ModelPanelProps = {
  objective: Objective
  setObjective: (o: Objective) => void
  steps: number
  setSteps: (n: number) => void
  lr: number
  setLr: (x: number) => void
  running: boolean
  onFit: () => void
  onStop: () => void
}

export function ModelPanel({ objective, setObjective, steps, setSteps, lr, setLr, running, onFit, onStop }: ModelPanelProps) {
  return (
    <div className="panel">
      <h3>Model & Fitting</h3>
      <div className="row">
        <label>Objective</label>
        <select value={objective} onChange={e => setObjective(e.target.value as Objective)} disabled={running}>
          <option value="kl_qp">KL(Q||P)</option>
          <option value="kl_pq">KL(P||Q)</option>
          <option value="js">Jensen–Shannon</option>
          <option value="tv">Total Variation</option>
          <option value="hellinger">Hellinger</option>
          <option value="bhattacharyya">Bhattacharyya</option>
          <option value="w1">Wasserstein-1</option>
        </select>
        <span></span>
      </div>
      <div className="row">
        <label>Steps</label>
        <input className="sl" type="range" min={10} max={300} step={10} value={steps} onChange={e => setSteps(Number(e.target.value))} disabled={running} />
        <span className="value">{steps}</span>
      </div>
      <div className="row">
        <label>Learning rate</label>
        <input className="sl" type="range" min={0.01} max={0.6} step={0.01} value={lr} onChange={e => setLr(Number(e.target.value))} disabled={running} />
        <span className="value">{lr.toFixed(2)}</span>
      </div>
      <div className="row" style={{marginTop:8}}>
        <span></span>
        {!running ? (
          <button className="secondary" onClick={onFit}>Fit model</button>
        ) : (
          <button className="ghost" onClick={onStop}>Stop</button>
        )}
      </div>
    </div>
  )
}
