import { chapter7Objects } from './chapter7'
import { finalObjects } from './chapter6'
import { finalAreaLabels } from './world'
import type { State } from './engine'
import { episode, objects } from './data'
import { hallObjects } from './chapter2'
import { platformObjects } from './chapter3'
import { trainObjects } from './chapter4'
import { moonObjects, moonClueText } from './chapter5'
import { moonAreaLabels, trainAreaLabels } from './world'

export const chapterInfo = (s: State) =>
  s.chapter7.started
    ? { number: 7, title: '안전하지 않은 대피소' }
    : s.chapter6.started
      ? { number: 6, title: '정비 통로' }
      : s.chapter5.started
        ? { number: 5, title: '대답 없는 승강장' }
        : s.chapter4.started
          ? { number: 4, title: '정차하지 않는 열차' }
          : s.chapter3.started
            ? { number: 3, title: '누군가 있는 승강장' }
            : s.area !== 'first'
              ? { number: 2, title: '불 꺼진 대합실' }
              : { number: 1, title: episode.title }
export const locationName = (s: State) =>
  (s.area === 'shelterDefense' ? '지상 대피소 · 대응 구획' : undefined) ??
  finalAreaLabels[s.area] ??
  moonAreaLabels[s.area] ??
  trainAreaLabels[s.area] ??
  (
    {
      first: '정비 대기실',
      hall: '대합실',
      electrical: '전기실',
      stairs: '승강장 계단',
      platform: '승강장',
      trainA: '대피 객실',
    } as Record<string, string>
  )[s.area] ??
  '탐색 구역'
export const clueGroups = (s: State) =>
  [
    { place: '지상 대피소 · 대응 구획', items: chapter7Objects },
    ...(['maintenance', 'recovery', 'shelter'] as const).map((area) => ({
      place: finalAreaLabels[area]!,
      items: finalObjects.filter((o) => o.area === area),
    })),
    { place: '신도림 · 정비 대기실', items: objects },
    { place: '신도림 · 대합실과 전기실', items: hallObjects },
    { place: '신도림 · 승강장과 대피 객실', items: platformObjects },
    { place: '이동 열차 · 객실', items: trainObjects },
    ...(['moonPlatform', 'moonBooth', 'moonHolding'] as const).map((area) => ({
      place: `문래 · ${moonAreaLabels[area]}`,
      items: moonObjects.filter((o) => o.area === area),
    })),
  ]
    .map((group) => ({
      place: group.place,
      items: group.items
        .filter((o) => s.clues.includes(o.id))
        .map((o) => ({
          id: o.id,
          title: o.title,
          text: moonObjects.some((m) => m.id === o.id)
            ? moonClueText(o.id, s.chapter5)
            : 'clue' in o
              ? o.clue
              : '',
        })),
    }))
    .filter((g) => g.items.length)
export type Reading = { clues: string[]; messages: number }
export const normalizeReading = (value: unknown, clues: string[], messages: number): Reading => {
  const r = value && typeof value === 'object' ? (value as Partial<Reading>) : {}
  return {
    clues: Array.isArray(r.clues)
      ? r.clues.filter((id): id is string => typeof id === 'string' && clues.includes(id))
      : [],
    messages: Number.isSafeInteger(r.messages) ? Math.max(0, Math.min(messages, r.messages!)) : 0,
  }
}
