import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

export const verifyChapter4Three = async ({
  send,
  evaluate,
  click,
  close,
  state,
  advanceAll,
  hold,
  wait,
  approach,
  pressE,
  resume3d,
  trustedClick,
}) => {
  await mkdir('docs/chapter4-3d', { recursive: true })
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`docs/chapter4-3d/${name}.png`, Buffer.from(data, 'base64'))
  }
  const restore = async (checkpoint) => {
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(checkpoint))})`,
    })
    await send('Page.reload')
    await wait(1100)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    await wait(150)
  }
  const act = async (id) => {
    await resume3d()
    await approach(id)
    assert.equal(
      await evaluate("document.querySelector('.interaction button').disabled"),
      false,
      `target ${id}`,
    )
    await pressE(true)
  }
  const finish = async () => {
    await advanceAll()
    await resume3d()
  }
  const inspect = async (id) => {
    await act(id)
    await advanceAll()
  }
  const base = await evaluate(
    `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,stage:'explore',area:'platform',scene:[],chapter2:{...s.chapter2,completed:true},chapter3:{...s.chapter3,started:true,npc:'helped',approved:true,signal:'green',doorOpen:true},clues:['train-a','train-b','platform-record','platform-signal'],position:{x:450,y:240}}})()`,
  )
  if (process.env.FIRST_PERSON_CHECK === 'chapter4-visual') {
    const views = [
      ['09-central-companion', 'trainB', { x: 570, y: 300 }, -2.356, -0.12, false],
      ['10-phone', 'trainB', { x: 265, y: 330 }, 0.68, -0.8, false],
      ['11-rear-devices', 'trainRear', { x: 690, y: 230 }, 0, 0, false],
      ['12-open-door', 'trainB', { x: 470, y: 460 }, Math.PI, 0, true],
    ]
    for (const [name, area, p, yaw, pitch, arrived] of views) {
      const checkpoint = await evaluate(
        `(async()=>{const {makeView3d}=await import('/src/game/view3d.ts');const base=${JSON.stringify(base)};return {...base,area:${JSON.stringify(area)},position:${JSON.stringify(p)},view3d:makeView3d(${JSON.stringify(area)},${JSON.stringify(p)},${yaw},${pitch}),chapter3:{...base.chapter3,boarded:true,npcBoarded:true,escaped:true,ending:'complete'},chapter4:{...base.chapter4,started:true,links:{relay:true,external:false,power:true},sync:${arrived ? "'accepted'" : "'idle'"},arrived:${arrived}}}})()`,
      )
      await restore(checkpoint)
      await resume3d()
      await wait(350)
      assert.equal(await evaluate("document.querySelectorAll('.first-person canvas').length"), 1)
      await shot(name)
    }
    console.log(
      'PASS chapter 4 visual checkpoints: companion, phone, devices and open Mullae door; single Canvas.',
    )
    return
  }
  await restore(base)
  await act('front-b')
  await click('최종 확인 · 탑승하고 출발')
  await advanceAll()
  assert.equal((await state()).chapter3.npcBoarded, true)
  await evaluate("document.querySelector('.first-person canvas').dataset.continuity='same-car'")
  await click('챕터 4 · 정차하지 않는 열차 시작')
  await finish()
  assert.equal(await evaluate("document.querySelector('canvas').dataset.continuity"), 'same-car')
  assert.equal(await evaluate("document.querySelector('canvas').dataset.npcCount"), '1')
  await shot('01-central-desktop')
  const key = async (code, key) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key })
    await wait(120)
  }
  for (const [code, name] of [
    ['Tab', 'Tab'],
    ['KeyI', 'i'],
  ]) {
    await key(code, name)
    assert.equal(await evaluate("!!document.querySelector('.overlay-panel')"), true)
    const paused = (await state()).position
    await hold('w', 180)
    assert.deepEqual((await state()).position, paused)
    await key('Escape', 'Escape')
    await resume3d()
  }
  if (process.env.FIRST_PERSON_CHECK === 'chapter4-controls') {
    console.log('PASS chapter 4 PC: Tab/I/Esc, menus block movement and exploration resumes.')
    return
  }
  const central = await state()
  if (process.env.FIRST_PERSON_CHECK === 'chapter4-phone') {
    await inspect('train-phone')
    assert.ok((await state()).clues.includes('train-phone'))
    await resume3d()
    await shot('13-phone-investigation')
    console.log(
      'PASS chapter 4 phone: standing camera aims at floor target and investigates with E.',
    )
    return
  }
  const travel = await evaluate("+document.querySelector('canvas').dataset.travel")
  await wait(300)
  assert.notEqual(await evaluate("+document.querySelector('canvas').dataset.travel"), travel)
  await inspect('train-phone')
  await resume3d()
  await inspect('train-route')
  await resume3d()
  await inspect('train-exit')
  assert.equal((await state()).chapter4.arrived, false)
  await resume3d()
  await act('train-rear-door')
  await resume3d()
  assert.equal((await state()).area, 'trainRear')
  assert.equal(await evaluate("document.querySelector('canvas').dataset.npcCount"), '0')
  await inspect('train-manual')
  await resume3d()
  await inspect('train-devices')
  await click('P-02 / 객실 전원')
  assert.equal((await state()).chapter4.links.power, false)
  await close()
  await resume3d()
  await shot('02-rear-emergency')
  const dark = await state()
  await restore(dark)
  await resume3d()
  assert.equal(await evaluate("document.querySelector('canvas').dataset.lightsOn"), 'false')
  await inspect('train-devices')
  await click('P-02 / 객실 전원')
  await click('R-01 / 객실 중계기')
  await close()
  await act('train-central-door')
  await resume3d()
  await act('train-front-door')
  await resume3d()
  assert.equal(await evaluate("document.querySelector('canvas').dataset.npcCount"), '0')
  await inspect('train-stop')
  assert.match(await evaluate('document.body.innerText'), /연결 오류/)
  await close()
  await inspect('train-cab')
  await resume3d()
  assert.equal((await state()).area, 'trainFront')
  await act('train-central-door')
  await resume3d()
  await act('train-rear-door')
  await resume3d()
  await inspect('train-devices')
  await click('R-01 / 객실 중계기')
  await click('X-09 / 외부 송신기')
  const interrupted = await state()
  assert.equal(interrupted.chapter4.interruption, 'interrupted')
  await restore(interrupted)
  await finish()
  assert.equal((await state()).messages.filter((m) => m.text === '지금 뭘 끊었어요?').length, 1)
  await shot('03-rear-restored')
  await act('train-central-door')
  await resume3d()
  await act('train-front-door')
  await resume3d()
  await inspect('train-stop')
  await click('신호 동기화 시작')
  const active = await state()
  await hold('w', 200)
  assert.deepEqual((await state()).position, active.position)
  await restore(active)
  await click('이 신호에 맞추기')
  await click('이 신호에 맞추기')
  assert.ok((await state()).chapter4.failures >= 2)
  await click('느린 신호 보조 켜기')
  await shot('04-sync-retry')
  for (let i = 0; i < 220; i++) {
    const marker = await evaluate(
      "+document.querySelector('.sync-track').getAttribute('aria-valuenow')",
    )
    if (marker >= 38 && marker <= 60) break
    await wait(40)
  }
  await click('이 신호에 맞추기')
  assert.equal((await state()).chapter4.sync, 'accepted')
  await finish()
  assert.equal((await state()).chapter4.arrived, true)
  await shot('05-front-arrived')
  await act('train-central-door')
  await resume3d()
  assert.equal(await evaluate("document.querySelector('canvas').dataset.doorOpen"), 'true')
  const stopped = await evaluate("+document.querySelector('canvas').dataset.travel")
  await wait(350)
  assert.equal(await evaluate("+document.querySelector('canvas').dataset.travel"), stopped)
  await act('train-exit')
  await advanceAll()
  assert.equal((await state()).chapter4.entryPrompt, true)
  await shot('06-mullae-confirm')
  const arrival = await state()
  await restore(arrival)
  assert.equal(
    (await state()).messages.filter((m) => m.text === '거기서는 안내방송에 대답하지 마세요.')
      .length,
    1,
  )
  await click('진입 승인 · 챕터 4 완료')
  assert.equal((await state()).chapter4.completed, true)
  const completed = await state()
  await restore(completed)
  await click('챕터 5 · 대답 없는 승강장 시작')
  await click('기본 이름')
  await advanceAll()
  assert.equal((await state()).area, 'moonPlatform')
  assert.equal(await evaluate("!!document.querySelector('.first-person')"), true)
  await shot('07-chapter5-existing-2d')
  // Non-companion legacy checkpoint retains chapter progress, starts at a safe camera location.
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  await restore({
    ...central,
    view3d: null,
    position: { x: 200, y: 230 },
    chapter3: { ...central.chapter3, npcBoarded: false, npc: 'waiting' },
  })
  assert.deepEqual((await state()).position, { x: 450, y: 420 })
  assert.equal(await evaluate("document.querySelector('canvas').dataset.npcCount"), '0')
  const bounds = await evaluate(
    "(()=>{const r=document.querySelector('.first-person canvas').getBoundingClientRect();return {height:r.height,width:r.width}})()",
  )
  assert.ok(bounds.height >= 842, JSON.stringify(bounds))
  const start = (await state()).position
  const p = await evaluate(
    "(()=>{const r=document.querySelector('.joystick').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()",
  )
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x + 28, y: p.y, id: 1 }],
  })
  await wait(300)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(450)
  assert.notDeepEqual((await state()).position, start)
  await shot('08-central-mobile')
  await trustedClick('[aria-label="조작 도움말"]')
  const paused = (await state()).position
  await hold('w', 200)
  assert.deepEqual((await state()).position, paused)
  await close()
  assert.equal(await evaluate("document.querySelector('.world-controls').style.visibility"), '')
  console.log(
    'PASS chapter 4 3D: continuous chapter 3 car, all areas/evidence, company/solo, power/relay recovery, suspicion once/reload, sync retry/assist/reload, arrival/exit/confirmation/chapter 5, legacy/3D saves, mobile and no AI.',
  )
}
