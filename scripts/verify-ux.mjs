import assert from 'node:assert/strict'
export async function verifyUx({ evaluate, click, close, wait, state, send, screenshot }) {
  const before = await state()
  await send('Page.reload')
  await wait(600)
  assert.equal(await evaluate('!!document.querySelector(\'[aria-label="저장된 여정"]\')'), true)
  assert.match(await evaluate('document.querySelector(".overlay-panel").textContent'), /챕터 2/)
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent==='새 게임').click()",
  )
  assert.match(
    await evaluate('document.querySelector(".overlay-panel").textContent'),
    /초기화됩니다/,
  )
  const saved = await evaluate("JSON.parse(localStorage.getItem('last-transfer-save-v1'))")
  assert.equal(saved.area, before.area)
  assert.equal(saved.health, before.health)
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent==='계속 플레이').click()",
  )
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('이어하기 →')).click()",
  )
  await wait(150)
  await click('소지품')
  assert.ok((await evaluate('document.querySelectorAll(".notebook-place").length')) > 0)
  await screenshot('ux-notebook-desktop.png')
  await close()
  assert.equal((await state()).reading.clues.length, (await state()).clues.length)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await wait(100)
  await click('휴대폰')
  await wait(100)
  await close()
  await wait(100)
  const stopped = (await state()).position
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'ArrowRight',
    code: 'ArrowRight',
    autoRepeat: true,
  })
  await wait(500)
  const after = (await state()).position
  assert.ok(
    Math.hypot(stopped.x - after.x, stopped.y - after.y) < 1,
    'held input resumed after closing phone',
  )
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' })
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft' })
  await wait(220)
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft' })
  await wait(80)
  const moved = (await state()).position
  assert.ok(Math.hypot(after.x - moved.x, after.y - moved.y) > 1, 'fresh input did not recover')
  assert.equal((await state()).health, before.health)
  await screenshot('ux-objective-desktop.png')
  console.log(
    'PASS UX: saved landing, reset cancellation, grouped notebook/read badges, held-key reset and fresh input recovery',
  )
}
