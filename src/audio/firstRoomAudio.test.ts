import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeSound, loadSound, createRoomAudio } from './firstRoomAudio'
afterEach(() => vi.unstubAllGlobals())
describe('sound preferences and graceful fallback', () => {
  it('clamps volume and treats invalid or legacy preferences as defaults', () => {
    expect(normalizeSound({ volume: 2, muted: true })).toEqual({ volume: 1, muted: true })
    expect(normalizeSound({ volume: -1, muted: 'yes' })).toEqual({ volume: 0, muted: false })
    for (const value of [null, {}, { volume: NaN }, { volume: Infinity }])
      expect(normalizeSound(value)).toEqual({ volume: 0.35, muted: false })
  })
  it('survives corrupt or blocked preference storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{broken' })
    expect(loadSound().volume).toBe(0.35)
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadSound().muted).toBe(false)
  })
  it('does not construct audio until enabled and fails without blocking gameplay', async () => {
    vi.stubGlobal('window', {})
    const audio = createRoomAudio()
    await audio.unlock()
    expect(audio.getStatus()).toBe('locked')
    audio.configure({ muted: false, volume: 0.35 }, true, false)
    await expect(audio.unlock()).resolves.toBeUndefined()
    expect(audio.getStatus()).toBe('unavailable')
    expect(() => {
      audio.travel(100)
      audio.door()
      audio.focus(false)
      audio.dispose()
    }).not.toThrow()
  })
})
