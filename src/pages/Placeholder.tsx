import { Link } from 'react-router-dom'

export default function Placeholder() {
  return (
    <div className="app" style={{gridTemplateColumns:'1fr', gridTemplateRows:'auto 1fr'}}>
      <header className="header">
        <div className="title">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} width={20} height={20} />
          <span>Placeholder Experiment</span>
          <span className="tag">WIP</span>
        </div>
        <div className="legend">
          <Link to="/experiments" className="btn ghost" style={{textDecoration:'none'}}>← Experiments</Link>
        </div>
      </header>
      <main className="content" style={{padding:16}}>
        <div className="panel" style={{maxWidth: 720, margin:'0 auto'}}>
          <h3>Coming Soon</h3>
          <p style={{marginTop:8, lineHeight:1.5, color:'#9ca3af'}}>
            This is a stub to illustrate how to add a new experiment page. Duplicate this file,
            change the route and registry entry, and build your interactive.
          </p>
          <div className="row" style={{marginTop:12}}>
            <span></span>
            <Link to="/experiments" className="btn">Back to Experiments</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

