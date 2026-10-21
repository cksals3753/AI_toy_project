import { useFirstRoomAudio } from './audio/useFirstRoomAudio'
import { SoundSettings } from './components/SoundSettings'
import { isImmersiveArea, usesFirstPerson } from './game/firstPerson'
import type { View3d } from './game/firstPerson'
import { ExplorationHud } from './components/ExplorationHud'
import { Chapter6Panels } from './components/Chapter6Panels'
import { finalObjective, finalQuestions, isChapter6Area } from './game/chapter6'
import { chapterInfo, locationName, clueGroups } from './game/progress'
import { AiChatComposer } from './components/AiChatComposer'
import { isAiChapter2 } from './chat/client'
import { Chapter5Panels } from './components/Chapter5Panels'
import type { Chapter5Panel } from './components/Chapter5Panels'
import { isChapter5Area, moonQuestions } from './game/chapter5'
import { Chapter4Panels } from './components/Chapter4Panels'
import type { Chapter4Panel } from './components/Chapter4Panels'
import { availableTrainQuestion, isChapter4Area, trainQuestions } from './game/chapter4'
import { Chapter3Panels } from './components/Chapter3Panels'
import type { Chapter3Panel } from './components/Chapter3Panels'
import { isChapter3Area, platformObjects, platformQuestions, survivor } from './game/chapter3'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { characters, episode, objects, questions, routes } from './game/data'
import { hallObjects, hallQuestions, powerDevices } from './game/chapter2'
import { loadGame, reducer, SAVE_KEY } from './game/engine'
import type { Message } from './game/dialogue'
import type { Entity, Point } from './game/world'
import { editingText } from './game/explorationInput'
import { flushSync } from 'react-dom'
import type { ExplorationControls } from './components/Exploration'
import { ExplorationView } from './components/ExplorationView'
import { Portrait } from './components/Portrait'
import { Overlay } from './components/Overlay'
import { DodgeGame } from './components/DodgeGame'

type Panel =
  | 'help'
  | 'final-control'
  | 'final-review'
  | 'episode-result'
  | 'phone'
  | 'bag'
  | 'reset'
  | 'door'
  | 'lock'
  | 'staff'
  | 'power'
  | Chapter3Panel
  | Chapter4Panel
  | Chapter5Panel
  | null
