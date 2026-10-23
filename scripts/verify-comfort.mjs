import assert from 'node:assert/strict'
export const verifyComfort = async ({
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
}) => {
  const camera = () =>
    evaluate(
      "(()=>{const c=document.querySelector('canvas');return {yaw:+c.dataset.yaw,pitch:+c.dataset.pitch,fov:+c.dataset.cameraFov}})()",
    )
  await look(0)
  const a = await camera()
  await wait(600)
  assert.deepEqual(await camera(), a, 'idle camera must not move')
  await hold('d', 250)
  assert.deepEqual(await camera(), a, 'movement does not bob, roll or alter FOV')
  await evaluate('document.querySelector(\'[aria-label="조작 도움말"]\').click()')
  await wait(100)
  assert.equal(await evaluate('!!document.pointerLockElement'), false)
  assert.match(await evaluate('document.body.textContent'), /화면·조작/)
  const setRange = async (label, value) =>
    evaluate(
      `(()=>{const input=[...document.querySelectorAll('fieldset label')].find(x=>x.textContent.includes(${JSON.stringify(label)})).querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(String(value))});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
  await setRange('시야각', 75)
  await setRange('이동 속도', 0.6)
  await setRange('마우스 감도', 0.001)
  await wait(150)
  const saved = await evaluate("JSON.parse(localStorage.getItem('last-transfer-comfort-v1'))")
  assert.equal(saved.fov, 75)
  assert.equal(saved.moveSpeed, 0.6)
  await close()
  await resume3d()
  assert.ok(Math.abs((await camera()).fov - 75) < 0.01)
  await look(0.4, 0.2)
  const turned = await camera()
  assert.ok(Math.abs(turned.yaw - 0.4) < 0.01 && Math.abs(turned.pitch - 0.2) < 0.01)
  await hold('w', 200)
  assert.deepEqual(await camera(), turned)
  const timing = await evaluate(
    `new Promise(resolve=>{let previous=performance.now();const samples=[];const tick=now=>{samples.push(now-previous);previous=now;if(samples.length<100)requestAnimationFrame(tick);else{samples.sort((a,b)=>a-b);resolve({frames:100,p50:samples[50],p95:samples[95],max:samples.at(-1),renderer:'headless Chrome SwiftShader'})}};requestAnimationFrame(tick)})`,
  )
  console.log('Comfort frame cadence:', JSON.stringify(timing))
  await screenshot('comfort-desktop.png')
  const before = (await state()).view3d
  await send('Page.reload')
  await wait(1500)
  await state()
  await resume3d()
  assert.deepEqual(
    await evaluate("JSON.parse(localStorage.getItem('last-transfer-comfort-v1'))"),
    saved,
  )
  assert.ok(Math.abs((await camera()).yaw - before.yaw) < 0.01)
  await evaluate('document.querySelector(\'[aria-label="조작 도움말"]\').click()')
  await wait(100)
  await click('화면·조작 기본값 복원')
  await wait(100)
  assert.equal(
    await evaluate("JSON.parse(localStorage.getItem('last-transfer-comfort-v1')).mouseSensitivity"),
    0.0015,
  )
  await close()
  await resume3d()
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await send('Page.reload')
  await wait(1500)
  await state()
  await wait(300)
  const c = await camera()
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 290, y: 350, id: 1 }],
  })
  await send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 340, y: 350, id: 1 }],
  })
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(150)
  assert.ok(
    Math.abs((await camera()).yaw - c.yaw + 0.15) < 0.015,
    '50 CSS pixels at reference width rotate .15 rad regardless of DPR',
  )
  await screenshot('comfort-mobile.png')
  console.log(
    'PASS comfort: idle/strafing camera, live settings, FOV, proportional mouse/touch, separate persistence, reset, mobile DPR2',
  )
}
