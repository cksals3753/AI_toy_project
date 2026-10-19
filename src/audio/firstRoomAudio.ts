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
    if (ambient) gainTo(ambient.gain, enabled && focused ? (paused ? 0.22 : 1) : 0)
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
    if (!enabled && !preview) return
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
        filter.type = 'lowpass'
        filter.frequency.value = 320
        filter.Q.value = 0.4
        const level = own(context.createGain())
        level.gain.value = 0.13
        fan.connect(filter).connect(level).connect(ambient)
        track(fan, [filter, level], true)
        fan.start()
        const hum = context.createOscillator()
        hum.type = 'sine'
        hum.frequency.value = 50
        const humLevel = own(context.createGain())
        humLevel.gain.value = 0.022
        hum.connect(humLevel).connect(ambient)
        track(hum, [humLevel], true)
        hum.start()
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
  const effect = (kind: 'step' | 'door', preview = false) => {
    if (
      !context ||
      !master ||
      !noise ||
      context.state !== 'running' ||
      !focused ||
      settings.muted ||
      !settings.volume ||
      (!enabled && !preview)
    )
      return
    const t = context.currentTime,
      duration = kind === 'step' ? 0.16 : 1.05
    const source = context.createBufferSource()
    source.buffer = noise
    const filter = own(context.createBiquadFilter())
    filter.type = 'lowpass'
    filter.frequency.value = kind === 'step' ? 430 : 1050
    filter.Q.value = 0.6
    const envelope = own(context.createGain())
    envelope.gain.setValueAtTime(0, t)
    envelope.gain.linearRampToValueAtTime(kind === 'step' ? 0.2 : 0.12, t + 0.015)
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    source.connect(filter).connect(envelope).connect(master)
    track(source, [filter, envelope])
    source.start(t)
    source.stop(t + duration)
    if (kind === 'door') {
      const motor = context.createOscillator()
      motor.type = 'triangle'
      motor.frequency.setValueAtTime(110, t)
      motor.frequency.exponentialRampToValueAtTime(55, t + 0.8)
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
    configure: (value: SoundSettings, active: boolean, blocked: boolean) => {
      settings = normalizeSound(value)
      enabled = active
      paused = blocked
      update()
      if (!enabled || settings.muted || settings.volume === 0) silence()
      if (!enabled) void context?.suspend().catch(() => {})
      else if (context?.state === 'suspended' && focused) void unlock()
    },
    focus: (value: boolean) => {
      focused = value
      distance = 0
      update()
      if (!value) {
        silence()
        void context?.suspend().catch(() => {})
      } else if (enabled && context?.state === 'suspended') void unlock()
    },
    travel: (amount: number) => {
      if (!audible() || paused || !Number.isFinite(amount) || amount <= 0) return
      distance += Math.min(amount, 12)
      if (distance >= 48 && context!.currentTime - lastStep >= 0.28) {
        distance = 0
        lastStep = context!.currentTime
        effect('step')
      }
    },
    door: () => effect('door'),
    preview: async () => {
      await unlock(true)
      if (master) {
        master.gain.setValueAtTime(settings.muted ? 0 : settings.volume * 0.5, context!.currentTime)
        effect('door', true)
        clearTimeout(previewTimer)
        previewTimer = setTimeout(() => {
          if (!enabled) {
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
      noise = null
      distance = 0
      lastStep = -Infinity
      status = 'locked'
    },
  }
}
export const firstRoomAudio = createRoomAudio()
