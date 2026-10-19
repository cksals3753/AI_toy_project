import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
export const verifyChapter2Three = async ({
  send,
  evaluate,
  click,
  close,
  state,
  advanceAll,
  hold,
  wait,
  look,
  approach,
  pressE,
  trustedClick,
  resume3d,
}) => {
  const dir = 'docs/chapter2-3d'
  await mkdir(dir, { recursive: true })
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`${dir}/${name}.png`, Buffer.from(data, 'base64'))
  }
  const restore = async (checkpoint) => {
    const injected = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(checkpoint))})`,
    })
    await send('Page.reload')
    await wait(1000)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier })
    await state()
    await wait(200)
  }
  const resume = async () => {
    await resume3d()
    assert.equal(await evaluate("document.querySelectorAll('.first-person canvas').length"), 1)
  }
  const act = async (id) => {
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
    await resume()
  }
  const power = async (name) => {
    await click(name)
    await wait(100)
  }
  const listeners = async () => {
    const r = await send('Runtime.evaluate', {
      expression:
        "JSON.stringify(Object.fromEntries(['keydown','keyup','mousemove','blur'].map(k=>[k,(getEventListeners(window)[k]??[]).length])))",
      returnByValue: true,
      includeCommandLineAPI: true,
    })
    return JSON.parse(r.result.value)
  }
  await resume()
  const listenerBaseline = await listeners()
  await shot('01-hall-dark-desktop')
  assert.equal(await evaluate("document.querySelector('canvas').dataset.lightsOn"), 'false')
  // Old 2D positions are not blindly used as camera coordinates; retain all progress.
  const initial = await state(),
    legacy = { ...initial, view3d: null, position: { x: 800, y: 450 } }
  await restore(legacy)
  await resume()
  assert.deepEqual((await state()).position, { x: 470, y: 460 })
  assert.deepEqual((await state()).clues, initial.clues)
  await act('electrical')
  assert.equal((await state()).area, 'hall')
  await finish()
  for (const id of ['hall-map', 'hall-window', 'hall-gate-note', 'hall-desk']) {
    await act(id)
    assert.ok((await state()).clues.includes(id))
    await shot(`object-${id}`)
    await finish()
  }
  assert.ok((await state()).inventory.includes('전기실 열쇠'))
  const beforeDanger = await state()
  await act('staff')
  await click('직원 통로 진입')
  await click('회피 시작')
  await click('몸 빼기')
  assert.equal((await state()).chapter2.staffEvent, 'failed')
  assert.equal((await state()).health, beforeDanger.health - 20)
  await finish()
  const failed = await state()
  await restore(failed)
  await resume()
  assert.equal((await state()).health, failed.health)
  await shot('02-staff-recovery')
  // Independent success branch from the same real pre-event checkpoint; reload active event before timing begins.
  await restore(beforeDanger)
  await resume()
  await act('staff')
  await click('직원 통로 진입')
  const active = await state()
  await restore(active)
  assert.equal((await state()).chapter2.staffEvent, 'active')
  await click('회피 시작')
  for (let i = 0; i < 150; i++) {
    const n = await evaluate(
      "+document.querySelector('.dodge-track').getAttribute('aria-valuenow')",
    )
    if (n >= 40 && n <= 58) break
    await wait(15)
  }
  await click('몸 빼기')
  assert.equal((await state()).chapter2.staffEvent, 'success')
  assert.equal((await state()).health, beforeDanger.health)
  await finish()
  await act('electrical')
  await wait(500)
  await resume()
  assert.equal((await state()).area, 'electrical')
  await act('powerboard')
  await power('개찰구')
  await close()
  await resume()
  await act('hall-return')
  await wait(500)
  await resume()
  await act('gate')
  assert.equal((await state()).area, 'hall')
  assert.match((await state()).scene[0].text, /조명/)
  await finish()
  assert.equal(await evaluate("document.querySelector('canvas').dataset.gateOpen"), 'true')
  await shot('03-gate-open-lights-off')
  await act('electrical')
  await wait(500)
  await resume()
  await act('powerboard')
  await power('방송')
  await power('조명')
  assert.deepEqual((await state()).chapter2.power, ['gate', 'broadcast'])
  assert.match((await state()).notice, /두 장치/)
  await power('방송')
  await power('조명')
  assert.deepEqual((await state()).chapter2.power, ['gate', 'lights'])
  await close()
  await resume()
  await shot('04-electrical-powered')
  const powered = await state()
  await restore(powered)
  await resume()
  assert.deepEqual((await state()).chapter2.power, ['gate', 'lights'])
  await act('hall-return')
  await wait(500)
  await resume()
  await look(0)
  await shot('05-hall-lit-desktop')
  // Transition/resource lifecycle: same number of input listeners and exactly one canvas after repeated visits.
  for (let i = 0; i < 2; i++) {
    await act('electrical')
    await wait(400)
    await resume()
    await act('hall-return')
    await wait(400)
    await resume()
  }
  assert.deepEqual(await listeners(), listenerBaseline)
  await look(0.42, -0.12)
  await wait(500)
  const saved = await state()
  await restore(saved)
  await resume()
  await wait(200)
  assert.ok(Math.abs((await state()).view3d.yaw - saved.view3d.yaw) < 0.01)
  assert.deepEqual((await state()).position, saved.position)
  // Tab/I/Esc use the common menu path and do not move the player while open.
  for (const code of ['Tab', 'KeyI']) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: code === 'Tab' ? 'Tab' : 'ㅑ',
      code,
      windowsVirtualKeyCode: code === 'Tab' ? 9 : 73,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: code === 'Tab' ? 'Tab' : 'ㅑ',
      code,
      windowsVirtualKeyCode: code === 'Tab' ? 9 : 73,
    })
    await wait(100)
    const p = (await state()).position
    await hold('w', 150)
    assert.deepEqual((await state()).position, p)
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    })
    await wait(150)
    await resume()
  }
  const hallCheckpoint = await state()
  // A required NPC asset fails: explicit bounded error, no movement, then retry with the same progress.
  await send('Network.setBlockedURLs', { urls: ['*characterMedium.fbx*'] })
  await restore(hallCheckpoint)
  await wait(500)
  assert.match(
    await evaluate("document.querySelector('.first-person').textContent"),
    /필수 인물 에셋/,
  )
  const stopped = (await state()).position
  await hold('w', 180)
  assert.deepEqual((await state()).position, stopped)
  await shot('06-loading-error')
  await send('Network.setBlockedURLs', { urls: [] })
  await click('다시 시도')
  await wait(800)
  await resume()
  assert.deepEqual((await state()).clues, hallCheckpoint.clues)
  // Mobile uses the same scene/interaction path without pointer lock.
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await restore(await state())
  await wait(250)
  if (await evaluate("!!document.querySelector('.exploration-resume')"))
    await trustedClick('.exploration-resume')
  const p = (await state()).position
  const j = await evaluate(
    "(()=>{const r=document.querySelector('.joystick').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()",
  )
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...j, id: 1 }] })
  await send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: j.x + 28, y: j.y, id: 1 }],
  })
  await wait(300)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(100)
  assert.ok(Math.hypot((await state()).position.x - p.x, (await state()).position.y - p.y) > 5)
  const yaw = +(await evaluate("document.querySelector('canvas').dataset.yaw"))
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 290, y: 400, id: 2 }],
  })
  await send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 230, y: 400, id: 2 }],
  })
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(100)
  assert.ok(Math.abs(+(await evaluate("document.querySelector('canvas').dataset.yaw")) - yaw) > 0.1)
  await trustedClick('.world-toolbar:not(.hud-utilities) button')
  await close()
  await wait(100)
  assert.equal(await evaluate('!!document.pointerLockElement'), false)
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true)
  await shot('07-hall-mobile')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await restore(hallCheckpoint)
  await resume()
  await act('gate')
  await advanceAll()
  await click('완료 기록 저장')
  await wait(300)
  await resume()
  assert.equal((await state()).area, 'stairs')
  assert.equal((await state()).chapter2.completed, true)
  await shot('08-stairs')
  const ending = await state()
  await restore(ending)
  await resume()
  assert.equal((await state()).messages.filter((m) => m.text.includes('지금 발소리')).length, 1)
  await act('next-chapter')
  await advanceAll()
  assert.equal((await state()).area, 'platform')
  assert.equal(await evaluate("!!document.querySelector('.first-person')"), true)
  await shot('09-chapter3-3d')
  console.log(
    'PASS chapter 2 3D: real first-room entry, all evidence/key, danger fail/success/reload, power retry/capacity/recording, gate/light flags, saved pose/legacy recovery, listener/canvas stability, asset retry, menus/touch, stairs → chapter 3 3D',
  )
}

// Final framing checks use valid saved checkpoints; this does not replace the full playthrough above.
export const verifyChapter2Visual = async ({
  send,
  evaluate,
  state,
  wait,
  trustedClick,
  pressE,
}) => {
  await mkdir('docs/chapter2-3d', { recursive: true })
  const capture = async (name, area, power, point, yaw = 0, pitch = 0) => {
    const fixture = await evaluate(
      `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');const {makeView3d}=await import('/src/game/view3d.ts');return {...s,stage:'explore',area:${JSON.stringify(area)},position:${JSON.stringify(point)},view3d:makeView3d(${JSON.stringify(area)},${JSON.stringify(point)},${yaw},${pitch}),chapter2:{...s.chapter2,power:${JSON.stringify(power)},completed:${area === 'stairs'},ending:${area === 'stairs' ? "'complete'" : "'none'"}}}})()`,
    )
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(fixture))})`,
    })
    await send('Page.reload')
    await wait(800)
    await state()
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    for (
      let i = 0;
      i < 70 && (await evaluate("!!document.querySelector('[data-scene-loading]')"));
      i++
    )
      await wait(100)
    if (await evaluate("!!document.querySelector('.exploration-resume')"))
      await trustedClick('.exploration-resume')
    await wait(300)
    assert.equal(await evaluate("document.querySelectorAll('.first-person canvas').length"), 1)
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true)
    const layout = await evaluate(
      "(()=>{const c=document.querySelector('canvas').getBoundingClientRect();return {width:c.width,height:c.height,vw:innerWidth,vh:innerHeight}})()",
    )
    assert.equal(layout.width, layout.vw)
    assert.equal(layout.height, layout.vh)
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`docs/chapter2-3d/${name}.png`, Buffer.from(data, 'base64'))
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await capture('10-hall-final-dark', 'hall', [], { x: 470, y: 460 })
  await capture('11-hall-final-lit', 'hall', ['gate', 'lights'], { x: 470, y: 460 })
  await capture('08-stairs', 'stairs', ['gate', 'lights'], { x: 480, y: 200 }, 0, -0.4)
  assert.equal(await evaluate("document.querySelector('.interaction button').disabled"), false)
  await pressE()
  assert.equal((await state()).area, 'platform')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 640,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await capture('12-hall-360x640', 'hall', ['gate', 'lights'], { x: 470, y: 460 })
  const bounds = await evaluate(
    "(()=>{const a=document.querySelector('.hud-objective').getBoundingClientRect();return {left:a.left,right:a.right,top:a.top,bottom:a.bottom}})()",
  )
  assert.ok(bounds.left >= 0 && bounds.right <= 360 && bounds.top >= 0 && bounds.bottom <= 640)
  console.log(
    'PASS final chapter 2 framing: same-view lights OFF/ON, descending stairs + E → 2D, 360x640 HUD, single canvas and full viewport',
  )
}
