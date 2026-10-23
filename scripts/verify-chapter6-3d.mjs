import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

export const verifyChapter6Three = async ({
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
  await mkdir('docs/chapter6-3d', { recursive: true })
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`docs/chapter6-3d/${name}.png`, Buffer.from(data, 'base64'))
  }
  const restore = async (checkpoint) => {
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(checkpoint))})`,
    })
    await send('Page.reload')
    await wait(1100)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    await wait(120)
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
  const inspect = async (id) => {
    await act(id)
    await advanceAll()
  }
  const select = async (id, value) => {
    await evaluate(
      `(()=>{const e=document.querySelector('#${id}');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await wait(100)
  }
  const resumeSave = async () => {
    const s = await state()
    await restore(s)
    const r = await state()
    assert.deepEqual(r.chapter6, s.chapter6)
    assert.equal(r.messages.length, s.messages.length)
    if (s.view3d?.area === s.area) {
      assert.deepEqual(r.view3d, s.view3d)
      assert.deepEqual(r.position, s.position)
    }
  }
  const base = await evaluate(
    `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,stage:'explore',area:'moonPlatform',scene:[],health:1,battery:0,inventory:[],clues:[],chapter2:{...s.chapter2,completed:true},chapter3:{...s.chapter3,started:true,npc:'helped',approved:true,signal:'green',doorOpen:true,boarded:true,escaped:true,ending:'complete'},chapter4:{...s.chapter4,started:true,sync:'accepted',arrived:true,doorSeen:true,completed:true},chapter5:{...s.chapter5,started:true,displayName:'한결',response:'silent',registration:'held',matched:true,externalPaused:true,routeOpen:true,exitSeen:true,completed:true}}})()`,
  )
  if (process.env.FIRST_PERSON_CHECK === 'chapter6-visual') {
    const views = [
      ['10-branch-room', 'maintenance', { x: 470, y: 430 }, 0, 0, null, false, false],
      ['11-recovery-water', 'recovery', { x: 450, y: 450 }, 0, -0.1, 'automatic', false, false],
      ['12-open-hatch', 'recovery', { x: 190, y: 445 }, 0, 0, 'automatic', true, true],
      ['13-shelter-front', 'shelter', { x: 450, y: 450 }, 0, 0, 'manual', false, false],
      ['14-shelter-side', 'shelter', { x: 160, y: 450 }, -0.5, 0, 'automatic', true, true],
    ]
    for (const [name, area, p, yaw, pitch, route, drained, boltOpen] of views) {
      const checkpoint = await evaluate(
        `(async()=>{const {makeView3d}=await import('/src/game/view3d.ts');const base=${JSON.stringify(base)};return {...base,area:${JSON.stringify(area)},position:${JSON.stringify(p)},view3d:makeView3d(${JSON.stringify(area)},${JSON.stringify(p)},${yaw},${pitch}),chapter3:{...base.chapter3,npcBoarded:true},chapter6:{...base.chapter6,started:true,route:${JSON.stringify(route)},drained:${drained},boltOpen:${boltOpen}}}})()`,
      )
      await restore(checkpoint)
      await resume3d()
      await wait(200)
      assert.equal(await evaluate("document.querySelectorAll('.first-person canvas').length"), 1)
      await shot(name)
    }
    console.log(
      'PASS chapter 6 visual checkpoints: branch room, recovery water, hatch, shelter front/side',
    )
    return
  }
  let maintenance, recovery
  for (const companion of [false, true])
    for (const automatic of [false, true]) {
      const input = {
        ...base,
        chapter3: {
          ...base.chapter3,
          npcBoarded: companion,
          npc: companion ? (automatic ? 'invited' : 'helped') : 'waiting',
        },
        chapter5: {
          ...base.chapter5,
          response: automatic ? 'answered' : 'silent',
          registration: automatic ? 'cancelled' : 'held',
        },
      }
      await restore(input)
      await act('moon-maintenance')
      await advanceAll()
      await resume3d()
      assert.equal((await state()).area, 'maintenance')
      maintenance = await state()
      assert.equal(
        await evaluate("document.querySelector('canvas').dataset.npcCount"),
        companion ? '1' : '0',
      )
      await shot(`01-maintenance-${automatic}-${companion}`)
      await inspect('final-map')
      await inspect('final-manual')
      await act('final-review')
      assert.doesNotMatch(
        await evaluate('document.querySelector(".overlay-panel").innerText'),
        /오반장이 제출|진짜 조력자/,
      )
      await close()
      await act('final-control')
      await select('final-mode', 'remote')
      await click('장치 설정 대조')
      assert.equal((await state()).chapter6.settings, null)
      await select('final-door', automatic ? 'G-01' : 'S-01')
      await select('final-mode', automatic ? 'remote' : 'local')
      await click('장치 설정 대조')
      assert.equal((await state()).area, 'maintenance')
      await close()
      await resumeSave()
      await act('final-control')
      await select('final-door', automatic ? 'G-01' : 'S-01')
      await select('final-mode', automatic ? 'remote' : 'local')
      await click('이동 전 근거 확인')
      assert.match(
        await evaluate('document.querySelector(".overlay-panel").innerText'),
        automatic ? /지하 등록 확인 구역/ : /지상 대피소 정문/,
      )
      await shot(`02-confirm-${automatic}-${companion}`)
      await click('이 경로로 이동 확정')
      await advanceAll()
      await resumeSave()
      await resume3d()
      if (automatic) {
        recovery = await state()
        assert.equal(recovery.area, 'recovery')
        await inspect('recovery-sealed')
        assert.equal((await state()).area, 'recovery')
        await act('recovery-hatch')
        assert.equal((await state()).area, 'recovery')
        await act('recovery-bolt')
        assert.equal((await state()).chapter6.boltOpen, false)
        await act('recovery-valve')
        assert.equal((await state()).chapter6.drained, false)
        await inspect('recovery-note')
        await inspect('recovery-water')
        await act('recovery-valve')
        await advanceAll()
        await resumeSave()
        await resume3d()
        assert.equal((await state()).chapter6.drained, true)
        await shot(`03-drained-${companion}`)
        await act('recovery-bolt')
        await advanceAll()
        await resumeSave()
        await resume3d()
        assert.equal((await state()).chapter6.boltOpen, true)
        await shot(`04-hatch-open-${companion}`)
        await act('recovery-hatch')
        await advanceAll()
        await resume3d()
      }
      assert.equal((await state()).area, 'shelter')
      assert.equal((await state()).chapter6.completed, false)
      assert.deepEqual(
        (await state()).position,
        automatic ? { x: 160, y: 450 } : { x: 450, y: 450 },
      )
      assert.equal(
        await evaluate("document.querySelector('canvas').dataset.npcCount"),
        companion ? '1' : '0',
      )
      await shot(`05-shelter-${automatic}-${companion}`)
      await act('shelter-arrival')
      assert.equal((await state()).chapter6.completed, false)
      await inspect('shelter-sign')
      await resumeSave()
      await act('shelter-arrival')
      await wait(200)
      const result = (await state()).chapter6.result
      assert.ok(result)
      assert.equal(result.health, 1)
      assert.equal(result.battery, 0)
      assert.deepEqual(result.inventory, [])
      assert.equal(result.npcTogether, companion)
      assert.equal(result.route, automatic ? 'automatic' : 'manual')
      await shot(`06-result-${automatic}-${companion}`)
      await resumeSave()
      assert.deepEqual((await state()).chapter6.result, result)
      await close()
      await click('저장된 결과 보기')
      await close()
      await act('shelter-arrival')
      assert.deepEqual((await state()).chapter6.result, result)
      console.log(
        `PASS chapter 6 3D ${automatic ? 'automatic/recovery' : 'manual'}, companion=${companion}: low resources, missing optional clues, ordered devices/retry, arrival confirmation, frozen result/resume`,
      )
    }
  await restore({ ...maintenance, view3d: null, position: { x: 350, y: 280 } })
  await resume3d()
  assert.deepEqual((await state()).position, { x: 450, y: 450 })
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
    const before = (await state()).position
    await hold('w', 200)
    assert.deepEqual((await state()).position, before)
    await key('Escape', 'Escape')
    await resume3d()
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  await restore({ ...recovery, view3d: null })
  const before = (await state()).position
  const p = await evaluate(
    "(()=>{const r=document.querySelector('[data-move-zone]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()",
  )
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  })
  await send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: p.x + 28, y: p.y, id: 1 }],
  })
  await wait(300)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(450)
  assert.notDeepEqual((await state()).position, before)
  assert.ok(await evaluate("document.querySelector('canvas').getBoundingClientRect().height>=842"))
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false)
  await shot('07-recovery-mobile')
  await trustedClick('[aria-label="조작 도움말"]')
  const paused = (await state()).position
  await hold('w', 200)
  assert.deepEqual((await state()).position, paused)
  await close()
  assert.equal(await evaluate("document.querySelector('.world-controls').style.visibility"), '')
  console.log('PASS chapter 6 PC menu/resume, legacy safe spawn and mobile controls/full viewport')
}