const App = () => {
  const [state, dispatch] = useReducer(reducer, undefined, loadGame)
  const [welcome, setWelcome] = useState(state.stage !== 'intro')
  const [transition, setTransition] = useState(false)
  const chapter = chapterInfo(state)
  const previousChapter = useRef(chapter.number)
  const unreadClues = cluesUnread(state)
  const unreadMessages = Math.max(0, state.messages.length - state.reading.messages)
  const explorationControls = useRef<ExplorationControls | null>(null)
  const [fieldNote, setFieldNote] = useState<{ text: string } | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [door, setDoor] = useState('west')
  const [code, setCode] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [resultDismissed, setResultDismissed] = useState(false)
  const [completionDismissed, setCompletionDismissed] = useState(state.chapter2.completed)
  const [escapeDismissed, setEscapeDismissed] = useState(state.chapter3.escaped)
  const [worldKey, setWorldKey] = useState(0)
  const end = useRef<HTMLDivElement>(null)
  const dialogueButton = useRef<HTMLButtonElement>(null)
  const {
    stage,
    area,
    clues,
    asked,
    battery,
    chapter2,
    chapter3,
    chapter4,
    chapter5,
    scene,
    sceneIndex,
  } = state
  const showResult = area === 'first' && stage === 'result' && !resultDismissed
  const showCompletion = area === 'stairs' && chapter2.completed && !completionDismissed
  const hazard = chapter2.staffEvent === 'active'
  const sixthChapter = state.chapter6.started
  const fifthChapter = chapter5.started && !sixthChapter
  const fourthChapter = chapter4.started && isChapter4Area(area)
  const thirdChapter = isChapter3Area(area)
  const showEscape = chapter3.escaped && !escapeDismissed && !chapter4.started
  const npcChoice = area === 'platform' && chapter3.npc === 'found' && !scene.length
  const blocking =
    welcome ||
    transition ||
    scene.length > 0 ||
    stage === 'intro' ||
    showResult ||
    hazard ||
    showCompletion ||
    npcChoice ||
    showEscape ||
    chapter4.sync === 'active' ||
    chapter4.entryPrompt ||
    (chapter5.started && !chapter5.displayName) ||
    chapter5.exitPrompt
  const paused = blocking || panel !== null
  const sound = useFirstRoomAudio(state, welcome, paused)
  const playing = stage !== 'intro' && !welcome
  const immersive =
    playing && usesFirstPerson(area) && import.meta.env.VITE_FIRST_ROOM_3D !== 'false'
  const menuKeys = useRef(new Set<string>())
  const finishUiGesture = () => {
    if (!paused || !isImmersiveArea(area)) return
    flushSync(() => {})
    explorationControls.current?.resumeAfterUi()
  }
  useEffect(() => {
    if (!fieldNote) return
    const timer = window.setTimeout(() => setFieldNote(null), 8500)
    return () => window.clearTimeout(timer)
  }, [fieldNote])
  const current = scene[sceneIndex]
  const speaker =
    current?.who === 'broadcast'
      ? { name: '안내방송', role: '승강장 자막' }
      : current?.who === 'survivor'
        ? survivor
        : characters.find((c) => c.id === current?.who)
  const currentQuestions = sixthChapter
    ? finalQuestions
    : fifthChapter
      ? moonQuestions
      : fourthChapter
        ? trainQuestions
        : area === 'first'
          ? questions
          : thirdChapter
            ? platformQuestions
            : hallQuestions
  const route = routes.find((r) => r.id === door)!
  const canRoute = clues.includes(route.requires) && asked.length > 0
  const lights = chapter2.power.includes('lights'),
    gateOpen = chapter2.power.includes('gate')

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      try {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({ ...state, savedAt: new Date().toISOString() }),
        )
        setSaveError(false)
      } catch {
        setSaveError(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [state])
  useEffect(() => {
    if (panel === 'phone') end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [state.messages.length, panel])
  useEffect(() => {
    if (!scene.length || welcome) return
    const previous = document.activeElement as HTMLElement | null
    dialogueButton.current?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault()
        dialogueButton.current?.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      previous?.focus()
    }
  }, [scene, sceneIndex, welcome])
  useEffect(() => {
    if (chapter3.signal !== 'changing' || scene.length || welcome) return
    const timer = window.setTimeout(() => dispatch({ type: 'signal-ready' }), 1400)
    return () => window.clearTimeout(timer)
  }, [chapter3.signal, scene.length, welcome])
  useEffect(() => {
    if (previousChapter.current === chapter.number) return
    previousChapter.current = chapter.number
    const enter = window.setTimeout(() => setTransition(true), 0)
    const leave = window.setTimeout(() => setTransition(false), 1100)
    return () => {
      clearTimeout(enter)
      clearTimeout(leave)
    }
  }, [chapter.number])
  const openPanel = (target: 'phone' | 'bag') => {
    setPanel(target)
  }
  useEffect(() => {
    if (!state.chapter6.completed || welcome) return
    const timer = setTimeout(() => setPanel('episode-result'), 0)
    return () => clearTimeout(timer)
  }, [state.chapter6.completed, welcome])
  const closeEscape = useCallback(() => setEscapeDismissed(true), [])
  const closePanel = useCallback(() => {
    if (panel === 'phone') dispatch({ type: 'read', target: 'messages' })
    if (panel === 'bag') dispatch({ type: 'read', target: 'clues' })
    setPanel(null)
  }, [panel])
  useEffect(() => {
    const held = menuKeys.current
    const keydown = (event: KeyboardEvent) => {
      if (
        document.visibilityState === 'hidden' ||
        !document.hasFocus() ||
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        editingText(event.target)
      )
        return
      const code = event.code
      if (!['Tab', 'KeyI', 'Escape'].includes(code) || (code === 'Tab' && event.shiftKey)) return
      const menuOpen = panel === 'phone' || panel === 'bag'
      if (blocking || (panel !== null && !menuOpen) || (code === 'Escape' && !menuOpen)) return
      const target = event.target instanceof Element ? event.target : null
      const inMenu = menuOpen && !!target?.closest(`[data-game-menu="${panel}"]`)
      const inWorld =
        !menuOpen &&
        (!!target?.closest('.world-frame canvas, .world-controls, .world-toolbar, .compact-hud') ||
          (document.pointerLockElement?.matches('.world-frame canvas') &&
            (target === document.body || target === document.documentElement)))
      if (!inMenu && !inWorld) return
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat || held.has(code)) return
      held.add(code)
      const requested = code === 'Tab' ? 'phone' : code === 'KeyI' ? 'bag' : null
      const next = code === 'Escape' || requested === panel ? null : requested
      flushSync(() => {
        if (panel === 'phone') dispatch({ type: 'read', target: 'messages' })
        if (panel === 'bag') dispatch({ type: 'read', target: 'clues' })
        setPanel(next)
      })
      // The renderer checks the newly committed aggregate pause state before requesting lock.
      if (next === null) explorationControls.current?.resumeAfterUi()
    }
    const keyup = (event: KeyboardEvent) => {
      held.delete(event.code)
    }
    const clear = () => held.clear()
    window.addEventListener('keydown', keydown, true)
    window.addEventListener('keyup', keyup, true)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      window.removeEventListener('keydown', keydown, true)
      window.removeEventListener('keyup', keyup, true)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [blocking, panel])
  const closeResult = useCallback(() => setResultDismissed(true), [])
  const closeCompletion = useCallback(() => setCompletionDismissed(true), [])
  const savePosition = useCallback(
    (position: Point) => dispatch({ type: 'position', position, area }),
    [area],
  )
  const saveView3d = useCallback((view: View3d) => dispatch({ type: 'view3d', view }), [])
  const talk = useCallback((lines: Message[]) => dispatch({ type: 'talk', lines }), [])
  const finishDodge = useCallback(
    (success: boolean) => dispatch({ type: 'staff-result', success }),
    [],
  )
  const interact = useCallback(
    (entity: Entity) => {
      if (sixthChapter && isChapter6Area(area)) {
        if (['final-control', 'final-s01', 'final-g01'].includes(entity.id))
          setPanel('final-control')
        else if (entity.id === 'final-review') setPanel('final-review')
        else if (entity.id === 'recovery-sealed')
          talk([
            {
              who: 'player',
              text: '진입 차단문은 닫혀 있다. 내부 복구 안내와 S-02 해치를 확인하자.',
            },
          ])
        else if (entity.id === 'recovery-valve') dispatch({ type: 'maintenance-drain' })
        else if (entity.id === 'recovery-bolt') dispatch({ type: 'maintenance-bolt' })
        else if (entity.id === 'recovery-hatch') dispatch({ type: 'maintenance-hatch' })
        else if (entity.id === 'shelter-arrival') dispatch({ type: 'maintenance-arrive' })
        else if (entity.id === 'survivor')
          talk([
            {
              who: 'survivor',
              text:
                area === 'recovery'
                  ? '저는 마른 의자에서 기다릴게요. 해치가 열리면 함께 나가요.'
                  : area === 'shelter'
                    ? '함께 지상까지 왔어요. 고마워요.'
                    : '천천히 따라갈게요. 지금 표식을 같이 확인해요.',
            },
          ])
        else dispatch({ type: 'inspect', id: entity.id })
        return
      }
      if (fifthChapter && isChapter5Area(area)) {
        if (entity.id === 'moon-booth-door') dispatch({ type: 'moon-move', area: 'moonBooth' })
        else if (entity.id === 'moon-platform-door')
          dispatch({ type: 'moon-move', area: 'moonPlatform' })
        else if (entity.id === 'moon-holding-door')
          talk([
            {
              who: 'player',
              text: '확인 대기 구역의 차단문이다. 점검창으로 안쪽 표식과 대기 의자를 볼 수 있다. 응답 여부는 MIC-03에서 명시적으로 선택한다.',
            },
          ])
        else if (entity.id === 'moon-sensor') {
          dispatch({ type: 'inspect', id: entity.id })
          setPanel('moon-response')
        } else if (entity.id === 'moon-terminal') setPanel('moon-registration')
        else if (entity.id === 'moon-cancel-device') setPanel('moon-cancel')
        else if (entity.id === 'moon-maintenance') {
          if (chapter5.completed) dispatch({ type: 'maintenance-start' })
          else setPanel('moon-route-controller')
        } else if (entity.id === 'survivor')
          talk([
            {
              who: 'survivor',
              text:
                chapter3.npc === 'helped'
                  ? '아까 부축해 줘서 여기까지 왔어요. 제 대신 결정할 수는 없겠지만 옆에 있을게요. 방송에는 대답하지 않았어요.'
                  : '함께 가자고 해 줘서 고마워요. 저는 대답하지 않고 곁에서 기다릴게요.',
            },
          ])
        else dispatch({ type: 'inspect', id: entity.id })
        return
      }
      if (fourthChapter) {
        if (entity.id === 'train-rear-door') dispatch({ type: 'train-move', area: 'trainRear' })
        else if (entity.id === 'train-front-door')
          dispatch({ type: 'train-move', area: 'trainFront' })
        else if (entity.id === 'train-central-door')
          dispatch({ type: 'train-move', area: 'trainB' })
        else if (entity.id === 'train-exit') dispatch({ type: 'train-door' })
        else if (entity.id === 'train-cab')
          talk([
            {
              who: 'player',
              text: '운전실은 잠겨 있다. 들어갈 수 없다. 나는 기관사가 아니다. 바깥 정차 요청 패널을 사용하자.',
            },
          ])
        else if (entity.id === 'survivor')
          talk([
            {
              who: 'survivor',
              text:
                chapter3.npc === 'helped'
                  ? '부축해 줘서 여기까지 왔어요. 아까 그 진동이 아직 귀에 남아요. 조사하는 동안 여기서 숨을 고를게요.'
                  : '함께 타자고 해 줘서 고마워요. 저도 여기에 있어요. 장치의 글자는 잘 안 보여요.',
            },
          ])
        else {
          dispatch({ type: 'inspect', id: entity.id })
          if (entity.id === 'train-devices') setPanel('train-links')
          if (entity.id === 'train-stop') setPanel('train-panel')
        }
        return
      }
      if (area === 'platform') {
        if (entity.id === 'survivor') {
          if (chapter3.npc === 'unseen') dispatch({ type: 'discover-survivor' })
          else setPanel('survivor')
        } else if (entity.id === 'approval') setPanel('approval')
        else if (entity.id === 'front-b') setPanel('depart')
        else if (entity.id === 'call-b') dispatch({ type: 'call-train-b' })
        else if (entity.id === 'train-a' || entity.id === 'train-b') {
          dispatch({ type: 'inspect', id: entity.id })
          setPanel(entity.id)
        } else if (entity.id === 'platform-stairs')
          talk([
            {
              who: 'player',
              text: '계단에서 따라온 발소리는 이 승강장까지 이어졌다. 기둥 뒤에서 사람이 기침한다.',
            },
          ])
        else {
          const object = platformObjects.find((o) => o.id === entity.id)
          if (object) {
            dispatch({ type: 'inspect', id: object.id })
            talk([
              {
                who: 'player',
                text:
                  object.id === 'platform-signal' && chapter3.signal === 'green'
                    ? object.clue + ' 지금 확인한 ◇-2 신호는 녹색이다.'
                    : object.clue,
              },
            ])
          }
        }
        return
      }
      if (area === 'trainA') {
        if (entity.id === 'exit-a') dispatch({ type: 'leave-train-a' })
        else {
          const object = platformObjects.find((o) => o.id === entity.id)!
          dispatch({ type: 'inspect', id: object.id })
          talk([{ who: 'player', text: object.clue }])
        }
        return
      }
      if (area === 'trainB' && chapter3.escaped) {
        dispatch({ type: 'train-start' })
        return
      }
      if (area === 'trainB') {
        talk([
          {
            who: entity.id === 'survivor' ? 'survivor' : 'player',
            text:
              entity.id === 'survivor'
                ? '제 발소리도 멈췄어요. 그런데… 저쪽에서 무슨 소리 들리지 않아요?'
                : '신도림역은 멀어졌다. 다음 역: 미확인.',
          },
        ])
        return
      }
      if (area === 'hall') {
        if (entity.id === 'staff') {
          if (chapter2.staffEvent === 'unseen') setPanel('staff')
          else
            talk([
              {
                who: 'player',
                text: '방화문이 완전히 내려왔다. 직원 통로로는 더 갈 수 없다. 전기실을 통해 개찰구를 열어야 한다.',
              },
            ])
        } else if (entity.id === 'electrical') dispatch({ type: 'enter-electrical' })
        else if (entity.id === 'gate') dispatch({ type: 'pass-gate' })
        else if (entity.id === 'sealed')
          talk([
            {
              who: 'player',
              text: '합선 때문에 차단문이 내려왔다. 손잡이까지 뜨겁다. 첫 방으로 돌아갈 수 없다.',
            },
          ])
        else if (entity.kind === 'npc')
          talk([
            {
              who: 'oh',
              text: '열쇠는 안내 데스크 서랍을 봐요. 난 여기 있을 테니… 방송 장치도 살아 있는지 확인해 봐요. 그렇다고 여기 말을 다 믿지는 말고요.',
            },
          ])
        else {
          const object = hallObjects.find((o) => o.id === entity.id)
          if (object) {
            dispatch({ type: 'inspect', id: object.id })
            talk([{ who: 'player', text: object.clue }])
          }
        }
        return
      }
      if (area === 'electrical') {
        if (entity.id === 'powerboard') setPanel('power')
        else dispatch({ type: 'return-hall' })
        return
      }
      if (area === 'stairs') {
        dispatch({ type: 'enter-platform' })
        return
      }
      if (entity.kind === 'object') {
        const object = objects.find((o) => o.id === entity.id)!
        if (stage !== 'explore') {
          const text = clues.includes(object.id)
            ? object.clue
            : '이 구간의 조사는 끝났다. 정비문을 통해 대합실로 이동하자.'
          if (import.meta.env.VITE_FIRST_ROOM_3D !== 'false') setFieldNote({ text })
          else talk([{ who: 'player', text }])
          return
        }
        dispatch({ type: 'inspect', id: entity.id })
        const text =
          battery < object.battery && !clues.includes(object.id)
            ? '배터리가 부족해 조사할 수 없다.'
            : object.clue
        if (import.meta.env.VITE_FIRST_ROOM_3D !== 'false') setFieldNote({ text })
        else talk([{ who: 'player', text }])
      } else if (entity.kind === 'npc') {
        talk(
          clues.includes('cabinet')
            ? [
                {
                  who: 'oh',
                  text: '물품함 기록을 봤군요. 서쪽 통로가 없는 건 아니에요. 비축품 때문에… 숨겼어요.',
                },
                {
                  who: 'player',
                  text: '현장의 기록과 단톡방의 말이 다르다. 휴대폰으로 이 모순을 물어보자.',
                },
              ]
            : [
                {
                  who: 'oh',
                  text: '깨어났군요. 난 이 근처 상가를 관리하던 사람이에요. 서쪽은 볼 것 없으니 구조대 말을 들어요.',
                },
                {
                  who: 'player',
                  text: '단톡방의 오반장이다. 왜 자꾸 서쪽으로 가지 말라고 할까? 주변부터 조사해 보자.',
                },
              ],
        )
      } else if (stage === 'lock') {
        if (entity.id === 'west') setPanel('lock')
        else
          talk([
            {
              who: 'player',
              text: '이미 서쪽 경로를 선택했다. 정비문으로 돌아가 잠금을 해제하자.',
            },
          ])
      } else if (stage === 'result') {
        if (entity.id === 'west' && state.outcome !== 'failed') dispatch({ type: 'enter-hall' })
        else talk([{ who: 'player', text: '동쪽 계단에서는 여전히 물소리가 난다.' }])
      } else {
        setDoor(entity.id)
        setPanel('door')
      }
    },
    [
      fourthChapter,
      fifthChapter,
      sixthChapter,
      chapter5.completed,
      area,
      stage,
      clues,
      battery,
      chapter2.staffEvent,
      chapter3.npc,
      chapter3.signal,
      chapter3.escaped,
      state.outcome,
      talk,
    ],
  )
  const reset = () => {
    setFieldNote(null)
    setWelcome(false)
    dispatch({ type: 'reset' })
    setPanel(null)
    setCode('')
    setResultDismissed(false)
    setCompletionDismissed(false)
    setEscapeDismissed(false)
    setWorldKey((key) => key + 1)
  }
  const notebook = (
    <>
      {chapter4.suspicion && (
        <article className="clue">
          <strong>외부 송신 연결 분리 직후의 반응</strong>
          <p>
            분리 사실을 알리기 전에 오반장이 “지금 뭘 끊었어요?”라고 물었다. 장치 상태를 아는 것
            같지만, 수신자나 최종 적의 정체가 확인된 것은 아니다.
          </p>
        </article>
      )}
      <h3 className="section-label">
        현장 기록 <span>{clues.length}개</span>
      </h3>
      {clueGroups(state).map((group) => (
        <section key={group.place} className="notebook-place">
          <h3>
            {group.place} · {group.items.length}개
          </h3>
          {group.items.map((o) => (
            <article className="clue" key={o.id}>
              <strong>
                {o.title}{' '}
                {!state.reading.clues.includes(o.id) && <span className="new-tag">✦ 새 단서</span>}
              </strong>
              <p>{o.text}</p>
            </article>
          ))}
        </section>
      ))}
      {(thirdChapter || fifthChapter || fourthChapter) && chapter3.npc !== 'unseen' && (
        <article className="clue">
          <strong>현장 생존자 기록</strong>
          <p>
            {chapter3.npcBoarded
              ? '다친 생존자가 B-04에 함께 탑승했다.'
              : chapter3.npc === 'waiting'
                ? '본인의 뜻에 따라 비상 부스 옆 의자에서 구조를 기다린다.'
                : ['helped', 'invited'].includes(chapter3.npc)
                  ? '부스 옆 의자에서 동행을 기다린다.'
                  : '기둥 뒤에서 만났다. 대피 방향을 알려줄 수 있다.'}
          </p>
        </article>
      )}
      {!clues.length && <p className="muted">사물 가까이 이동한 뒤 조사하세요.</p>}
    </>
  )
  const objective = sixthChapter
    ? finalObjective(state)
    : fifthChapter
      ? chapter5.completed
        ? '챕터 5 완료 · 문래역 정비 통로 이동 승인 저장. 다음 챕터에서 이어집니다.'
        : !chapter5.displayName
          ? '휴대폰 프로필에서 이전부터 사용한 표시 이름을 확인하세요.'
          : area === 'moonHolding' && chapter5.registration === 'active'
            ? '내부 활성 등록과 해제 안내를 조사하고 취소 장치로 차단문을 해제하세요.'
            : chapter5.response === 'undecided'
              ? '전광판·신발·응답 감지기를 조사한 뒤 응답 여부를 선택하세요.'
              : !chapter5.matched
                ? '안내 부스에서 방송 재생·외부 수신·수동 첨부 원본을 조사하고 등록 건을 대조하세요.'
                : !chapter5.externalPaused
                  ? '안내 부스 단말에서 외부 유도를 보류하세요.'
                  : !chapter5.routeOpen
                    ? '승강장의 현장 표식을 조사한 뒤 정비 통로의 문 번호와 승인 방식을 대조하세요.'
                    : '승인된 정비 통로 앞에서 이동을 확인하세요.'
      : fourthChapter
        ? chapter4.completed
          ? `챕터 4 완료 · ${chapter4.destination} 도착. 역 탐색은 챕터 5에서 이어집니다.`
          : chapter4.arrived
            ? `${chapter4.destination} — 비상 정차. 중앙 객실의 열린 문으로 이동하세요.`
            : chapter4.sync === 'accepted'
              ? '정차 요청 수락 · 감속 중'
              : '객실 인원을 확인하고 휴대폰·노선 표시기·설명서·장치 식별자를 대조하세요. 후방 장치함에서 연결을 정리한 뒤 선두 패널로 이동하세요.'
        : thirdChapter
          ? chapter3.escaped
            ? '신도림역 탈출 완료 · 다음 역: 미확인'
            : area === 'trainA'
              ? '객실의 선두 안내를 조사하고 아래 문으로 돌아갈 수 있습니다.'
              : area === 'trainB'
                ? '신도림역 표지판이 창밖으로 멀어진다.'
                : chapter3.npc === 'unseen'
                  ? '뒤따르던 발소리를 확인하고 주변 차량 표식을 조사하세요.'
                  : chapter3.signal === 'green'
                    ? '승인된 열차의 비상 호출로 문을 열고 출발을 확인하세요.'
                    : '차량 표식과 비상 부스 기록을 조사해 대조하세요.'
          : area === 'first'
            ? state.outcome
              ? state.outcome === 'failed'
                ? '탈출 실패 · 이번 회차 종료'
                : '정비문 개방 · 대합실로 이동하세요.'
              : stage === 'lock'
                ? '선택한 문의 잠금장치를 현장 단서와 대조하세요.'
                : clues.length === 0
                  ? '위쪽 벽의 안내도와 감지 패널을 찾아보세요.'
                  : asked.length === 0
                    ? '휴대폰에서 현장 단서와 다른 주장에 대해 질문하세요.'
                    : '문 가까이 다가가 경로를 선택하세요.'
            : area === 'electrical'
              ? '위쪽 배전반에서 회로 두 개까지 선택할 수 있습니다.'
              : area === 'stairs'
                ? chapter2.completed
                  ? '챕터 2 완료 · 계단에 다가가 챕터 3로 이동하세요.'
                  : '멈춰 서서 발소리에 귀를 기울인다.'
                : !state.inventory.includes('전기실 열쇠')
                  ? '역 안내도와 점검창을 조사하고 안내 데스크를 찾아보세요.'
                  : !lights || !gateOpen
                    ? clues.includes('hall-gate-note')
                      ? '개방 안내문과 전기실 회로를 대조하세요. 수집한 기록은 소지품에서 확인합니다.'
                      : '잠긴 개찰구의 안내문과 전기실을 조사하세요.'
                    : '조명과 개찰구가 켜졌습니다. 오른쪽 개찰구로 이동하세요.'
  return (
    <div
      className={`app-shell ${playing ? 'is-playing' : ''} ${immersive ? 'is-immersive' : ''}`}
      onClick={finishUiGesture}
      onSubmit={finishUiGesture}
    >
      <header className="header">
        <div className="brand">
          <span className="brand-mark">↗</span>
          <span>
            마지막 환승<small>THE LAST TRANSFER</small>
          </span>
        </div>
        <div className="header-right">
          <span className="connection">
            <i /> 로컬 플레이
          </span>
          <button className="icon-button" onClick={() => setPanel('reset')} disabled={paused}>
            ↻ <span>초기화</span>
          </button>
        </div>
      </header>
      <main>
        {!immersive && sixthChapter && (
          <div className="power-status">
            <span>
              {state.chapter3.npcBoarded
                ? '생존자 동행 · 두 경로 모두 함께 이동'
                : '단독 이동 · 생존자는 신도림역에서 마지막 확인'}
            </span>
            <span>
              {state.chapter6.drained ? '배수 완료' : '지역 설비 전원 유지'}
              {state.chapter6.boltOpen ? ' · 빗장 해제' : ''}
            </span>
          </div>
        )}
        {state.chapter6.completed && (
          <button
            className="primary full episode-result-button"
            onClick={() => setPanel('episode-result')}
          >
            에피소드 1 완료 · 저장된 결과 보기
          </button>
        )}
        <div className="episode-bar">
          <div>
            <span className="chapter">
              CHAPTER{' '}
              {sixthChapter
                ? '06'
                : area === 'first'
                  ? '01'
                  : fifthChapter
                    ? '05'
                    : fourthChapter
                      ? '04'
                      : thirdChapter
                        ? '03'
                        : '02'}
            </span>
            <h1>
              {sixthChapter
                ? '정비 통로'
                : fifthChapter
                  ? '대답 없는 승강장'
                  : area === 'first'
                    ? episode.title
                    : fourthChapter
                      ? '정차하지 않는 열차'
                      : thirdChapter
                        ? '누군가 있는 승강장'
                        : '불 꺼진 대합실'}
            </h1>
          </div>
          <div className="resources">
            <span>
              ♡ <b>{state.health}</b>
              <small>체력</small>
            </span>
            <span>
              ▰ <b>{battery}%</b>
              <small>배터리</small>
            </span>
          </div>
        </div>
        <div className="objective-card" role="status">
          <strong>⌖ 다음 목표</strong>
          <p>{objective}</p>
        </div>
        <div className="workspace-heading">
          <span className="overline">EXPLORE · OBSERVE · SURVIVE</span>
          <span>
            {sixthChapter
              ? '문래역 정비 구역 · 게임용 가상 공간'
              : fifthChapter
                ? '문래역 · 게임용 가상 공간'
                : area === 'electrical'
                  ? '직원 전용 전기실'
                  : area === 'stairs'
                    ? '승강장 계단 앞'
                    : '신도림역을 모티브로 한 가상 공간'}
          </span>
        </div>
        {!immersive &&
          area !== 'first' &&
          !sixthChapter &&
          !thirdChapter &&
          !fourthChapter &&
          !fifthChapter && (
            <div className="power-status" aria-label="예비 전원 상태">
              {powerDevices.map((d) => (
                <span key={d.id} className={chapter2.power.includes(d.id) ? 'on' : ''}>
                  <i />
                  {d.title} {chapter2.power.includes(d.id) ? 'ON' : 'OFF'}
                </span>
              ))}
              <small>{chapter2.power.length}/2 회로</small>
            </div>
          )}
        {!immersive && thirdChapter && !fourthChapter && !fifthChapter && (
          <div className="power-status train-status">
            <span>
              {clues.includes('train-b') || clues.includes('platform-record')
                ? 'B-04 / ◇-2'
                : '차량 표식 미확인'}
            </span>
            <span className={chapter3.signal === 'green' ? 'on' : ''}>
              <i />
              {chapter3.signal === 'green'
                ? '녹색 신호'
                : chapter3.signal === 'changing'
                  ? '신호 전환 중'
                  : '붉은 신호'}
            </span>
            <small>
              {chapter3.escaped ? '탈출 완료' : chapter3.doorOpen ? '문 개방' : '문 닫힘'}
            </small>
          </div>
        )}
        {chapter3.escaped && !chapter4.started && !showEscape && (
          <button className="primary full" onClick={() => dispatch({ type: 'train-start' })}>
            챕터 4 · 정차하지 않는 열차 시작 →
          </button>
        )}
        {!immersive && fourthChapter && !fifthChapter && (
          <div className="power-status train-four-status">
            <span>B-04 · {chapter3.npcBoarded ? '객실 2명 (나·생존자)' : '객실 1명 (나)'}</span>
            <span>{chapter4.links.power ? 'P-02 전원 연결' : 'P-02 차단 · 비상등'}</span>
            <span>{chapter4.arrived ? `${chapter4.destination} — 비상 정차` : '터널 운행 중'}</span>
          </div>
        )}
        {chapter4.completed && !fifthChapter && !sixthChapter && (
          <div className="chapter4-complete" role="status">
            CHAPTER 04 CLEAR · {chapter4.destination} 도착 저장 완료.
            <button
              className="primary full"
              disabled={paused}
              onClick={() => dispatch({ type: 'moon-start' })}
            >
              챕터 5 · 대답 없는 승강장 시작 →
            </button>
          </div>
        )}
        {!immersive && fifthChapter && (
          <div className="power-status moon-status">
            <span>문래역 · {chapter3.npcBoarded ? '나와 동행 생존자' : '단독 탐색'}</span>
            <span>
              응답:{' '}
              {chapter5.response === 'answered'
                ? '응답함'
                : chapter5.response === 'silent'
                  ? '무응답'
                  : '미선택'}
            </span>
            <span>
              등록:{' '}
              {
                { pending: '대기', active: '활성', cancelled: '취소', held: '보류' }[
                  chapter5.registration
                ]
              }
            </span>
          </div>
        )}
        {chapter5.completed && !sixthChapter && (
          <div className="chapter4-complete" role="status">
            CHAPTER 05 CLEAR · 정비 통로 이동 승인 저장 완료.
            <button
              className="primary full"
              disabled={paused}
              onClick={() => dispatch({ type: 'maintenance-start' })}
            >
              챕터 6 · 정비 통로 진입 →
            </button>
          </div>
        )}
        <div
          className={`world-frame area-${area} ${chapter4.started && sceneIndex === 0 && scene[0]?.text.startsWith('“잠깐.') ? 'chapter4-opening' : ''}`}
        >
          {playing && (
            <ExplorationHud
              chapter={`CH ${String(chapter.number).padStart(2, '0')} · ${area === 'first' ? '정비 대기실' : locationName(state)}`}
              health={state.health}
              battery={battery}
              objective={objective}
              power={
                immersive && ['hall', 'electrical', 'stairs'].includes(area)
                  ? chapter2.power
                  : undefined
              }
              paused={paused}
              operation={
                sixthChapter
                  ? `${state.chapter6.route === 'manual' ? 'S-01 수동 경로' : state.chapter6.route === 'automatic' ? 'G-01 → S-02' : '경로 미확정'} / ${state.chapter6.completed ? '도착 확인 완료' : state.chapter6.boltOpen ? '해치 개방' : state.chapter6.drained ? '배수 완료' : '지역 전원 유지'}`
                  : fifthChapter
                    ? `${chapter5.response === 'answered' ? '응답' : chapter5.response === 'silent' ? '무응답' : '응답 미선택'} / ${chapter5.routeOpen ? '정비 통로 개방' : chapter5.externalPaused ? '등록 처리 완료' : '현장 조사'}`
                    : fourthChapter
                      ? `${chapter4.links.power ? 'P-02 연결' : 'P-02 차단 · 비상등'} / ${chapter4.arrived ? `${chapter4.destination} — 비상 정차` : '터널 운행 중'}`
                      : thirdChapter
                        ? `${chapter3.signal === 'green' ? '출발 신호 · 녹색' : chapter3.signal === 'changing' ? '신호 전환 중' : '출발 신호 · 붉음'} / ${chapter3.doorOpen ? 'B 출입문 개방' : 'B 출입문 닫힘'}`
                        : undefined
              }
              onHelp={() => setPanel('help')}
              onFullscreen={() => {
                if (document.fullscreenElement) void document.exitFullscreen()
                else void document.documentElement.requestFullscreen().catch(() => setPanel('help'))
              }}
            />
          )}
          <ExplorationView
            key={`${worldKey}:${area}:${chapter2.staffEvent}`}
            area={area}
            power={chapter2.power}
            staffEvent={chapter2.staffEvent}
            chapter3={chapter3}
            chapter4={chapter4}
            chapter5={chapter5}
            chapter6={state.chapter6}
            initialPosition={state.position}
            paused={paused}
            clues={clues}
            outcome={state.outcome}
            controlsRef={explorationControls}
            onInteract={interact}
            onPosition={savePosition}
            view3d={state.view3d}
            onView3d={saveView3d}
          />
          {area === 'first' && fieldNote && !paused && (
            <aside className="field-note" role="status" aria-live="polite">
              <strong>⌕ 현장 기록 · 탐색 유지</strong>
              <p>{fieldNote.text}</p>
              <small>획득한 단서는 소지품에서 다시 확인할 수 있습니다.</small>
            </aside>
          )}
          <div className="world-toolbar">
            <button
              disabled={paused}
              onClick={() => openPanel('phone')}
              aria-label={`휴대폰 단톡방 · 새 메시지 ${unreadMessages}개`}
              title="휴대폰 [Tab]"
            >
              ▯{' '}
              <span>
                휴대폰 <kbd className="pc-key-hint">[Tab]</kbd>
              </span>
              <small>
                <span className="badge-text">
                  {unreadMessages ? `✦ 새 메시지 ${unreadMessages}` : '✓ 확인함'}
                </span>
                <span className="badge-dot" aria-hidden="true">
                  {unreadMessages ? `✦ ${unreadMessages}` : '✓'}
                </span>
              </small>
            </button>
            <button
              disabled={paused}
              onClick={() => openPanel('bag')}
              aria-label={`소지품·단서 · 새 단서 ${unreadClues}개`}
              title="소지품·단서 [I]"
            >
              ⊞{' '}
              <span>
                소지품·단서 <kbd className="pc-key-hint">[I]</kbd>
              </span>
              <small>
                <span className="badge-text">
                  {unreadClues ? `✦ 새 단서 ${unreadClues}` : `✓ ${clues.length}개 확인`}
                </span>
                <span className="badge-dot" aria-hidden="true">
                  {unreadClues ? `✦ ${unreadClues}` : '✓'}
                </span>
              </small>
            </button>
          </div>
          {area === 'trainB' && chapter3.ending === 'departing' && sceneIndex >= 1 && (
            <div className="departure-window" aria-label="열차 창밖으로 멀어지는 신도림역 표지판">
              <span>신도림 SINDORIM →</span>
            </div>
          )}
          {current && !welcome && (
            <div className="vn-layer">
              {area === 'stairs' && chapter2.ending === 'echo' && sceneIndex === 1 && (
                <div className="footstep-echo" key="echo" aria-label="멈춘 뒤 한 번 더 들린 발소리">
                  <span>… 또각.</span>
                  <i />
                </div>
              )}
              {current.who === 'broadcast' ? (
                <div className="vn-broadcast" aria-hidden="true">
                  ◉<small>안내방송 자막</small>
                </div>
              ) : (
                <div className="vn-portrait">
                  <Portrait who={current.who} />
                </div>
              )}
              <div
                className="vn-dialogue"
                role="dialog"
                aria-modal="true"
                aria-label={`${speaker?.name ?? '나'} 대화`}
              >
                <span className="overline">{speaker?.role ?? '현장 기록'} · 탐색 일시정지</span>
                <h2>{speaker?.name ?? '나'}</h2>
                <p aria-live="polite" key={`${sceneIndex}:${current.text}`}>
                  {current.text}
                </p>
                <button
                  ref={dialogueButton}
                  className="primary"
                  onClick={() => dispatch({ type: 'advance' })}
                >
                  {sceneIndex + 1 < scene.length ? '다음 대화' : '탐색 계속'} <span>▸</span>
                </button>
                <small>
                  {sceneIndex + 1} / {scene.length}
                </small>
              </div>
            </div>
          )}
        </div>
        {chapter4.interruption === 'interrupted' && (
          <div className="train-interruption" role="status">
            단톡방 수신 잠시 중단 · 사용자 휴대폰 독립 연결 전환 중
          </div>
        )}
        <div className="below-map">
          <div>
            <span className="status-light" />
            <p>
              미확인 기록 · 단서 {unreadClues}개 · 메시지 {unreadMessages}개
            </p>
          </div>
          <span className="keyboard-help">
            <kbd>WASD</kbd> / <kbd>↑↓←→</kbd> 이동 · <kbd>E</kbd> 상호작용 · <kbd>Tab</kbd> 휴대폰 ·{' '}
            <kbd>I</kbd> 소지품·단서
          </span>
        </div>
        <footer>
          <span role="status">
            {saveError
              ? '저장 실패 · 브라우저 저장 공간을 확인하세요.'
              : '자동 저장 · 위치·대화·전원 상태를 이 기기에 저장합니다.'}
          </span>
          <div>
            {stage === 'result' && area === 'first' && (
              <button disabled={paused} onClick={() => setResultDismissed(false)}>
                결과 보기 ↗
              </button>
            )}
            {area === 'stairs' && chapter2.completed && (
              <button disabled={paused} onClick={() => setCompletionDismissed(false)}>
                챕터 완료 기록 ↗
              </button>
            )}
            {chapter3.escaped && !chapter4.started && (
              <button disabled={paused} onClick={() => setEscapeDismissed(false)}>
                탈출 기록 ↗
              </button>
            )}
            <span>
              {sixthChapter
                ? locationName(state)
                : chapter4.arrived
                  ? `${chapter4.destination} · 비상 정차`
                  : chapter3.escaped
                    ? '다음 역: 미확인'
                    : '신도림역 · B2'}
            </span>
          </div>
        </footer>
      </main>
      {welcome && panel !== 'reset' && (
        <Overlay title="마지막 환승 · 저장된 여정">
          <p className="intro-text">
            챕터 {chapter.number} · {chapter.title}
          </p>
          <p>
            {locationName(state)} · 체력 {state.health} · 단서 {clues.length}개
          </p>
          <p className="muted">
            {state.savedAt && Number.isFinite(Date.parse(state.savedAt))
              ? `저장: ${new Date(state.savedAt).toLocaleString('ko-KR')}`
              : '이 기기에 저장된 진행이 있습니다.'}
          </p>
          <p>{objective}</p>
          <button
            className="primary full"
            onClick={() => {
              setWelcome(false)
              if (stage === 'lock') setPanel('lock')
            }}
          >
            이어하기 →
          </button>
          <button className="text-button" onClick={() => setPanel('reset')}>
            새 게임
          </button>
        </Overlay>
      )}
      {transition && (
        <div className="chapter-transition" role="status">
          <span>CHAPTER {chapter.number}</span>
          <h2>{chapter.title}</h2>
        </div>
      )}
      {stage === 'intro' && (
        <Overlay title="차가운 바닥에서 눈을 떴다.">
          <SoundSettings
            settings={sound.settings}
            onChange={sound.setSettings}
            status={sound.status}
          />
          <p className="intro-text">{episode.intro}</p>
          <div className="intro-instructions">
            <p>
              <b>01</b> 직접 걸으며 사물과 인물을 찾으세요.
            </p>
            <p>
              <b>02</b>{' '}
              <span className="pc-input-help">
                가까이에서 E로 조사하세요. Tab: 휴대폰 · I: 소지품·단서
              </span>
              <span className="touch-input-help">가까이에서 조사 버튼을 누르세요.</span>
            </p>
            <p>
              <b>03</b> 휴대폰 단톡방에서 주장과 단서를 비교하세요.
            </p>
          </div>
          <p className="muted">
            <span className="pc-input-help">
              PC: WASD / 방향키 · Tab 휴대폰 · I 소지품·단서 · Esc 닫기
            </span>
            <span className="touch-input-help">
              모바일: 왼쪽 조이스틱 · 오른쪽 드래그 시점 · 휴대폰·소지품 버튼
            </span>
            <br />
            대화·휴대폰·메뉴가 열리면 탐색이 멈춥니다.
          </p>
          <p className="muted">저장된 진행 없음 · 외부 AI 없이 플레이 가능</p>
          <button
            className="primary full"
            onClick={() => {
              dispatch({ type: 'start' })
              talk([
                {
                  who: 'player',
                  text: '간신히 몸을 일으켰다. 저쪽에 사람이 보인다. 휴대폰에는 네 사람의 메시지가 와 있다.',
                },
              ])
            }}
          >
            몸을 일으키기 →
          </button>
        </Overlay>
      )}
      {panel === 'phone' && (
        <Overlay title="신도림 생존자 · 5명" onClose={closePanel} wide shortcutMenu="phone">
          <div className="members">
            {characters.map((c) => (
              <span key={c.id}>
                <span style={{ background: `${c.color}22`, color: c.color }}>{c.initial}</span>
                <b>
                  {c.name}
                  <small>{c.role}</small>
                </b>
              </span>
            ))}
          </div>
          <div className="chat-messages" role="log" aria-label="단톡방 메시지">
            <p className="chat-system">로컬 채널 · 현장의 단서와 비교하세요.</p>
            {state.messages.map((message, i) => {
              const c = characters.find((c) => c.id === message.who)
              return (
                <article key={i} className={`message ${c ? '' : 'mine'}`}>
                  <span className="avatar" style={{ color: c?.color }}>
                    {c?.initial ?? '나'}
                  </span>
                  <div>
                    <strong>
                      {c?.name ?? '나'}
                      <small>{message.time ?? c?.role ?? '생존자'}</small>
                    </strong>
                    <p>{message.text}</p>
                    {i >= state.reading.messages && <small className="new-tag">✦ 새 메시지</small>}
                    {message.kind && (
                      <small className="ai-message-kind">
                        {message.kind === 'ai-answer'
                          ? 'AI 생성 대사 · 현장 판정 아님'
                          : message.kind === 'mock-answer'
                            ? '모의 응답 · 검증용'
                            : `질문 대상: ${characters.find((person) => person.id === message.target)?.name ?? ''}`}
                      </small>
                    )}
                  </div>
                </article>
              )
            })}
            <div ref={end} />
          </div>
          {isAiChapter2(state) && <AiChatComposer state={state} dispatch={dispatch} />}
          <div className="question-area">
            <h3>
              단서를 바탕으로 질문하기 <small>배터리 소모 없음</small>
            </h3>
            {currentQuestions
              .filter((q) => q.id !== 'train-power-question' || chapter4.powerAdvice)
              .map((q) => (
                <button
                  key={q.id}
                  disabled={
                    state.chapter6.completed ||
                    stage !== 'explore' ||
                    area === 'stairs' ||
                    (!sixthChapter && !fifthChapter && !fourthChapter && chapter3.boarded) ||
                    (fourthChapter
                      ? !availableTrainQuestion(q.id, clues, chapter4)
                      : !clues.includes(q.requires)) ||
                    asked.includes(q.id)
                  }
                  onClick={() => dispatch({ type: 'ask', id: q.id })}
                >
                  <span>{asked.includes(q.id) ? '✓' : '↗'}</span>
                  {q.label}
                  <small>
                    {asked.includes(q.id)
                      ? '완료'
                      : clues.includes(q.requires)
                        ? '질문'
                        : '단서 필요'}
                  </small>
                </button>
              ))}
          </div>
        </Overlay>
      )}
      {panel === 'help' && (
        <Overlay title="탐색 조작 안내" onClose={closePanel}>
          <SoundSettings
            settings={sound.settings}
            onChange={sound.setSettings}
            status={sound.status}
          />
          <div className="pc-input-help">
            <p>WASD / 방향키 이동 · 마우스 시점 · E 조사</p>
            <p>Tab 휴대폰 · I 소지품·단서 · Esc 닫기 / 잠금 해제</p>
            <p>
              잠금 복귀가 허용되지 않으면 화면을 한 번 클릭하세요. 복귀 클릭은 조사에 사용되지
              않습니다.
            </p>
          </div>
          <div className="touch-input-help">
            <p>왼쪽 조이스틱으로 이동하고 오른쪽 화면을 드래그해 둘러보세요.</p>
            <p>조사 버튼 · 휴대폰 · 소지품 버튼을 사용하세요.</p>
          </div>
          <p>짧은 조사는 탐색을 유지합니다. 대화·퍼즐·메뉴에서는 탐색을 멈춥니다.</p>
          <button className="text-button" onClick={() => setPanel('reset')}>
            새 게임 / 저장 초기화 확인
          </button>
        </Overlay>
      )}
      {panel === 'bag' && (
        <Overlay title="소지품과 현장 기록" onClose={closePanel} shortcutMenu="bag">
          <div className="inventory">
            <span>▯ 휴대폰 · {battery}%</span>
            {state.inventory.map((item) => (
              <span key={item}>♧ {item}</span>
            ))}
          </div>
          {notebook}
        </Overlay>
      )}
      {panel === 'door' && (
        <Overlay title={route.title} onClose={closePanel}>
          <span className="overline">{route.voice}</span>
          <p className="intro-text">{route.text}</p>
          <p className="muted">
            {!clues.includes(route.requires)
              ? '관련 현장 단서를 먼저 조사해야 합니다.'
              : !asked.length
                ? '휴대폰에서 질문을 하나 이상 해보세요.'
                : '이 경로를 선택하면 되돌릴 수 없습니다.'}
          </p>
          <button
            className="primary full"
            disabled={!canRoute}
            onClick={() => {
              dispatch({ type: 'route', id: door })
              setPanel(door === 'west' ? 'lock' : null)
              setResultDismissed(false)
            }}
          >
            이 경로 선택 →
          </button>
        </Overlay>
      )}
      {panel === 'lock' && (
        <Overlay title="서쪽 정비문 · 전자 잠금" onClose={closePanel}>
          <span className="overline">MAINTENANCE ACCESS</span>
          <p className="intro-text">
            마지막 경보 시각 네 자리.
            <br />
            닫힌 문 너머에서 바람이 스민다.
          </p>
          <form
            className="lock-form"
            onSubmit={(event) => {
              event.preventDefault()
              const next = reducer(state, { type: 'code', code })
              dispatch({ type: 'code', code })
              setCode('')
              if (next.stage === 'result') {
                setPanel(null)
                setResultDismissed(false)
              }
            }}
          >
            <label htmlFor="code">암호 입력 · 남은 기회 {3 - state.attempts}회</label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{4}"
              maxLength={4}
              value={code}
              placeholder="0000"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
            <button className="primary" disabled={code.length !== 4}>
              잠금 해제 →
            </button>
          </form>
          <p role="status" className="notice">
            {state.notice}
          </p>
          <details>
            <summary>수집한 단서 확인</summary>
            {notebook}
          </details>
        </Overlay>
      )}
      {!welcome && showResult && panel !== 'reset' && (
        <Overlay
          title={state.outcome === 'failed' ? '마지막 신호가 끊겼다.' : '정비문이 열렸다.'}
          onClose={closeResult}
        >
          <span className="overline">
            {state.outcome === 'failed' ? 'SIGNAL LOST' : 'CHAPTER 01 CLEAR'}
          </span>
          <p className="intro-text">{state.notice}</p>
          <p className="result-stats">
            체력 {state.health} · 배터리 {battery}% · 단서 {clues.length}개
          </p>
          {state.outcome !== 'failed' && (
            <button className="primary full" onClick={() => dispatch({ type: 'enter-hall' })}>
              대합실로 이동 →
            </button>
          )}
          <button className="text-button" onClick={() => setPanel('reset')}>
            처음부터 다시 플레이
          </button>
        </Overlay>
      )}
      {panel === 'staff' && (
        <Overlay title="파란 불빛을 따라갈까요?" onClose={closePanel}>
          <p className="intro-text">
            강태오가 안내한 직원 통로. 안쪽에서 환풍기 소리와 금속이 삐걱이는 소리가 들립니다.
          </p>
          <p className="muted">
            이 경로에서는 한 번의 회피 사건이 발생합니다. 실패해도 체력 20이 감소한 상태로 대합실에
            복귀합니다.
          </p>
          <button
            className="primary full"
            onClick={() => {
              setPanel(null)
              dispatch({ type: 'staff-start' })
            }}
          >
            직원 통로 진입 →
          </button>
        </Overlay>
      )}
      {hazard && !welcome && <DodgeGame onFinish={finishDodge} />}
      {panel === 'power' && (
        <Overlay title="예비 전원 · 회로 분배" onClose={closePanel}>
          <div className="power-capacity">
            <span>
              {chapter2.power.length} <small>/ 2 회로 연결</small>
            </span>
            <p>
              세 장치 중 최대 두 개.
              <br />
              켜진 장치를 끄면 다른 회로를 연결할 수 있습니다.
            </p>
          </div>
          <div className="power-devices">
            {powerDevices.map((device) => {
              const enabled = chapter2.power.includes(device.id)
              return (
                <button
                  key={device.id}
                  aria-pressed={enabled}
                  onClick={() => dispatch({ type: 'power', device: device.id })}
                >
                  <span className="device-icon">{device.icon}</span>
                  <span>
                    <strong>{device.title}</strong>
                    <small>{device.description}</small>
                  </span>
                  <b>{enabled ? 'ON' : 'OFF'}</b>
                </button>
              )
            })}
          </div>
          <p className="notice" role="status">
            {state.notice}
          </p>
          <p className="muted">
            안전 통과 조건: 조명 {lights ? '✓' : '—'} + 개찰구 {gateOpen ? '✓' : '—'}
            <br />
            방송 기록은 전원을 꺼도 현장 노트에 남습니다.
          </p>
          <button className="primary full" onClick={closePanel}>
            설정 유지하고 탐색 계속 →
          </button>
        </Overlay>
      )}
      {showCompletion && !welcome && panel !== 'reset' && (
        <Overlay title="챕터 2 · 불 꺼진 대합실 완료" onClose={closeCompletion}>
          <span className="overline">CHAPTER 02 CLEAR · SAVED</span>
          <p className="intro-text">
            개찰구 너머, 계단 앞에 도착했습니다.
            <br />한 번 더 울린 발소리의 주인은 아직 알 수 없습니다.
          </p>
          <p className="result-stats">
            체력 {state.health} · 수집한 기록 {clues.length}개
          </p>
          <div className="chapter-preview">
            <span>CHAPTER 03</span>
            <h3>누군가 있는 승강장</h3>
            <p>계단을 내려가 발소리의 주인을 확인하세요.</p>
          </div>
          <button
            className="primary full"
            onClick={() => {
              closeCompletion()
              dispatch({ type: 'enter-platform' })
            }}
          >
            챕터 3 · 승강장으로 이동 →
          </button>
          <button className="text-button" onClick={closeCompletion}>
            완료 기록 저장 · 현장으로 →
          </button>
          <button className="text-button" onClick={() => setPanel('reset')}>
            처음부터 다시 플레이
          </button>
        </Overlay>
      )}
      {!welcome && (
        <Chapter6Panels
          state={state}
          panel={panel}
          onClose={closePanel}
          dispatch={dispatch}
          notebook={notebook}
        />
      )}
      {!welcome && (
        <Chapter5Panels
          state={state}
          panel={panel}
          onClose={closePanel}
          dispatch={dispatch}
          notebook={notebook}
        />
      )}
      {!welcome && (
        <Chapter4Panels
          state={state}
          panel={panel}
          onClose={closePanel}
          dispatch={dispatch}
          notebook={notebook}
        />
      )}
      {!welcome && (
        <Chapter3Panels
          state={state}
          panel={panel}
          onClose={closePanel}
          dispatch={dispatch}
          notebook={notebook}
        />
      )}
      {showEscape && !welcome && panel !== 'reset' && (
        <Overlay title="신도림역 탈출 완료" onClose={closeEscape}>
          <span className="overline">CHAPTER 03 CLEAR · NEXT STATION UNKNOWN</span>
          <p className="intro-text">
            차창 밖의 신도림역 표지판이 멀어졌습니다.
            <br />
            {chapter3.npcBoarded
              ? '다친 생존자와 함께 열차에 올랐습니다.'
              : '혼자 탑승했습니다. 생존자는 비상 부스 옆 의자에서 구조를 기다립니다.'}
          </p>
          <div className="chapter-preview">
            <span>다음 역: 미확인</span>
            <h3>“지금 객실에 몇 명 있어요?”</h3>
            <p>챕터 4 · 정차하지 않는 열차에서 객실의 통신 흔적을 확인하세요.</p>
          </div>
          <button className="primary full" onClick={closeEscape}>
            탈출 기록 저장 · 객실 둘러보기 →
          </button>
          <button
            className="primary full"
            onClick={() => {
              closeEscape()
              dispatch({ type: 'train-start' })
            }}
          >
            챕터 4 · 정차하지 않는 열차 시작 →
          </button>
          <button className="text-button" onClick={() => setPanel('reset')}>
            처음부터 다시 플레이
          </button>
        </Overlay>
      )}
      {panel === 'reset' && (
        <Overlay title="처음부터 다시 시작할까요?" onClose={closePanel}>
          <p className="intro-text">현재 회차의 위치, 단서, 대화와 저장 기록이 초기화됩니다.</p>
          <button className="primary full" onClick={reset}>
            초기화하고 시작 ↻
          </button>
          <button className="text-button" onClick={closePanel}>
            계속 플레이
          </button>
        </Overlay>
      )}
    </div>
  )
}
const cluesUnread = (state: import('./game/engine').State) => {
  return state.clues.filter((id) => !state.reading.clues.includes(id)).length
}
export default App
