import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const chapter3Dir = process.env.FACILITY_REGRESSION_ROOT
  ? `${process.env.FACILITY_REGRESSION_ROOT}/chapter3`
  : 'docs/chapter3-3d'
export const verifyChapter3Three = async ({
  send,
  evaluate,
  click,
  close,
  state,
  advanceAll,
  wait,
  approach,
  pressE,
  resume3d,
  look,
  hold,
}) => {
  await mkdir(chapter3Dir, { recursive: true })
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`${chapter3Dir}/${name}.png`, Buffer.from(data, 'base64'))
  }
  const restore = async (checkpoint) => {
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(checkpoint))})`,
    })
    await send('Page.reload')
    await wait(1100)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    await wait(200)
  }
  const act = async (id) => {
    await resume3d()
    await approach(id)
    await pressE(true)
  }
  const finish = async () => {
    await advanceAll()
    await resume3d()
  }
  const base = await evaluate(
    `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,stage:'explore',area:'stairs',scene:[],sceneIndex:0,chapter2:{...s.chapter2,started:true,completed:true,power:['lights','gate']},view3d:null}})()`,
  )
  await restore(base)
  await act('next-chapter')
  await finish()
  assert.equal((await state()).area, 'platform')
  assert.equal(await evaluate("!!document.querySelector('.first-person')"), true)
  await look(-1.45, 0)
  await shot('01-platform-desktop')
  const key = async (code, key) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key })
    await wait(100)
  }
  await key('Tab', 'Tab')
  assert.equal(await evaluate("!!document.querySelector('.overlay-panel')"), true)
  const menuPosition = (await state()).position
  await hold('w', 250)
  assert.deepEqual((await state()).position, menuPosition)
  await key('Escape', 'Escape')
  await resume3d()
  await key('KeyI', 'i')
  assert.equal(await evaluate("!!document.querySelector('.overlay-panel')"), true)
  await key('Escape', 'Escape')
  await resume3d()
  const fresh = await state()
  await act('survivor')
  await advanceAll()
  await click('부축해 승강장 의자까지 데려간다')
  await finish()
  assert.equal((await state()).chapter3.npc, 'helped')
  await approach('survivor')
  await shot('07-survivor')
  await act('train-a')
  await advanceAll()
  await click('A-17 내부 조사')
  await finish()
  assert.equal((await state()).area, 'trainA')
  await act('train-a-stop')
  await finish()
  await shot('02-train-a')
  await act('exit-a')
  await finish()
  assert.equal((await state()).area, 'platform')
  for (const id of ['train-b', 'platform-record', 'platform-signal']) {
    await act(id)
    await advanceAll()
    if (await evaluate("!!document.querySelector('.overlay-panel')")) await close()
    await resume3d()
  }
  const evidence = await state()
  assert.ok(
    ['train-a', 'train-b', 'platform-record', 'platform-signal'].every((id) =>
      evidence.clues.includes(id),
    ),
    JSON.stringify(evidence.clues),
  )
  await act('approval')
  await evaluate(
    "(()=>{const e=document.querySelector('#vehicle');e.value='A-17';e.dispatchEvent(new Event('change',{bubbles:true}));const t=document.querySelector('#track');t.value='△-1';t.dispatchEvent(new Event('change',{bubbles:true}))})()",
  )
  await click('기록 대조 · 승인 요청')
  assert.equal((await state()).chapter3.approved, false)
  await evaluate(
    "(()=>{const e=document.querySelector('#vehicle');e.value='B-04';e.dispatchEvent(new Event('change',{bubbles:true}));const t=document.querySelector('#track');t.value='◇-2';t.dispatchEvent(new Event('change',{bubbles:true}))})()",
  )
  await click('기록 대조 · 승인 요청')
  await wait(1600)
  assert.equal((await state()).chapter3.approved, true, JSON.stringify(await state()))
  await close()
  await act('call-b')
  await finish()
  assert.equal((await state()).chapter3.doorOpen, true)
  await look(Math.PI, 0)
  await shot('03-approved-platform')
  const approved = await state()
  await restore(approved)
  await resume3d()
  assert.equal((await state()).chapter3.doorOpen, true)
  await act('front-b')
  await click('최종 확인 · 탑승하고 출발')
  await advanceAll()
  await wait(300)
  assert.equal((await state()).area, 'trainB')
  assert.equal((await state()).chapter3.npcBoarded, true)
  await shot('04-boarded')
  await click('챕터 4 · 정차하지 않는 열차 시작')
  await advanceAll()
  assert.equal((await state()).chapter4.started, true)
  assert.equal(await evaluate("!!document.querySelector('.first-person')"), true)
  await shot('05-chapter4-3d')
  // A separate legacy checkpoint covers the non-help and later invitation branch.
  await restore({ ...fresh, view3d: null, position: { x: 880, y: 520 } })
  await resume3d()
  assert.deepEqual((await state()).position, { x: 140, y: 240 })
  await act('survivor')
  await advanceAll()
  await click('위치와 대피 방향을 알려주고 먼저 조사한다')
  await finish()
  assert.equal((await state()).chapter3.npc, 'directed')
  await act('survivor')
  await click('함께 탑승하자고 제안한다')
  await finish()
  assert.equal((await state()).chapter3.npc, 'invited')
  await restore({ ...approved, chapter3: { ...approved.chapter3, npc: 'waiting' } })
  await act('front-b')
  await click('최종 확인 · 탑승하고 출발')
  await advanceAll()
  assert.equal((await state()).chapter3.npcBoarded, false)
  await click('챕터 4 · 정차하지 않는 열차 시작')
  await advanceAll()
  assert.equal((await state()).chapter4.started, true)
  assert.equal(await evaluate("!!document.querySelector('.first-person')"), true)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  await restore({ ...approved, view3d: null })
  await wait(400)
  assert.equal(await evaluate("document.querySelector('.interaction button').disabled"), true)
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true)
  const start = (await state()).position
  const p = await evaluate(
    "(()=>{const r=document.querySelector('[data-move-zone]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()",
  )
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  })
  await send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: p.x + 28, y: p.y, id: 1 }],
  })
  await wait(350)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(450)
  assert.notDeepEqual((await state()).position, start)
  const bounds = await evaluate(
    "(()=>{const r=document.querySelector('.first-person canvas').getBoundingClientRect();return {width:r.width,height:r.height}})()",
  )
  assert.ok(bounds.height >= 842, JSON.stringify(bounds))
  await shot('06-platform-mobile')
  await evaluate('document.querySelector(\'[aria-label="조작 도움말"]\').click()')
  await wait(100)
  const paused = (await state()).position
  await wait(400)
  assert.deepEqual((await state()).position, paused)
  await close()
  assert.equal(await evaluate("document.querySelector('.world-controls').style.visibility"), '')
  console.log(
    'Chapter 3 3D: entry, evidence, survivor/help/invite/wait, A return, approval wrong/correct, doors, boarding and saves passed.',
  )
}
