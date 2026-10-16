import contract from '../../backend/src/main/resources/private/chapter2-public.json?raw'
import { expect, test } from 'vitest'
import { hallObjects, scriptedDisclosures, scriptedEvidence } from './chapter2Public'
test('Spring public evidence matches client scripts', () => {
  const actual = JSON.parse(contract)
  expect(actual).toEqual({ hallObjects, scriptedDisclosures, scriptedEvidence })
})
