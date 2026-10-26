import {
  interactionReach,
  interactionSurface,
  surfaceDistance,
  workingFaceVisible,
} from './interaction'
import { initialHallEnvironment, hallPartitions, shutterRect, waterRects } from './hallEnvironment'
import type { HallEnvironment } from './hallEnvironment'
import type { Chapter7 } from './chapter7'
import { rearOpen } from './chapter7'
import type { Chapter6 } from './chapter6'
import type { Chapter5 } from './chapter5'
import type { Chapter4 } from './chapter4'
export type Point = { x: number; y: number }
export type Rect = Point & { w: number; h: number }
export type Entity = Rect & {
  id: string
  label: string
  kind: 'object' | 'npc' | 'door'
  color: string
  passable?: boolean
}
export type Area =
  | 'shelterDefense'
  | 'first'
  | 'hall'
  | 'electrical'
  | 'stairs'
  | 'platform'
  | 'trainA'
  | 'trainB'
  | 'trainRear'
  | 'trainFront'
  | 'moonPlatform'
  | 'moonBooth'
  | 'moonHolding'
  | 'maintenance'
  | 'recovery'
  | 'shelter'
export const room = {
  width: 960,
  height: 600,
  spawn: { x: 480, y: 460 },
  radius: 13,
  speed: 165,
  obstacles: [
    { x: 290, y: 250, w: 120, h: 42 },
    { x: 550, y: 250, w: 120, h: 42 },
    { x: 280, y: 390, w: 42, h: 48 },
    { x: 640, y: 390, w: 42, h: 48 },
  ] satisfies Rect[],
  entities: [
    {
      id: 'panel',
      label: '침수 감지 패널',
      kind: 'object',
      x: 740,
      y: 78,
      w: 70,
      h: 38,
      color: '#ac765e',
    },
    {
      id: 'map',
      label: '찢어진 안내도',
      kind: 'object',
      x: 442,
      y: 78,
      w: 80,
      h: 38,
      color: '#b4bf93',
    },
    {
      id: 'cabinet',
      label: '비상 물품함',
      kind: 'object',
      x: 150,
      y: 78,
      w: 70,
      h: 38,
      color: '#99ad94',
    },
    { id: 'oh', label: '오반장', kind: 'npc', x: 205, y: 330, w: 30, h: 30, color: '#b09ab2' },
    {
      id: 'west',
      label: '서쪽 정비문',
      kind: 'door',
      x: 30,
      y: 220,
      w: 24,
      h: 90,
      color: '#a9bd83',
    },
    {
      id: 'east',
      label: '동쪽 2번 출구',
      kind: 'door',
      x: 906,
      y: 220,
      w: 24,
      h: 90,
      color: '#b78b76',
    },
  ] satisfies Entity[],
}
export type World = typeof room & { waterZones?: Rect[]; occluders?: Rect[] }
export const hall: World = {
  ...room,
  spawn: { x: 470, y: 460 },
  obstacles: [
    { x: 310, y: 260, w: 115, h: 42 },
    { x: 550, y: 260, w: 115, h: 42 },
    { x: 330, y: 410, w: 36, h: 45 },
    { x: 640, y: 410, w: 36, h: 45 },
  ],
  entities: [
    {
      id: 'hall-map',
      label: '역 안내도',
      kind: 'object',
      x: 440,
      y: 78,
      w: 80,
      h: 8,
      color: '#bccd98',
    },
    {
      id: 'hall-window',
      label: '통로 점검창',
      kind: 'object',
      x: 112,
      y: 120,
      w: 75,
      h: 40,
      color: '#89c5d7',
    },
    {
      id: 'hall-desk',
      label: '안내 데스크',
      kind: 'object',
      x: 580,
      y: 115,
      w: 120,
      h: 48,
      color: '#b9aa8a',
    },
    {
      id: 'hall-gate-note',
      label: '비상 개방 안내문',
      kind: 'object',
      x: 790,
      y: 183,
      w: 48,
      h: 7,
      color: '#d6cd98',
    },
    {
      id: 'staff',
      label: '직원 전용 통로',
      kind: 'door',
      x: 30,
      y: 240,
      w: 24,
      h: 90,
      color: '#8bbed4',
    },
    {
      id: 'gate',
      label: '잠긴 개찰구',
      kind: 'door',
      x: 856,
      y: 255,
      w: 48,
      h: 95,
      color: '#c3a980',
    },
    {
      id: 'electrical',
      label: '전기실',
      kind: 'door',
      x: 160,
      y: 526,
      w: 80,
      h: 24,
      color: '#becb94',
    },
    {
      id: 'sealed',
      label: '내려온 차단문',
      kind: 'door',
      x: 435,
      y: 526,
      w: 90,
      h: 24,
      color: '#b7836c',
    },
    { id: 'oh', label: '오반장', kind: 'npc', x: 730, y: 220, w: 30, h: 30, color: '#b09ab2' },
  ],
}
export const electrical: World = {
  ...room,
  spawn: { x: 480, y: 455 },
  obstacles: [
    { x: 180, y: 165, w: 85, h: 120 },
    { x: 680, y: 165, w: 85, h: 120 },
  ],
  entities: [
    {
      id: 'powerboard',
      label: '예비 전원 배전반',
      kind: 'object',
      x: 435,
      y: 130,
      w: 90,
      h: 55,
      color: '#bccea0',
    },
    {
      id: 'hall-return',
      label: '대합실로',
      kind: 'door',
      x: 435,
      y: 526,
      w: 90,
      h: 24,
      color: '#adc895',
    },
  ],
}
export const stairs: World = {
  ...room,
  spawn: { x: 480, y: 440 },
  obstacles: [
    { x: 240, y: 130, w: 110, h: 190 },
    { x: 610, y: 130, w: 110, h: 190 },
  ],
  entities: [
    {
      id: 'next-chapter',
      label: '승강장 계단 · CHAPTER 03',
      kind: 'door',
      x: 410,
      y: 90,
      w: 140,
      h: 65,
      color: '#c3d6a7',
    },
  ],
}
export const platform: World = {
  ...room,
  spawn: { x: 140, y: 240 },
  obstacles: [
    { x: 110, y: 75, w: 85, h: 80 },
    { x: 290, y: 75, w: 120, h: 80 },
    { x: 195, y: 75, w: 95, h: 30 },
    { x: 495, y: 483, w: 105, h: 65 },
    { x: 695, y: 483, w: 150, h: 65 },
    { x: 600, y: 524, w: 95, h: 24 },
    { x: 54, y: 155, w: 141, h: 6 },
    { x: 290, y: 155, w: 616, h: 6 },
    { x: 54, y: 477, w: 546, h: 6 },
    { x: 695, y: 477, w: 211, h: 6 },
    { x: 250, y: 300, w: 34, h: 50 },
    { x: 440, y: 315, w: 115, h: 38 },
    { x: 630, y: 210, w: 34, h: 48 },
  ],
  entities: [
    {
      id: 'train-a',
      label: 'A-17 / △-1 · 문 열림',
      kind: 'door',
      x: 195,
      y: 115,
      w: 95,
      h: 38,
      color: '#d8bd80',
    },
    {
      id: 'train-b',
      label: 'B-04 / ◇-2 · 문 닫힘',
      kind: 'door',
      x: 600,
      y: 486,
      w: 95,
      h: 38,
      color: '#84b7be',
    },
    {
      id: 'platform-record',
      label: '역무원 비상 부스',
      kind: 'object',
      x: 760,
      y: 155,
      w: 95,
      h: 48,
      color: '#bfcaa0',
    },
    {
      id: 'approval',
      label: '비상 운행 승인 장치',
      kind: 'object',
      x: 760,
      y: 265,
      w: 95,
      h: 40,
      color: '#bacb9a',
    },
    {
      id: 'platform-signal',
      label: '안전 난간 · 선로 표식',
      kind: 'object',
      x: 105,
      y: 425,
      w: 70,
      h: 35,
      color: '#b9cdab',
    },
    {
      id: 'call-b',
      label: 'B-04 비상 호출',
      kind: 'object',
      x: 775,
      y: 420,
      w: 45,
      h: 32,
      color: '#8bbcc2',
    },
    {
      id: 'front-b',
      label: 'B-04 선두 · 출발 확인',
      kind: 'door',
      x: 565,
      y: 400,
      w: 110,
      h: 35,
      color: '#a8d09c',
    },
    {
      id: 'survivor',
      label: '기둥 뒤의 사람',
      kind: 'npc',
      x: 200,
      y: 340,
      w: 30,
      h: 30,
      color: '#ba947b',
    },
    {
      id: 'platform-stairs',
      label: '승강장 진입 계단',
      kind: 'door',
      x: 70,
      y: 220,
      w: 40,
      h: 65,
      color: '#bcc7a3',
    },
  ],
}
export const trainA: World = {
  ...room,
  spawn: { x: 480, y: 450 },
  obstacles: [
    { x: 170, y: 210, w: 140, h: 40 },
    { x: 650, y: 210, w: 140, h: 40 },
  ],
  entities: [
    {
      id: 'train-a-stop',
      label: 'A-17 선두 차량 · 운행 중지',
      kind: 'object',
      x: 420,
      y: 95,
      w: 120,
      h: 50,
      color: '#dbbb87',
    },
    {
      id: 'exit-a',
      label: '승강장으로 돌아가기',
      kind: 'door',
      x: 430,
      y: 522,
      w: 100,
      h: 28,
      color: '#b6cf96',
    },
  ],
}
const trainSeats: Rect[] = [
  { x: 170, y: 210, w: 140, h: 40 },
  { x: 650, y: 210, w: 140, h: 40 },
]
const trainEntity = (
  id: string,
  label: string,
  x: number,
  y: number,
  kind: Entity['kind'] = 'object',
): Entity => ({ id, label, x, y, w: 80, h: 35, kind, color: '#adc4a0' })
export const trainB: World = {
  ...room,
  spawn: { x: 450, y: 420 },
  obstacles: [...trainSeats, { x: 600, y: 330, w: 30, h: 30 }],
  entities: [
    trainEntity('train-phone', '좌석 01 · 좌석 아래 휴대폰', 190, 270),
    trainEntity('train-route', '객실 노선 표시기', 430, 100),
    trainEntity('train-rear-door', '후방 객실 →', 800, 380, 'door'),
    trainEntity('train-front-door', '← 선두 연결 구역', 85, 380, 'door'),
    trainEntity('train-exit', '중앙 출입문 · 정차 전 잠김', 430, 510, 'door'),
  ],
}
export const trainRear: World = {
  ...room,
  spawn: { x: 450, y: 420 },
  obstacles: trainSeats,
  entities: [
    trainEntity('train-devices', '통신 장치함 R / X / P', 650, 100),
    trainEntity('train-manual', '비상 운행 설명서', 240, 100),
    trainEntity('train-central-door', '중앙 객실로', 430, 510, 'door'),
  ],
}
export const trainFront: World = {
  ...room,
  spawn: { x: 450, y: 420 },
  obstacles: trainSeats,
  entities: [
    trainEntity('train-stop', '정차 요청 패널', 240, 110),
    trainEntity('train-cab', '잠긴 운전실 · 진입 불가', 550, 100, 'door'),
    trainEntity('train-central-door', '중앙 객실로', 430, 510, 'door'),
  ],
}
export const moonPlatform: World = {
  ...room,
  spawn: { x: 450, y: 420 },
  obstacles: [
    { x: 130, y: 200, w: 120, h: 40 },
    { x: 510, y: 240, w: 35, h: 45 },
    { x: 350, y: 544, w: 80, h: 5 },
    { x: 510, y: 544, w: 190, h: 5 },
  ],
  entities: [
    trainEntity('moon-warning', '전광판 · 차단문 경고', 430, 100),
    trainEntity('moon-shoes', '같은 방향의 신발', 260, 290),
    trainEntity('moon-broadcast', '안내방송 자막', 380, 210),
    trainEntity('moon-sensor', 'MIC-03 · 응답 감지기', 760, 260),
    trainEntity('moon-window', '확인 구역 점검창', 640, 100),
    trainEntity('moon-holding-door', '확인 대기 구역 차단문', 800, 100, 'door'),
    trainEntity('moon-booth-door', '안내 부스로 →', 800, 410, 'door'),
    trainEntity('moon-route', 'M-12 · 현장 통행 표식', 100, 380),
    trainEntity('moon-maintenance', 'D-02 · 정비 통로', 100, 500, 'door'),
  ],
}
export const moonBooth: World = {
  ...room,
  spawn: { x: 450, y: 420 },
  obstacles: [
    { x: 270, y: 250, w: 120, h: 45 },
    { x: 560, y: 250, w: 120, h: 45 },
  ],
  entities: [
    trainEntity('moon-playback', '방송 재생 기록', 170, 110),
    trainEntity('moon-receipt', 'RX-12 · 외부 자료 수신', 430, 100),
    trainEntity('moon-attachment', '등록 원본 · 첨부', 700, 110),
    trainEntity('moon-terminal', '등록 대조·보류 단말', 700, 360),
    trainEntity('moon-platform-door', '승강장으로', 430, 510, 'door'),
  ],
}
export const moonHolding: World = {
  ...room,
  spawn: { x: 450, y: 420 },
  obstacles: trainSeats,
  entities: [
    trainEntity('moon-active-record', '내부 활성 등록 표시', 220, 100),
    trainEntity('moon-cancel-note', '내부 해제 안내', 500, 100),
    trainEntity('moon-cancel-device', '내부 취소 장치', 740, 290),
    trainEntity('moon-platform-door', '승강장 복귀 차단문', 430, 510, 'door'),
  ],
}
const finalRoom = (entities: Entity[]): World => ({
  ...room,
  spawn: { x: 450, y: 450 },
  obstacles: [{ x: 320, y: 270, w: 120, h: 40 }],
  entities,
})
export const maintenance = finalRoom([
  trainEntity('final-map', '현행 대피도 S-01 / G-01', 180, 100),
  trainEntity('final-manual', '지역 설비 설명판', 440, 100),
  trainEntity('final-window', 'G-01 점검창', 700, 100),
  trainEntity('final-review', '현장 기록 확인대', 150, 320),
  trainEntity('final-control', '문·승인·전원 제어반', 740, 340),
  trainEntity('final-s01', 'S-01 · 지상 대피소 정문', 100, 500, 'door'),
  trainEntity('final-g01', 'G-01 · 등록 확인 구역', 780, 500, 'door'),
])
export const recovery = finalRoom([
  trainEntity('recovery-sealed', '내려온 진입 차단문', 430, 510, 'door'),
  trainEntity('recovery-note', '내부 복구 안내', 180, 100),
  trainEntity('recovery-water', '배수 상태창', 440, 100),
  trainEntity('recovery-valve', '배수 밸브', 700, 100),
  trainEntity('recovery-bolt', '해치 빗장', 740, 340),
  trainEntity('recovery-hatch', 'S-02 비상 해치', 150, 340, 'door'),
])
export const shelterArrivals = { front: { x: 450, y: 450 }, side: { x: 160, y: 450 } } as const
export const shelter = finalRoom([
  trainEntity('shelter-sign', '지상 대피소 내부 표식', 180, 100),
  trainEntity('shelter-arrival', '대피소 내부 도착 확인대', 700, 100),
])
const defenseEntity = (
  id: string,
  label: string,
  x: number,
  y: number,
  w = 50,
  h = 24,
): Entity => ({ id, label, x, y, w, h, kind: 'object', color: '#b9ad7c' })
export const shelterDefense: World = {
  ...room,
  spawn: { x: 270, y: 450 },
  obstacles: [
    { x: 610, y: 70, w: 20, h: 215 },
    { x: 610, y: 360, w: 20, h: 70 },
    { x: 610, y: 505, w: 20, h: 45 },
    { x: 740, y: 70, w: 12, h: 215 },
    { x: 740, y: 360, w: 12, h: 190 },
    { x: 370, y: 245, w: 120, h: 70 },
  ],
  entities: [
    defenseEntity('s7-rest', '휴식 의자', 160, 420, 60, 28),
    defenseEntity('s7-window', '외부 관측창 / 대응 시작', 260, 90, 95, 15),
    defenseEntity('s7-entrance-note', '반입문 상태와 보강 안내', 120, 90),
    defenseEntity('s7-entrance', '외부 반입문 · 입구 설치점', 55, 220, 16, 70),
    defenseEntity('s7-kit-note', '물자 사용 안내', 395, 90),
    defenseEntity('s7-kit', '지지대 선반 / 반납', 470, 90, 65, 28),
    defenseEntity('s7-rear-note', '후면 비상문 상태', 540, 380),
    defenseEntity('s7-rear', '후면 지름길 · 설치점', 580, 445, 20, 45),
    defenseEntity('s7-winch', '후면 수동 윈치', 665, 90, 55, 35),
    defenseEntity('s7-firedoor', '방화문 · 안전측 손잡이와 빗장', 775, 385, 24, 45),
    defenseEntity('s7-ready', '후면 이동 준비 확인', 785, 430, 50, 35),
    defenseEntity('s7-finish', '다음 이동 준비 완료', 795, 100, 65, 25),
  ],
}
export const worlds: Record<Area, World> = {
  shelterDefense,
  maintenance,
  recovery,
  shelter,
  first: room,
  hall,
  electrical,
  stairs,
  platform,
  trainA,
  trainB,
  trainRear,
  trainFront,
  moonPlatform,
  moonBooth,
  moonHolding,
}
export const getWorld = (
  area: Area,
  npc = 'unseen',
  npcBoarded = false,
  power: readonly string[] = [],
  doorOpen = false,
  chapter4?: Pick<Chapter4, 'started' | 'arrived'>,
  chapter5?: Pick<Chapter5, 'routeOpen' | 'registration'>,
  chapter6?: Pick<Chapter6, 'settings' | 'route' | 'drained' | 'boltOpen'>,
  environment: HallEnvironment = initialHallEnvironment,
  chapter7?: Chapter7,
): World => {
  if (area === 'shelterDefense') {
    const c = chapter7
    return {
      ...shelterDefense,
      obstacles: [
        ...shelterDefense.obstacles,
        ...(!c || !rearOpen(c) ? [{ x: 610, y: 430, w: 20, h: 75 }] : []),
        ...(c && c.fireDoor !== 'open' ? [{ x: 740, y: 285, w: 12, h: 75 }] : []),
      ],
      entities: [
        ...shelterDefense.entities,
        ...(npcBoarded
          ? [
              defenseEntity(
                's7-survivor',
                '다친 생존자',
                c && ['secured', 'complete'].includes(c.phase) ? 785 : 220,
                c && ['secured', 'complete'].includes(c.phase) ? 240 : 425,
                28,
                28,
              ),
            ]
          : []),
      ],
    }
  }

  if (chapter6 && ['maintenance', 'recovery', 'shelter'].includes(area)) {
    const base = worlds[area]
    const entities = base.entities.map((e) => {
      const passable =
        e.id === 'final-s01'
          ? chapter6.settings?.door === 'S-01'
          : e.id === 'final-g01'
            ? chapter6.settings?.door === 'G-01'
            : e.id === 'recovery-hatch'
              ? chapter6.boltOpen
              : undefined
      return passable === undefined ? e : { ...e, passable }
    })
    return {
      ...base,
      spawn:
        area === 'shelter' && chapter6.route === 'automatic' ? shelterArrivals.side : base.spawn,
      obstacles: [
        ...base.obstacles,
        ...(area === 'recovery' || area === 'shelter' ? [{ x: 600, y: 330, w: 30, h: 30 }] : []),
        ...entities
          .filter((e) => e.kind === 'door' && 'passable' in e && e.passable)
          .flatMap((e) => [
            { x: e.x, y: e.y, w: 5, h: e.h },
            { x: e.x + e.w - 5, y: e.y, w: 5, h: e.h },
          ]),
      ],
      entities: [
        ...entities,
        ...(npcBoarded
          ? [
              {
                id: 'survivor',
                label: area === 'recovery' ? '동행 생존자 · 안전 대기' : '동행 생존자',
                kind: 'npc' as const,
                x: area === 'recovery' && chapter6.boltOpen ? 565 : 600,
                y: area === 'recovery' && chapter6.boltOpen ? 430 : 330,
                w: 30,
                h: 30,
                color: '#ba947b',
              },
            ]
          : []),
      ],
    }
  }
  if (chapter5 && ['moonPlatform', 'moonBooth', 'moonHolding'].includes(area)) {
    const base = worlds[area]
    const entities = base.entities.map((e) => {
      const passable =
        e.id === 'moon-shoes'
          ? true
          : e.id === 'moon-maintenance'
            ? chapter5.routeOpen
            : e.id === 'moon-booth-door' || (area === 'moonBooth' && e.id === 'moon-platform-door')
              ? true
              : area === 'moonHolding' && e.id === 'moon-platform-door'
                ? chapter5.registration === 'cancelled'
                : undefined
      return passable === undefined ? e : { ...e, passable }
    })
    return {
      ...base,
      obstacles: [
        ...base.obstacles,
        ...entities
          .filter((e) => e.kind === 'door' && 'passable' in e && e.passable)
          .flatMap((e) => [
            { x: e.x, y: e.y, w: 5, h: e.h },
            { x: e.x + e.w - 5, y: e.y, w: 5, h: e.h },
          ]),
      ],
      entities: [
        ...entities,
        ...(npcBoarded
          ? [
              {
                id: 'survivor',
                label: '동행 생존자',
                kind: 'npc' as const,
                x: 600,
                y: 330,
                w: 30,
                h: 30,
                color: '#ba947b',
              },
            ]
          : []),
      ],
    }
  }
  if (area === 'hall') {
    const waterZones = waterRects(environment.water)
    return {
      ...hall,
      waterZones,
      occluders: hallPartitions,
      obstacles: [
        ...hall.obstacles,
        ...waterZones,
        ...hallPartitions,
        ...(power.includes('gate')
          ? [
              { x: 856, y: 255, w: 48, h: 12 },
              { x: 856, y: 338, w: 48, h: 12 },
            ]
          : []),
      ],
      entities: [
        ...hall.entities.map((e) =>
          e.id === 'gate' && power.includes('gate') ? { ...e, passable: true } : e,
        ),
        {
          ...shutterRect,
          id: 'hall-shutter',
          label:
            environment.shutter === 'open'
              ? 'IS-02 · 걸쇠 고정 / 개방'
              : environment.shutter === 'unlatched'
                ? 'IS-02 · 셔터 올리고 고정'
                : 'IS-02 · 빗장 해제',
          kind: 'door',
          color: '#b7aa75',
          passable: environment.shutter === 'open',
        },
      ],
    }
  }
  if (area === 'platform')
    return {
      ...platform,
      entities: platform.entities.map((e) =>
        e.id === 'train-b' && doorOpen
          ? { ...e, passable: true, label: 'B-04 / ◇-2 · 문 열림' }
          : e.id === 'survivor' && ['helped', 'invited', 'waiting'].includes(npc)
            ? { ...e, x: 610, y: 315, label: '다친 생존자 · 대기 의자' }
            : e,
      ),
    }
  if (chapter4?.started && ['trainRear', 'trainFront'].includes(area)) return worlds[area]
  if (area === 'trainB' && chapter4?.started) {
    const base = worlds.trainB
    return {
      ...base,
      entities: [
        ...base.entities.map((e) =>
          e.id === 'train-exit'
            ? {
                ...e,
                passable: chapter4.arrived,
                label: chapter4.arrived ? '중앙 출입문 · 문래역 하차 확인' : e.label,
              }
            : e,
        ),
        ...(npcBoarded
          ? [
              {
                id: 'survivor',
                label: '함께 탄 생존자 · 좌석',
                kind: 'npc' as const,
                x: chapter4.arrived ? 565 : 600,
                y: chapter4.arrived ? 450 : 330,
                w: 30,
                h: 30,
                color: '#ba947b',
              },
            ]
          : []),
      ],
    }
  }
  if (
    [
      'trainB',
      'trainRear',
      'trainFront',
      'moonPlatform',
      'moonBooth',
      'moonHolding',
      'maintenance',
      'recovery',
      'shelter',
    ].includes(area) &&
    npcBoarded
  )
    return {
      ...worlds[area],
      entities: [
        ...worlds[area].entities,
        {
          id: 'survivor',
          label: '함께 탄 생존자',
          kind: 'npc',
          x: 600,
          y: 330,
          w: 30,
          h: 30,
          color: '#ba947b',
        },
      ],
    }
  return worlds[area]
}
export const overlaps = (p: Point, rect: Rect, radius = room.radius) => {
  return (
    p.x + radius > rect.x &&
    p.x - radius < rect.x + rect.w &&
    p.y + radius > rect.y &&
    p.y - radius < rect.y + rect.h
  )
}
export const walkable = (p: Point, world: World = room) => {
  return (
    p.x >= 54 + room.radius &&
    p.x <= 906 - room.radius &&
    p.y >= 70 + room.radius &&
    p.y <= 550 - room.radius &&
    ![...world.obstacles, ...world.entities.filter((e) => !('passable' in e && e.passable))].some(
      (rect) => overlaps(p, rect),
    )
  )
}
// Resolve axes separately for sliding; substeps prevent tunnelling after slow frames.
export const movePlayer = (
  position: Point,
  direction: Point,
  seconds: number,
  world: World = room,
  speed = 1,
): Point => {
  const magnitude = Math.hypot(direction.x, direction.y)
  if (!magnitude) return position
  const dt = Math.min(Math.max(seconds, 0), 0.1)
  const distance = room.speed * dt * Math.max(0.6, Math.min(1, speed))
  const steps = Math.max(1, Math.ceil(distance / 5))
  const dx = ((direction.x / Math.max(1, magnitude)) * distance) / steps
  const dy = ((direction.y / Math.max(1, magnitude)) * distance) / steps
  let p = { ...position }
  for (let i = 0; i < steps; i++) {
    if (walkable({ x: p.x + dx, y: p.y }, world)) p = { ...p, x: p.x + dx }
    if (walkable({ x: p.x, y: p.y + dy }, world)) p = { ...p, y: p.y + dy }
  }
  return p
}
const interactionClear = (p: Point, e: Entity, w: World) => {
  if (!workingFaceVisible(p, e)) return false
  const r = interactionSurface(e)
  const q = {
    x: Math.max(r.x, Math.min(p.x, r.x + r.w)),
    y: Math.max(r.y, Math.min(p.y, r.y + r.h)),
  }
  return ![
    ...w.obstacles.filter(
      (r) =>
        !w.waterZones?.some((z) => z.x === r.x && z.y === r.y && z.w === r.w && z.h === r.h) &&
        !(e.kind === 'npc' && r.x === e.x && r.y === e.y && r.w === e.w && r.h === e.h),
    ),
    ...w.entities.filter(
      (other) =>
        other.id !== e.id && other.kind !== 'npc' && !('passable' in other && other.passable),
    ),
  ].some((r) => {
    let start = 0,
      end = 1
    for (const axis of ['x', 'y'] as const) {
      const d = q[axis] - p[axis],
        min = r[axis],
        max = min + (axis === 'x' ? r.w : r.h)
      if (Math.abs(d) < 1e-9) {
        if (p[axis] < min || p[axis] > max) return false
      } else {
        const a = (min - p[axis]) / d,
          b = (max - p[axis]) / d
        start = Math.max(start, Math.min(a, b))
        end = Math.min(end, Math.max(a, b))
        if (start > end) return false
      }
    }
    return true
  })
}
export const nearestEntity = (p: Point, world: World = room): Entity | null => {
  const candidates = world.entities
    .map((entity) => ({
      entity,
      distance: surfaceDistance(p, entity),
    }))
    .filter(
      (candidate) =>
        candidate.distance < interactionReach(candidate.entity.id) &&
        interactionClear(p, candidate.entity, world),
    )
    .sort((a, b) => a.distance - b.distance)
  return candidates[0]?.entity ?? null
}

export const trainAreaLabels: Partial<Record<Area, string>> = {
  trainB: 'B-04 중앙 객실',
  trainRear: 'B-04 후방 객실',
  trainFront: 'B-04 선두 연결 구역',
}

export const moonAreaLabels: Partial<Record<Area, string>> = {
  moonPlatform: '문래역 · 대답 없는 승강장',
  moonBooth: '문래역 · 승강장 안내 부스',
  moonHolding: '문래역 · 확인 대기 구역',
}

export const finalAreaLabels: Partial<Record<Area, string>> = {
  maintenance: '문래역 · 정비 통로 분기실',
  recovery: '문래역 · 자동 확인 복구 구역',
  shelter: '지상 대피소 내부',
}
