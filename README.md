# Divergence Playground — Experiments Hub

Live demo (GitHub Pages):
- https://iabaldwin.github.io/divergence-playground/

What is this?
- A tiny hub with tiles for small interactive experiments.
- The first experiment is an interactive Divergence Playground for 1D distributions.

Highlights
- Drag Gaussian modes for target Q and model P
- Metrics: KL(P||Q), KL(Q||P), Jensen–Shannon, Jeffreys, Cross‑Entropy, TV, Hellinger, Bhattacharyya, Wasserstein‑1
- Fit a Gaussian (P) to multi‑modal Q under chosen objective
- Inset parameter heatmap (μ vs σ) + live optimization path
- Shift‑drag markers to change σ directly on the plot
- Unit tests for divergence math and KL asymmetry

Quick start (dev)
- Node 18+ (Node 20 recommended)
- Install: `npm install`
- Run: `npm run dev`
- Open: printed local URL (e.g., http://localhost:5173)

Run tests (Node test runner)
- Build math lib + run tests: `npm run test`

Project structure
- Hub landing: `src/pages/Landing.tsx`
- Divergence app: `src/pages/Divergence.tsx`
- Router shell: `src/App.tsx`
- Plot + controls: `src/components/*`
- Math + divergences + optimizer: `src/lib/*`
- Tests: `tests/divergences.test.js`

Add another experiment
1) Create a page component in `src/pages/MyExperiment.tsx`.
2) Add a tile in `src/pages/Landing.tsx` linking to `/my-experiment`.
3) Register a route in `src/App.tsx`.

Deploy to GitHub Pages
- This repo ships with a Pages workflow: `.github/workflows/pages.yml`
- On push to `main`, it builds the app and deploys to Pages.
- Project Pages URL format: `https://<user>.github.io/<repo>/`.
- For this repo under user `iabaldwin`: `https://iabaldwin.github.io/divergence-playground/`.

Notes on base path (Vite + Router)
- Vite base is taken from `BASE_PATH` env during build (defaults to `/`).
- The workflow sets `BASE_PATH=/<repo>/` automatically, so assets and routes work under project pages.
- A SPA fallback (`dist/404.html`) is created to support deep‑link refreshes.
- If deploying to a user site repo (`iabaldwin.github.io`), set `BASE_PATH=/` in repo Actions Variables and the workflow will use it.

Screenshots
- Drop a screenshot at `docs/preview.png` and embed it here:
  - `![Preview](docs/preview.png)`

License
- MIT or your preferred license.
