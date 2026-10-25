import { verifyEpisodeFacilities } from './verify-episode-facilities.mjs'
import { verifyFacilityReview, verifyFacilityFallback } from './verify-facility-review.mjs'
import { verifyHallVisual } from './verify-hall-visual.mjs'
import { verifyHallControls } from './verify-hall-controls.mjs'
import { verifyHallRestructure } from './verify-hall-restructure.mjs'
import { verifyControls } from './verify-controls.mjs'
import { verifyComfort } from './verify-comfort.mjs'
import { verifyThreat } from './verify-threat.mjs'
import { verifyChapter56Audio } from './verify-chapter56-audio.mjs'
import { verifyChapter34Audio } from './verify-chapter34-audio.mjs'
import { verifyFirstRoomAudio } from './verify-first-room-audio.mjs'
import { verifySurfaceVisual } from './verify-surface-visual.mjs'
import { verifyAimEntry } from './verify-aim-entry.mjs'
import { verifyEpisodeControls } from './verify-episode-controls.mjs'
import { verifyEpisodeThree } from './verify-episode-3d.mjs'
import { verifyChapter6Three } from './verify-chapter6-3d.mjs'
import { verifyChapter5Three } from './verify-chapter5-3d.mjs'
import { verifyChapter4Three } from './verify-chapter4-3d.mjs'
import { verifyChapter3Three } from './verify-chapter3-3d.mjs'
import { verifyChapter2Three, verifyChapter2Visual } from './verify-chapter2-3d.mjs'
import { verifyVisual } from './verify-visual.mjs'
import { verifyShortcuts } from './verify-shortcuts.mjs'
import { verifyResume } from './verify-resume.mjs'
import assert from 'node:assert/strict'
export async function verifyFirstPerson({
  send,
  evaluate,
  click,
  close,
  state,
  advanceAll,
  hold,
  wait,
  screenshot,
  inputCode,
  walkTo,
}) {
  async function trustedClick(selector) {
    const p = await evaluate(
      `(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
    )
    if (await evaluate('navigator.maxTouchPoints>0')) {
      await send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ ...p, id: 9, radiusX: 4, radiusY: 4, force: 1 }],
      })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else {
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        button: 'left',
        clickCount: 1,
        ...p,
      })
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        button: 'left',
        clickCount: 1,
        ...p,
      })
    }
    await wait(300)
  }
  async function resume3d() {
    for (
      let i = 0;
      i < 60 && (await evaluate("!!document.querySelector('[data-scene-loading]')"));
      i++
    )
      await wait(100)
    if (await evaluate("!!document.querySelector('.exploration-resume')"))
      await trustedClick('.exploration-resume')
    assert.equal(
      await evaluate(
        "document.pointerLockElement===document.querySelector('.first-person canvas')",
      ),
      true,
      'pointer lock acquired: ' +
        (await evaluate("document.querySelector('.first-person').textContent")),
    )
  }
  async function unlock() {
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
    await wait(100)
    assert.equal(await evaluate('!!document.pointerLockElement'), false, 'Esc releases mouse lock')
  }
  let mx = 600,
    my = 400
  async function look(yaw, pitch = 0) {
    // Production has no debug dataset; read the game's own persisted camera instead.
    if (process.env.PRODUCTION_CHECK) await wait(450)
    // Relative movement is produced through Chrome's real input protocol.
    for (let i = 0; i < 20; i++) {
      const a = await evaluate(
        process.env.PRODUCTION_CHECK
          ? "JSON.parse(localStorage.getItem('last-transfer-save-v1')).view3d"
          : "({yaw:+document.querySelector('canvas').dataset.yaw,pitch:+document.querySelector('canvas').dataset.pitch})",
      )
      const yawDelta = process.env.PRODUCTION_CHECK
        ? Math.atan2(Math.sin(a.yaw - yaw), Math.cos(a.yaw - yaw))
        : a.yaw - yaw
      const sensitivity = await evaluate(
        "JSON.parse(localStorage.getItem('last-transfer-comfort-v1') ?? 'null')?.mouseSensitivity ?? 0.0015",
      )
      // Production feedback is sampled every 450ms. Slow synthetic turns can
      // spend several seconds exposed to the infected; use a normal fast mouse
      // turn for this real-time play route instead of changing the game threat.
      const fast =
        !!process.env.PRODUCTION_CHECK ||
        [
          'facility-progress',
          'facility-review',
          'episode',
          'facilities',
          'facility-branches',
        ].includes(process.env.FIRST_PERSON_CHECK)
      const dx = fast
        ? yawDelta / sensitivity
        : Math.max(-180, Math.min(180, yawDelta / sensitivity))
      const dy = fast
        ? (a.pitch - pitch) / sensitivity
        : Math.max(-100, Math.min(100, (a.pitch - pitch) / sensitivity))
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
      // Keep individual events below the game's 500px OS-warp guard.
      const steps = fast ? Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 450)) : 1
      for (let step = 0; step < steps; step++) {
        mx += dx / steps
        my += dy / steps
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my })
        if (fast) await wait(16)
      }
      await wait(process.env.PRODUCTION_CHECK ? 450 : 40)
    }
    throw Error(
      'Could not aim camera: ' +
        (await evaluate(
          process.env.PRODUCTION_CHECK
            ? "localStorage.getItem('last-transfer-save-v1')"
            : "JSON.stringify(document.querySelector('canvas').dataset)",
        )),
    )
  }
  async function seed(position) {
    const saved = await state()
    saved.position = position
    saved.view3d = null
    const fixtureScript = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(saved))})`,
    })
    await send('Page.reload')
    await wait(900)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: fixtureScript.identifier })
    await state()
    await wait(150)
    await resume3d()
  }
  async function approachOnce(id) {
    // Older chapter routes now encounter the same mandatory physical shutter.
    // Use real navigation/input; never inject an unlocked state.
    if (id === 'electrical' && (await state()).area === 'hall') {
      for (let step = 0; step < 2 && (await state()).chapter2.shutter !== 'open'; step++) {
        await approach('hall-shutter')
        assert.ok(
          (await evaluate("document.querySelector('.interaction').textContent")).includes('IS-02'),
          JSON.stringify({
            s: await state(),
            hud: await evaluate("document.querySelector('.interaction').textContent"),
          }),
        )
        const before = (await state()).chapter2.shutter
        await pressE()
        for (
          let i = 0;
          i < 60 && (await state()).chapter2.shutter === before && !(await state()).threat?.caught;
          i++
        )
          await wait(100)
        if ((await state()).threat?.caught) throw Error('Capture during physical shutter action')
        assert.notEqual(
          (await state()).chapter2.shutter,
          before,
          'physical action: ' +
            (await evaluate("document.querySelector('.first-person').textContent")),
        )
      }
      assert.equal((await state()).chapter2.shutter, 'open')
    }
    await resume3d()
    await look(0)
    await walkTo(id)
    const p = (await state()).position
    const entity = await evaluate(
      `(async()=>{const {getWorld}=await import('/src/game/world.ts');const s=JSON.parse(localStorage.getItem('last-transfer-save-v1'));const e=getWorld(s.area,s.chapter3.npc,s.chapter3.npcBoarded,s.chapter2.power,s.chapter3.doorOpen,s.chapter4,s.chapter5,s.chapter6,s.chapter2).entities.find(e=>e.id===${JSON.stringify(id)});const {interactionSurface,interactionAim}=await import('/src/game/interaction.ts');const {facilityProfiles}=await import('/src/game/facilityProfiles.ts');return {...e,...interactionSurface(e),aim:interactionAim(e.id),surfaceFace:!!facilityProfiles[e.id]||['hall-desk','hall-shutter','hall-map','hall-window','hall-gate-note','powerboard','moon-shoes'].includes(e.id)}})()`,
    )
    const tx = entity.surfaceFace
      ? Math.max(entity.x + 2, Math.min(p.x, entity.x + entity.w - 2))
      : entity.x + entity.w / 2
    const ty =
      entity.id === 'moon-shoes'
        ? Math.max(entity.y + 2, Math.min(p.y, entity.y + entity.h - 2))
        : entity.id === 'hall-desk'
          ? entity.y + entity.h
          : entity.y + entity.h / 2
    await look(
      Math.atan2(p.x - tx, p.y - ty),
      ['train-phone', 'moon-shoes'].includes(entity.id)
        ? -Math.atan2(entity.id === 'train-phone' ? 1.3 : 1.15, Math.hypot(p.x - tx, p.y - ty) / 50)
        : entity.id === 'hall-desk'
          ? -Math.atan2(0.65, Math.hypot(p.x - tx, p.y - ty) / 40)
          : -Math.atan2(
              1.5 - entity.aim,
              Math.hypot(p.x - tx, p.y - ty) /
                (await evaluate(
                  `(async()=>{const {sceneScale}=await import('/src/game/firstPerson.ts');return sceneScale('${(await state()).area}')})()`,
                )),
            ),
    )
    await wait(80)
  }
  const approach = async (id) => {
    for (let retry = 0; retry < 5; retry++) {
      try {
        await approachOnce(id)
        if (!(await state()).threat?.caught) return
      } catch (error) {
        if (!(await state()).threat?.caught) throw error
      }
      await click('안전 체크포인트에서 재시도')
      await advanceAll()
      await resume3d()
      if ((await state()).area === 'electrical' && !['powerboard', 'hall-return'].includes(id)) {
        await approachOnce('hall-return')
        await pressE()
        await advanceAll()
        await resume3d()
      }
    }
    throw Error('Repeated capture while approaching ' + id)
  }
  async function pressE(korean = false, repeat = false) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: korean ? 'ㄷ' : 'e',
      code: 'KeyE',
      windowsVirtualKeyCode: 69,
      autoRepeat: repeat,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: korean ? 'ㄷ' : 'e',
      code: 'KeyE',
      windowsVirtualKeyCode: 69,
    })
    await wait(130)
  }
  await send('Page.bringToFront')
  await click('몸을 일으키기')
  await advanceAll()
  await wait(500)
  assert.equal(await evaluate("!!document.querySelector('.first-person canvas')"), true)
  await screenshot('3d-01-room-desktop.png')
  await resume3d()
  if (['facilities', 'facilities-2d'].includes(process.env.FIRST_PERSON_CHECK)) {
    const both = process.env.FACILITY_ANGLES === 'both'
    if (both) delete process.env.FACILITY_ANGLES
    const helpers = {
      send,
      evaluate,
      state,
      wait,
      resume3d,
      pressE,
      advanceAll,
      close,
      trustedClick,
      look,
    }
    await verifyEpisodeFacilities(helpers)
    if (both) {
      process.env.FACILITY_ANGLES = '1'
      await verifyEpisodeFacilities(helpers)
      delete process.env.FACILITY_ANGLES
    }
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'facility-branches') {
    const helpers = {
      look,
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
      inputCode,
    }
    for (const check of [
      verifyChapter3Three,
      verifyChapter4Three,
      verifyChapter5Three,
      verifyChapter6Three,
    ].slice(Number(process.env.FACILITY_BRANCH_START ?? 3) - 3)) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await check(helpers)
    }
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'threat') {
    await verifyThreat({
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
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'comfort') {
    await verifyComfort({
      send,
      evaluate,
      wait,
      click,
      close,
      resume3d,
      look,
      hold,
      state,
      screenshot,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'facility-fallback') {
    await verifyFacilityFallback({ send, evaluate, state, wait, pressE, trustedClick })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'facility-review') {
    await verifyFacilityReview({
      send,
      evaluate,
      state,
      wait,
      resume3d,
      pressE,
      advanceAll,
      look,
      trustedClick,
      close,
      hold,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'restructure-visual') {
    await verifyHallVisual({ send, evaluate, state, wait, resume3d })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'restructure-controls') {
    await verifyHallControls({
      approach,
      click,
      advanceAll,
      send,
      evaluate,
      state,
      wait,
      resume3d,
      pressE,
      hold,
      close,
      trustedClick,
    })
    return
  }
  if (['restructure', 'facility-progress'].includes(process.env.FIRST_PERSON_CHECK)) {
    await verifyHallRestructure({
      send,
      evaluate,
      click,
      close,
      state,
      hold,
      wait,
      resume3d,
      trustedClick,
      approach,
      pressE,
      advanceAll,
      look,
    })
    if (process.env.PRODUCTION_CHECK)
      await verifyHallControls({
        send,
        evaluate,
        state,
        wait,
        resume3d,
        pressE,
        hold,
        close,
        trustedClick,
        approach,
        click,
        advanceAll,
      })
    if (process.env.FIRST_PERSON_CHECK === 'facility-progress')
      await verifyFacilityReview({
        send,
        evaluate,
        state,
        wait,
        resume3d,
        pressE,
        advanceAll,
        look,
        trustedClick,
        close,
        hold,
      })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'controls') {
    await verifyControls({
      approach,
      pressE,
      look,
      send,
      evaluate,
      state,
      wait,
      advanceAll,
      resume3d,
      trustedClick,
      screenshot,
      hold,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'static') return
  if (process.env.FIRST_PERSON_CHECK === 'audio56') {
    await verifyChapter56Audio({
      send,
      evaluate,
      click,
      close,
      state,
      hold,
      wait,
      resume3d,
      trustedClick,
      approach,
      pressE,
      advanceAll,
      inputCode,
      look,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'audio34') {
    await verifyChapter34Audio({
      send,
      evaluate,
      click,
      close,
      state,
      hold,
      wait,
      resume3d,
      trustedClick,
      approach,
      pressE,
      advanceAll,
      inputCode,
      look,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'audio') {
    await verifyFirstRoomAudio({
      send,
      evaluate,
      click,
      close,
      state,
      hold,
      wait,
      resume3d,
      trustedClick,
      approach,
      pressE,
      advanceAll,
      inputCode,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'surface-visual') {
    await verifySurfaceVisual({
      send,
      evaluate,
      state,
      wait,
      resume3d,
      look,
      hold,
      approach,
      pressE,
      advanceAll,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'aim-entry') {
    await verifyAimEntry({
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
      trustedClick,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'episode-controls') {
    await verifyEpisodeControls({
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
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'episode') {
    await verifyEpisodeThree({
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
      inputCode,
      trustedClick,
      look,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK?.startsWith('chapter6')) {
    await verifyChapter6Three({
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
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK?.startsWith('chapter5')) {
    await verifyChapter5Three({
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
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK?.startsWith('chapter4')) {
    await verifyChapter4Three({
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
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'chapter3') {
    await verifyChapter3Three({
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
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'chapter2-visual') {
    await verifyChapter2Visual({ send, evaluate, state, wait, trustedClick, pressE })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'visual') {
    await verifyVisual({ send, evaluate, state, wait, trustedClick, look })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'shortcuts') {
    await verifyShortcuts({
      advanceAll,
      approach,
      send,
      evaluate,
      state,
      wait,
      hold,
      screenshot,
      seed,
      pressE,
      trustedClick,
      resume3d,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'resume') {
    await verifyResume({
      send,
      evaluate,
      click,
      state,
      wait,
      hold,
      screenshot,
      inputCode,
      seed,
      pressE,
      trustedClick,
      look,
      approach,
    })
    return
  }
  if (process.env.FIRST_PERSON_CHECK === 'fallback') {
    const before = await state()
    await evaluate(
      "document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()",
    )
    await wait(700)
    assert.equal(await evaluate("!!document.querySelector('.first-person')"), false)
    assert.match(await evaluate("document.querySelector('.renderer-notice').textContent"), /2D/)
    const after = await state()
    for (const field of ['position', 'area', 'health', 'battery', 'clues', 'inventory'])
      assert.deepEqual(after[field], before[field], field)
    await screenshot('3d-fallback.png')
    console.log('PASS WebGL context loss → 2D with position/resources/evidence preserved')
    return
  }
  const p0 = (await state()).position
  await hold('w', 900)
  assert.ok((await state()).position.y < p0.y - 10)
  await screenshot('3d-02-exploring.png')
  await unlock()
  await click('휴대폰')
  const stopped = (await state()).position
  await hold('w', 250)
  assert.deepEqual((await state()).position, stopped)
  await close()
  assert.equal(
    await evaluate("document.querySelector('.first-person').classList.contains('is-paused')"),
    false,
  )
  await resume3d()
  // World obstacles still own collision in the 3D renderer.
  await seed({ x: 350, y: 330 })
  await hold('w', 1000)
  assert.ok((await state()).position.y >= 305, 'bench collision')
  await seed({ x: 480, y: 160 })
  await hold('w', 1300)
  assert.ok((await state()).position.y >= 129, 'investigation object collision')
  assert.match(
    await evaluate("document.querySelector('.interaction').textContent"),
    /찢어진案内図|찢어진 안내도/,
  )
  await pressE(true)
  assert.ok((await state()).clues.includes('map'))
  const battery = (await state()).battery
  await pressE(true, true)
  assert.equal((await state()).battery, battery)
  await advanceAll()
  await resume3d()
  // Inspect all first-room props with the E key; game state/puzzle remains authoritative.
  await trustedClick('.first-person canvas')
  assert.equal((await state()).scene.length, 0)
  assert.ok(
    await evaluate("!!document.querySelector('.field-note')"),
    'mouse click shares nonblocking target with E',
  )
  await advanceAll()
  for (const id of ['panel', 'cabinet']) {
    await approach(id)
    await pressE(true)
    assert.ok((await state()).clues.includes(id), id)
    await advanceAll()
  }
  await approach('oh')
  await pressE()
  assert.ok((await state()).scene.length, 'E opens Oh portrait conversation')
  await screenshot('3d-03-oh-dialogue.png')
  await advanceAll()
  await click('휴대폰')
  await click('동쪽 배수 기록')
  await close()
  await approach('west')
  await wait(100)
  assert.match(await evaluate("document.querySelector('.interaction').textContent"), /서쪽 정비문/)
  await pressE(true)
  await click('이 경로 선택')
  await inputCode('0218')
  assert.equal((await state()).outcome, 'escaped')
  await screenshot('3d-04-cleared.png')
  await click('대합실로 이동')
  await advanceAll()
  assert.equal((await state()).area, 'hall')
  assert.equal(await evaluate("!!document.querySelector('.first-person')"), true)
  if (process.env.FIRST_PERSON_CHECK === 'chapter2') {
    await verifyChapter2Three({
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
      unlock,
    })
    return
  }
  // Return to a real saved first-room state; no added gameplay/debug state.
  const saved = await state()
  const initial = await evaluate(
    "(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,stage:'explore',position:{x:480,y:160},scene:[],sceneIndex:0}})()",
  )
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await evaluate(
    `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(initial))})`,
  )
  await send('Page.reload')
  await wait(800)
  await state()
  await wait(150)
  await screenshot('3d-mobile-before-input.png')
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('.world-toolbar .pc-key-hint')].every(e=>getComputedStyle(e).display==='none')",
    ),
    true,
    'mobile hides shortcut hints',
  )
  if (await evaluate("!!document.querySelector('.exploration-resume')"))
    await trustedClick('.exploration-resume')
  const b = await evaluate(
    "(()=>{const r=document.querySelector('[data-move-zone]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()",
  )
  const touch = async (type, points) =>
    send('Input.dispatchTouchEvent', { type, touchPoints: points })
  await touch('touchStart', [{ ...b, id: 1 }])
  await touch('touchMove', [{ x: b.x + 28, y: b.y, id: 1 }])
  await wait(300)
  await touch('touchEnd', [])
  await wait(100)
  assert.ok((await state()).position.x > 490, 'mobile joystick moves')
  const yaw0 = await evaluate("+document.querySelector('canvas').dataset.yaw")
  const r = await evaluate(
    "(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x+r.width*.7,y:r.y+r.height*.45}})()",
  )
  await touch('touchStart', [{ ...r, id: 2 }])
  await touch('touchMove', [{ x: r.x - 70, y: r.y, id: 2 }])
  await touch('touchEnd', [])
  await wait(80)
  assert.ok(
    Math.abs((await evaluate("+document.querySelector('canvas').dataset.yaw")) - yaw0) > 0.2,
    'right drag rotates',
  )
  const yaw1 = await evaluate("+document.querySelector('canvas').dataset.yaw")
  await trustedClick('.world-toolbar:not(.hud-utilities) button')
  assert.equal(
    await evaluate("+document.querySelector('canvas').dataset.yaw"),
    yaw1,
    'UI touch does not rotate',
  )
  await close()
  assert.equal(
    await evaluate("!!document.querySelector('.exploration-resume')"),
    false,
    'mobile resumes without pointer lock',
  )
  // Restart from a persisted first-room checkpoint to verify the touch action itself.
  await evaluate(
    `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(initial))});location.reload()`,
  )
  await wait(900)
  await state()
  await wait(200)
  if (await evaluate("!!document.querySelector('.exploration-resume')"))
    await trustedClick('.exploration-resume')
  await trustedClick('.interaction button')
  assert.ok((await state()).clues.includes('map'), 'touch investigates selected target')
  assert.equal(
    await evaluate("getComputedStyle(document.querySelector('.world-controls')).visibility"),
    'visible',
  )
  assert.equal((await state()).scene.length, 0)
  await advanceAll()
  await screenshot('3d-05-mobile.png')
  await evaluate(
    `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(saved))})`,
  )
  console.log(
    'PASS 3D: WASD/collision, Korean E investigation/NPC/door, pointer lock/look, UI gesture resume/canvas fallback, puzzle clear → chapter 2, touch move/look/UI, reload',
  )
}
