import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
export const verifyHallControls = async ({
  send,
  evaluate,
  state,
  wait,
  resume3d,
  pressE,
  close,
  trustedClick,
  approach,
  click,
  advanceAll,
}) => {
  const dir = 'docs/chapter2-restructure'
  await mkdir(dir, { recursive: true })
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot')
    await writeFile(`${dir}/${name}.png`, Buffer.from(r.data, 'base64'))
  }
  const base = await evaluate(
    `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');const {makeView3d}=await import('/src/game/view3d.ts');return {...s,area:'hall',stage:'explore',scene:[],position:{x:215,y:390},view3d:makeView3d('hall',{x:215,y:390},Math.PI),inventory:['전기실 열쇠'],health:1,battery:0}})()`,
  )
  const restore = async (saved, mobile = false, extra = '') => {
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source:
        extra +
        `;localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(saved))})`,
    })
    await send('Page.reload')
    await wait(1300)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    if (mobile) {
      if (await evaluate("!!document.querySelector('.exploration-resume')"))
        await trustedClick('.exploration-resume')
      await trustedClick('.first-person canvas')
    } else await resume3d()
  }
  await restore(base)
  await shot('11-shutter-front-locked')
  await pressE()
  await wait(150)
  assert.equal((await state()).chapter2.shutter, 'locked')
  await restore(await state())
  assert.equal((await state()).chapter2.shutter, 'locked', 'unfinished action is not saved')
  await pressE()
  await wait(150)
  await evaluate("window.dispatchEvent(new Event('blur'))")
  await wait(1000)
  assert.equal((await state()).chapter2.shutter, 'locked', 'blur cancels')
  await restore(base)
  await evaluate("document.querySelector('button.pointer-events-auto').click()")
  const paused = await state()
  await wait(1000)
  assert.deepEqual((await state()).position, paused.position)
  assert.equal((await state()).chapter2.shutter, 'locked')
  await close()
  await resume3d()
  for (const success of [false, true]) {
    const danger = {
      ...base,
      position: { x: 110, y: 350 },
      view3d: null,
      chapter2: {
        ...base.chapter2,
        water: 1,
        leakShown: true,
        visited: true,
        shutter: 'open',
        power: ['lights', 'gate'],
      },
    }
    await restore(danger)
    await approach('staff')
    await pressE()
    await click('직원 통로 진입')
    await click('회피 시작')
    if (success)
      for (let i = 0; i < 160; i++) {
        const n = await evaluate(
          "+document.querySelector('.dodge-track').getAttribute('aria-valuenow')",
        )
        if (n >= 40 && n <= 58) break
        await wait(15)
      }
    await click('몸 빼기')
    await advanceAll()
    await resume3d()
    assert.equal((await state()).chapter2.staffEvent, success ? 'success' : 'failed')
    assert.equal((await state()).chapter2.water, 1)
    await approach('electrical')
    await pressE()
    await advanceAll()
    await resume3d()
    assert.equal((await state()).area, 'electrical')
  }
  // Legibility checkpoints, separate from the continuous route: exact stage data,
  // fixed safe viewpoint, no gameplay success inferred from these captures.
  for (const water of [0, 1]) {
    const sample = await evaluate(
      `(async()=>{const {makeView3d}=await import('/src/game/view3d.ts');return makeView3d('hall',{x:650,y:490},-1.0,-.4)})()`,
    )
    await restore({
      ...base,
      position: { x: 650, y: 490 },
      view3d: sample,
      chapter2: {
        ...base.chapter2,
        water,
        visited: water === 1,
        leakShown: water === 1,
        shutter: 'open',
      },
    })
    await shot(`12-water-${water}-boundary`)
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  await restore(base, true)
  const before = await state(),
    move = { x: 80, y: 650, id: 1 },
    shift = { x: 115, y: 650, id: 1 },
    look = { x: 300, y: 350, id: 2 }
  const touch = (type, touchPoints) => send('Input.dispatchTouchEvent', { type, touchPoints })
  await touch('touchStart', [move])
  await touch('touchMove', [shift])
  await touch('touchStart', [shift, look])
  await touch('touchMove', [shift, { ...look, x: 330 }])
  await wait(500)
  await touch('touchEnd', [])
  await wait(450)
  const after = await state()
  assert.notDeepEqual(after.position, before.position)
  assert.ok(Math.abs(after.view3d.yaw - before.view3d.yaw) > 0.05)
  await restore(base, true)
  await trustedClick('.interaction button')
  await wait(1100)
  assert.equal((await state()).chapter2.shutter, 'unlatched')
  await shot('07-mobile-unlatched')
  await trustedClick('.interaction button')
  await wait(1100)
  assert.equal((await state()).chapter2.shutter, 'open')
  await trustedClick('[aria-label="조작 도움말"]')
  const slider = async (value) =>
    evaluate(
      `(()=>{const label=[...document.querySelectorAll('label')].find(e=>e.textContent.includes('장면 밝기'));const i=label.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'${value}');i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
  await slider(0.85)
  await wait(100)
  assert.equal(
    await evaluate("JSON.parse(localStorage.getItem('last-transfer-comfort-v1')).brightness"),
    0.85,
  )
  await evaluate(
    "[...document.querySelectorAll('details')].find(d=>d.textContent.includes('어두운 장면')).open=true",
  )
  await shot('08-brightness-sample')
  const power = (await state()).chapter2.power
  await slider(1.25)
  await wait(100)
  await close()
  await wait(200)
  assert.deepEqual((await state()).chapter2.power, power)
  await shot('09-mobile-brightness')
  if (!process.env.PRODUCTION_CHECK) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await send('Emulation.clearDeviceMetricsOverride')
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).startsWith('webgl'))return null;return original.call(this,kind,...args)};localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(base))})`,
    })
    await send('Page.reload')
    await wait(1500)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    assert.ok(await evaluate("!!document.querySelector('.exploration:not(.first-person) canvas')"))
    await trustedClick('.exploration canvas')
    await pressE()
    await wait(1100)
    assert.equal((await state()).chapter2.shutter, 'unlatched')
    await pressE()
    await wait(1100)
    assert.equal((await state()).chapter2.shutter, 'open')
    await shot('10-2d-shutter-open')
  }
  await writeFile(
    `${dir}/${process.env.PRODUCTION_CHECK ? 'production-' : ''}controls.json`,
    JSON.stringify(
      {
        staffSuccessAndFailure: true,
        waterLegibilityCheckpoints: true,
        midOperationSave: true,
        blurCancel: true,
        explanationPauses: true,
        multiTouch: true,
        touchBothStages: true,
        brightness: [0.85, 1.25],
        brightnessDoesNotPowerGate: true,
        fallback2D: !process.env.PRODUCTION_CHECK,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS hall field controls: in-flight save/blur, paused explanation, simultaneous mobile move/look, touch stages, brightness, optional 2D fallback',
  )
}
