import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import DivergencePage from './pages/Divergence'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true } as any}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/divergence" element={<DivergencePage />} />
      </Routes>
    </BrowserRouter>
  )
}
