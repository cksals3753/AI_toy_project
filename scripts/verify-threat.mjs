import assert from 'node:assert/strict'
export const verifyThreat = async ({
  send,
  evaluate,
  state,
  wait,
  look,
  click,
  close,
  advanceAll,
  resume3d,
  approach,
  pressE,
  screenshot,
}) => {
  const restore = async (point, extra = {}) => {
    const seed = await evaluate(
      `(async()=>{const {initialState}=await import('/src/game/engine.ts');const {makeView3d}=await import('/src/game/view3d.ts');return {...initialState,stage:'explore',area:'hall',health:1,battery:0,inventory:['전기실 열쇠'],clues:['hall-map'],position:${JSON.stringify(point)},view3d:makeView3d('hall',${JSON.stringify(point)}),...${JSON.stringify(extra)}}})()`,
    )
    const s = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-comfort-v1',JSON.stringify({mouseSensitivity:0.0015,touchSensitivity:0.003,fov:64,moveSpeed:0.6}));localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(seed))})`,
    })
    await send('Page.reload')
    await wait(1200)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: s.identifier })
    await state()
    await advanceAll()
    if (await evaluate('navigator.maxTouchPoints===0')) await resume3d()
  }
  const until = async (check, label, limit = 30000) => {
    for (let t = 0; t < limit; t += 150) {
      if (await check()) return
      await wait(150)
    }
    throw Error('Timed out: ' + label)
  }
  const mode = () =>
    evaluate("document.querySelector('[data-threat-status]')?.dataset.threatStatus")
  const position = () =>
    evaluate(
      "(()=>{const c=document.querySelector('canvas');return [c.dataset.threatX,c.dataset.threatY]})()",
    )
  await until(async () => (await state()).threat.roomBeat > 0, 'first impact')
  assert.match(await evaluate('document.body.textContent'), /임시 안전/)
  await screenshot('threat-first-room.png')
  await restore({ x: 710, y: 190 })
  await look(Math.PI / 2)
  await screenshot('threat-infected-walk.png')
  await until(async () => ['suspect', 'chase'].includes(await mode()), 'real detection')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' })
  await wait(150)
  assert.equal(await evaluate("!!document.querySelector('[data-game-menu=phone]')"), true)
  const before = await position(),
    beforeMode = await mode()
  await wait(1400)
  assert.equal(await mode(), beforeMode)
  if (!process.env.PRODUCTION_CHECK) assert.deepEqual(await position(), before)
  assert.equal((await state()).threat.caught, false)
  await close()
  await resume3d()
  const other = await send('Target.createTarget', { url: 'about:blank' })
  await send('Target.activateTarget', { targetId: other.targetId })
  await wait(200)
  const focusPosition = await position(),
    focusMode = await mode()
  await wait(1100)
  assert.equal(await mode(), focusMode)
  if (!process.env.PRODUCTION_CHECK) assert.deepEqual(await position(), focusPosition)
  await send('Target.closeTarget', { targetId: other.targetId })
  await send('Page.bringToFront')
  await wait(150)
  await resume3d()
  const gait = []
  await until(async () => {
    if (!process.env.PRODUCTION_CHECK)
      gait.push(await evaluate("+document.querySelector('canvas').dataset.threatGait"))
    return (await state()).threat.caught
  }, 'real capture')
  if (!process.env.PRODUCTION_CHECK)
    assert.ok(
      Math.max(...gait) - Math.min(...gait) > 0.05,
      'articulated walking poses change during real chase',
    )
  await screenshot('threat-caught.png')
  const caught = await state()
  assert.equal(caught.health, 1)
  assert.equal(caught.battery, 0)
  await click('안전 체크포인트에서 재시도')
  await advanceAll()
  await resume3d()
  const retried = await state()
  assert.equal(retried.threat.caught, false)
  assert.deepEqual(retried.inventory, caught.inventory)
  assert.deepEqual(retried.clues, caught.clues)
  assert.equal(retried.health, 1)
  assert.equal(retried.battery, 0)
  await approach('hall-map')
  await pressE()
  assert.ok((await state()).scene.length > 0)
  const readingPosition = await position(),
    readingMode = await mode()
  await wait(1000)
  assert.equal(await mode(), readingMode)
  if (!process.env.PRODUCTION_CHECK) assert.deepEqual(await position(), readingPosition)
  await advanceAll()
  await resume3d()
  await restore({ x: 710, y: 190 })
  await until(async () => (await state()).threat.caught, 'second real capture')
  await click('안전 체크포인트에서 재시도')
  await advanceAll()
  await resume3d()
  assert.equal((await state()).health, 1)
  assert.equal((await state()).battery, 0)
  await restore({ x: 710, y: 190 })
  await until(async () => (await state()).threat.alert, 'saved alert')
  await send('Page.reload')
  await wait(1200)
  const resumed = await state()
  assert.equal(resumed.threat.alert, false)
  assert.ok(resumed.scene.some((m) => m.text.includes('안전 체크포인트')))
  assert.equal(resumed.health, 1)
  await advanceAll()
  await resume3d()
  // Enter the existing safe room using real navigation/E, then configure and return.
  await approach('electrical')
  await pressE()
  await advanceAll()
  await resume3d()
  assert.equal((await state()).area, 'electrical')
  await approach('powerboard')
  await pressE()
  await click('조명')
  await click('개찰구')
  await close()
  await resume3d()
  await approach('hall-return')
  await pressE()
  await advanceAll()
  await resume3d()
  await wait(350)
  assert.equal((await state()).threat.gateHeard, true)
  await screenshot('threat-hall-gate.png')
  // Touch escape uses only the existing joystick, with the enemy active.
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  await restore({ x: 710, y: 190 })
  const initialYaw = (await state()).view3d.yaw
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 330, y: 430, id: 2 }],
  })
  await send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 305, y: 450, id: 2 }],
  })
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(550)
  assert.notEqual((await state()).view3d.yaw, initialYaw)
  const start = (await state()).position
  const p = await evaluate(
    "(()=>{const r=document.querySelector('.joystick').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()",
  )
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x + 28, y: p.y + 28, id: 1 }],
  })
  await wait(800)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(500)
  assert.notDeepEqual((await state()).position, start)
  assert.equal((await state()).threat.caught, false)
  await screenshot('threat-mobile.png')
  await evaluate(
    "document.querySelector('.first-person canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))",
  )
  await wait(600)
  assert.equal(await evaluate("!!document.querySelector('.first-person')"), false)
  assert.equal(await evaluate("!!document.querySelector('canvas[aria-label*=탑다운]')"), true)
  const flatBefore = (await state()).position
  const flat = await evaluate(
    "(()=>{const r=document.querySelector('.joystick').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()",
  )
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: flat.x - 26, y: flat.y, id: 1 }],
  })
  await wait(500)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(500)
  assert.notDeepEqual((await state()).position, flatBefore)
  await screenshot('threat-2d-mobile.png')
  // Start a controlled visible encounter; standing behind cover must not summon an enemy.
  await restore({ x: 710, y: 190 })
  await evaluate(
    "document.querySelector('.first-person canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))",
  )
  await wait(600)
  await until(async () => (await state()).threat.caught, '2D real capture', 24000)
  await screenshot('threat-2d-caught.png')
  console.log(
    'PASS threat: real detection/capture/retry, menu pause, pursuit save recovery, low resources, electrical/gate, touch evasion',
  )
}
