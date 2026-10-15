export const hallObjects = [
  {
    id: 'hall-map',
    title: '대합실 역 안내도',
    clue: '직원 전용 통로는 승강장 직통이 아니라 환풍기·설비 구역으로 이어진다. 승강장 계단은 오른쪽 개찰구 너머다.',
    item: null,
  },
  {
    id: 'hall-window',
    title: '통로 점검창',
    clue: '파란 불빛은 환풍기 설비의 상태 표시등이다. 바닥에는 물이 고여 있고, 천장 방화문의 레일이 뒤틀려 있다. “전압 불안정 / 자동 폐쇄” 경고가 깜빡인다.',
    item: null,
  },
  {
    id: 'hall-gate-note',
    title: '개찰구 비상 개방 안내문',
    clue: '정전 시 수동 개방 불가. 전기실에서 예비 전원을 연결해야 한다. 승강장 접근 구역의 안전한 이동에는 조명도 필요하다. 예비 회로 용량: 최대 두 장치.',
    item: null,
  },
  {
    id: 'hall-desk',
    title: '안내 데스크',
    clue: '서랍에서 전기실 열쇠를 찾았다. 인수인계 메모: “예비 전원은 배터리와 별도. 조명 / 개찰구 / 방송 중 두 회로만 동시 사용.”',
    item: '전기실 열쇠',
  },
  {
    id: 'hall-recording',
    title: '사고 당시 방송 녹음',
    clue: '02:17 녹음: “직원 통로 환풍기 누전. 파란 표시등은 대피 유도등이 아닙니다. 개찰구 예비 회로를 확보하십시오.” 뒤에서 누군가 안내 방송을 급히 끈 소리가 들린다.',
    item: null,
  },
] as const

// Existing choice questions explicitly publish their cited evidence to the group.
export const scriptedDisclosures: Record<string, string[]> = {
  'hall-path': ['hall-map'],
  'hall-blue': ['hall-window'],
  'hall-power': ['hall-gate-note'],
}

// Exact information spoken by the player in each existing script, not the entire clue.
export const scriptedEvidence: Record<string, { id: string; text: string }> = {
  'hall-path': {
    id: 'hall-map',
    text: '직원 통로 끝에 뭐가 있었어요? 안내도에는 설비 구역으로 나와요.',
  },
  'hall-blue': {
    id: 'hall-window',
    text: '파란 불빛은 안내등이 아니라 설비 표시등인데요? 누전과 자동 폐쇄 경고도 있어요.',
  },
  'hall-power': {
    id: 'hall-gate-note',
    text: '개찰구는 예비 전원이 필요하다고 적혀 있어요. 그냥 밀면 안 열려요.',
  },
}
