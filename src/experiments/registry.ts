export type ExperimentMeta = {
  id: string
  path: string
  title: string
  description: string
  badge?: string
  hidden?: boolean
}

export const experiments: ExperimentMeta[] = [
  {
    id: 'divergence',
    path: '/experiments/divergence',
    title: 'Divergence Playground',
    description: 'Drag Gaussian modes, compare KL both ways, JS, TV, Hellinger, Bhattacharyya, W1. Fit a Gaussian to a multi‑modal target and watch the path.',
    badge: 'New',
  },
  {
    id: 'placeholder',
    path: '/experiments/placeholder',
    title: 'Placeholder Experiment',
    description: 'A stub page to illustrate how new experiments are added and routed. Replace with your next idea.',
    badge: 'WIP',
    hidden: true,
  },
]
