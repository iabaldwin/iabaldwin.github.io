import { Link } from 'react-router-dom'
import { experiments } from '../experiments/registry'

export default function Experiments() {
  return (
    <div className="landing">
      <header className="header">
        <div className="title">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} width={20} height={20} />
          <span>Experiments</span>
          <span className="tag">Index</span>
        </div>
      </header>
      <main className="content">
        <div className="tiles">
          {experiments.filter(e => !e.hidden).map(exp => (
            <Link className="tile" to={exp.path} key={exp.id}>
              <div className="tile-hero" />
              {exp.badge && <div className="tile-badge">{exp.badge}</div>}
              <div className="tile-title">{exp.title}</div>
              <div className="tile-desc">{exp.description}</div>
              <div className="tile-meta">Interactive • Vite + React</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
