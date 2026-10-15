export const episode = {
  id: 'sindorim-01', title: '신도림, 마지막 환승', location: '지하 2층 · 중앙 대합실',
  code: '0218', next: '문래역',
  intro: '차가운 바닥. 멎어버린 안내 방송. 눈을 뜨자 휴대폰에 낯선 단톡방 초대가 도착했다. 지상으로 이어지는 길은 두 개. 누군가의 말은 틀렸다.',
}
export const characters = [
  { id: 'seo', name: '서윤', role: '시설 정비사', initial: '서', color: '#9fae92', truth: '진짜 조력자', motive: '현재 센서와 현장 표식을 근거로 생존자를 안내한다.' },
  { id: 'kang', name: '강태오', role: '구조대원이라고 주장', initial: '강', color: '#b69984', truth: '의도적인 거짓말', motive: '비상 전원을 차지하려고 생존자를 위험한 동쪽으로 유도한다.' },
  { id: 'min', name: '민재', role: '역 근처 대학생', initial: '민', color: '#8e9fb5', truth: '오래된 정보', motive: '재난 이전 지도를 믿고 침수된 환승 통로를 추천한다.' },
  { id: 'oh', name: '오반장', role: '상가 관리인', initial: '오', color: '#b09ab2', truth: '자기 이익을 위한 은폐', motive: '서쪽 통로의 비축품을 혼자 쓰려고 통로 존재를 숨긴다.' },
] as const
export const openingMessages = [
  { who: 'seo', text: '누가 접속했네요. 들리나요? 지금 중앙 대합실이죠? 서쪽 정비 통로로 오세요. 동쪽은 이미 물이 찼어요.' },
  { who: 'kang', text: '구조대 강태오입니다. 동쪽 2번 출구로 이동하세요. 02:14에 배수 완료됐습니다. 서쪽은 붕괴 위험입니다.' },
  { who: 'min', text: '제 지도에는 환승 통로가 지상으로 연결돼 있어요. 지도는… 작년에 저장한 거예요.' },
  { who: 'oh', text: '서쪽에 통로 같은 건 없어요. 괜히 뒤지지 말고 구조대 말 들어요.' },
]
export const objects = [
  { id: 'panel', number: '01', title: '침수 감지 패널', subtitle: '붉은 표시등이 아직 깜빡인다', icon: '▤', battery: 8, clue: '02:18 센서 기록 — 동쪽 2번 출구 수심 1.8m. 배수 펌프 정지. 패널 아래 “정비문 암호 = 마지막 경보 시각 4자리”라고 적혀 있다.', item: null },
  { id: 'map', number: '02', title: '찢어진 안내도', subtitle: '먼지 아래 드러난 녹색 선', icon: '⌁', battery: 0, clue: '서쪽 정비 통로는 지상 환기구로 연결된다. 환승 통로에는 “침수 / 폐쇄” 테이프가 붙어 있다. 지도 갱신: 오늘 02:10.', item: null },
  { id: 'cabinet', number: '03', title: '비상 물품함', subtitle: '반쯤 열린 철제 문', icon: '⊞', battery: 5, clue: '절연 장갑 한 켤레를 찾았다. 물품함 기록에 “서쪽 통로 비축품 반출 — 오반장 02:12”가 남아 있다.', item: '절연 장갑' },
] as const
export const questions = [
  { id: 'water', label: '동쪽 배수 기록에 대해 묻기', requires: 'panel', replies: [{ who: 'player', text: '패널에는 02:18에도 수심 1.8m라고 나와요. 배수가 끝난 게 맞나요?' }, { who: 'kang', text: '센서 오류예요. 화면은 무시하고 제 지시만 따르면 됩니다.' }, { who: 'seo', text: '배수가 끝났다면 펌프 작동등이 켜져야 해요. 정지 상태죠? 현장 기록을 믿으세요.' }] },
  { id: 'west', label: '서쪽 통로와 비축품에 대해 묻기', requires: 'cabinet', replies: [{ who: 'player', text: '오반장님, 서쪽에서 비축품을 꺼냈다는 기록이 있어요. 통로가 없다면서요?' }, { who: 'oh', text: '…거긴 내 물건이 있어요. 사람들 몰리면 곤란해서 그랬어요.' }, { who: 'seo', text: '서쪽 정비문은 전자 잠금이에요. 패널에 적힌 규칙으로 열 수 있어요. 장갑도 챙겨요.' }] },
  { id: 'map', label: '지도 갱신 시각 확인하기', requires: 'map', replies: [{ who: 'player', text: '오늘 02:10에 갱신된 지도에는 환승 통로가 폐쇄됐어요.' }, { who: 'min', text: '제 지도는 재난 전이네요… 미안해요. 현장 지도가 더 정확하겠어요.' }, { who: 'seo', text: '확인 잘했어요. 화면보다 현장의 단서를 먼저 보세요.' }] },
] as const
export const routes = [
  { id: 'west', title: '서쪽 정비 통로', text: '어둠 속으로 이어진 좁은 통로. 전자 잠금장치가 보인다.', voice: '서윤의 안내', requires: 'map' },
  { id: 'east', title: '동쪽 2번 출구', text: '계단 아래에서 물소리가 들린다. 구조 신호는 보이지 않는다.', voice: '강태오의 안내', requires: 'panel' },
] as const
