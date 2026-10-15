import { afterEach, describe, expect, it } from 'vitest'
import { initialState, loadGame, reducer } from './engine'
import type { Action, State } from './engine'
import { defaultChapter3 } from './chapter3'
import { defaultChapter4, trainObjects } from './chapter4'
import {
  defaultChapter5,
  defaultDisplayName,
  maintenanceRule,
  matchingRegistration,
  moonClueText,
  moonBroadcast,
  moonEvidence,
  moonObjects,
  moonOpening,
  moonQuestions,
  moonStation,
} from './chapter5'
import { trainEvidence } from './trainEvidence'
import { getWorld, nearestEntity, walkable } from './world'

const apply = (s: State, ...actions: Action[]) => actions.reduce(reducer, s)
const finish = (s: State) => {
  let next = s
  for (let i = 0; i < 20 && next.scene.length; i++) next = reducer(next, { type: 'advance' })
  return next
}
const arrived = (together = false): State => ({
  ...initialState,
  stage: 'explore',
  area: 'trainB',
  health: 1,
  battery: 0,
  inventory: ['절연 장갑', '전기실 열쇠'],
  clues: ['cabinet', 'train-phone', 'train-devices'],
  asked: ['west'],
  chapter2: { ...initialState.chapter2, completed: true },
  chapter3: {
    ...defaultChapter3,
    started: true,
    approved: true,
    signal: 'green',
    doorOpen: true,
    boarded: true,
    npc: together ? 'helped' : 'waiting',
    npcBoarded: together,
    escaped: true,
    ending: 'complete',
  },
  chapter4: {
    ...defaultChapter4,
    started: true,
    links: { relay: true, power: true, external: false },
    sync: 'accepted',
    arrived: true,
    doorSeen: true,
    completed: true,
    interruption: 'restored',
    suspicion: true,
  },
})
const start = (together = false, name = defaultDisplayName) =>
  finish(
    apply(
      arrived(together),
      { type: 'moon-start' },
      { type: 'moon-profile-edit', name },
      { type: 'moon-profile-confirm' },
    ),
  )
const inspect = (s: State, id: string) => finish(reducer(s, { type: 'inspect', id }))
const choose = (choice: 'answered' | 'silent', together = false) =>
  finish(
    reducer(inspect(inspect(start(together), 'moon-warning'), 'moon-sensor'), {
      type: 'moon-respond',
      choice,
    }),
  )
const cancel = (s: State) =>
  finish(
    reducer(inspect(inspect(s, 'moon-active-record'), 'moon-cancel-note'), {
      type: 'moon-cancel',
      caseId: matchingRegistration.id,
    }),
  )
const booth = (s: State) => {
  let next = s.area === 'moonHolding' ? reducer(s, { type: 'moon-move', area: 'moonPlatform' }) : s
  next = reducer(next, { type: 'moon-move', area: 'moonBooth' })
  for (const id of moonEvidence) next = inspect(next, id)
  return next
}
const reload = (s: unknown) => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify(s) },
  })
  return loadGame()
}
afterEach(() => Reflect.deleteProperty(globalThis, 'localStorage'))

