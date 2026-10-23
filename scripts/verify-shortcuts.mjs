import assert from 'node:assert/strict'
export async function verifyShortcuts({
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
  advanceAll,
  approach,
}) {
  const panel = () => evaluate("document.querySelector('[data-game-menu]')?.dataset.gameMenu??null")
  const locked = () => evaluate('!!document.pointerLockElement')
  async function key(code, key = code, repeat = false, release = true) {
    const vk = code === 'Tab' ? 9 : code === 'Escape' ? 27 : 73
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      code,
      key,
      windowsVirtualKeyCode: vk,
      autoRepeat: repeat,
    })
    if (release)
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: vk })
    await wait(120)
  }
  await seed({ x: 480, y: 150 })
  await evaluate(
    'window.lockAttempts=0;window.nativeLock=HTMLCanvasElement.prototype.requestPointerLock;HTMLCanvasElement.prototype.requestPointerLock=function(...args){window.lockAttempts++;return window.nativeLock.apply(this,args).catch(e=>{window.lastLockFailure={name:e.name,message:e.message};throw e})}',
  )
  await key('Tab')
  assert.equal(await panel(), 'phone')
  assert.equal(await locked(), false)
  const stopped = (await state()).position
  await hold('w', 200)
  assert.deepEqual((await state()).position, stopped)
  await key('KeyI', 'ㅑ')
  assert.equal(await panel(), 'bag')
  await key('Tab')
  assert.equal(await panel(), 'phone')
  assert.equal(await evaluate('window.lockAttempts'), 0, 'switching menus must not request lock')
  await key('Tab')
  assert.equal(await panel(), null)
  assert.equal(await locked(), true)
  assert.equal(await evaluate('window.lockAttempts'), 1)
  await key('KeyI', 'ㅑ', false, false)
  assert.equal(await panel(), 'bag')
  await key('KeyI', 'ㅑ', true, false)
  assert.equal(await panel(), 'bag')
  await key('KeyI', 'ㅑ', false, false)
  assert.equal(await panel(), 'bag', 'held-key latch survives menu render')
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    code: 'KeyI',
    key: 'ㅑ',
    windowsVirtualKeyCode: 73,
  })
  await key('KeyI', 'ㅑ')
  assert.equal(await panel(), null)
  await key('Tab')
  for (const tag of ['input', 'textarea', 'div']) {
    await evaluate(
      `(()=>{const e=document.createElement(${JSON.stringify(tag)});e.id='typing-fixture';if(e.tagName==='DIV')e.contentEditable='true';const n=document.createElement('button');n.id='typing-next';n.textContent='다음 입력';document.querySelector('[data-game-menu]').append(e,n);e.focus()})()`,
    )
    await key('KeyI', 'ㅑ')
    assert.equal(await panel(), 'phone', 'typing I must not switch')
    await key('Escape')
    assert.equal(await panel(), 'phone', 'editable Escape remains outside game shortcuts')
    await evaluate(
      "window.tabPrevented=null;document.querySelector('#typing-fixture').addEventListener('keydown',e=>{if(e.code==='Tab')queueMicrotask(()=>{window.tabPrevented=e.defaultPrevented})},{once:false})",
    )
    await key('Tab')
    assert.equal(await panel(), 'phone')
    assert.equal(
      await evaluate('window.tabPrevented'),
      false,
      'typing Tab keeps native focus navigation',
    )
    await evaluate(
      "document.querySelector('#typing-fixture').remove();document.querySelector('#typing-next').remove();document.querySelector('.close-button').focus()",
    )
  }
  await key('Escape')
  assert.equal(await panel(), null)
  if (!(await locked())) {
    assert.ok(await evaluate("!!document.querySelector('.exploration-resume')"))
    await wait(1500)
    await resume3d()
  } // Browser Escape policy may require a canvas gesture.
  const p = (await state()).position
  await wait(150)
  assert.deepEqual((await state()).position, p)
  // Page chrome focus must not be treated as game focus, including when lock is still held.
  await evaluate(
    "(()=>{const b=document.createElement('button');b.id='outside-game';b.textContent='페이지 외부';Object.assign(b.style,{position:'fixed',left:'0',top:'0',zIndex:1000});document.body.append(b);b.focus()})()",
  )
  await key('KeyI', 'ㅑ')
  assert.equal(await panel(), null)
  await key('Tab')
  assert.equal(await panel(), null)
  await evaluate(
    "document.querySelector('#outside-game')?.remove();document.querySelector('canvas').focus()",
  )
  await key('Tab')
  assert.equal(await panel(), 'phone')
  // A denied close request must keep the existing click-to-resume fallback, with no retry loop.
  await evaluate(
    "window.lockAttempts=0;HTMLCanvasElement.prototype.requestPointerLock=function(){window.lockAttempts++;return Promise.reject(new DOMException('test denial','NotAllowedError'))}",
  )
  await key('Tab')
  await wait(200)
  assert.equal(await panel(), null)
  assert.equal(await evaluate('window.lockAttempts'), 1)
  assert.equal(await locked(), false)
  assert.ok(await evaluate("!!document.querySelector('.exploration-resume')"))
  await evaluate('HTMLCanvasElement.prototype.requestPointerLock=window.nativeLock')
  await send('Page.bringToFront')
  assert.equal(
    await evaluate(
      "(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===c})()",
    ),
    true,
    'resume point must hit canvas',
  )
  await trustedClick('canvas')
  assert.equal(await locked(), true)
  assert.equal((await state()).clues.includes('map'), false, 'resume click must not investigate')
  await pressE(true)
  assert.ok((await state()).clues.includes('map'), 'existing Korean E still investigates')
  await screenshot('shortcuts-desktop.png')
  // Actual puzzle UI checkpoint: Tab/I cannot replace it, including the text field.
  const s = await state()
  s.stage = 'lock'
  s.route = 'west'
  s.position = { x: 95, y: 265 }
  s.view3d = null
  await evaluate(
    `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(s))});location.reload()`,
  )
  await wait(900)
  await state()
  assert.ok(await evaluate("!!document.querySelector('#code')"))
  await evaluate("document.querySelector('.close-button').focus()")
  await key('Tab')
  await key('KeyI', 'ㅑ')
  assert.equal(await panel(), null)
  assert.ok(await evaluate("!!document.querySelector('#code')"))
  await screenshot('shortcuts-puzzle-guard.png')
  // Non-menu dialogue is also protected from the new shortcuts.
  const hallSave = await state()
  hallSave.area = 'hall'
  hallSave.stage = 'explore'
  hallSave.position = { x: 480, y: 150 }
  hallSave.view3d = { version: 1, area: 'hall', position: { x: 0, z: -4 }, yaw: 0, pitch: 0 }
  hallSave.scene = []
  hallSave.outcome = null
  await evaluate(
    `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(hallSave))});location.reload()`,
  )
  await wait(900)
  await state()
  // Hall saves intentionally resume through a paused safe-checkpoint notice.
  await advanceAll()
  await resume3d()
  await evaluate("document.querySelector('canvas').focus()")
  await key('KeyI', 'ㅑ')
  assert.equal(await panel(), 'bag')
  await key('Tab')
  assert.equal(await panel(), 'phone')
  await key('Escape')
  assert.equal(await panel(), null)
  await resume3d()
  await approach('hall-map')
  await pressE(true)
  assert.ok((await state()).clues.includes('hall-map'))
  const dialogue = (await state()).scene.length
  assert.ok(dialogue > 0)
  await key('Tab')
  await key('KeyI', 'ㅑ')
  assert.equal(await panel(), null)
  assert.equal((await state()).scene.length, dialogue)
  await advanceAll()
  await resume3d()
  await key('Tab')
  await evaluate("document.querySelector('[data-overlay-dismiss]').focus()")
  await key('Tab')
  assert.equal(await panel(), null, 'Tab at the new footer still closes the shortcut menu')
  // Mobile UI/touch regression is covered by FIRST_PERSON_CHECK=1; no external AI is enabled.
  console.log(
    'PASS shortcuts: locked opening/toggling, Korean I, menu switch without lock requests, repeat latch, editable/native Tab, page focus, Escape/fallback, consumed click, E, puzzle guard',
  )
}
