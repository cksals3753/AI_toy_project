export type ComfortSettings = {
  brightness: number
  mouseSensitivity: number
  touchSensitivity: number
  fov: number
  moveSpeed: number
}
export const COMFORT_KEY = 'last-transfer-comfort-v1'
export const defaultComfort: ComfortSettings = {
  brightness: 1,
  mouseSensitivity: 0.0015,
  touchSensitivity: 0.003,
  fov: 64,
  moveSpeed: 0.8,
}
const bounded = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback
export const normalizeComfort = (value: unknown): ComfortSettings => {
  const v = value && typeof value === 'object' ? (value as Partial<ComfortSettings>) : {}
  return {
    brightness: bounded(v.brightness, defaultComfort.brightness, 0.85, 1.25),
    mouseSensitivity: bounded(v.mouseSensitivity, defaultComfort.mouseSensitivity, 0.0005, 0.004),
    touchSensitivity: bounded(v.touchSensitivity, defaultComfort.touchSensitivity, 0.001, 0.008),
    fov: bounded(v.fov, defaultComfort.fov, 55, 80),
    moveSpeed: bounded(v.moveSpeed, defaultComfort.moveSpeed, 0.6, 1),
  }
}
// Preferred vertical FOV; bound horizontal field on extreme aspect ratios only.
export const cameraFov = (vertical: number, aspect: number) => {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const horizontal = (2 * Math.atan(Math.tan((vertical * Math.PI) / 360) * ratio) * 180) / Math.PI
  const h = Math.max(40, Math.min(105, horizontal))
  return (2 * Math.atan(Math.tan((h * Math.PI) / 360) / ratio) * 180) / Math.PI
}
// CSS pixel deltas, never multiplied by frame time or devicePixelRatio.
export const touchLookScale = (width: number, height: number) =>
  390 / Math.max(240, Math.min(width, height))
