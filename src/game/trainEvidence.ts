import { trains } from './chapter3'

// Shared historical facts; chapter 5 adds receipt detail without rewriting chapter 4 evidence.
export const trainEvidence = {
  vehicle: trains[1].id,
  external: 'EXT-X09',
  transmissions: ['02:31:04', '02:31:08'],
} as const
