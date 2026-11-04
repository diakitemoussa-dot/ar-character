export const DEFAULT_SCENE_SCALE = 1.3
export const MIN_SCENE_SCALE = 0.5
export const MAX_SCENE_SCALE = 10

// Scene scale from a query string ('?scale=2.5'): a number in [0.5, 10], else the fallback.
export function parseSceneScale(search, fallback = DEFAULT_SCENE_SCALE) {
  const raw = new URLSearchParams(search || '').get('scale')
  if (raw === null || raw.trim() === '') return fallback
  const v = Number(raw)
  return Number.isFinite(v) && v >= MIN_SCENE_SCALE && v <= MAX_SCENE_SCALE ? v : fallback
}
