import { clueGroups } from './progress'
import type { Action, State } from './engine'
import {
  defaultChapter6,
  finalObjects,
  finalQuestions,
  finalAnswer,
  isChapter6Area,
  routeEvidence,
} from './chapter6'
import { worlds } from './world'
const scene = (lines: State['scene']) => ({ scene: lines, sceneIndex: 0 })
export function reduceChapter6(s: State, a: Action): State | undefined {
  const c = s.chapter6
  if (a.type === 'maintenance-start') {
    if (c.started || !s.chapter5.completed || s.area !== 'moonPlatform') return s
    return {
      ...s,
      area: 'maintenance',
      position: worlds.maintenance.spawn,
      chapter6: { ...defaultChapter6, started: true },
      messages: [
        ...s.messages,
        { who: 'kang', text: '자동 확인 경로로 오세요. 확인이 끝나면 빨리 나갈 수 있을 거예요.' },
        {
          who: 'seo',
          text: '난 통로 안을 볼 수 없어요. 지금 지도와 문이 실제로 어디로 연결되는지 먼저 확인해요.',
        },
      ],
      ...scene([
        {
          who: 'player',
          text: 'D-02를 지나 문래역 정비 통로로 들어섰다. 지상 대피소를 찾아야 한다. 현행 대피도와 설비 설명판이 보인다.',
        },
        ...(s.chapter3.npcBoarded
          ? [
              {
                who: 'survivor',
                text:
                  s.chapter3.npc === 'helped'
                    ? '처음 부축해 준 것, 잊지 않았어요. 이번에도 같이 나가요.'
                    : s.chapter3.npc === 'invited'
                      ? '함께 가자고 해 준 덕분에 여기까지 왔어요. 천천히 따라갈게요.'
                      : '함께 여기까지 왔네요. 천천히 따라갈게요.',
              },
            ]
          : []),
      ]),
      notice: '챕터 6 · 정비 통로. 현장 기록 확인대에서 이전 기록도 다시 볼 수 있다.',
    }
  }
  if (!c.started || !isChapter6Area(s.area)) return undefined
  if (c.completed) return s
  if (a.type === 'inspect') {
    const o = finalObjects.find((o) => o.id === a.id && o.area === s.area)
    if (!o) return s
    const observation =
      o.id === 'recovery-water' && c.drained
        ? '현재 배수 상태: 수위 낮음 / 배수 완료 / 빗장 해제 가능. 내부 안내에 따라 해치를 개방할 수 있다.'
        : o.clue
    return {
      ...s,
      clues: s.clues.includes(o.id) ? s.clues : [...s.clues, o.id],
      ...scene([{ who: 'player', text: observation }]),
      notice: observation,
    }
  }
  if (a.type === 'ask') {
    const q = finalQuestions.find((q) => q.id === a.id)
    if (!q || !s.clues.includes(q.requires) || s.asked.includes(q.id)) return s
    return {
      ...s,
      asked: [...s.asked, q.id],
      messages: [...s.messages, ...finalAnswer(q.id)],
      notice: '현장 근거를 공유한 뒤의 답변을 기록했다.',
    }
  }
  if (a.type === 'maintenance-configure') {
    if (s.area !== 'maintenance' || c.route) return s
    if (!routeEvidence.every((id) => s.clues.includes(id)))
      return {
        ...s,
        notice: '현행 대피도와 설비 설명판을 먼저 조사하세요. 과거 단서는 필요하지 않습니다.',
      }
    if (
      !a.power ||
      !((a.door === 'S-01' && a.mode === 'local') || (a.door === 'G-01' && a.mode === 'remote'))
    )
      return {
        ...s,
        notice:
          '설정 불일치 · 문과 승인 방식, 전원 조건을 현장 설명판과 대조하세요. 수정과 재시도에 자원을 쓰지 않습니다.',
      }
    return {
      ...s,
      chapter6: { ...c, settings: { door: a.door, mode: a.mode, power: a.power } },
      notice: '설정 저장. 아직 이동하지 않았습니다. 목적지와 근거를 검토하고 별도로 확정하세요.',
    }
  }
  if (a.type === 'maintenance-commit') {
    if (
      s.area !== 'maintenance' ||
      c.route ||
      !c.settings ||
      !routeEvidence.every((id) => s.clues.includes(id))
    )
      return s
    const manual = c.settings.door === 'S-01'
    return {
      ...s,
      area: manual ? 'shelter' : 'recovery',
      position: worlds[manual ? 'shelter' : 'recovery'].spawn,
      chapter6: { ...c, route: manual ? 'manual' : 'automatic' },
      ...scene([
        {
          who: 'player',
          text: manual
            ? 'S-01을 현장에서 개방했다. 지상 대피소 정문 안쪽에 도착했다. 내부 확인대까지 직접 걸어가자.'
            : 'G-01 확인 구역에 들어서자 뒤쪽 차단문이 내려왔다. 지도에 적힌 대로 지상이 아니다. 안쪽에 복구 안내와 S-02 해치가 보인다.',
        },
        ...(s.chapter3.npcBoarded
          ? [
              {
                who: 'survivor',
                text: manual
                  ? '함께 올라왔어요. 저쪽 안에 도착 확인대가 보여요.'
                  : '저도 함께 들어왔어요. 마른 의자에서 기다릴게요. 해치를 열면 같이 나가요.',
              },
            ]
          : []),
      ]),
      notice: manual
        ? '지상 대피소 · 아직 도착 확인 전.'
        : '자동 확인 경로 차단 사건 저장. 체력·배터리 소모 없음.',
    }
  }
  if (a.type === 'maintenance-drain') {
    if (s.area !== 'recovery' || c.drained) return s
    if (!['recovery-note', 'recovery-water'].every((id) => s.clues.includes(id)))
      return { ...s, notice: '내부 복구 안내와 배수 상태를 먼저 조사하세요.' }
    return {
      ...s,
      chapter6: { ...c, drained: true },
      ...scene([
        {
          who: 'player',
          text: '배수 밸브를 열었다. 물이 빠지고 상태창에 “수위 낮음 / 빗장 해제 가능”이 표시된다. 지역 전원은 유지되고 있다.',
        },
      ]),
      notice: '배수 완료 · 이제 빗장 해제 가능.',
    }
  }
  if (a.type === 'maintenance-bolt') {
    if (s.area !== 'recovery' || c.boltOpen) return s
    if (!c.drained)
      return {
        ...s,
        notice: '수압 때문에 빗장이 움직이지 않는다. 배수 상태와 복구 안내를 확인하세요.',
      }
    return {
      ...s,
      chapter6: { ...c, boltOpen: true },
      ...scene([
        {
          who: 'player',
          text: '수압이 사라진 빗장을 안쪽에서 풀었다. S-02 해치가 열린다. 벽면 손잡이를 따라 지상으로 이동할 수 있다.',
        },
      ]),
      notice: 'S-02 해치 개방 · 동행자는 함께 이동한다.',
    }
  }
  if (a.type === 'maintenance-hatch') {
    if (s.area !== 'recovery' || !c.boltOpen)
      return { ...s, notice: '해치가 잠겼다. 배수와 빗장 해제를 마쳐야 한다.' }
    return {
      ...s,
      area: 'shelter',
      position: worlds.shelter.spawn,
      ...scene([
        {
          who: 'player',
          text: s.chapter3.npcBoarded
            ? '의자에서 기다리던 생존자에게 돌아가 함께 S-02를 올랐다. 대피소 측면 해치 안쪽에 도착했다.'
            : 'S-02를 올라 대피소 측면 해치 안쪽에 도착했다.',
        },
      ]),
      notice: '지상 대피소 안쪽 도착 · 확인대에서 완료를 확정하세요.',
    }
  }
  if (a.type === 'maintenance-arrive') {
    if (s.area !== 'shelter' || !c.route || !s.clues.includes('shelter-sign'))
      return { ...s, notice: '대피소 내부 표식을 먼저 조사한 뒤 확인대를 사용하세요.' }
    const together = s.chapter3.npcBoarded
    const facts = [
      c.route === 'manual'
        ? '현장 수동 경로로 지상 대피소 정문에 도착했다.'
        : '자동 확인 구역에서 배수·빗장을 해제하고 S-02로 대피소에 도착했다.',
      ...(s.clues.includes('moon-disclosure')
        ? ['표시 이름과 탑승 정보가 수동 전달된 기록을 확보했다.']
        : []),
      ...(s.clues.includes('moon-playback') ? ['문래역 호명 방송은 저장된 문장 조합이었다.'] : []),
    ]
    return {
      ...s,
      notice: '에피소드 1 완료 · 지상 대피소 도착 결과 저장.',
      chapter6: {
        ...c,
        completed: true,
        result: {
          route: c.route,
          health: s.health,
          battery: s.battery,
          inventory: [...s.inventory],
          clues: [...s.clues],
          clueTexts: Object.fromEntries(
            clueGroups(s).flatMap((g) => g.items.map((o) => [o.id, o.text])),
          ),
          messages: structuredClone(s.messages),
          asked: [...s.asked],
          npcTogether: together,
          npcHelp: s.chapter3.npc,
          npcLocation: together
            ? '지상 대피소 내부 · 함께 도착'
            : ['waiting', 'directed'].includes(s.chapter3.npc)
              ? '신도림역 비상 부스 옆 의자 · 마지막 확인 위치, 이후 구조 여부 미확인'
              : s.chapter3.npc === 'found'
                ? '신도림역 승강장 기둥 뒤 · 마지막 확인 위치, 이후 상태 미확인'
                : '이전 저장에 마지막 확인 위치 기록 없음',
          choices: [
            `첫 방 경로: ${s.route === 'west' ? '서쪽' : s.route === 'east' ? '동쪽' : '기록 없음'}`,
            `직원 통로: ${s.chapter2.staffEvent === 'failed' ? '회피 실패 후 복귀' : s.chapter2.staffEvent === 'success' ? '회피 성공' : '미진입'}`,
            `문래역 방송: ${s.chapter5.response === 'answered' ? '응답 후 등록 취소' : s.chapter5.response === 'silent' ? '무응답·등록 보류' : '기록 없음'}`,
            `마지막 경로: ${c.route === 'manual' ? 'S-01 현장 수동 대피' : 'G-01 자동 확인 → 배수·빗장 복구 → S-02'}`,
          ],
          facts,
          unknowns: [
            '재난이 발생한 원인과 잘못된 유도 절차의 배경',
            ...(['moon-disclosure', 'moon-attachment', 'moon-receipt'].some((id) =>
              s.clues.includes(id),
            )
              ? ['수동 제출자와 외부 정보 이용자의 신원']
              : []),
            ...(!together ? ['신도림역에 남은 생존자의 이후 구조 여부'] : []),
          ],
          completedAt: new Date().toISOString(),
        },
      },
    }
  }
  return undefined
}
