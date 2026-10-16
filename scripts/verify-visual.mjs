import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const directory = 'docs/visual-review'
export async function verifyVisual({ send, evaluate, state, wait, trustedClick, look }) {
  const label = process.env.VISUAL_LABEL ?? 'after'
  await mkdir(directory, { recursive: true })
  const results = {
    label,
    environment:
      'Chrome headless / SwiftShader, DPR 1; development build. RAF is presentation timing, not GPU frame time.',
    views: [],
  }
  const original = await state()
  async function shot(name) {
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`${directory}/${label}-${name}.png`, Buffer.from(data, 'base64'))
  }
  async function measure(name) {
    await wait(1500)
    const sample = await evaluate(
      `new Promise(resolve=>{const frames=[];let previous=0;const start=performance.now();function frame(t){if(previous)frames.push(t-previous);previous=t;if(t-start<4000)requestAnimationFrame(frame);else{const sorted=[...frames].sort((a,b)=>a-b),c=document.querySelector('canvas'),r=c.getBoundingClientRect();resolve({frames:frames.length,meanMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95Ms:sorted[Math.floor(sorted.length*.95)],drawCalls:+c.dataset.drawCalls,triangles:+c.dataset.triangles,shadows:c.dataset.shadows,npcModel:c.dataset.npcModel,npcIdle:c.dataset.npcIdle,canvas:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight},position:JSON.parse(localStorage.getItem('last-transfer-save-v1')).position,yaw:+c.dataset.yaw,pitch:+c.dataset.pitch})}}requestAnimationFrame(frame)})`,
    )
    if (label === 'after') {
      assert.equal(await evaluate("document.querySelector('canvas').dataset.npcModel"), 'true')
      assert.equal(await evaluate("document.querySelector('canvas').dataset.npcIdle"), 'true')
      assert.equal(
        await evaluate(
          "[...document.querySelectorAll('.asset-warning')].some(e=>e.textContent.includes('로딩 실패'))",
        ),
        false,
      )
      assert.ok(sample.canvas.width >= sample.viewport.width - 2)
      assert.ok(sample.canvas.height >= sample.viewport.height - 2)
      assert.ok(
        await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
        'no horizontal overflow',
      )
      assert.equal(
        await evaluate("!!document.querySelector('.exploration-resume strong')"),
        false,
        'no large repeat help',
      )
    }
    results.views.push({ name, ...sample })
    await shot(name)
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await wait(500)
  await measure('desktop')
  if (label === 'after') {
    await evaluate('document.exitPointerLock()')
    await wait(100)
    await shot('resume')
    await trustedClick('.hud-objective button')
    assert.equal(
      await evaluate(
        "document.querySelector('.hud-objective button').getAttribute('aria-expanded')",
      ),
      'false',
    )
    assert.equal(
      await evaluate('!!document.pointerLockElement'),
      false,
      'HUD button does not resume exploration',
    )
    await trustedClick('.hud-objective button')
    await trustedClick('.hud-utilities button')
    assert.equal(await evaluate('!!document.pointerLockElement'), false)
    await shot('help')
    await trustedClick('.close-button')
    if (await evaluate("!!document.querySelector('.exploration-resume')"))
      await trustedClick('canvas')
    await wait(150)
  }
  // Same NPC position and camera orientation before/after; gameplay data is untouched.
  const npc = { ...original, position: { x: 220, y: 420 } }
  await evaluate(
    `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(npc))});location.reload()`,
  )
  await wait(1100)
  await state()
  await wait(200)
  if (await evaluate("!!document.querySelector('.exploration-resume')"))
    await trustedClick('.exploration-resume')
  await look(0)
  await shot('npc')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await evaluate(
    `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(original))});location.reload()`,
  )
  await wait(1100)
  await state()
  await wait(200)
  if (await evaluate("!!document.querySelector('.exploration-resume')"))
    await trustedClick('.exploration-resume')
  await measure('mobile')
  if (label === 'after') {
    for (const size of [
      [844, 390],
      [360, 640],
      [1920, 1080],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: size[0],
        height: size[1],
        deviceScaleFactor: 1,
        mobile: size[0] < 1000,
      })
      await send('Emulation.setTouchEmulationEnabled', { enabled: size[0] < 1000 })
      await wait(250)
      const layout = await evaluate(
        "(()=>{const c=document.querySelector('canvas').getBoundingClientRect();const buttons=[...document.querySelectorAll('.world-toolbar button,.compact-hud button')].map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom}});return {canvas:{width:c.width,height:c.height},width:innerWidth,height:innerHeight,buttons}})()",
      )
      assert.ok(Math.abs(layout.canvas.width - size[0]) < 2)
      assert.ok(Math.abs(layout.canvas.height - size[1]) < 2)
      for (const b of layout.buttons) {
        assert.ok(
          b.x >= 0 && b.y >= 0 && b.right <= layout.width + 1 && b.bottom <= layout.height + 1,
          JSON.stringify(b),
        )
      }
      results.views.push({ name: `layout-${size.join('x')}`, ...layout })
      await shot(`layout-${size.join('x')}`)
    }
  }
  if (label === 'after') {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await send('Emulation.setTouchEmulationEnabled', { enabled: false })
    for (const area of ['hall', 'platform', 'trainB', 'moonPlatform', 'maintenance']) {
      const fixture = {
        ...original,
        area,
        stage: 'explore',
        scene: [],
        position: { x: 480, y: 460 },
        chapter3: {
          ...original.chapter3,
          started: true,
          approved: true,
          signal: 'green',
          doorOpen: true,
          boarded: area !== 'hall' && area !== 'platform',
          escaped: area !== 'hall' && area !== 'platform',
          ending: 'complete',
        },
        chapter4: {
          ...original.chapter4,
          started: ['trainB', 'moonPlatform', 'maintenance'].includes(area),
          sync: 'accepted',
          arrived: area !== 'trainB',
          doorSeen: true,
          completed: area === 'moonPlatform' || area === 'maintenance',
        },
        chapter5: {
          ...original.chapter5,
          started: area === 'moonPlatform' || area === 'maintenance',
          displayName: '기록자',
          response: 'answered',
          registration: 'cancelled',
          matched: true,
          externalPaused: true,
          routeOpen: true,
          exitSeen: true,
          completed: area === 'maintenance',
        },
        chapter6: { ...original.chapter6, started: area === 'maintenance' },
      }
      await evaluate(
        `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(fixture))});location.reload()`,
      )
      await wait(650)
      assert.equal((await state()).area, area)
      await wait(120)
      assert.equal(await evaluate("!!document.querySelector('.first-person')"), false)
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true)
      await shot(`2d-${area}`)
    }
  }
  await writeFile(`${directory}/${label}-metrics.json`, JSON.stringify(results, null, 2) + '\n')
  console.log('PASS visual capture', label, JSON.stringify(results.views))
}
