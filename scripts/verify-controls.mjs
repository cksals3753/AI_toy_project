import assert from 'node:assert/strict'
export const verifyControls = async ({
  send,
  evaluate,
  state,
  wait,
  advanceAll,
  resume3d,
  trustedClick,
  screenshot,
  hold,
  approach,
  pressE,
  look,
}) => {
  const restore = async (extra) => {
    const s = await evaluate(
      `(async()=>{const {initialState}=await import('/src/game/engine.ts');const extra=${JSON.stringify(extra)};return {...initialState,stage:'explore',scene:[],...extra,chapter2:{...initialState.chapter2,...extra.chapter2},chapter3:{...initialState.chapter3,...extra.chapter3},chapter4:{...initialState.chapter4,...extra.chapter4},chapter5:{...initialState.chapter5,...extra.chapter5},chapter6:{...initialState.chapter6,...extra.chapter6}}})()`,
    )
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(s))})`,
    })
    await send('Page.reload')
    await wait(1300)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    await advanceAll()
  }
  const button = async (text) => {
    await evaluate(
      `(()=>{const b=[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!b)throw Error('button '+${JSON.stringify(text)});b.dataset.testButton='true';b.scrollIntoView({block:'center'})})()`,
    )
    await trustedClick('[data-test-button]')
    await evaluate(
      "document.querySelector('[data-test-button]')?.removeAttribute('data-test-button')",
    )
  }
  const escape = async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
    await wait(150)
  }
  const noDialog = async () =>
    assert.equal(await evaluate("!!document.querySelector('[role=dialog]')"), false)
  const dismiss = async () => {
    await button('닫기 · 돌아가기')
    await noDialog()
  }
  const chapter3 = {
    started: true,
    npc: 'helped',
    approved: true,
    signal: 'green',
    doorOpen: true,
    boarded: true,
    npcBoarded: true,
    escaped: true,
    ending: 'complete',
  }
  if (!process.env.CONTROLS_TOUCH_ONLY) {
    await restore({
      area: 'trainB',
      chapter3,
      chapter4: {
        started: true,
        links: { power: true, relay: true, external: false },
        sync: 'active',
      },
    })
    // Wait for an actually incorrect timing; never manufacture a marker or success.
    for (let i = 0; i < 150; i++) {
      if (await evaluate("+document.querySelector('.sync-track').getAttribute('aria-valuenow')<10"))
        break
      await wait(30)
    }
    await evaluate(
      "document.querySelector('.sync-track').closest('[role=dialog]').querySelector('.primary').focus();document.querySelector('.sync-track').closest('[role=dialog]').querySelector('.primary').click()",
    )
    await wait(180)
    assert.equal((await state()).chapter4.failures, 1)
    assert.match(await evaluate('document.activeElement?.textContent'), /이 신호에 맞추기/)
    await button('중단하고 패널로 돌아가기')
    assert.equal((await state()).chapter4.sync, 'idle')
    await noDialog()
    await resume3d()
    console.log('PASS modal: sync failure stays readable, bottom cancels without success')
    for (const scenario of [
      {
        extra: {
          area: 'first',
          clues: ['map', 'panel', 'cabinet'],
          asked: ['water'],
          route: 'west',
          stage: 'lock',
          position: { x: 95, y: 265 },
        },
        target: null,
        field: 'stage',
        value: 'lock',
      },
      {
        extra: { area: 'electrical', inventory: ['전기실 열쇠'] },
        target: 'powerboard',
        field: 'chapter2',
        value: null,
      },
      {
        extra: { area: 'platform', chapter3: { started: true, npc: 'helped' } },
        target: 'approval',
        field: 'chapter3',
        value: null,
      },
      {
        extra: {
          area: 'moonPlatform',
          chapter3,
          chapter4: {
            started: true,
            sync: 'accepted',
            arrived: true,
            doorSeen: true,
            completed: true,
          },
          chapter5: { started: true, displayName: '한결' },
        },
        target: 'moon-maintenance',
        field: 'chapter5',
        value: null,
      },
      {
        extra: {
          area: 'maintenance',
          chapter3,
          chapter4: {
            started: true,
            sync: 'accepted',
            arrived: true,
            doorSeen: true,
            completed: true,
          },
          chapter5: {
            started: true,
            displayName: '한결',
            response: 'silent',
            registration: 'held',
            matched: true,
            externalPaused: true,
            routeOpen: true,
            exitSeen: true,
            completed: true,
          },
          chapter6: { started: true },
        },
        target: 'final-control',
        field: 'chapter6',
        value: null,
      },
    ]) {
      await restore(scenario.extra)
      if (scenario.target) {
        await resume3d()
        await approach(scenario.target)
        await pressE()
      }
      const before = (await state())[scenario.field]
      const title = await evaluate(
        "document.querySelector('[role=dialog]')?.getAttribute('aria-label')",
      )
      if (scenario.target === 'powerboard') await button('설정 유지하고 탐색 계속')
      else await dismiss()
      await noDialog()
      assert.deepEqual((await state())[scenario.field], before)
      await resume3d()
      if (scenario.target) {
        await pressE()
        await evaluate("document.querySelector('.close-button').focus()")
        await escape()
        await noDialog()
        assert.deepEqual((await state())[scenario.field], before)
      }
      if (scenario.target === 'final-control') {
        await resume3d()
        await pressE()
        await button('장치 설정 대조·저장')
        assert.match(
          await evaluate("document.querySelector('[role=dialog]').textContent"),
          /먼저 조사/,
        )
        await dismiss()
        assert.equal((await state()).chapter6.route, null)
        await resume3d()
        for (const id of ['final-map', 'final-manual']) {
          await approach(id)
          await pressE()
          await advanceAll()
          await resume3d()
        }
        await approach('final-control')
        await pressE()
        await button('장치 설정 대조·저장')
        await button('이동 전 근거 확인')
        await button('설정으로 돌아가기')
        assert.equal(
          await evaluate("document.querySelector('[role=dialog]').getAttribute('aria-label')"),
          '정비 통로 · 경로 제어반',
        )
        assert.equal((await state()).chapter6.route, null)
        await button('이동 전 근거 확인')
        await escape()
        assert.equal(
          await evaluate("document.querySelector('[role=dialog]').getAttribute('aria-label')"),
          '정비 통로 · 경로 제어반',
        )
        await dismiss()
        assert.equal((await state()).chapter6.route, null)
      }
      console.log('PASS modal bottom/Escape parity:', title)
    }
  }
  await restore({ area: 'first', position: { x: 480, y: 450 } })
  await resume3d()
  await look(0)
  await hold('d', 150)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 3 })
  await restore({ area: 'first', position: { x: 480, y: 450 } })
  const touch = (type, points) => send('Input.dispatchTouchEvent', { type, touchPoints: points })
  const pos = async () => {
    await wait(400)
    return (await state()).position
  }
  const yaw = async () => {
    if (process.env.PRODUCTION_CHECK) await wait(400)
    return evaluate(
      process.env.PRODUCTION_CHECK
        ? "JSON.parse(localStorage.getItem('last-transfer-save-v1')).view3d.yaw"
        : "+document.querySelector('canvas').dataset.yaw",
    )
  }
  assert.equal(await evaluate("!!document.querySelector('.joystick')"), false)
  const still = await pos()
  await touch('touchStart', [{ x: 80, y: 220, id: 1 }])
  await wait(300)
  await touch('touchEnd', [])
  assert.deepEqual(await pos(), still, 'upper-left must not move')
  await touch('touchStart', [{ x: 4, y: 835, id: 1 }])
  await wait(80)
  const ring = await evaluate(
    "(()=>{const r=document.querySelector('.joystick').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()",
  )
  assert.ok(ring.left >= 0 && ring.right <= 195 && ring.bottom <= 844)
  assert.deepEqual(await pos(), still, 'initial contact is neutral even with edge clamping')
  await touch('touchCancel', [])
  assert.equal(await evaluate("!!document.querySelector('.joystick')"), false)
  await evaluate(
    "window.touchTrace=[];['pointerdown','pointerup','pointercancel','lostpointercapture','blur','resize'].forEach(name=>window.addEventListener(name,e=>window.touchTrace.push({type:e.type,id:e.pointerId,target:e.target?.className}),true))",
  )
  const p = { x: 80, y: 650, id: 1 },
    move = { x: 115, y: 650, id: 1 },
    right = { x: 300, y: 350, id: 2 }
  await touch('touchStart', [p])
  await touch('touchMove', [move])
  await wait(200)
  const a = await yaw()
  await touch('touchStart', [move, right])
  await touch('touchMove', [move, { ...right, x: 330 }])
  await wait(200)
  assert.ok(Math.abs((await yaw()) - a) > 0.05)
  const moving = await pos()
  assert.ok(moving.x > still.x)
  await touch('touchEnd', [right])
  await wait(250)
  assert.equal(
    await evaluate("!!document.querySelector('.joystick')"),
    true,
    'releasing look finger cannot release movement: ' +
      JSON.stringify(await evaluate('window.touchTrace')),
  )
  await touch('touchMove', [{ x: 280, y: 390, id: 1 }])
  await wait(300)
  assert.equal(
    await evaluate("!!document.querySelector('.joystick')"),
    true,
    'capture outside original quarter',
  )
  await screenshot('controls-dynamic-mobile.png')
  await touch('touchCancel', [])
  const stopped = await pos()
  assert.deepEqual(await pos(), stopped)
  // Open menu while the original move finger is still held.
  await touch('touchStart', [p])
  await touch('touchMove', [move])
  const phone = await evaluate(
    "(()=>{const r=document.querySelector('.world-toolbar:not(.hud-utilities) button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:3}})()",
  )
  if (process.env.CONTROLS_TOUCH_BASELINE) {
    await evaluate("document.querySelector('.world-toolbar:not(.hud-utilities) button').click()")
    await wait(150)
    await evaluate(
      "document.querySelector('[data-overlay-dismiss]').scrollIntoView({block:'center'})",
    )
    const footer = await evaluate(
      "(()=>{const r=document.querySelector('[data-overlay-dismiss]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:3}})()",
    )
    await touch('touchStart', [move, footer])
    await touch('touchEnd', [footer])
    await wait(150)
    console.log(
      'BASELINE held-finger footer remains:',
      await evaluate("!!document.querySelector('[role=dialog]')"),
    )
    await evaluate("document.querySelector('.close-button').focus()")
    await escape()
    console.log(
      'BASELINE Escape closes:',
      await evaluate("!document.querySelector('[role=dialog]')"),
    )
    await touch('touchCancel', [])
    return
  }
  await touch('touchStart', [move, phone])
  await touch('touchEnd', [phone])
  await wait(150)
  assert.equal(await evaluate("!!document.querySelector('.joystick')"), false)
  const paused = await pos()
  assert.deepEqual(await pos(), paused)
  await evaluate(
    "document.querySelector('[data-overlay-dismiss]').scrollIntoView({block:'center'})",
  )
  const footer = await evaluate(
    "(()=>{const r=document.querySelector('[data-overlay-dismiss]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:3}})()",
  )
  await screenshot('controls-mobile-footer.png')
  // A secondary tap outside on release must not dismiss.
  await touch('touchStart', [move, footer])
  await touch('touchMove', [move, { ...footer, x: 5, y: 400 }])
  await touch('touchEnd', [{ ...footer, x: 5, y: 400 }])
  await wait(100)
  assert.equal(await evaluate("!!document.querySelector('[role=dialog]')"), true)
  await touch('touchStart', [move, footer])
  await touch('touchEnd', [footer])
  await wait(150)
  await noDialog()
  assert.equal(await evaluate("!!document.querySelector('.joystick')"), false)
  // The finger held across the menu must not restart the newly mounted joystick.
  await touch('touchMove', [move])
  assert.deepEqual(await pos(), paused)
  await touch('touchEnd', [])

  await touch('touchStart', [p])
  await touch('touchMove', [move])
  await wait(150)
  const target = await send('Target.createTarget', { url: 'about:blank' })
  await send('Target.activateTarget', { targetId: target.targetId })
  await wait(200)
  await send('Target.closeTarget', { targetId: target.targetId })
  await send('Page.bringToFront')
  await touch('touchCancel', [])
  await wait(300)
  assert.equal(await evaluate("!!document.querySelector('.joystick')"), false)
  const blurStop = await pos()
  assert.deepEqual(await pos(), blurStop)
  // A screen resume click is consumed; it must not begin movement.
  await trustedClick('.first-person canvas')
  assert.equal(await evaluate("!!document.querySelector('.joystick')"), false)
  await touch('touchStart', [p])
  await touch('touchMove', [move])
  await wait(250)
  await touch('touchEnd', [])
  const saved = (await state()).position
  await send('Page.reload')
  await wait(1300)
  await state()
  assert.deepEqual((await state()).position, saved)
  await evaluate(
    "document.querySelector('.first-person canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))",
  )
  await wait(600)
  const flat = await pos()
  await touch('touchStart', [p])
  await touch('touchMove', [move])
  await wait(250)
  await touch('touchEnd', [])
  assert.ok((await pos()).x > flat.x)
  console.log(
    'PASS dynamic joystick: quarter only, edge, neutral start, simultaneous look/move, pointer ownership, capture, cancel, menu, actual blur, reload, 2D fallback',
  )
}
