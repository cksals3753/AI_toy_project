import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
export const verifyHallRestructure = async (api) => {
  const {
    send,
    evaluate,
    state,
    wait,
    resume3d,
    approach,
    pressE,
    advanceAll,
    click,
    close,
    hold,
    look,
    trustedClick,
  } = api
  const dir = 'docs/chapter2-restructure'
  await mkdir(dir, { recursive: true })
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot')
    await writeFile(
      `${dir}/${process.env.PRODUCTION_CHECK ? 'production-' : ''}${name}.png`,
      Buffer.from(s.data, 'base64'),
    )
  }
  const restore = async (s) => {
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(s))})`,
    })
    await send('Page.reload')
    await wait(1300)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    await advanceAll()
    await resume3d()
  }
  const base = await evaluate(
    `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,stage:'explore',area:'hall',health:1,battery:0,scene:[],position:{x:470,y:480}}})()`,
  )
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('last-transfer-comfort-v1',JSON.stringify({mouseSensitivity:.0015,touchSensitivity:.003,fov:64,moveSpeed:.6,brightness:1}));localStorage.setItem('last-transfer-audio-v1',JSON.stringify({muted:true,volume:.35}))`,
  })
  await restore(base)
  await look(0, -0.15)
  await shot('01-initial-water')
  const act = async (id) => {
    await approach(id)
    await pressE()
    await advanceAll()
  }
  for (const id of ['hall-window', 'hall-map', 'hall-desk', 'hall-gate-note']) await act(id)
  assert.ok((await state()).inventory.includes('전기실 열쇠'))
  await approach('hall-shutter')
  await shot('02-shutter-locked')
  await pressE()
  await hold('s', 100)
  await wait(150)
  assert.equal((await state()).chapter2.shutter, 'locked', 'movement cancels unfinished operation')
  await approach('hall-shutter')
  await pressE()
  await wait(250)
  await evaluate('document.exitPointerLock()')
  await wait(100)
  await trustedClick('[aria-label="조작 도움말"]')
  assert.equal((await state()).chapter2.shutter, 'locked', 'menu cancels')
  await close()
  await resume3d()
  await approach('hall-shutter')
  await pressE()
  await pressE(false, true)
  await wait(1100)
  assert.equal((await state()).chapter2.shutter, 'unlatched', 'repeat does not perform two stages')
  await shot('03-shutter-unlatched')
  const unlatched = await state()
  await restore(unlatched)
  assert.equal((await state()).chapter2.shutter, 'unlatched')
  await approach('hall-shutter')
  await pressE()
  await wait(1100)
  assert.equal((await state()).chapter2.shutter, 'open')
  await shot('04-shutter-open')
  await act('electrical')
  assert.equal((await state()).area, 'electrical')
  await wait(350)
  const leakDeferredInSafety = (await state()).chapter2.water === 0
  await act('powerboard')
  await click('방송')
  await click('조명')
  await click('개찰구')
  assert.equal((await state()).chapter2.power.length, 2)
  await click('방송')
  await click('개찰구')
  await close()
  await resume3d()
  assert.ok((await state()).clues.includes('hall-recording'))
  const powered = await state()
  await act('hall-return')
  await resume3d()
  await hold('a', 300)
  await hold('w', 650)
  for (let i = 0; i < 80 && (await state()).chapter2.water === 0; i++) await wait(100)
  await look(0, -0.15)
  await shot('05-increased-water')
  assert.equal((await state()).chapter2.water, 1)
  const returning = await state()
  assert.deepEqual(returning.chapter2.power, powered.chapter2.power)
  await act('gate')
  await advanceAll()
  await click('완료 기록 저장')
  await resume3d()
  assert.equal((await state()).area, 'stairs')
  await act('next-chapter')
  assert.equal((await state()).area, 'platform')
  await shot('06-chapter3-connected')
  const continuousRouteCaptureRetries = (await state()).threat.revision
  // Checkpoint-derived optional danger outcome; retain the real path above separately.
  if (!process.env.PRODUCTION_CHECK) {
    for (const success of [false, true]) {
      await restore({ ...returning, chapter2: { ...returning.chapter2, staffEvent: 'unseen' } })
      await act('staff')
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
    }
  }
  await writeFile(
    `${dir}/${process.env.PRODUCTION_CHECK ? 'production-' : ''}result.json`,
    JSON.stringify(
      {
        ch2ContinuousFromEntry: true,
        minimumSpeed: 0.6,
        muted: true,
        unlatchedSave: true,
        powerOrder: true,
        gateAndChapter3: true,
        continuousRouteCaptureRetries,
        leakDeferredInSafety,
        checkpointBranches: !process.env.PRODUCTION_CHECK,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS hall restructure: initial/raised water, real navigation at .6, two physical shutter steps/cancel/repeat/save, power order/recording, gate and chapter3',
  )
}