describe('chapter 5 entry, identity and historical continuity', () => {
  it('requires actual chapter 4 arrival and completion', () => {
    expect(reducer(initialState, { type: 'moon-start' })).toBe(initialState)
    const s = { ...arrived(), chapter4: { ...arrived().chapter4, completed: false } }
    expect(reducer(s, { type: 'moon-start' })).toBe(s)
  })
  it('confirms an existing fictional profile without transmitting a new identity', () => {
    let s = reducer(arrived(), { type: 'moon-start' })
    expect(s.chapter5.displayName).toBeNull()
    expect(s.messages).toEqual(arrived().messages)
    expect(reducer(s, { type: 'moon-move', area: 'moonBooth' })).toBe(s)
    expect(reducer(s, { type: 'position', position: { x: 450, y: 400 } })).toBe(s)
    s = apply(s, { type: 'moon-profile-edit', name: '  가온  ' }, { type: 'moon-profile-confirm' })
    expect(s.chapter5.displayName).toBe('가온')
    expect(s.scene.some((m) => m.who === 'broadcast' && m.text.includes('가온'))).toBe(true)
    expect(s.scene[0].text).toContain('이름을 새로 보내지는 않았다')
    expect(moonClueText('moon-attachment', s.chapter5)).toContain('가온')
    expect(moonClueText('moon-broadcast', s.chapter5)).toContain('가온')
    s = finish(s)
    expect(reducer(s, { type: 'moon-profile-edit', name: '변경' })).toBe(s)
    expect(reload(s).chapter5.displayName).toBe('가온')
  })
  it.each(['', '   ', '가'.repeat(17)])(
    'rejects invalid profile %j without starting broadcast',
    (name) => {
      const s = apply(
        arrived(),
        { type: 'moon-start' },
        { type: 'moon-profile-edit', name },
        { type: 'moon-profile-confirm' },
      )
      expect(s.chapter5.displayName).toBeNull()
      expect(s.scene).toHaveLength(0)
      expect(s.notice).toContain('1~16자')
      expect(
        reducer(s, { type: 'moon-profile-confirm', useDefault: true }).chapter5.displayName,
      ).toBe(defaultDisplayName)
    },
  )
  it('uses shared train evidence without changing the original clue or timestamps', () => {
    expect(moonStation).toBe('문래역')
    expect(trainEvidence).toEqual({
      vehicle: 'B-04',
      external: 'EXT-X09',
      transmissions: ['02:31:04', '02:31:08'],
    })
    expect(trainObjects[0].clue).toContain('마지막 전송 02:31:08, 이전 전송 02:31:04')
    const s = start(true)
    expect(s.chapter4).toEqual(arrived(true).chapter4)
    expect(s.chapter3).toEqual(arrived(true).chapter3)
    expect(s.chapter2).toEqual(arrived(true).chapter2)
    expect(s.clues).toEqual([...arrived(true).clues, 'moon-broadcast'])
  })
})

describe('explicit response branches and recoverability', () => {
  it('requires observable warnings and does not treat normal actions as a response', () => {
    let s = start()
    expect(reducer(s, { type: 'moon-respond', choice: 'answered' }).chapter5.response).toBe(
      'undecided',
    )
    s = inspect(inspect(s, 'moon-shoes'), 'moon-sensor')
    expect(s.chapter5.response).toBe('undecided')
    expect(reducer(s, { type: 'moon-respond', choice: 'answered' }).chapter5.response).toBe(
      'undecided',
    )
    s = inspect(s, 'moon-warning')
    expect(reducer(s, { type: 'moon-respond', choice: 'answered' }).area).toBe('moonHolding')
  })
  it.each([true, false])(
    'responding closes a recoverable holding area, companion %s',
    (together) => {
      let s = choose('answered', together)
      expect(s.area).toBe('moonHolding')
      expect(s.chapter5.registration).toBe('active')
      expect(reducer(s, { type: 'moon-move', area: 'moonPlatform' }).area).toBe('moonHolding')
      expect(
        reducer(s, { type: 'moon-cancel', caseId: matchingRegistration.id }).chapter5.registration,
      ).toBe('active')
      s = inspect(inspect(s, 'moon-active-record'), 'moon-cancel-note')
      for (let i = 0; i < 8; i++) s = reducer(s, { type: 'moon-cancel', caseId: 'REG-409' })
      expect(s.chapter5.registration).toBe('active')
      expect(s.health).toBe(1)
      expect(s.battery).toBe(0)
      s = finish(reducer(s, { type: 'moon-cancel', caseId: matchingRegistration.id }))
      expect(s.chapter5.registration).toBe('cancelled')
      expect(reducer(s, { type: 'moon-move', area: 'moonPlatform' }).area).toBe('moonPlatform')
      expect(s.inventory).toEqual(arrived().inventory)
      expect(s.chapter3.npcBoarded).toBe(together)
    },
  )
  it('keeps every broadcast line in the replayable notebook without changing a choice', () => {
    let s = choose('answered')
    expect(moonClueText('moon-broadcast', s.chapter5)).toContain(moonBroadcast.confirmed)
    s = { ...s, chapter5: { ...s.chapter5, exitSeen: true } }
    const transcript = moonClueText('moon-broadcast', s.chapter5)
    expect(transcript).toContain(moonBroadcast.intro(defaultDisplayName))
    expect(transcript).toContain(moonBroadcast.ending('answered'))
    expect(s.chapter5.response).toBe('answered')
  })
  it('silence leaves doors unchanged and requires booth processing', () => {
    const s = choose('silent')
    expect(s.area).toBe('moonPlatform')
    expect(s.chapter5.registration).toBe('pending')
    expect(reducer(s, { type: 'moon-respond', choice: 'answered' })).toBe(s)
    expect(s.chapter5.externalPaused).toBe(false)
  })
  it('cannot alter response through dialogue, replay or a completed branch', () => {
    let s = choose('silent')
    s = reducer(s, { type: 'talk', lines: [{ who: 'broadcast', text: '응답하세요.' }] })
    expect(reducer(s, { type: 'moon-respond', choice: 'answered' })).toBe(s)
    expect(reducer(s, { type: 'position', position: { x: 450, y: 400 } })).toBe(s)
    s = finish(s)
    const count = s.messages.length
    s = inspect(inspect(s, 'moon-broadcast'), 'moon-broadcast')
    expect(s.chapter5.response).toBe('silent')
    expect(s.messages).toHaveLength(count)
  })
})

