import { episode } from './data'
import type { Message } from './dialogue'
import { trainEvidence } from './trainEvidence'

export const moonStation = episode.next
export const defaultDisplayName = '한결'
export const displayNameLimit = 16
export const cleanDisplayName = (name: string) =>
  Array.from(name)
    .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
    .join('')
    .trim()
export const validDisplayName = (name: string) =>
  name.length > 0 && Array.from(name).length <= displayNameLimit
export const isChapter5Area = (area: string) =>
  ['moonPlatform', 'moonBooth', 'moonHolding'].includes(area)

export type Chapter5 = {
  started: boolean
  profileDraft: string
  displayName: string | null
  response: 'undecided' | 'answered' | 'silent'
  registration: 'pending' | 'active' | 'cancelled' | 'held'
  matched: boolean
  externalPaused: boolean
  routeOpen: boolean
  exitSeen: boolean
  exitPrompt: boolean
  completed: boolean
}
export const defaultChapter5: Chapter5 = {
  started: false,
  profileDraft: defaultDisplayName,
  displayName: null,
  response: 'undecided',
  registration: 'pending',
  matched: false,
  externalPaused: false,
  routeOpen: false,
  exitSeen: false,
  exitPrompt: false,
  completed: false,
}
export const registrationCases = [
  {
    id: 'REG-410',
    vehicle: trainEvidence.vehicle,
    source: trainEvidence.external,
    time: trainEvidence.transmissions[1],
    ownProfile: true,
  },
  {
    id: 'REG-409',
    vehicle: 'A-17',
    source: trainEvidence.external,
    time: trainEvidence.transmissions[1],
    ownProfile: false,
  },
  {
    id: 'REG-411',
    vehicle: trainEvidence.vehicle,
    source: 'EXT-X08',
    time: trainEvidence.transmissions[1],
    ownProfile: false,
  },
] as const
export const matchingRegistration = registrationCases[0]
export const maintenanceRule = { door: 'D-02', mode: 'local', mark: 'M-12' } as const
export const moonEvidence = ['moon-playback', 'moon-receipt', 'moon-attachment']

