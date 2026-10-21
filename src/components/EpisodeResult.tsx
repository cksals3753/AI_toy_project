import type { State } from '../game/engine'
import { RecordEntry, RecordList } from './ui/Records'
import { Button } from './ui/Button'
import { Overlay } from './Overlay'
import { finalObjects } from '../game/chapter6'
import { objects } from '../game/data'
import { hallObjects } from '../game/chapter2'
import { platformObjects } from '../game/chapter3'
import { trainObjects } from '../game/chapter4'
import { moonObjects } from '../game/chapter5'
const catalog = [
  ...objects,
  ...hallObjects,
  ...platformObjects,
  ...trainObjects,
  ...moonObjects,
  ...finalObjects,
]

export const EpisodeResult = ({
  result: r,
  onClose,
}: {
  result: NonNullable<State['chapter6']['result']>
  onClose: () => void
}) => {
  return (
    <Overlay title="에피소드 1 완료 · 지상 대피소 도착" onClose={onClose} wide>
      <div className="episode-arrival" aria-hidden="true">
        지상 · 새벽빛이 창 안으로 들어온다.
      </div>
      <span className="overline">도착 시점의 저장된 결과 · 다시 보기로 변경되지 않음</span>
      <p className="intro-text">
        {r.route === 'manual'
          ? 'S-01 현장 수동 경로 → 대피소 정문'
          : 'G-01 자동 확인 → 배수·빗장 복구 → S-02 측면 해치'}
      </p>
      <p>
        체력 {r.health} · 배터리 {r.battery}% · 소지품 {r.inventory.join(', ') || '없음'}
      </p>
      <h3>동행과 마지막 확인 위치</h3>
      <p>
        {r.npcTogether
          ? '생존자와 함께 도착 · ' +
            (r.npcHelp === 'helped'
              ? '처음 의자까지 부축함'
              : r.npcHelp === 'invited'
                ? '탑승 전에 동행을 제안함'
                : '이전 도움 방식 기록 없음')
          : '생존자 비동행'}
      </p>
      <p>{r.npcLocation}</p>
      <RecordList title="이번 회차의 주요 선택" items={r.choices} />
      <RecordList title="확인된 사실" items={r.facts} />
      <RecordList title="미확인 사항" items={r.unknowns} />
      <details>
        <summary>실제로 획득한 단서 · {r.clues.length}개</summary>
        {r.clues.map((id) => (
          <RecordEntry key={id} title={catalog.find((o) => o.id === id)?.title ?? id}>
            <p>{r.clueTexts[id]}</p>
          </RecordEntry>
        ))}
      </details>
      <details>
        <summary>도착 시점 단톡방 기록 · {r.messages.length}개</summary>
        {r.messages.map((m, i) => (
          <article className="clue" key={i}>
            <strong>
              {{
                seo: '서윤',
                kang: '강태오',
                min: '민재',
                oh: '오반장',
                player: '나',
                survivor: '다친 생존자',
              }[m.who] ?? m.who}
            </strong>
            <p>{m.text}</p>
            {m.kind === 'mock-answer' && <small>모의 응답 · 검증용</small>}
            {m.kind === 'ai-answer' && <small>AI 생성 대사 · 현장 판정 아님</small>}
          </article>
        ))}
      </details>
      <p className="muted">
        이 회차의 탈출 목표는 해결되었습니다. 전체 재난의 진실은 아직 확인되지 않았습니다.
      </p>
      <Button full onClick={onClose}>
        결과 저장 · 대피소 보기
      </Button>
    </Overlay>
  )
}
