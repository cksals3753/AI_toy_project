import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const chapter5Dir = process.env.FACILITY_REGRESSION_ROOT
  ? `${process.env.FACILITY_REGRESSION_ROOT}/chapter5`
  : 'docs/chapter5-3d'

export const verifyChapter5Three = async ({
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
  await mkdir(chapter5Dir, { recursive: true })
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`${chapter5Dir}/${name}.png`, Buffer.from(data, 'base64'))
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
  const select = async (label, value) => {
    await evaluate(
      `(()=>{const e=document.querySelector('select[aria-label="${label}"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await wait(100)
  }
  const resumeSave = async () => {
    const s = await state()
    await restore(s)
    assert.deepEqual((await state()).chapter5, s.chapter5)
    assert.equal((await state()).messages.length, s.messages.length)
    if (s.view3d?.area === s.area) {
      assert.deepEqual((await state()).view3d, s.view3d)
      assert.deepEqual((await state()).position, s.position)
    }
  }
  const base = await evaluate(
    `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,stage:'explore',area:'trainB',scene:[],chapter2:{...s.chapter2,completed:true},chapter3:{...s.chapter3,started:true,npc:'helped',approved:true,signal:'green',doorOpen:true,boarded:true,escaped:true,ending:'complete'},chapter4:{...s.chapter4,started:true,sync:'accepted',arrived:true,links:{relay:true,external:false,power:true}},clues:['train-phone','train-devices','train-route'],position:{x:450,y:420}}})()`,
  )
  if (process.env.FIRST_PERSON_CHECK === 'chapter5-visual') {
    const views = [
      ['10-arrival', 'moonPlatform', { x: 450, y: 420 }, 0, 0, 'undecided', 'pending', false],
      ['06-shoes', 'moonPlatform', { x: 300, y: 370 }, 0, -0.8, 'silent', 'pending', false],
      [
        '07-shutter-closed',
        'moonHolding',
        { x: 470, y: 450 },
        Math.PI,
        0,
        'answered',
        'active',
        false,
      ],
      [
        '08-shutter-open',
        'moonHolding',
        { x: 470, y: 450 },
        Math.PI,
        0,
        'answered',
        'cancelled',
        false,
      ],
      ['09-maintenance-open', 'moonPlatform', { x: 200, y: 420 }, 2.59, 0, 'silent', 'held', true],
    ]
    for (const [name, area, p, yaw, pitch, response, registration, opened] of views) {
      const checkpoint = await evaluate(
        `(async()=>{const {makeView3d}=await import('/src/game/view3d.ts');const base=${JSON.stringify(base)};return {...base,area:${JSON.stringify(area)},position:${JSON.stringify(p)},view3d:makeView3d(${JSON.stringify(area)},${JSON.stringify(p)},${yaw},${pitch}),chapter3:{...base.chapter3,npcBoarded:true},chapter4:{...base.chapter4,doorSeen:true,completed:true},chapter5:{...base.chapter5,started:true,displayName:'한결',response:${JSON.stringify(response)},registration:${JSON.stringify(registration)},matched:${opened},externalPaused:${opened},routeOpen:${opened}}}})()`,
      )
      await restore(checkpoint)
      await resume3d()
      await wait(200)
      await shot(name)
      assert.equal(await evaluate("document.querySelectorAll('.first-person canvas').length"), 1)
    }
    console.log(
      'PASS chapter 5 fixed visual checkpoints: shoes, shutter closed/open and maintenance opening.',
    )
    return
  }
  let platform
  for (const companion of [false, true])
    for (const response of ['silent', 'answered']) {
      await restore({
        ...base,
        chapter3: {
          ...base.chapter3,
          npcBoarded: companion,
          npc: companion ? 'helped' : 'waiting',
        },
      })
      await act('train-exit')
      await advanceAll()
      await click('진입 승인 · 챕터 4 완료')
      await click('챕터 5 · 대답 없는 승강장 시작')
      await click('기본 이름')
      await advanceAll()
      await resume3d()
      assert.equal((await state()).area, 'moonPlatform')
      assert.equal(
        await evaluate("document.querySelector('canvas').dataset.npcCount"),
        companion ? '1' : '0',
      )
      await shot(`01-platform-${response}-${companion}`)
      platform = await state()
      // E and advancing sensor text must never count as a response.
      await inspect('moon-sensor')
      assert.equal((await state()).chapter5.response, 'undecided')
      assert.equal(
        await evaluate(
          "[...document.querySelectorAll('button')].find(e=>e.textContent.includes('경고를 확인했으며')).disabled",
        ),
        true,
      )
      await close()
      for (const id of ['moon-warning', 'moon-shoes', 'moon-window', 'moon-broadcast'])
        await inspect(id)
      assert.equal((await state()).chapter5.response, 'undecided')
      assert.equal((await state()).clues.includes('moon-active-record'), false)
      await inspect('moon-sensor')
      await click(response === 'answered' ? '경고를 확인했으며 대답한다' : '응답하지 않는다')
      await advanceAll()
      await resumeSave()
      await resume3d()
      assert.equal((await state()).chapter5.response, response)
      if (response === 'answered') {
        assert.equal((await state()).area, 'moonHolding')
        assert.equal(await evaluate("document.querySelector('canvas').dataset.doorOpen"), 'false')
        assert.equal(
          await evaluate("document.querySelector('canvas').dataset.npcCount"),
          companion ? '1' : '0',
        )
        await act('moon-platform-door')
        assert.equal((await state()).area, 'moonHolding')
        for (const id of ['moon-active-record', 'moon-cancel-note']) await inspect(id)
        await act('moon-cancel-device')
        await select('등록 건 선택', 'REG-409')
        await click('활성 등록 취소')
        assert.equal((await state()).chapter5.registration, 'active')
        await select('등록 건 선택', 'REG-410')
        await click('활성 등록 취소')
        await advanceAll()
        await resumeSave()
        await resume3d()
        assert.equal(await evaluate("document.querySelector('canvas').dataset.doorOpen"), 'true')
        await shot(`02-holding-released-${companion}`)
        await act('moon-platform-door')
        await resume3d()
      }
      await act('moon-booth-door')
      await resume3d()
      for (const id of ['moon-playback', 'moon-receipt', 'moon-attachment']) await inspect(id)
      await act('moon-terminal')
      await select('등록 건 선택', 'REG-411')
      await click('등록 건·첨부 원본 대조')
      assert.equal((await state()).chapter5.matched, false)
      await select('등록 건 선택', 'REG-410')
      await click('등록 건·첨부 원본 대조')
      assert.equal((await state()).chapter5.matched, true)
      await click(response === 'answered' ? '취소된 등록의 외부 유도 보류' : '미확인 등록 보류')
      assert.equal((await state()).chapter5.externalPaused, true)
      assert.equal((await state()).chapter5.routeOpen, false)
      await shot(`03-registration-${response}-${companion}`)
      await close()
      await resumeSave()
      await act('moon-platform-door')
      await resume3d()
      await act('moon-maintenance')
      await select('통행 문', 'D-02')
      await select('승인 방식', 'local')
      await click('현장 통행 조건 대조')
      assert.equal((await state()).chapter5.routeOpen, false)
      await close()
      await inspect('moon-route')
      await act('moon-maintenance')
      await select('통행 문', 'D-03')
      await select('승인 방식', 'remote')
      await click('현장 통행 조건 대조')
      assert.equal((await state()).chapter5.routeOpen, false)
      await select('통행 문', 'D-02')
      await select('승인 방식', 'local')
      await click('현장 통행 조건 대조')
      assert.equal((await state()).chapter5.routeOpen, true)
      await click('열린 정비 통로 앞에서 이동 확인')
      await advanceAll()
      await resumeSave()
      await shot(`04-exit-${response}-${companion}`)
      await click('정비 통로 이동 승인 · 챕터 5 완료')
      await resumeSave()
      assert.equal((await state()).chapter5.completed, true)
      // Existing completion action connects to chapter 6, which remains 2D.
      await click('챕터 6')
      await advanceAll()
      assert.equal((await state()).area, 'maintenance')
      assert.equal(await evaluate("!!document.querySelector('.first-person')"), true)
      console.log(
        `PASS chapter 5 3D: ${response}, companion=${companion}, warnings/explicit choice, recovery, matching retry, route proof, saves and chapter 6`,
      )
    }
  await restore({ ...platform, view3d: null, position: { x: 145, y: 220 } })
  await resume3d()
  assert.deepEqual((await state()).position, { x: 450, y: 420 })
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
  await restore({ ...platform, view3d: null })
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
  await shot('05-mobile')
  await trustedClick('[aria-label="조작 도움말"]')
  const paused = (await state()).position
  await hold('w', 200)
  assert.deepEqual((await state()).position, paused)
  await close()
  assert.equal(await evaluate("document.querySelector('.world-controls').style.visibility"), '')
  console.log('PASS chapter 5 PC menus, legacy safe recovery and mobile touch/menu/full viewport')
}