// Public facts only. Author-only attribution lives in docs/chapter5-author.md.
export const moonObjects = [
  {
    id: 'moon-broadcast',
    area: 'moonPlatform',
    title: '안내방송 자막·재생 기록',
    clue: '승강장 방송 자막을 다시 확인했다.',
  },
  {
    id: 'moon-shoes',
    area: 'moonPlatform',
    title: '같은 방향으로 놓인 신발',
    clue: '서로 다른 크기의 신발 여러 켤레가 바닥 화살표를 따라 같은 방향으로 놓여 있다. 옆 안내에는 “침수 오염 방지: 신발을 벗고 확인 대기 방향으로 이동”이라고 적혀 있다. 화살표는 출구가 아니라 확인 대기 구역을 가리킨다.',
  },
  {
    id: 'moon-warning',
    area: 'moonPlatform',
    title: '안내 전광판 · 차단문 경고',
    clue: '“응답 감지 시 확인 구역 차단문 작동”. 방송은 출구 개방을 말하지만 현장 표시는 확인 대기 구역이다. 응답하지 않아도 안내 부스를 조사할 수 있다.',
  },
  {
    id: 'moon-sensor',
    area: 'moonPlatform',
    title: '응답 감지기 · 명시적 선택',
    clue: '응답 감지기 MIC-03. 게임의 “대답한다” 선택을 누를 때만 응답으로 판정된다. 이름을 부르는 방송과 움직임·대화 넘기기는 별개다. 실제 마이크를 사용하지 않는다. 응답 시 확인 구역 차단문이 닫힌다는 경고가 다시 표시된다.',
  },
  {
    id: 'moon-window',
    area: 'moonPlatform',
    title: '확인 구역 점검창',
    clue: '안쪽에는 비어 있는 대기 의자와 “활성 등록 취소 / 내부 해제” 장치가 있다. 대기 구역 뒤쪽에는 “등록 완료자 이동 →” 표식과 연결문이 보인다. 현재 안쪽은 비어 있다. 지금 들어갈 필요는 없으며 외부 안내 부스에서도 대기 등록을 보류할 수 있다.',
  },
  {
    id: 'moon-route',
    area: 'moonPlatform',
    title: '정비 통로 현장 표식',
    clue: 'M-12 표식: 정비 통로 D-02 / 지역 수동 승인. 외부 대기 유도를 보류한 뒤 현장 통행 절차를 선택한다. 방송 응답은 통행 조건이 아니다. 다른 문이나 원격 승인은 이 통로를 열지 않는다.',
  },
  {
    id: 'moon-playback',
    area: 'moonBooth',
    title: '방송 재생 기록',
    clue: '음성 출처: 저장된 문장 조합 / 실시간 직원 방송 아님. 개인 호명 문장은 수신된 표시 이름을 삽입한다. 응답 감지 결과는 대피자 위치 확인이 아니라 확인 구역 등록 활성화에 쓰인다.',
  },
  {
    id: 'moon-receipt',
    area: 'moonBooth',
    title: '외부 자료 수신 기록',
    clue: `수신 장치 RX-12. 발신 ${trainEvidence.external} / 차량 ${trainEvidence.vehicle}. 수신 대응 기록 ${trainEvidence.transmissions.join(' / ')}. 등록 건 ${matchingRegistration.id}에 연결된다. 전송 시각뿐 아니라 발신 장치와 등록 건을 함께 대조해야 한다.`,
  },
  {
    id: 'moon-attachment',
    area: 'moonBooth',
    title: '등록 원본 · 수동 첨부',
    clue: `등록 ${matchingRegistration.id} / 수동 첨부 / 단톡방 표시 이름과 탑승 정보. 제출자 계정 비공개. 이는 이전부터 사용하던 채널 프로필의 전달 기록이며 지금 프로필을 확인해서 새로 보낸 자료가 아니다.`,
  },
  {
    id: 'moon-active-record',
    area: 'moonHolding',
    title: '내부 활성 등록 표시',
    clue: `활성 등록 ${matchingRegistration.id}. 응답 감지로 확인 대기 등록이 확정되었다. 원격 출구 개방 요청은 없다. 이 등록을 내부에서 취소할 수 있다.`,
  },
  {
    id: 'moon-cancel-note',
    area: 'moonHolding',
    title: '내부 해제 안내',
    clue: '활성 등록 번호를 확인한 뒤 내부 취소 장치를 사용하면 차단문이 열린다. 취소는 출구 개방과 다르다. 물리적인 내부 해제 회로라 휴대폰 배터리나 소지품은 필요하지 않다. 취소 후 안내 부스에서 외부 유도를 보류한다.',
  },
  {
    id: 'moon-disclosure',
    area: 'moonBooth',
    title: '대조 결과 · 정보 수동 전달 확인',
    clue: '발신 장치·등록 건·수동 첨부 원본이 함께 일치한다. 누군가 내 표시 이름과 탑승 정보를 수동 전달했다. 시각 일치만으로 내린 결론이 아니다. 제출자와 최종 수신자의 신원은 확인되지 않았다.',
  },
] as const
export const moonBroadcast = {
  intro: (name: string) =>
    `“${name} 님, 대피자 확인을 위해 대답해 주십시오. 응답하면 출구를 개방합니다.”`,
  confirmed: '현장 확인 완료. 대기 등록이 활성화되었습니다. 출구 개방 요청은 접수되지 않았습니다.',
  ending: (response: Chapter5['response']) =>
    response === 'answered'
      ? '확인이 취소되었습니다. 다시 응답해 주십시오.'
      : '응답하지 않은 분은, 아직 그곳에 계십니까?',
}
export const moonClueText = (id: string, chapter: Chapter5) => {
  const object = moonObjects.find((item) => item.id === id)
  if (!object) return ''
  if (id === 'moon-broadcast')
    return [
      moonBroadcast.intro(chapter.displayName ?? '표시 이름 미확인'),
      ...(chapter.response === 'answered' ? [`응답 뒤 기록: “${moonBroadcast.confirmed}”`] : []),
      ...(chapter.exitSeen ? [`마지막 반복: “${moonBroadcast.ending(chapter.response)}”`] : []),
    ].join('\n')
  const personal = ['moon-attachment', 'moon-active-record', 'moon-disclosure'].includes(id)
  return (
    object.clue +
    (personal && chapter.displayName
      ? ` 표시 이름: “${chapter.displayName}” / 탑승 차량: ${trainEvidence.vehicle}.`
      : '')
  )
}
export const moonOpening: Message[] = [
  {
    who: 'seo',
    text: '이름을 안다고 안전한 방송은 아니에요. 응답 표시와 장치 번호부터 확인해요. 난 지금 그 전광판을 볼 수 없어요.',
  },
  { who: 'kang', text: '대피자 확인일 거예요. 이름을 부르면 대답해야 위치를 알려줄 수 있어요.' },
  {
    who: 'min',
    text: '예전에는 안내 부스 옆에 직원 호출 버튼이 있었어요. 지금도 같은 용도인지는 모르겠어요.',
  },
  {
    who: 'oh',
    text: '안내 부스에 등록 기록이 있을 거예요. 굳이 내역까지 뒤질 필요는 없고요. 통로부터 찾아요.',
  },
]
export const moonQuestions = [
  {
    id: 'moon-warning-question',
    requires: 'moon-warning',
    label: '안내방송에 대답하지 말라는 근거가 뭐예요?',
  },
  {
    id: 'moon-shutter-question',
    requires: 'moon-sensor',
    label: '응답하면 출구가 아니라 차단문이 작동한다는데요?',
  },
  {
    id: 'moon-old-question',
    requires: 'moon-playback',
    label: '이 버튼은 예전 직원 호출 버튼이 아니에요.',
  },
  {
    id: 'moon-transmission-question',
    requires: 'moon-receipt',
    label: '열차의 외부 송신 기록과 이 등록 건이 연결돼요.',
  },
  {
    id: 'moon-disclosure-question',
    requires: 'moon-disclosure',
    label: '누가 제 표시 이름과 탑승 정보를 수동 전달했어요?',
  },
] as const
export const moonAnswer = (id: string, asked: string[], chapter: Chapter5): Message[] => {
  const question = moonQuestions.find((q) => q.id === id)
  if (!question) return []
  const replies: Record<string, Message[]> = {
    'moon-warning-question': [
      {
        who: 'seo',
        text: '예전 점검에서 응답으로 대기 구역을 여는 장치를 본 적이 있어요. 그때 생각나서 경고했어요. 지금 이 역의 설정은 현장 표식으로 확인해야 해요.',
      },
    ],
    'moon-shutter-question': [
      {
        who: 'kang',
        text:
          chapter.response === 'answered'
            ? '안에 갇혔다고요? 확인이 끝나면 열릴 줄 알았어요. 내부 해제 안내가 있는지 보세요.'
            : '확인 절차라 잠깐 닫히는 걸 수도 있어요. 지금 그 장치를 직접 본 건 아니에요.',
      },
      {
        who: 'seo',
        text: '출구와 대기 구역은 달라요. 내부 취소나 등록 보류 안내가 있는지 조사해요.',
      },
    ],
    'moon-old-question': [
      {
        who: 'min',
        text: '제 기억은 예전 버튼이네요. 지금 재생 기록에 적힌 기능을 먼저 봐야겠어요.',
      },
    ],
    'moon-transmission-question': [
      {
        who: 'oh',
        text: '그 발신 표식이 등록 기록에도 나온다고요? 등록 자료를 받아 쓰는 장치일 수는 있겠네요. 제출 계정까지는 나도 모른다고요.',
      },
      {
        who: 'seo',
        text: '시각만 같은 것으로는 부족해요. 발신 식별자, 등록 번호, 수동 첨부 원본을 함께 확인해요.',
      },
    ],
    'moon-disclosure-question': [
      {
        who: 'oh',
        text: asked.includes('moon-transmission-question')
          ? '아까는 장치끼리 기록을 주고받을 수 있다고 한 거예요. 수동 첨부라고 적혔다면… 누가 작성했는지는 그 화면에 안 나오잖아요.'
          : '등록 기록을 찾았군요. 난 그 계정 화면을 보고 있는 게 아니에요. 제출자 이름이 없으면 누가 했는지는 모르죠.',
      },
      {
        who: 'min',
        text: '누군가 전달한 건 확인됐지만 누구인지는 아직 모르겠네요. 제 옛 지도만으로는 설명할 수 없는 일이에요.',
      },
      {
        who: 'seo',
        text: '확인된 기록을 보존해요. 제출한 사람과 그 정보를 이용하는 주체가 같은지도 아직 알 수 없어요.',
      },
    ],
  }
  return [{ who: 'player', text: question.label }, ...replies[id]]
}
export const normalizeChapter5 = (value: unknown): Chapter5 => {
  const c = value && typeof value === 'object' ? (value as Partial<Chapter5>) : {}
  const name = typeof c.displayName === 'string' ? cleanDisplayName(c.displayName) : ''
  const started = c.started === true
  const displayName = started && validDisplayName(name) ? name : null
  const response =
    displayName && ['answered', 'silent'].includes(c.response ?? '') ? c.response! : 'undecided'
  const registration =
    response === 'answered'
      ? c.registration === 'cancelled'
        ? 'cancelled'
        : 'active'
      : response === 'silent' && c.registration === 'held'
        ? 'held'
        : 'pending'
  const matched = response !== 'undecided' && c.matched === true
  const externalPaused =
    matched && ['cancelled', 'held'].includes(registration) && c.externalPaused === true
  const routeOpen = externalPaused && c.routeOpen === true
  return {
    ...defaultChapter5,
    started,
    displayName,
    profileDraft:
      typeof c.profileDraft === 'string' ? c.profileDraft.slice(0, 128) : defaultDisplayName,
    response,
    registration,
    matched,
    externalPaused,
    routeOpen,
    exitSeen: routeOpen && c.exitSeen === true,
    exitPrompt: routeOpen && c.exitPrompt === true && c.completed !== true,
    completed: routeOpen && c.exitSeen === true && c.completed === true,
  }
}
