import { chapter56Room } from './chapter56Audio'
import { trainRoom } from './chapter34Audio'
import type { TrainMotion } from './chapter34Audio'
import type { AudioCue } from './chapter2Audio'
export type SoundSettings = { muted: boolean; volume: number }
export const SOUND_KEY = 'last-transfer-audio-v1'
export const normalizeSound = (value: unknown): SoundSettings => {
  const s = value as Partial<SoundSettings> | null
  return {
    muted: s?.muted === true,
    volume:
      typeof s?.volume === 'number' && Number.isFinite(s.volume)
        ? Math.max(0, Math.min(1, s.volume))
        : 0.35,
  }
}
export const loadSound = (): SoundSettings => {
  try {
    return normalizeSound(JSON.parse(localStorage.getItem(SOUND_KEY) ?? 'null'))
  } catch {
    return normalizeSound(null)
  }
}

// Local procedural sound bank: no downloads, permissions, providers or external audio assets.
// Only this bank needs replacing when recorded sound effects are introduced.
export const createRoomAudio = () => {
  let context: AudioContext | null = null,
    master: GainNode | null = null,
    ambient: GainNode | null = null
  let ended = false,
    wet = false
  let water: AudioBufferSourceNode | null = null
  let waterLevel: GainNode | null = null
  let waterFilter: BiquadFilterNode | null = null
  let fanLevel: GainNode | null = null
  let completionTimer: ReturnType<typeof setTimeout> | undefined
  let motion: TrainMotion = 'stopped'
  let rolling: AudioBufferSourceNode | null = null
  let traction: GainNode | null = null
  let tractionFilter: BiquadFilterNode | null = null
  let room = 'first'
  let powered = false
  let humLevel: GainNode | null = null
  let fanFilter: BiquadFilterNode | null = null
  const lastCue = new Map<string, number>()
  let settings = normalizeSound(null),
    enabled = false,
    paused = true,
    focused = true,
    distance = 0,
    lastStep = -Infinity
  let status: 'locked' | 'ready' | 'unavailable' = 'locked'
  const listeners = new Set<() => void>(),
    sources = new Set<AudioScheduledSourceNode>(),
    oneShots = new Set<AudioScheduledSourceNode>()
  let previewTimer: ReturnType<typeof setTimeout> | undefined
  const nodes = new Set<AudioNode>()
  let noise: AudioBuffer | null = null
  const notify = () => listeners.forEach((fn) => fn())
  const audible = () =>
    !!context &&
    context.state === 'running' &&
    enabled &&
    focused &&
    !settings.muted &&
    settings.volume > 0
  const own = <T extends AudioNode>(node: T): T => {
    nodes.add(node)
    return node
  }
  const track = (source: AudioScheduledSourceNode, chain: AudioNode[], loop = false) => {
    if (!loop) oneShots.add(source)
    sources.add(source)
    source.onended = () => {
      source.disconnect()
      sources.delete(source)
      oneShots.delete(source)
      chain.forEach((n) => {
        n.disconnect()
        nodes.delete(n)
      })
    }
  }
  const gainTo = (param: AudioParam, value: number, seconds = 0.06) => {
    if (!context) return
    param.cancelScheduledValues(context.currentTime)
    param.setTargetAtTime(value, context.currentTime, seconds)
  }
  const update = () => {
    if (master) gainTo(master.gain, audible() ? settings.volume * 0.5 : 0, 0.025)
    if (ambient) gainTo(ambient.gain, enabled && focused && !ended ? (paused ? 0.22 : 1) : 0)
    if (fanLevel)
      gainTo(
        fanLevel.gain,
        room === 'shelter' || room === 'shelterDefense'
          ? 0.028
          : room === 'maintenance'
            ? 0.11
            : 0.13,
        0.45,
      )
    if (humLevel)
      gainTo(
        humLevel.gain,
        room === 'shelter' || room === 'shelterDefense'
          ? 0.004
          : chapter56Room(room)
            ? 0.01
            : trainRoom(room)
              ? powered
                ? 0.018
                : 0.002
              : room === 'platform'
                ? 0.01
                : room === 'electrical'
                  ? powered
                    ? 0.035
                    : 0.006
                  : room === 'hall'
                    ? 0.015
                    : 0.022,
      )
    if (fanFilter)
      gainTo(
        fanFilter.frequency,
        room === 'shelter' || room === 'shelterDefense'
          ? 140
          : room === 'maintenance' || room === 'recovery'
            ? 240
            : room.startsWith('moon')
              ? 190
              : trainRoom(room)
                ? powered
                  ? room === 'trainRear'
                    ? 260
                    : 210
                  : 70
                : room === 'platform'
                  ? 190
                  : room === 'electrical'
                    ? powered
                      ? 460
                      : 180
                    : room === 'hall'
                      ? 260
                      : 320,
      )
    if (context && noise && tractionFilter && enabled && motion !== 'stopped' && !rolling) {
      rolling = context.createBufferSource()
      rolling.buffer = noise
      rolling.loop = true
      rolling.connect(tractionFilter)
      track(rolling, [], true)
      rolling.start()
    } else if (rolling && motion === 'stopped') {
      rolling.stop()
      rolling = null
    }
    if (context && noise && waterFilter && enabled && wet && !ended && !water) {
      water = context.createBufferSource()
      water.buffer = noise
      water.loop = true
      water.connect(waterFilter)
      track(water, [], true)
      water.start()
    } else if (water && (!wet || ended || !enabled)) {
      water.stop()
      water = null
    }
    if (traction)
      gainTo(
        traction.gain,
        enabled && focused && motion !== 'stopped' ? (motion === 'slowing' ? 0.055 : 0.1) : 0,
        motion === 'stopped' ? 0.12 : 0.3,
      )
    if (tractionFilter) gainTo(tractionFilter.frequency, motion === 'slowing' ? 160 : 500, 0.3)
    if (!audible() || paused) distance = 0
  }
  const silence = () => {
    oneShots.forEach((source) => {
      try {
        source.stop()
      } catch {
        /* Already stopped. */
      }
    })
    oneShots.clear()
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime)
      master.gain.setValueAtTime(0, context.currentTime)
    }
  }
  const unlock = async (preview = false) => {
    if ((!enabled && !preview) || (ended && !preview) || !focused) return
    if (status === 'unavailable' || context?.state === 'running') return
    try {
      if (!context) {
        if (!window.AudioContext) throw new Error('Audio unavailable')
        context = new AudioContext()
        master = own(context.createGain())
        master.gain.value = 0
        master.connect(context.destination)
        ambient = own(context.createGain())
        ambient.gain.value = 0
        ambient.connect(master)
        noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
        const data = noise.getChannelData(0)
        let seed = 71
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 16807) % 2147483647
          data[i] = (seed / 2147483647) * 2 - 1
        }
        const fan = context.createBufferSource()
        fan.buffer = noise
        fan.loop = true
        const filter = own(context.createBiquadFilter())
        fanFilter = filter
        filter.type = 'lowpass'
        filter.frequency.value = 320
        filter.Q.value = 0.4
        const level = own(context.createGain())
        fanLevel = level
        level.gain.value = 0.13
        fan.connect(filter).connect(level).connect(ambient)
        track(fan, [filter, level], true)
        fan.start()
        const hum = context.createOscillator()
        hum.type = 'sine'
        hum.frequency.value = 50
        humLevel = own(context.createGain())
        humLevel.gain.value = 0.022
        hum.connect(humLevel).connect(ambient)
        track(hum, [humLevel], true)
        hum.start()
        // A single rolling loop bypasses the cabin equipment bus. Power cuts and
        // carriage transitions must never restart it or change its playback phase.
        traction = own(context.createGain())
        traction.gain.value = 0
        traction.connect(master)
        tractionFilter = own(context.createBiquadFilter())
        tractionFilter.type = 'lowpass'
        tractionFilter.frequency.value = 500
        tractionFilter.connect(traction)
        waterLevel = own(context.createGain())
        waterLevel.gain.value = 0.065
        waterLevel.connect(ambient)
        waterFilter = own(context.createBiquadFilter())
        waterFilter.type = 'bandpass'
        waterFilter.frequency.value = 700
        waterFilter.Q.value = 0.4
        waterFilter.connect(waterLevel)
      }
      if (context.state === 'suspended') await context.resume()
      status = context.state === 'running' ? 'ready' : 'locked'
      update()
      notify()
    } catch {
      status = 'unavailable'
      notify()
    }
  }
  const effect = (kind: 'step' | AudioCue, preview = false) => {
    if (
      !context ||
      !master ||
      !noise ||
      context.state !== 'running' ||
      !focused ||
      settings.muted ||
      !settings.volume ||
      (!enabled && !preview) ||
      (ended && kind !== 'complete' && !preview)
    )
      return
    const t = context.currentTime
    const duration = ['chime', 'sensor', 'processed', 'complete', 'latch'].includes(kind)
      ? 0.3
      : kind === 'valve'
        ? 0.6
        : kind === 'echo'
          ? 0.22
          : kind === 'vibration'
            ? 0.55
            : ['call', 'approved', 'request', 'chime', 'sensor', 'processed', 'complete'].includes(
                  kind,
                )
              ? 0.25
              : kind === 'brake'
                ? 1.4
                : kind === 'step' || kind === 'infected'
                  ? 0.16
                  : kind === 'switch'
                    ? 0.1
                    : kind === 'key'
                      ? 0.24
                      : kind === 'warning'
                        ? 0.45
                        : 1.05
    if (t - (lastCue.get(kind) ?? -Infinity) < Math.max(0.25, duration)) return
    lastCue.set(kind, t)
    const source = context.createBufferSource()
    source.buffer = noise
    const filter = own(context.createBiquadFilter())
    filter.type = 'lowpass'
    filter.frequency.value =
      kind === 'echo'
        ? 500
        : kind === 'vibration'
          ? 95
          : kind === 'infected'
            ? 180
            : kind === 'step'
              ? 430
              : kind === 'key'
                ? 2200
                : kind === 'switch'
                  ? 1600
                  : 1050
    filter.Q.value = 0.6
    const envelope = own(context.createGain())
    envelope.gain.setValueAtTime(0, t)
    envelope.gain.linearRampToValueAtTime(
      kind === 'step' ? 0.2 : kind === 'door' || kind === 'gate' ? 0.12 : 0.055,
      t + 0.015,
    )
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    source.connect(filter).connect(envelope).connect(master)
    track(source, [filter, envelope])
    source.start(t)
    source.stop(t + duration)
    if (
      [
        'door',
        'gate',
        'restore',
        'warning',
        'call',
        'approved',
        'depart',
        'request',
        'brake',
        'stop',
        'vibration',
        'chime',
        'sensor',
        'processed',
        'valve',
        'latch',
        'complete',
      ].includes(kind)
    ) {
      const motor = context.createOscillator()
      motor.type = kind === 'vibration' ? 'sine' : 'triangle'
      motor.frequency.setValueAtTime(
        ['call', 'approved', 'request', 'chime', 'sensor', 'processed', 'complete'].includes(kind)
          ? 440
          : kind === 'warning'
            ? 360
            : kind === 'restore' || kind === 'depart'
              ? 65
              : kind === 'vibration'
                ? 85
                : 110,
        t,
      )
      motor.frequency.exponentialRampToValueAtTime(
        kind === 'restore' || kind === 'depart'
          ? 130
          : kind === 'warning'
            ? 240
            : ['call', 'approved', 'request', 'chime', 'sensor', 'processed', 'complete'].includes(
                  kind,
                )
              ? 330
              : 55,
        t + duration * 0.75,
      )
      const level = own(context.createGain())
      level.gain.setValueAtTime(0, t)
      level.gain.linearRampToValueAtTime(0.045, t + 0.08)
      level.gain.linearRampToValueAtTime(0, t + duration)
      motor.connect(level).connect(master)
      track(motor, [level])
      motor.start(t)
      motor.stop(t + duration)
    }
  }
  return {
    unlock,
    configure: (
      value: SoundSettings,
      active: boolean,
      blocked: boolean,
      area = 'first',
      power = false,
      movement: TrainMotion = 'stopped',
      waterActive = false,
      finished = false,
    ) => {
      if (room !== area && !(trainRoom(room) && trainRoom(area)) && !chapter56Room(area)) {
        silence()
        distance = 0
      }
      if (!finished) clearTimeout(completionTimer)
      wet = waterActive
      ended = finished
      motion = movement
      room = area
      powered = power
      settings = normalizeSound(value)
      enabled = active
      paused = blocked
      update()
      if (!enabled || settings.muted || settings.volume === 0) silence()
      if (!enabled) void context?.suspend().catch(() => {})
      else if (!ended && context?.state === 'suspended' && focused) void unlock()
    },
    focus: (value: boolean) => {
      focused = value
      distance = 0
      update()
      if (!value) {
        silence()
        void context?.suspend().catch(() => {})
      } else if (enabled && !ended && context?.state === 'suspended') void unlock()
    },
    travel: (amount: number) => {
      if (ended || !audible() || paused || !Number.isFinite(amount) || amount <= 0) return
      distance += Math.min(amount, 12)
      if (distance >= 48 && context!.currentTime - lastStep >= 0.28) {
        distance = 0
        lastStep = context!.currentTime
        effect('step')
      }
    },
    door: () => effect('door'),
    cue: (kind: AudioCue) => effect(kind),
    complete: async () => {
      await unlock(true)
      if (!master || !context || !ended) return
      master.gain.setValueAtTime(settings.muted ? 0 : settings.volume * 0.5, context.currentTime)
      effect('complete', true)
      clearTimeout(completionTimer)
      completionTimer = setTimeout(() => {
        silence()
        void context?.suspend().catch(() => {})
      }, 450)
    },
    preview: async () => {
      await unlock(true)
      if (master) {
        master.gain.setValueAtTime(settings.muted ? 0 : settings.volume * 0.5, context!.currentTime)
        effect('door', true)
        clearTimeout(previewTimer)
        previewTimer = setTimeout(() => {
          if (!enabled || ended) {
            silence()
            void context?.suspend().catch(() => {})
          }
        }, 1150)
      }
    },
    getStatus: () => status,
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    dispose: () => {
      clearTimeout(previewTimer)
      clearTimeout(completionTimer)
      oneShots.clear()
      sources.forEach((s) => {
        try {
          s.stop()
        } catch {
          /* already ended */
        }
        s.disconnect()
      })
      sources.clear()
      nodes.forEach((n) => n.disconnect())
      nodes.clear()
      void context?.close().catch(() => {})
      context = null
      master = null
      ambient = null
      humLevel = null
      fanFilter = null
      fanLevel = null
      water = null
      waterFilter = null
      waterLevel = null
      ended = false
      wet = false
      rolling = null
      traction = null
      tractionFilter = null
      motion = 'stopped'
      lastCue.clear()
      noise = null
      distance = 0
      lastStep = -Infinity
      status = 'locked'
    },
  }
}
export const firstRoomAudio = createRoomAudio()
