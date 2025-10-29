import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import DivergencePage from './pages/Divergence'
import Experiments from './pages/Experiments'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true } as any}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/experiments" element={<Experiments />} />
        <Route path="/experiments/divergence" element={<DivergencePage />} />
        {/* <Route path="/experiments/placeholder" element={<Placeholder />} /> */}
      </Routes>
    </BrowserRouter>
  )
}