describe('evidence, knowledge boundaries, puzzle and exit', () => {
  it('requires the manual attachment and matching identifiers, not just time coincidence', () => {
    let s = reducer(choose('silent'), { type: 'moon-move', area: 'moonBooth' })
    s = inspect(inspect(s, 'moon-playback'), 'moon-receipt')
    expect(
      reducer(s, { type: 'moon-match', caseId: matchingRegistration.id }).chapter5.matched,
    ).toBe(false)
    s = inspect(s, 'moon-attachment')
    expect(reducer(s, { type: 'moon-match', caseId: 'REG-409' }).chapter5.matched).toBe(false)
    expect(reducer(s, { type: 'moon-match', caseId: 'REG-411' }).chapter5.matched).toBe(false)
    s = reducer(s, { type: 'moon-match', caseId: matchingRegistration.id })
    expect(s.chapter5.matched).toBe(true)
    expect(s.clues).toContain('moon-disclosure')
    expect(reducer(s, { type: 'moon-match', caseId: matchingRegistration.id })).toBe(s)
  })
  it('gates each question and adapts replies to evidence already shared', () => {
    let s = start()
    for (const q of moonQuestions) expect(reducer(s, { type: 'ask', id: q.id })).toBe(s)
    s = booth(choose('silent'))
    s = reducer(s, { type: 'ask', id: 'moon-transmission-question' })
    expect(reducer(s, { type: 'ask', id: 'moon-transmission-question' })).toBe(s)
    expect(reducer(s, { type: 'ask', id: 'moon-disclosure-question' })).toBe(s)
    s = apply(
      s,
      { type: 'moon-match', caseId: matchingRegistration.id },
      { type: 'ask', id: 'moon-disclosure-question' },
    )
    expect(s.messages.at(-3)?.text).toContain('아까는 장치끼리')
    expect(s.messages.at(-1)?.text).toContain('같은지도 아직 알 수 없어요')
  })
  it('does not expose author-only attribution or hidden character roles in player-facing records', () => {
    const s = booth(choose('silent'))
    const publicText = [
      ...moonObjects.map((o) => moonClueText(o.id, s.chapter5)),
      ...moonOpening.map((m) => m.text),
    ].join('\n')
    for (const secret of [
      '오반장이 제출',
      '오반장이 정보를',
      '진짜 조력자',
      '의도적인 거짓말',
      '최종 적은',
    ])
      expect(publicText).not.toContain(secret)
    expect(moonClueText('moon-attachment', s.chapter5)).toContain('제출자 계정 비공개')
  })
  it.each(['answered', 'silent'] as const)(
    'finishes %s with separate physical route evidence, retries and explicit approval',
    (choice) => {
      let s = choose(choice, true)
      if (choice === 'answered') s = cancel(s)
      s = booth(s)
      s = apply(
        s,
        { type: 'moon-match', caseId: matchingRegistration.id },
        { type: 'moon-process' },
      )
      expect(s.chapter5.registration).toBe(choice === 'answered' ? 'cancelled' : 'held')
      s = reducer(s, { type: 'moon-move', area: 'moonPlatform' })
      expect(
        reducer(s, { type: 'moon-unlock', door: maintenanceRule.door, mode: maintenanceRule.mode })
          .chapter5.routeOpen,
      ).toBe(false)
      s = inspect(s, 'moon-route')
      s = reducer(s, { type: 'moon-unlock', door: 'D-03', mode: 'remote' })
      expect(s.chapter5.routeOpen).toBe(false)
      s = apply(
        s,
        { type: 'moon-unlock', door: maintenanceRule.door, mode: maintenanceRule.mode },
        { type: 'moon-exit' },
      )
      expect(s.chapter5.completed).toBe(false)
      expect(s.scene.find((m) => m.who === 'broadcast')?.text).toContain(
        choice === 'answered' ? '취소되었습니다' : '응답하지 않은',
      )
      s = finish(s)
      s = reducer(s, { type: 'moon-finish', confirm: false })
      expect(s.chapter5.completed).toBe(false)
      s = apply(s, { type: 'moon-exit' }, { type: 'moon-finish', confirm: true })
      expect(s.chapter5.completed).toBe(true)
      expect(s.area).toBe('moonPlatform')
      expect(s.health).toBe(1)
      expect(s.battery).toBe(0)
      expect(s.inventory).toEqual(arrived().inventory)
      expect(reload(s).chapter5).toEqual(s.chapter5)
      expect(s.notice).toContain('문래역')
    },
  )
})

