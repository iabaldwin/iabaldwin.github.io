import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="landing">
      <header className="header">
        <div className="title">
          <img src="/favicon.svg" width={20} height={20} />
          <span>Experiments by iabaldwin</span>
          <span className="tag">Hub</span>
        </div>
      </header>
      <main className="content">
        <div className="tiles">
          <Link className="tile" to="/divergence">
            <div className="tile-hero" />
            <div className="tile-badge">New</div>
            <div className="tile-title">Divergence Playground</div>
            <div className="tile-desc">Drag Gaussian modes, compare KL both ways, JS, TV, Hellinger, Bhattacharyya, W1. Fit a Gaussian to a multi‑modal target and watch the path.</div>
            <div className="tile-meta">Vite + React • SVG • Canvas inset</div>
          </Link>
          {/* Add more tiles here as you create new experiments */}
        </div>
      </main>
    </div>
  )
}
