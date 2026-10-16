import assert from 'node:assert/strict'
export async function verifyResume({
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
}) {
  const status = () =>
    evaluate(
      "({locked:!!document.pointerLockElement,paused:document.querySelector('.first-person').classList.contains('is-paused'),focus:document.activeElement===document.querySelector('canvas'),resume:!!document.querySelector('.exploration-resume')})",
    )
  async function ui(text) {
    await evaluate(
      `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)})&&!b.disabled);if(!b)throw Error('No button '+${JSON.stringify(text)});b.dataset.gesture='target'})()`,
    )
    await trustedClick('[data-gesture="target"]')
    await evaluate(
      "document.querySelector('[data-gesture=target]')?.removeAttribute('data-gesture')",
    )
  }
  async function finishDialogue() {
    for (let i = 0; i < 8 && (await state()).scene.length; i++) {
      const s = await state()
      if (s.sceneIndex + 1 < s.scene.length) await ui('다음 대화')
      else await hold('Enter', 30)
      if ((await state()).scene.length)
        assert.equal((await status()).locked, false, 'nested dialogue still blocks')
    }
  }
  async function esc() {
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
    await wait(120)
  }
  await seed({ x: 480, y: 150 })
  await pressE(true)
  assert.ok((await state()).clues.includes('map'))
  assert.deepEqual(await status(), { locked: true, paused: false, focus: true, resume: false })
  assert.ok(await evaluate("!!document.querySelector('.field-note')"))
  const before = (await state()).position
  await hold('s', 350)
  assert.ok((await state()).position.y > before.y + 10)
  await look(0.3)
  await look(0)
  await screenshot('resume-short-inspection.png')
  await approach('cabinet')
  const battery = (await state()).battery
  await pressE(true)
  await pressE(true)
  await pressE(true, true)
  assert.equal((await state()).battery, battery - 5)
  assert.equal((await state()).inventory.filter((x) => x === '절연 장갑').length, 1)
  assert.equal((await status()).locked, true)
  await approach('panel')
  await pressE(true)
  await approach('oh')
  await pressE(true)
  assert.equal((await status()).paused, true)
  assert.equal((await status()).locked, false)
  await evaluate(
    'window.lockAttempts=0;window.nativeLock=HTMLCanvasElement.prototype.requestPointerLock;HTMLCanvasElement.prototype.requestPointerLock=function(...args){window.lockAttempts++;return window.nativeLock.apply(this,args)}',
  )
  await finishDialogue()
  assert.deepEqual(await status(), { locked: true, paused: false, focus: true, resume: false })
  assert.equal(await evaluate('window.lockAttempts'), 1, 'only final dialogue input requests lock')
  await pressE(true, true)
  assert.equal((await state()).scene.length, 0, 'held E cannot reopen NPC')
  const stationary = (await state()).position
  await wait(250)
  assert.deepEqual((await state()).position, stationary, 'no stale movement')
  await esc()
  const attempts = await evaluate('window.lockAttempts')
  await wait(300)
  assert.equal((await status()).locked, false)
  assert.equal((await status()).paused, false)
  assert.equal(await evaluate('window.lockAttempts'), attempts, 'Esc never auto-relocks')
  await trustedClick('.first-person canvas')
  assert.equal((await status()).locked, true)
  assert.equal((await state()).scene.length, 0, 'resume click is consumed')
  assert.deepEqual((await state()).position, stationary)
  await esc()
  await ui('휴대폰')
  await trustedClick('.close-button')
  assert.equal((await status()).locked, true, 'phone close gesture resumes')
  await esc()
  await ui('소지품·단서')
  await trustedClick('.close-button')
  assert.equal((await status()).locked, true, 'bag close gesture resumes')
  // Deterministic browser denial: one attempt and a consumed canvas fallback gesture.
  await esc()
  await ui('휴대폰')
  await evaluate(
    "window.lockAttempts=0;HTMLCanvasElement.prototype.requestPointerLock=function(){window.lockAttempts++;return Promise.reject(new DOMException('test denial','NotAllowedError'))}",
  )
  await trustedClick('.close-button')
  await wait(350)
  assert.equal(await evaluate('window.lockAttempts'), 1)
  assert.deepEqual(await status(), { locked: false, paused: false, focus: true, resume: true })
  await screenshot('resume-denied-fallback.png')
  await evaluate('HTMLCanvasElement.prototype.requestPointerLock=window.nativeLock')
  await trustedClick('.first-person canvas')
  assert.equal((await status()).locked, true)
  assert.equal((await state()).scene.length, 0)
  await esc()
  await ui('휴대폰')
  await click('동쪽 배수 기록')
  await trustedClick('.close-button')
  await approach('west')
  await pressE(true)
  await trustedClick('.close-button')
  assert.equal((await status()).locked, true, 'route menu cancel resumes')
  await pressE(true)
  await ui('이 경로 선택')
  assert.equal((await status()).locked, false, 'puzzle remains blocked after route menu')
  assert.equal((await status()).paused, true)
  await trustedClick('.close-button')
  assert.equal((await status()).locked, true, 'puzzle cancel resumes')
  await pressE(true)
  await inputCode('0218')
  assert.equal((await status()).locked, false, 'success result still blocks')
  assert.equal((await status()).paused, true)
  await trustedClick('.close-button')
  assert.equal((await status()).locked, true, 'final result close gesture resumes')
  assert.equal((await state()).outcome, 'escaped')
  await screenshot('resume-puzzle-success.png')
  console.log(
    'PASS resume: nonblocking clues/items, immediate move/look, NPC last gesture, nested UI, phone/bag, puzzle cancel/success, Esc intent, single denied request, consumed canvas fallback, repeat E/resource guards',
  )
}
