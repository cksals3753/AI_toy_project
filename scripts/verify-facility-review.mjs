import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
export const verifyFacilityReview = async ({
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
}) => {
  const dir = 'docs/facility-review',
    label = process.env.VISUAL_LABEL ?? 'after'
  await mkdir(dir, { recursive: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const capture = async (name) => {
    const r = await send('Page.captureScreenshot')
    await writeFile(`${dir}/${label}-${name}.png`, Buffer.from(r.data, 'base64'))
  }
  const restore = async (area, position, yaw = 0, brightness = 1) => {
    const saved = await evaluate(
      `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');const {makeView3d}=await import('/src/game/view3d.ts');return {...s,stage:'explore',area:'${area}',scene:[],threat:null,position:${JSON.stringify(position)},view3d:makeView3d('${area}',${JSON.stringify(position)},${yaw},-.06),inventory:['전기실 열쇠']}})()`,
    )
    const injection = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(saved))});localStorage.setItem('last-transfer-comfort-v1',JSON.stringify({brightness:${brightness}}));localStorage.setItem('last-transfer-audio-v1',JSON.stringify({muted:true,volume:.35}))`,
    })
    await send('Page.reload')
    await wait(1300)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier })
    await state()
    await resume3d()
    await wait(100)
  }
  const cases = [
    ['map', 'hall', { x: 480, y: 200 }, 0, 'hall-map'],
    ['window', 'hall', { x: 150, y: 240 }, 0, 'hall-window'],
    ['desk', 'hall', { x: 640, y: 240 }, 0, 'hall-desk'],
    ['shutter', 'hall', { x: 215, y: 340 }, Math.PI, 'hall-shutter'],
    ['power', 'electrical', { x: 480, y: 275 }, 0, 'powerboard'],
  ]
  for (const [name, area, p, yaw, id] of cases) {
    await restore(area, p, yaw)
    await capture(name)
    if (label === 'after' && name !== 'shutter') {
      if (name === 'desk') await look(yaw, -0.4)
      await look(yaw + 0.05, name === 'desk' ? -0.4 : -0.06)
      assert.equal(
        await evaluate("document.querySelector('.interaction button').disabled"),
        false,
        name + ' comfortable reach',
      )
      assert.ok(
        await evaluate(
          `document.querySelector('.interaction').textContent.includes(${JSON.stringify(name === 'map' ? '안내도' : name === 'window' ? '점검창' : name === 'desk' ? '데스크' : '배전반')})`,
        ),
      )
      await look(yaw, name === 'desk' ? -0.4 : -0.06)
      await pressE()
      await wait(120)
      if (name === 'power') {
        assert.ok(await evaluate("document.body.textContent.includes('예비 전원')"))
        await close()
      } else {
        assert.ok((await state()).clues.includes(id))
        await advanceAll()
      }
    }
  }
  if (label === 'after') {
    await restore('hall', { x: 540, y: 190 }, Math.atan2(60, 105))
    assert.equal(
      await evaluate("document.querySelector('.interaction button').disabled"),
      false,
      'oblique map surface',
    )
    await capture('map-oblique')
    await pressE()
    assert.ok((await state()).clues.includes('hall-map'))
    await advanceAll()
    await restore('hall', { x: 150, y: 185 })
    await hold('w', 300)
    await wait(450)
    assert.ok((await state()).position.y >= 172.9, 'camera cannot enter the grille/cabinet')
    assert.ok(Math.abs((await state()).view3d.yaw) < 0.01, 'no camera push/forced turn')
    await capture('near-window')
    await restore('hall', { x: 480, y: 235 })
    assert.equal(
      await evaluate("document.querySelector('.interaction button').disabled"),
      true,
      'map out of reach',
    )
    await restore('hall', { x: 280, y: 445 }, Math.PI / 2)
    assert.equal(
      await evaluate("document.querySelector('.interaction button').disabled"),
      true,
      'solid side wall',
    )
    await restore('hall', { x: 215, y: 390 }, Math.PI)
    assert.ok(
      await evaluate("document.querySelector('.interaction').textContent.includes('IS-02')"),
      'closed shutter owns selection, not E-01 behind it',
    )
    await restore('hall', { x: 215, y: 350 })
    const before = (await state()).position
    await hold('d', 450)
    await wait(450)
    assert.ok((await state()).position.x - before.x > 25, 'pass below/alongside facility sign')
    await capture('sign-sidepass')

    for (const brightness of [0.85, 1.25]) {
      await restore('hall', { x: 150, y: 240 }, 0, brightness)
      await capture(`dark-${brightness}`)
    }
    await restore('first', { x: 775, y: 170 })
    await pressE()
    assert.ok(
      (await state()).clues.includes('panel'),
      'shared selection: first-room panel retains its original reach',
    )
    await capture('first-room-panel')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    // Mobile resume does not acquire pointer lock.
    const r = await send('Page.addScriptToEvaluateOnNewDocument', {
      source:
        "localStorage.setItem('last-transfer-save-v1',JSON.stringify({...JSON.parse(localStorage.getItem('last-transfer-save-v1')),area:'electrical',position:{x:480,y:310},view3d:{version:1,area:'electrical',position:{x:0,z:0},yaw:0,pitch:-.06}}))",
    })
    await send('Page.reload')
    await wait(1500)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: r.identifier })
    await state()
    if (await evaluate("!!document.querySelector('.exploration-resume')"))
      await trustedClick('.exploration-resume')
    await capture('mobile-power')
    await trustedClick('.interaction button')
    assert.ok(await evaluate("!!document.querySelector('[role=dialog]')"))
    await close()
  }
  await writeFile(
    `${dir}/${label}-result.json`,
    JSON.stringify(
      {
        fixedViewpoints: true,
        production: !!process.env.PRODUCTION_CHECK,
        comfortableReach: label === 'after',
        oblique: label === 'after',
        wallAndClosedDoor: label === 'after',
        signSidepass: label === 'after',
        brightness: label === 'after' ? [0.85, 1.25] : [],
        mobileTouch: label === 'after',
        firstRoomRegression: label === 'after',
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    `PASS facility ${label}: fixed viewpoints${label === 'after' ? ', comfortable investigations, brightness, mobile touch' : ''}`,
  )
}

export const verifyFacilityFallback = async ({
  send,
  evaluate,
  state,
  wait,
  pressE,
  trustedClick,
}) => {
  const saved = await evaluate(
    `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,area:'hall',stage:'explore',position:{x:197,y:360},view3d:null,scene:[],threat:null}})()`,
  )
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).startsWith('webgl'))return null;return original.call(this,kind,...args)};localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(saved))});localStorage.setItem('last-transfer-audio-v1',JSON.stringify({muted:true,volume:.35}))`,
  })
  await send('Page.reload')
  await wait(1500)
  await state()
  assert.ok(await evaluate("!!document.querySelector('.exploration:not(.first-person) canvas')"))
  await trustedClick('.exploration canvas')
  assert.equal(await evaluate("document.querySelector('.interaction button').disabled"), false)
  await pressE()
  await wait(1100)
  assert.equal((await state()).chapter2.shutter, 'unlatched')
  await pressE()
  await wait(1100)
  assert.equal((await state()).chapter2.shutter, 'open')
  const shot = await send('Page.captureScreenshot')
  await mkdir('docs/facility-review', { recursive: true })
  await writeFile('docs/facility-review/after-2d-shutter.png', Buffer.from(shot.data, 'base64'))
  await writeFile(
    'docs/facility-review/fallback-result.json',
    JSON.stringify(
      { intentionalWebglFailure: true, sameSurfaceAndReach: true, confirmedBothStages: true },
      null,
      2,
    ) + '\n',
  )
  console.log('PASS facility 2D fallback: same new surface/reach and two confirmed shutter steps')
}
