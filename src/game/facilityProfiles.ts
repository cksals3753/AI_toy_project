import type { FacilityKind } from './facilityVisuals'
type Profile = {
  reach: number
  bottom: number
  top: number
  aim: number
  kind?: FacilityKind
  north?: boolean
}
// Authored per facility, in existing world units. Travel doors, people, shoes
// and unlisted small props keep their current policy. No game progression here.
export const facilityProfiles: Record<string, Profile> = {
  map: { reach: 110, bottom: 0.55, top: 1.75, aim: 1.2 },
  panel: { reach: 90, bottom: 0.5, top: 1.9, aim: 1.2 },
  cabinet: { reach: 70, bottom: 0, top: 1.65, aim: 1.25 },
  'platform-record': { reach: 110, bottom: 0.8, top: 1.7, aim: 1.25, kind: 'records' },
  approval: { reach: 95, bottom: 0.75, top: 1.6, aim: 1.3, kind: 'console' },
  'call-b': { reach: 65, bottom: 1.05, top: 1.55, aim: 1.3, kind: 'button', north: true },
  'train-a-stop': { reach: 115, bottom: 0.9, top: 1.75, aim: 1.3, kind: 'notice' },
  'train-phone': { reach: 60, bottom: 0.08, top: 0.3, aim: 0.15 },
  'train-route': { reach: 105, bottom: 1.75, top: 2.4, aim: 2.05 },
  'train-manual': { reach: 95, bottom: 0.65, top: 1.1, aim: 0.98 },
  'train-devices': { reach: 100, bottom: 0.4, top: 1.9, aim: 1.3, kind: 'links' },
  'train-stop': { reach: 90, bottom: 0.75, top: 1.6, aim: 1.3, kind: 'console' },
  'moon-warning': { reach: 115, bottom: 1.75, top: 2.4, aim: 2.05 },
  'moon-broadcast': { reach: 90, bottom: 0.5, top: 1.9, aim: 1.4 },
  'moon-sensor': { reach: 70, bottom: 1.05, top: 1.6, aim: 1.35, kind: 'sensor' },
  'moon-window': { reach: 90, bottom: 1, top: 1.8, aim: 1.35 },
  'moon-route': { reach: 100, bottom: 0.9, top: 1.75, aim: 1.3, kind: 'notice' },
  'moon-playback': { reach: 80, bottom: 0.8, top: 1.7, aim: 1.2, kind: 'records' },
  'moon-receipt': { reach: 110, bottom: 0.8, top: 1.7, aim: 1.2, kind: 'records' },
  'moon-attachment': { reach: 100, bottom: 0.8, top: 1.7, aim: 1.2, kind: 'records' },
  'moon-terminal': { reach: 90, bottom: 0.75, top: 1.6, aim: 1.3, kind: 'console' },
  'moon-active-record': { reach: 100, bottom: 0.9, top: 1.75, aim: 1.3, kind: 'notice' },
  'moon-cancel-note': { reach: 105, bottom: 0.9, top: 1.75, aim: 1.3, kind: 'notice' },
  'moon-cancel-device': { reach: 65, bottom: 1.05, top: 1.55, aim: 1.3, kind: 'button' },
  'final-map': { reach: 120, bottom: 0.9, top: 1.75, aim: 1.3, kind: 'notice' },
  'final-manual': { reach: 110, bottom: 0.9, top: 1.75, aim: 1.3, kind: 'notice' },
  'final-window': { reach: 90, bottom: 1, top: 1.8, aim: 1.35 },
  'final-review': { reach: 85, bottom: 0.8, top: 1.7, aim: 1.2, kind: 'records' },
  'final-control': { reach: 100, bottom: 0.75, top: 1.6, aim: 1.3, kind: 'console' },
  'recovery-note': { reach: 115, bottom: 0.9, top: 1.75, aim: 1.3, kind: 'notice' },
  'recovery-water': { reach: 100, bottom: 0.65, top: 1.8, aim: 1.3, kind: 'gauge' },
  'recovery-valve': { reach: 65, bottom: 0.7, top: 1.65, aim: 1.3, kind: 'valve' },
  'recovery-bolt': { reach: 70, bottom: 0.88, top: 1.4, aim: 1.1, kind: 'bolt' },
  'shelter-sign': { reach: 105, bottom: 0.9, top: 1.75, aim: 1.3, kind: 'notice' },
  'shelter-arrival': { reach: 80, bottom: 0.8, top: 1.5, aim: 1.1, kind: 'arrival' },
}