describe('migration, resume and reachable physical interactions', () => {
  it('adds defaults to earlier saves and retains arrival and companion after entering the station', () => {
    const old: Partial<State> = arrived(true)
    delete old.chapter5
    expect(reload(old).chapter5).toEqual(defaultChapter5)
    const s = start(true)
    expect(reload(s).chapter3).toEqual(s.chapter3)
    expect(reload(s).chapter4).toEqual(s.chapter4)
    expect(reload(s).area).toBe('moonPlatform')
  })
  it.each(['answered', 'silent'] as const)(
    'resumes all major %s states without repeated events',
    (choice) => {
      let s = reducer(arrived(true), { type: 'moon-start' })
      const checkpoints = [s]
      s = reducer(s, { type: 'moon-profile-edit', name: '별빛' })
      checkpoints.push(s)
      s = reducer(s, { type: 'moon-profile-confirm' })
      checkpoints.push(s)
      s = finish(s)
      s = inspect(inspect(s, 'moon-warning'), 'moon-sensor')
      s = reducer(s, { type: 'moon-respond', choice })
      checkpoints.push(s)
      s = finish(s)
      if (choice === 'answered') {
        checkpoints.push(s)
        s = cancel(s)
        checkpoints.push(s)
      }
      s = booth(s)
      s = reducer(s, { type: 'moon-match', caseId: matchingRegistration.id })
      checkpoints.push(s)
      s = reducer(s, { type: 'moon-process' })
      checkpoints.push(s)
      s = inspect(reducer(s, { type: 'moon-move', area: 'moonPlatform' }), 'moon-route')
      s = reducer(s, {
        type: 'moon-unlock',
        door: maintenanceRule.door,
        mode: maintenanceRule.mode,
      })
      checkpoints.push(s)
      s = reducer(s, { type: 'moon-exit' })
      checkpoints.push(s)
      s = finish(s)
      checkpoints.push(s)
      s = reducer(s, { type: 'moon-finish', confirm: true })
      checkpoints.push(s)
      for (const checkpoint of checkpoints) {
        const restored = reload(checkpoint)
        expect(restored.chapter5).toEqual(checkpoint.chapter5)
        expect(restored.chapter4).toEqual(checkpoint.chapter4)
        expect(restored.chapter3).toEqual(checkpoint.chapter3)
        expect(restored.scene).toEqual(checkpoint.scene)
        expect(restored.sceneIndex).toBe(checkpoint.sceneIndex)
        expect(restored.messages).toEqual(checkpoint.messages)
        expect(restored.clues).toEqual(checkpoint.clues)
        expect(restored.area).toBe(checkpoint.area)
      }
    },
  )
  it.each(['moonPlatform', 'moonBooth', 'moonHolding'] as const)(
    'can walk to every object in %s with or without NPC',
    (area) => {
      for (const together of [true, false]) {
        const world = getWorld(area, 'helped', together),
          queue = [world.spawn],
          seen = new Set<string>(),
          reached = new Set<string>()
        for (let i = 0; i < queue.length; i++) {
          const p = queue[i],
            key = `${p.x},${p.y}`
          if (seen.has(key)) continue
          seen.add(key)
          const entity = nearestEntity(p, world)
          if (entity) reached.add(entity.id)
          for (const delta of [
            { x: 10, y: 0 },
            { x: -10, y: 0 },
            { x: 0, y: 10 },
            { x: 0, y: -10 },
          ]) {
            const next = { x: p.x + delta.x, y: p.y + delta.y }
            if (walkable(next, world) && !seen.has(`${next.x},${next.y}`)) queue.push(next)
          }
        }
        expect([...reached].sort()).toEqual(world.entities.map((e) => e.id).sort())
      }
    },
  )
})
