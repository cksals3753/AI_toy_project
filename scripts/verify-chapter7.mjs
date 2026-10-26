import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
export const verifyChapter7 = async (h) => {
  const {
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
    trustedClick,
  } = h
  const dir = 'docs/chapter7-verification'
  await mkdir(dir, { recursive: true })
  const results =
    process.env.CHAPTER7_CASE || process.env.CHAPTER7_FINAL_ONLY
      ? JSON.parse(
          await readFile(
            `${dir}/partial-${process.env.CHAPTER7_MOBILE_ONLY ? 'mobile' : 'desktop'}.json`,
            'utf8',
          ),
        ).routes.map((r) => ({ ...r, verifiedInPreviousRun: true }))
      : []
  const restore = async (seed) => {
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(seed))});localStorage.setItem('last-transfer-comfort-v1',JSON.stringify({version:1,mouseSensitivity:.0015,touchSensitivity:.003,fov:64,moveSpeed:.6,brightness:1}));`,
    })
    await send('Page.reload')
    await wait(1200)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    await wait(200)
  }
  let checkpoint = await evaluate(`(async()=>{
    const {initialState:i,reducer}=await import('/src/game/engine.ts');
    let s={...i,area:'shelter',stage:'explore',health:1,battery:0,inventory:[],clues:['shelter-sign'],
      chapter3:{...i.chapter3,started:true,approved:true,signal:'green',doorOpen:true,boarded:true,escaped:true,npcBoarded:false,npc:'waiting',ending:'complete'},
      chapter4:{...i.chapter4,started:true,sync:'accepted',arrived:true,doorSeen:true,completed:true},
      chapter5:{...i.chapter5,started:true,displayName:'한결',response:'silent',registration:'held',matched:true,externalPaused:true,routeOpen:true,exitSeen:true,completed:true},
      chapter6:{...i.chapter6,started:true,route:'manual'}};
    return reducer(s,{type:'maintenance-arrive'});
  })()`)
  if (process.env.CHAPTER7_REAL_SAVE) {
    const snapshots = JSON.parse(await readFile(process.env.CHAPTER7_REAL_SAVE, 'utf8'))
    checkpoint = Object.values(snapshots)
      .filter((s) => s.chapter6?.completed && s.area === 'shelter')
      .at(-1)
    assert.ok(checkpoint, 'requires actual episode1 completion checkpoint')
  }
  assert.equal(checkpoint.chapter6.completed, true)
  const act = async (id) => {
    await resume3d()
    await approach(id)
    const expected = {
      's7-entrance': '외부 반입문',
      's7-rear': '후면 지름길',
      's7-firedoor': '방화문',
    }[id]
    if (expected)
      assert.ok(
        (await evaluate("document.querySelector('.interaction').innerText")).includes(expected),
        JSON.stringify({
          id,
          position: (await state()).position,
          view: (await state()).view3d,
          ui: await evaluate("document.querySelector('.interaction').innerText"),
        }),
      )
    if (await evaluate('navigator.maxTouchPoints>0')) await trustedClick('.interaction button')
    else await pressE(true)
    await wait(100)
  }
  const inspect = async (id) => {
    await act(id)
    await advanceAll()
  }
  const work = async (id, field, test) => {
    await act(id)
    for (let i = 0; i < 100 && !test((await state()).chapter7[field]); i++) await wait(100)
    assert.ok(
      test((await state()).chapter7[field]),
      `work ${id}: ` +
        JSON.stringify({
          chapter: (await state()).chapter7,
          position: (await state()).position,
          screen: await evaluate("document.querySelector('main').innerText"),
        }),
    )
  }
  const reload = async () => {
    const before = await state()
    await send('Page.reload')
    await wait(1100)
    await state()
    assert.deepEqual((await state()).chapter6.result, before.chapter6.result)
    assert.ok(Math.abs((await state()).chapter7.elapsed - before.chapter7.elapsed) < 0.5)
    return before
  }
  if (process.env.CHAPTER7_BRIDGE_ONLY) {
    await restore(checkpoint)
    await click('에피소드 2 시작 · 기존 기록 이어가기')
    await click('에피소드 2 시작 · 기존 기록 이어가기')
    await advanceAll()
    await wait(1200)
    await inspect('s7-rest')
    const next = await state()
    assert.equal(next.chapter7.started, true)
    assert.equal(next.chapter7.rested, true)
    assert.equal(next.chapter7.elapsed, 0)
    assert.deepEqual(next.chapter6.result, checkpoint.chapter6.result)
    assert.equal(next.chapter5.displayName, checkpoint.chapter5.displayName)
    assert.deepEqual(next.inventory, checkpoint.inventory)
    await writeFile(
      `${dir}/actual-save-bridge.json`,
      JSON.stringify(
        {
          source: process.env.CHAPTER7_REAL_SAVE,
          entered: true,
          rested: true,
          resultUnchanged: true,
          inventoryUnchanged: true,
          nameUnchanged: true,
          npcTogether: next.chapter6.result.npcTogether,
        },
        null,
        2,
      ),
    )
    console.log(
      'PASS actual episode1 save → episode2 start/rest, immutable result, items/name/NPC continuity',
    )
    return
  }
  if (process.env.CHAPTER7_ARCHIVE_ONLY) {
    const done = await evaluate(
      `(async()=>{const {reducer}=await import('/src/game/engine.ts');const {makeView3d}=await import('/src/game/view3d.ts');let s=${JSON.stringify(checkpoint)};const act=(a)=>{s=reducer(s,a);for(let i=0;i<30&&s.scene.length;i++)s=reducer(s,{type:'advance'})};act({type:'s7-start'});act({type:'s7-rest'});for(const id of ['s7-entrance-note','s7-kit-note','s7-rear-note'])act({type:'inspect',id});act({type:'s7-observe'});act({type:'s7-begin'});act({type:'s7-kit'});act({type:'s7-install',destination:'rear'});s.position={x:850,y:390};act({type:'s7-firedoor'});act({type:'s7-firedoor'});act({type:'s7-ready'});act({type:'s7-complete'});s.view3d=makeView3d('shelterDefense',s.position);return s})()`,
    )
    assert.equal(done.chapter7.phase, 'complete')
    for (const mobile of [false, true]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: mobile ? 390 : 1280,
        height: mobile ? 844 : 1000,
        deviceScaleFactor: 1,
        mobile,
      })
      await send('Emulation.setTouchEmulationEnabled', { enabled: mobile })
      await restore(done)
      assert.equal(
        await evaluate("!!document.querySelector('.episode-result-button')"),
        false,
        'archive does not cover exploration HUD',
      )
      await click('소지품·단서')
      await click('에피소드 1 · 도착 시점 결과 다시 보기')
      assert.deepEqual((await state()).chapter6.result, done.chapter6.result)
      await click('에피소드 2 이어하기')
      assert.equal((await state()).chapter7.phase, 'complete')
      assert.equal((await state()).area, 'shelterDefense')
      const { data } = await send('Page.captureScreenshot')
      await writeFile(
        `${dir}/archive-${mobile ? 'mobile' : 'desktop'}.png`,
        Buffer.from(data, 'base64'),
      )
    }
    await writeFile(
      `${dir}/archive.json`,
      JSON.stringify(
        {
          readOnly: true,
          episode2Continued: true,
          noExplorationOverlay: true,
          viewports: ['1280x1000', '390x844'],
          fixture: 'completed chapter7 via reducer; UI check only',
        },
        null,
        2,
      ),
    )
    console.log(
      'PASS archive UI: mobile/desktop, immutable arrival result, continue chapter7, unobstructed HUD',
    )
    return
  }
  if (process.env.CHAPTER7_SURFACE_ONLY) {
    if (process.env.CHAPTER7_MOBILE_ONLY) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      })
      await send('Emulation.setTouchEmulationEnabled', { enabled: true })
    }
    for (const id of ['s7-entrance', 's7-rear', 's7-firedoor']) {
      const seed = structuredClone(checkpoint)
      seed.area = 'shelterDefense'
      seed.scene = []
      seed.chapter7 = {
        ...seed.chapter7,
        started: true,
        rested: true,
        observed: true,
        phase: 'respond',
        kit: id === 's7-firedoor' ? 'rear' : 'carried',
        priority: id === 's7-firedoor' ? 'rear' : null,
      }
      seed.position = {
        x: id === 's7-entrance' ? 140 : id === 's7-rear' ? 520 : 850,
        y: id === 's7-entrance' ? 250 : id === 's7-rear' ? 465 : 340,
      }
      seed.view3d = await evaluate(
        `(async()=>{const {makeView3d}=await import('/src/game/view3d.ts');return makeView3d('shelterDefense',${JSON.stringify(seed.position)})})()`,
      )
      await restore(seed)
      await act(id)
      console.log('PASS surface', id, await evaluate("document.querySelector('main').innerText"))
      await advanceAll()
    }
    return
  }
  const cases = process.env.CHAPTER7_MOBILE_ONLY
    ? [
        { together: false, priority: 'entrance', mobile: true },
        { together: true, priority: 'rear', mobile: true },
      ]
    : [false, true].flatMap((together) =>
        ['entrance', 'rear'].map((priority) => ({ together, priority, mobile: false })),
      )
  for (const { together, priority, mobile } of cases.filter(
    (c) =>
      !process.env.CHAPTER7_FINAL_ONLY &&
      (!process.env.CHAPTER7_CASE ||
        `${c.priority}-${c.together ? 'company' : 'solo'}` === process.env.CHAPTER7_CASE),
  )) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: mobile ? 390 : 1280,
      height: mobile ? 844 : 1000,
      deviceScaleFactor: 1,
      mobile,
    })
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile })
    let seed = structuredClone(checkpoint)
    seed.chapter3.npcBoarded = together
    seed.chapter3.npc = together ? 'helped' : 'waiting'
    const automatic = priority === 'rear'
    seed.chapter5.response = automatic ? 'answered' : 'silent'
    seed.chapter5.registration = automatic ? 'cancelled' : 'held'
    seed.chapter6 = {
      ...seed.chapter6,
      route: automatic ? 'automatic' : 'manual',
      drained: automatic,
      boltOpen: automatic,
      completed: false,
      result: null,
    }
    seed = await evaluate(
      `(async()=>{const {reducer}=await import('/src/game/engine.ts');return reducer(${JSON.stringify(seed)},{type:'maintenance-arrive'})})()`,
    )
    await restore(seed)
    assert.ok(
      await evaluate(
        "document.querySelector('.overlay-panel').innerText.includes('에피소드 1 완료')",
      ),
    )
    await click('에피소드 2 시작 · 기존 기록 이어가기')
    await click('에피소드 2 시작 · 기존 기록 이어가기')
    await advanceAll()
    await wait(1300)
    assert.equal((await state()).area, 'shelterDefense')
    await inspect('s7-rest')
    assert.equal((await state()).health, 30)
    assert.equal((await state()).battery, 20)
    for (const id of ['s7-entrance-note', 's7-kit-note', 's7-rear-note']) await inspect(id)
    await inspect('s7-window')
    if (mobile) {
      await resume3d()
      const r = await evaluate(
        "(()=>{const r=document.querySelector('.first-person canvas').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()",
      )
      const before = await state(),
        left = { id: 1, x: r.x + r.w * 0.2, y: r.y + r.h * 0.87 },
        right = { id: 8, x: r.x + r.w * 0.75, y: r.y + r.h * 0.4 }
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, right] })
      await send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { ...left, y: left.y + 33 },
          { ...right, x: right.x + 12 },
        ],
      })
      await wait(300)
      await send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [{ ...left, y: left.y + 33 }],
      })
      await wait(150)
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await wait(500)
      const after = await state()
      assert.ok(
        Math.hypot(after.position.x - before.position.x, after.position.y - before.position.y) > 5,
        'two-finger touch moves player',
      )
      assert.ok(
        Math.abs(after.view3d.yaw - before.view3d.yaw) > 0.01,
        'right finger rotates camera while moving',
      )
      await wait(350)
      assert.ok(
        Math.hypot(
          (await state()).position.x - after.position.x,
          (await state()).position.y - after.position.y,
        ) < 1,
        'touch release stops movement',
      )
    }
    const prepared = await state()
    assert.equal(prepared.chapter7.phase, 'prepare')
    await wait(1000)
    assert.equal((await state()).chapter7.elapsed, 0)
    await act('s7-window')
    await click('현장 대응 시작')
    await resume3d()
    await act('s7-kit')
    assert.equal((await state()).chapter7.kit, 'carried')
    await reload()
    await resume3d()
    // Return to rack remains reversible; using E again does not install anything.
    await act('s7-kit')
    assert.equal((await state()).chapter7.kit, 'rack')
    await act('s7-kit')
    assert.equal((await state()).chapter7.kit, 'carried')
    await act(`s7-${priority}`)
    await click('이 위치에 지지대 설치')
    await resume3d()
    if (!mobile && !together && priority === 'entrance') {
      await wait(100)
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
      })
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
      })
      await wait(150)
      assert.equal((await state()).chapter7.kit, 'carried')
      assert.equal((await state()).chapter7.priority, null)
      await close()
      await reload()
      await resume3d()
      await act('s7-entrance')
      await click('이 위치에 지지대 설치')
      await resume3d()
    }
    for (let i = 0; i < 40 && (await state()).chapter7.priority !== priority; i++) await wait(100)
    assert.equal(
      (await state()).chapter7.priority,
      priority,
      await evaluate("document.querySelector('main').innerText"),
    )
    await reload()
    await resume3d()
    if (!mobile) {
      const other = await send('Target.createTarget', { url: 'about:blank', background: false })
      await send('Target.activateTarget', { targetId: other.targetId })
      await wait(250)
      const hiddenTime = (await state()).chapter7.elapsed
      assert.ok(
        await evaluate("document.visibilityState==='hidden'||!document.hasFocus()"),
        'real background tab pauses exploration',
      )
      await wait(600)
      assert.equal((await state()).chapter7.elapsed, hiddenTime)
      await send('Target.closeTarget', { targetId: other.targetId })
      await send('Page.bringToFront')
      await resume3d()
      // UI, pointer unlock and tab hiding pause the same counter.
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
      })
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
      })
      const paused = (await state()).chapter7.elapsed
      await wait(600)
      assert.equal((await state()).chapter7.elapsed, paused)
      await close()
      await resume3d()
      await evaluate('document.exitPointerLock()')
      await wait(150)
      const unlocked = (await state()).chapter7.elapsed
      await wait(600)
      assert.equal((await state()).chapter7.elapsed, unlocked)
      await resume3d()
    }
    if (priority === 'entrance') {
      if (!mobile && !together) {
        await act('s7-winch')
        await wait(100)
        await evaluate('document.exitPointerLock()')
        await wait(250)
        assert.equal((await state()).chapter7.winch, 'pinned')
        await resume3d()
      }
      await work('s7-winch', 'winch', (v) => v === 'released')
      await reload()
      await resume3d()
      await work('s7-winch', 'winch', (v) => v === 'open')
    }
    if (!mobile && !together) {
      await act('s7-firedoor')
      await wait(100)
      await evaluate('document.exitPointerLock()')
      await wait(250)
      assert.equal((await state()).chapter7.fireDoor, 'open')
      await resume3d()
    }
    await work('s7-firedoor', 'fireDoor', (v) => v === 'closed')
    await reload()
    await resume3d()
    await work('s7-firedoor', 'fireDoor', (v) => v === 'bolted')
    assert.equal((await state()).chapter7.phase, 'secured')
    const secured = (await state()).chapter7.elapsed
    await wait(700)
    assert.equal((await state()).chapter7.elapsed, secured)
    await inspect('s7-ready')
    await act('s7-finish')
    await click('다음 이동 준비 완료')
    await advanceAll()
    const done = await state()
    assert.equal(done.chapter7.phase, 'complete')
    assert.deepEqual(done.chapter6.result, seed.chapter6.result)
    await reload()
    const { data } = await send('Page.captureScreenshot')
    await writeFile(
      `${dir}/${mobile ? 'mobile' : 'desktop'}-${priority}-${together ? 'company' : 'solo'}.png`,
      Buffer.from(data, 'base64'),
    )
    results.push({
      simultaneousTouch: mobile,
      priority,
      together,
      mobile,
      minimumMoveSpeed: 0.6,
      activeSeconds: secured,
      remainingSeconds: 180 + (priority === 'entrance' ? 120 : 0) - secured,
      complete: true,
    })
    await writeFile(
      `${dir}/partial-${process.env.CHAPTER7_MOBILE_ONLY ? 'mobile' : 'desktop'}.json`,
      JSON.stringify({ suiteComplete: false, routes: results }, null, 2),
    )
    console.log('PASS chapter7 route', results.at(-1))
  }
  // Actual frame-driven expiration from a near-deadline fixture, not dispatching a fake failure.
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const failed = process.env.CHAPTER7_FINAL_ONLY
    ? {
        ...checkpoint,
        area: 'shelterDefense',
        stage: 'explore',
        position: { x: 270, y: 450 },
        view3d: null,
        health: 30,
        battery: 20,
        chapter7: { ...checkpoint.chapter7, started: true, rested: true, observed: true },
      }
    : await state()
  failed.chapter7 = {
    ...failed.chapter7,
    phase: 'respond',
    elapsed: 298.5,
    kit: 'entrance',
    priority: 'entrance',
    fireDoor: 'open',
    ready: false,
  }
  failed.scene = []
  await restore(failed)
  await resume3d()
  await wait(1800)
  assert.equal((await state()).chapter7.phase, 'failed')
  await send('Page.reload')
  await wait(1100)
  await state()
  assert.equal((await state()).chapter7.phase, 'failed')
  const resources = [(await state()).health, (await state()).battery]
  await click('안전 체크포인트에서 재시도')
  await advanceAll()
  assert.equal((await state()).chapter7.phase, 'prepare')
  assert.equal((await state()).chapter7.kit, 'rack')
  assert.deepEqual([(await state()).health, (await state()).battery], resources)
  if (!process.env.CHAPTER7_MOBILE_ONLY) {
    await act('s7-window')
    await click('현장 대응 시작')
    const again = await state()
    again.chapter7.elapsed = 178.5
    await restore(again)
    await resume3d()
    await wait(1800)
    assert.equal((await state()).chapter7.phase, 'failed')
    const attempt = (await state()).chapter7.attempt
    await click('안전 체크포인트에서 재시도')
    await advanceAll()
    assert.equal((await state()).chapter7.attempt, attempt + 1)
    assert.deepEqual([(await state()).health, (await state()).battery], resources)
  }
  await act('s7-window')
  await evaluate("document.querySelector('.overlay-panel input[type=checkbox]').click()")
  await click('현장 대응 시작')
  await resume3d()
  const before = (await state()).chapter7.elapsed
  await wait(700)
  assert.equal((await state()).chapter7.elapsed, before)
  await writeFile(
    `${dir}/${process.env.CHAPTER7_MOBILE_ONLY ? 'mobile' : 'desktop'}-${process.env.PRODUCTION_CHECK ? 'production' : 'development'}-results.json`,
    JSON.stringify(
      {
        mode: process.env.PRODUCTION_CHECK ? 'production-preview' : 'development',
        routes: results,
        frameDrivenExpiration: true,
        savedFailure: true,
        pressureAssist: true,
        notes:
          'Chrome automation; elapsed includes automated navigation and aiming. Not a novice comfort study or real mobile device.',
      },
      null,
      2,
    ),
  )
  console.log('PASS chapter7 expiry/retry/save/assist and immutable episode1 result')
}
