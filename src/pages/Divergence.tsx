import React, { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Plot from '../components/Plot'
import { ComponentList, MetricsTable, ModelPanel } from '../components/Controls'
import { computeAll } from '../lib/divergences'
import { densityOnGrid, defaultMixture, Gaussian, histogramDensity, makeGrid, sampleMixture } from '../lib/mixture'
import { fitModelToTarget } from '../lib/optimize'
import type { Objective } from '../lib/optimize'
import ParamHeatmap from '../components/ParamHeatmap'

export default function DivergencePage() {
  const [domain, setDomain] = useState<[number, number]>([-6, 6])
  const [gridN, setGridN] = useState(1024)
  // Model (P) and Target (Q)
  const [pComps, setPComps] = useState<Gaussian[]>(defaultMixture('unimodal'))
  const [qComps, setQComps] = useState<Gaussian[]>([
    { mean: -1.5, sigma: 0.55, weight: 0.873 },
    { mean: 1.2, sigma: 0.75, weight: 0.166 },
  ])
  const [units, setUnits] = useState<'nats'|'bits'>('nats')
  const [showSamples, setShowSamples] = useState(true)
  const [samplesN, setSamplesN] = useState(1500)
  
  const [objective, setObjective] = useState<Objective>('kl_qp')
  const [steps, setSteps] = useState(120)
  const [lr, setLr] = useState(0.2)
  const [running, setRunning] = useState(false)
  const abortRef = useRef(false)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [sigmaRange, setSigmaRange] = useState<[number, number]>([0.2, 2.5])
  const [fitPath, setFitPath] = useState<{ mean: number, sigma: number }[] | null>(null)

  const grid = useMemo(() => makeGrid(domain, gridN), [domain, gridN])
  const dx = (domain[1] - domain[0]) / (gridN - 1)
  const pY = useMemo(() => densityOnGrid(pComps, grid, dx), [pComps, grid])
  const qY = useMemo(() => densityOnGrid(qComps, grid, dx), [qComps, grid])

  const metrics = useMemo(() => computeAll(pY, qY, dx), [pY, qY, dx])

  const pHist = useMemo(() => showSamples ? histogramDensity(sampleMixture(pComps, samplesN), 80, domain) : undefined, [showSamples, pComps, samplesN, domain])
  const qHist = useMemo(() => showSamples ? histogramDensity(sampleMixture(qComps, samplesN), 80, domain) : undefined, [showSamples, qComps, samplesN, domain])

  function updateComp(which: 'p'|'q', index: number, patch: Partial<Gaussian>) {
    const updater = which === 'p' ? setPComps : setQComps
    updater(prev => prev.map((c, i) => i === index ? { ...c, ...patch } : c))
  }

  function addComp(which: 'p'|'q') {
    const updater = which === 'p' ? setPComps : setQComps
    updater(prev => {
      const cap = which === 'p' ? 1 : 6
      return prev.length >= cap ? prev : [...prev, { mean: 0, sigma: 0.8, weight: 0.2 }]
    })
  }

  function removeComp(which: 'p'|'q', index: number) {
    const updater = which === 'p' ? setPComps : setQComps
    updater(prev => prev.filter((_, i) => i !== index))
  }

  function onDragMean(which: 'p'|'q', index: number, newMean: number) {
    updateComp(which, index, { mean: newMean })
  }

  function reset(which: 'p'|'q', preset: 'unimodal'|'bimodal'|'trimodal') {
    if (which === 'p') setPComps(defaultMixture(preset))
    else setQComps(defaultMixture(preset))
  }

  function jitterInitFromP(p: Gaussian[], d: [number, number]): Gaussian[] {
    const base = p[0] ?? { mean: 0, sigma: 1, weight: 1 }
    const width = d[1] - d[0]
    const jitter = 0.01 * width * (Math.random() * 2 - 1)
    const sigmaJitter = base.sigma * (1 + 0.05 * (Math.random() * 2 - 1))
    return [ { mean: base.mean + jitter, sigma: Math.max(0.1, Math.min(3, sigmaJitter)), weight: 1 } ]
  }

  async function onFit() {
    setRunning(true)
    abortRef.current = false
    // Seed path with current P to reflect the true starting point
    setFitPath([{ mean: pComps[0].mean, sigma: pComps[0].sigma }])
    try {
      const init = pComps
      await fitModelToTarget({
        model: { kind: 'gaussian' },
        initial: init,
        targetY: qY,
        grid,
        dx,
        objective,
        steps,
        lr,
        domain,
        onUpdate: (comps) => {
          setPComps(comps)
          setFitPath(prev => (prev ? [...prev, { mean: comps[0].mean, sigma: comps[0].sigma }] : [{ mean: comps[0].mean, sigma: comps[0].sigma }]))
        },
        abortSignal: () => abortRef.current,
      })
    } finally {
      setRunning(false)
    }
  }

  function onStop() { abortRef.current = true }

  return (
    <div className="app">
      <header className="header">
        <div className="title">
          <img src="/favicon.svg" width={20} height={20} />
          <span>Divergence Playground</span>
          <span className="tag">Vite + React</span>
        </div>
        <div className="legend">
          <Link to="/" className="btn ghost" style={{textDecoration:'none'}}>← Experiments</Link>
          <span className="dot q"></span><span>Q (target)</span>
          <span className="dot p"></span><span>P (model)</span>
        </div>
      </header>
      <aside className="sidebar">
        <div className="panel">
          <h3>Global</h3>
          <div className="row">
            <label>Units</label>
            <div>
              <button className={units==='nats' ? '' : 'ghost'} onClick={() => setUnits('nats')}>nats</button>
              <span style={{margin: '0 6px'}}></span>
              <button className={units==='bits' ? '' : 'ghost'} onClick={() => setUnits('bits')}>bits</button>
            </div>
          </div>
          <div className="row">
            <label>Domain</label>
            <input className="sl" type="range" min={4} max={16} step={0.5} value={domain[1]} onChange={e => { const v = Number(e.target.value); setDomain([-v, v]) }} />
            <span className="value">[{domain[0]}, {domain[1]}]</span>
          </div>
          <div className="row">
            <label>Show Samples</label>
            <input type="checkbox" checked={showSamples} onChange={e => setShowSamples(e.target.checked)} />
            <span></span>
          </div>
          <div className="row">
            <label>Samples</label>
            <input className="sl" type="range" min={200} max={5000} step={100} disabled={!showSamples} value={samplesN} onChange={e => setSamplesN(+e.target.value)} />
            <span className="value">{samplesN}</span>
          </div>
          <div className="row">
            <label>Param heatmap</label>
            <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
            <span></span>
          </div>
          <div className="row">
            <label>σ max</label>
            <input className="sl" type="range" min={0.5} max={4} step={0.05} value={sigmaRange[1]} onChange={e => setSigmaRange([sigmaRange[0], Number(e.target.value)])} />
            <span className="value">{sigmaRange[1].toFixed(2)}</span>
          </div>
        </div>

        <MetricsTable units={units} values={metrics} />

        <ModelPanel
          objective={objective}
          setObjective={setObjective}
          steps={steps}
          setSteps={setSteps}
          lr={lr}
          setLr={setLr}
          running={running}
          onFit={onFit}
          onStop={onStop}
        />

        <div className="panel">
          <h3>Presets</h3>
          <div className="row"><label>Q</label>
            <div>
              <button className="secondary" onClick={() => reset('q','unimodal')}>Unimodal</button>
              <span style={{margin:'0 4px'}}></span>
              <button className="secondary" onClick={() => reset('q','bimodal')}>Bimodal</button>
              <span style={{margin:'0 4px'}}></span>
              <button className="secondary" onClick={() => reset('q','trimodal')}>Trimodal</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        <div className="plot-wrap">
          <div className="plot-card">
            <Plot
              width={window.innerWidth - 320 - 40}
              height={Math.max(420, window.innerHeight - 220)}
              domain={domain}
              pX={grid} pY={pY}
              qX={grid} qY={qY}
              pComps={pComps}
              qComps={qComps}
              onDragMean={onDragMean}
              onDragSigma={(which, index, sigma) => updateComp(which, index, { sigma })}
              showSamples={showSamples}
              pHist={pHist}
              qHist={qHist}
            />
            {showHeatmap && (
              <div className="inset">
                <ParamHeatmap
                  width={280}
                  height={200}
                  domain={domain}
                  sigmaRange={sigmaRange}
                  grid={grid}
                  dx={dx}
                  qY={qY}
                  objective={objective}
                  path={fitPath ?? undefined}
                  current={pComps[0]}
                />
              </div>
            )}
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:12}}>
          <ComponentList
            title="Distribution P"
            colorDotClass="p"
            comps={pComps}
            onChange={(i, patch) => updateComp('p', i, patch)}
            onAdd={() => addComp('p')}
            onRemove={(i) => removeComp('p', i)}
            disabled={running}
            hideWeight
            maxComponents={1}
          />
          <ComponentList
            title="Reference Q"
            colorDotClass="q"
            comps={qComps}
            onChange={(i, patch) => updateComp('q', i, patch)}
            onAdd={() => addComp('q')}
            onRemove={(i) => removeComp('q', i)}
          />
        </div>
      </main>
    </div>
  )
}
