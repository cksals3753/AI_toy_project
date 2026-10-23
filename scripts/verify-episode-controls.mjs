import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'

// Supplementary checkpoint test, separate from the unmodified fresh-game run.
export const verifyEpisodeControls = async ({
  send,
  evaluate,
  click,
  close,
  state,
  wait,
  hold,
  approach,
  pressE,
  resume3d,
  trustedClick,
}) => {
  const dir = 'docs/episode1-3d-integration',
    samples = []
  const checkpoint = JSON.parse(await readFile(`${dir}/checkpoints.json`, 'utf8'))['03-repeat-2']
  assert.equal(checkpoint.area, 'hall')
  const script = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(checkpoint))})`,
  })
  await send('Page.reload')
  await wait(1100)
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
  await state()
  await resume3d()
  const listenerCounts = async () => {
    const r = await send('Runtime.evaluate', {
      expression:
        "JSON.stringify(Object.fromEntries(['keydown','keyup','mousemove','blur'].map(k=>[k,(getEventListeners(window)[k]??[]).length])))",
      returnByValue: true,
      includeCommandLineAPI: true,
    })
    return JSON.parse(r.result.value)
  }
  const baseline = await listenerCounts()
  await send('Performance.enable')
  const sample = async (i) => {
    await send('HeapProfiler.collectGarbage')
    const r = await send('Performance.getMetrics')
    const record = {
      round: i,
      canvas: await evaluate("document.querySelectorAll('.first-person canvas').length"),
      listeners: await listenerCounts(),
      metrics: Object.fromEntries(
        r.metrics
          .filter((x) =>
            ['JSHeapUsedSize', 'Nodes', 'JSEventListeners', 'Documents'].includes(x.name),
          )
          .map((x) => [x.name, x.value]),
      ),
      render: await evaluate("({...document.querySelector('canvas').dataset})"),
    }
    assert.equal(record.canvas, 1)
    assert.deepEqual(record.listeners, baseline)
    if (samples.length) {
      assert.equal(record.metrics.Nodes, samples[0].metrics.Nodes, 'retired scene DOM released')
      assert.equal(
        record.metrics.JSEventListeners,
        samples[0].metrics.JSEventListeners,
        'retired context listeners released',
      )
    }
    samples.push(record)
  }
  await sample(0)
  for (let i = 1; i <= 8; i++) {
    for (const id of ['electrical', 'hall-return']) {
      await approach(id)
      await pressE()
      await resume3d()
    }
    await sample(i)
  }
  await evaluate("document.querySelector('canvas').focus()")
  for (const [code, key] of [
    ['Tab', 'Tab'],
    ['KeyI', 'ㅑ'],
  ]) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key })
    await wait(100)
    assert.equal(await evaluate("!!document.querySelector('.overlay-panel')"), true)
    const p = (await state()).position
    await hold('w', 180)
    assert.deepEqual((await state()).position, p)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape' })
    await wait(100)
    await resume3d()
  }
  // Real browser tab activation while a movement key is held: no keyUp is delivered to the old page.
  const targets = await send('Target.getTargets'),
    current = targets.targetInfos.find(
      (t) => t.type === 'page' && t.url.startsWith('http://127.0.0.1'),
    )
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyS', key: 's' })
  await wait(120)
  const other = await send('Target.createTarget', { url: 'about:blank' })
  await send('Target.activateTarget', { targetId: other.targetId })
  await wait(200)
  await send('Target.activateTarget', { targetId: current.targetId })
  await send('Page.bringToFront')
  await wait(150)
  await resume3d()
  const focused = (await state()).position
  await wait(500)
  assert.deepEqual((await state()).position, focused, 'held movement cleared on real tab blur')
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyS', key: 's' })
  await send('Target.closeTarget', { targetId: other.targetId })
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  await send('Page.reload')
  await wait(1100)
  await state()
  if (await evaluate("!!document.querySelector('.exploration-resume')"))
    await trustedClick('.exploration-resume')
  const rect = await evaluate(
    "(()=>{const r=document.querySelector('[data-move-zone]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()",
  )
  const before = await state(),
    yaw = await evaluate("+document.querySelector('canvas').dataset.yaw")
  const touches = [
    { x: rect.x, y: rect.y, id: 1 },
    { x: 290, y: 400, id: 2 },
  ]
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches })
  await wait(80)
  await send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { ...touches[0], x: rect.x + 25 },
      { x: 330, y: 420, id: 2 },
    ],
  })
  await wait(350)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(450)
  assert.notDeepEqual((await state()).position, before.position, 'mobile simultaneous move')
  assert.ok(
    Math.abs((await evaluate("+document.querySelector('canvas').dataset.yaw")) - yaw) > 0.1,
    'mobile simultaneous look',
  )
  const released = (await state()).position
  await wait(500)
  assert.deepEqual((await state()).position, released, 'all touches released')
  const shot = await send('Page.captureScreenshot')
  await writeFile(`${dir}/12-mobile-controls.png`, Buffer.from(shot.data, 'base64'))
  await writeFile(
    `${dir}/stability.json`,
    JSON.stringify(
      {
        checkpoint: 'real continuous 03-repeat-2',
        roundTrips: 8,
        samples,
        pcMenus: true,
        realTabBlur: true,
        mobileSimultaneous: true,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS checkpoint stability: eight round trips, post-GC heap/DOM samples, single Canvas/listeners, Tab/I/Esc, real tab blur, mobile simultaneous move/look',
  )
}
