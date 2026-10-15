// Real Chromium checks via CDP; no additional npm dependency. Node 22+ required.
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
const base = 'http://127.0.0.1:5175', debug = 'http://127.0.0.1:9223'
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
await access(chrome)
const artifacts = await mkdtemp(join(tmpdir(), 'last-transfer-ch3-'))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { stdio: 'ignore' })
const browser = spawn(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9223', `--user-data-dir=${join(artifacts, 'profile')}`, 'about:blank'], { stdio: 'ignore' })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  async function ready(url) { for (let i = 0; i < 100; i++) { try { const r = await fetch(url); if (r.ok) return r } catch { /* Wait for our child process. */ } await wait(100) } throw new Error(`Could not start ${url}`) }
  await ready(base)
  const pages = await (await ready(`${debug}/json`)).json()
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map(), errors = []
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) { const job = pending.get(message.id); pending.delete(message.id); if (message.error) job.reject(new Error(JSON.stringify(message.error))); else job.resolve(message.result) }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
  })
  function send(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })) }) }
  async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value }
  const state = () => evaluate("JSON.parse(localStorage.getItem('last-transfer-save-v1'))")
  async function click(text) { await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)})&&!b.disabled); if(!b)throw new Error('Button missing: '+${JSON.stringify(text)});b.click() })()`); await wait(80) }
  async function close() { await evaluate("document.querySelector('.close-button').click()"); await wait(80) }
  async function advanceAll() { for (let n = 0; n < 8 && (await state()).scene.length; n++) { await click((await state()).sceneIndex + 1 < (await state()).scene.length ? '다음 대화' : '탐색 계속') } }
  async function screenshot(name) { const r = await send('Page.captureScreenshot'); await writeFile(join(artifacts, name), Buffer.from(r.data, 'base64')) }
  async function hold(key, milliseconds) { const code = key.startsWith('Arrow') ? key : `Key${key.toUpperCase()}`; await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code }); await wait(milliseconds); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code }); await wait(40) }
  async function interact() { await hold('e', 15); await wait(70) }
  // Follow collision-valid waypoints with actual key input, using persisted coordinates as feedback.
  async function walkTo(id) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const route = await evaluate(`(async()=>{
        const m=await import('/src/game/world.ts'),s=JSON.parse(localStorage.getItem('last-transfer-save-v1')),w=m.getWorld(s.area,s.chapter3?.npc,s.chapter3?.npcBoarded),p=s.position;
        if(m.nearestEntity(p,w)?.id===${JSON.stringify(id)})return [];
        const start={x:Math.round(p.x/10)*10,y:Math.round(p.y/10)*10};
        const queue=[start],seen=new Set(),parents=new Map();let goal;
        for(let i=0;i<queue.length;i++){const q=queue[i],k=q.x+','+q.y;if(seen.has(k))continue;seen.add(k);
          const entity=w.entities.find(e=>e.id===${JSON.stringify(id)});const distance=Math.hypot(q.x-Math.max(entity.x,Math.min(q.x,entity.x+entity.w)),q.y-Math.max(entity.y,Math.min(q.y,entity.y+entity.h)));if(m.nearestEntity(q,w)?.id===${JSON.stringify(id)}&&distance<40){goal=q;break}
          for(const d of [{x:10,y:0},{x:-10,y:0},{x:0,y:10},{x:0,y:-10}]){const v={x:q.x+d.x,y:q.y+d.y},vk=v.x+','+v.y;if(m.walkable(v,w)&&!seen.has(vk)&&!parents.has(vk)){parents.set(vk,q);queue.push(v)}}}
        if(!goal)throw Error('No route to '+${JSON.stringify(id)});
        const path=[goal];while(path.at(-1).x!==start.x||path.at(-1).y!==start.y){path.push(parents.get(path.at(-1).x+','+path.at(-1).y));if(path.length>2000)throw Error('Invalid path')}
        path.reverse();let points=[path[0]];for(let i=1;i<path.length-1;i++){if(path[i].x-path[i-1].x!==path[i+1].x-path[i].x||path[i].y-path[i-1].y!==path[i+1].y-path[i].y)points.push(path[i])}points.push(goal);return points;
      })()`)
      if (!route.length) return
      for (const target of route) {
        for (let step = 0; step < 3; step++) {
          const p = (await state()).position, dx = target.x - p.x, dy = target.y - p.y
          if (Math.hypot(dx, dy) < 2) break
          const horizontal = Math.abs(dx) >= Math.abs(dy), distance = horizontal ? dx : dy
          await hold(horizontal ? distance > 0 ? 'd' : 'a' : distance > 0 ? 's' : 'w', Math.max(25, Math.min(2200, Math.abs(distance) / 165 * 1000)))
        }
      }
    }
    await screenshot('failure-navigation.png'); console.error('Navigation state', await state()); throw new Error(`Could not approach ${id}; screenshot at ${artifacts}`)
  }
  async function inputCode(code) { await evaluate(`{const i=document.querySelector('#code');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(code)});i.dispatchEvent(new Event('input',{bubbles:true}))}`); await wait(80); await click('잠금 해제') }
  await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: base }); await wait(700)
  await click('몸을 일으키기'); await advanceAll()
  for (const id of ['panel', 'map', 'cabinet']) { await walkTo(id); await interact(); await advanceAll() }
  await click('휴대폰'); const before = (await state()).position; await hold('w', 300); assert.deepEqual((await state()).position, before)
  await click('동쪽 배수 기록'); await close()
  await walkTo('west'); await interact(); await click('이 경로 선택'); await inputCode('0218')
  const chapter1 = await state(); assert.equal(chapter1.outcome, 'escaped')
  await click('대합실로 이동'); await advanceAll()
  assert.equal((await state()).area, 'hall'); assert.equal((await state()).health, chapter1.health)
  await screenshot('01-hall-desktop.png')
  console.log('PASS first room → chapter 2 with real keyboard navigation')
  // Locked electrical room provides hint before the key is collected.
  await walkTo('electrical'); await interact(); assert.equal((await state()).area, 'hall'); assert.match((await state()).scene[0].text, /안내 데스크/); await advanceAll()
  for (const id of ['hall-map', 'hall-window', 'hall-gate-note', 'hall-desk']) { await walkTo(id); await interact(); await advanceAll() }
  await click('휴대폰'); for (const label of ['직원 통로 끝에', '파란 불빛은', '개찰구는 예비']) await click(label); await close()
  assert.equal((await state()).asked.filter(id => id.startsWith('hall-')).length, 3)
  // A failed risk returns to the hall and cannot deduct health twice, including after reload.
  await walkTo('staff'); await interact(); await click('직원 통로 진입'); await click('회피 시작'); await click('몸 빼기')
  assert.equal((await state()).chapter2.staffEvent, 'failed'); assert.equal((await state()).health, chapter1.health - 20)
  await advanceAll(); await send('Page.reload'); await wait(600)
  await walkTo('staff'); await interact(); assert.equal((await state()).chapter2.staffEvent, 'failed'); await advanceAll()
  assert.equal((await state()).health, chapter1.health - 20)
  await walkTo('electrical'); await interact(); assert.equal((await state()).area, 'electrical')
  await walkTo('powerboard'); await interact(); await click('조명'); await click('방송'); await click('개찰구')
  assert.deepEqual((await state()).chapter2.power, ['lights', 'broadcast'])
  assert.ok((await state()).clues.includes('hall-recording'))
  await screenshot('02-power-puzzle.png')
  await click('조명'); await click('개찰구'); await close()
  await walkTo('hall-return'); await interact(); await walkTo('gate'); await interact()
  assert.equal((await state()).area, 'hall'); assert.match((await state()).scene[0].text, /조명/); await advanceAll()
  // Mobile actual touch input and responsive UI.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 }); await wait(150)
  const b = await evaluate("(()=>{const r=document.querySelector('.joystick').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()")
  const mobileBefore = (await state()).position
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y, id: 1 }] })
  await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x - 32, y: b.y, id: 1 }] }); await wait(400)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(80)
  assert.ok((await state()).position.x < mobileBefore.x - 10)
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false)
  await screenshot('03-mobile-hall.png')
  await walkTo('electrical'); await interact(); await walkTo('powerboard'); await interact(); await click('방송'); await click('조명'); await close()
  await walkTo('hall-return'); await interact()
  await send('Page.reload'); await wait(600)
  assert.deepEqual((await state()).chapter2.power, ['gate', 'lights'])
  assert.ok((await state()).clues.includes('hall-recording')); assert.equal((await state()).inventory.filter(i => i === '전기실 열쇠').length, 1)
  await walkTo('gate'); await interact(); assert.equal((await state()).area, 'stairs')
  await click('다음 대화'); await screenshot('04-footstep-ending.png')
  await send('Page.reload'); await wait(600); assert.equal((await state()).sceneIndex, 1)
  await advanceAll(); assert.equal((await state()).chapter2.completed, true)
  await click('완료 기록 저장'); await send('Page.reload'); await wait(600)
  assert.equal((await state()).scene.length, 0); assert.equal((await state()).chapter2.completed, true)
  assert.equal(await evaluate('!!document.querySelector(".overlay-backdrop")'), false)
  await screenshot('05-completed.png')
  console.log('PASS chapter 2 regression, touch controls, power persistence and ending resume')
  // Continue the same real playthrough through chapter 3.
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
  await walkTo('next-chapter'); await interact(); await advanceAll()
  assert.equal((await state()).area, 'platform')
  await screenshot('06-platform.png')
  await walkTo('survivor'); await interact(); await advanceAll()
  assert.equal((await state()).chapter3.npc, 'found')
  await click('위치와 대피 방향'); await advanceAll()
  assert.equal((await state()).chapter3.npc, 'directed')
  await click('휴대폰'); const pausedAt = (await state()).position; await hold('d', 300); assert.deepEqual((await state()).position, pausedAt); await close()
  await walkTo('train-a'); await interact(); await click('A-17 내부 조사')
  await walkTo('train-a-stop'); await interact(); await advanceAll()
  const explained = (await state()).messages.length
  await send('Page.reload'); await wait(600); await interact(); await advanceAll(); assert.equal((await state()).messages.length, explained)
  await walkTo('exit-a'); await interact(); assert.equal((await state()).area, 'platform')
  await walkTo('train-b'); await interact(); await close()
  await walkTo('platform-record'); await interact(); await advanceAll()
  await walkTo('platform-signal'); await interact(); await advanceAll()
  await click('휴대폰'); for (const label of ['A-17은 운행 중지', '오늘 비상 운행', 'B-04가 출발 대상']) await click(label); await close()
  assert.equal((await state()).asked.filter(id => id.startsWith('platform-')).length, 3)
  await walkTo('approval'); await interact()
  async function select(id,value){await evaluate(`{const e=document.querySelector('#${id}');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))}`);await wait(80)}
  await select('vehicle','A-17');await select('track','△-1');await click('기록 대조')
  assert.equal((await state()).chapter3.approved,false);assert.match((await state()).notice,/불일치/)
  await select('vehicle','B-04');await select('track','◇-2');await click('기록 대조')
  assert.equal((await state()).chapter3.signal,'changing')
  await send('Page.reload');await wait(700);assert.equal((await state()).chapter3.approved,true)
  await wait(1000);assert.equal((await state()).chapter3.signal,'green')
  await walkTo('call-b');await interact();await advanceAll();assert.equal((await state()).chapter3.doorOpen,true)
  const readyToLeave = await state()
  await walkTo('survivor');await interact();await click('함께 탑승하자고');await advanceAll()
  assert.equal((await state()).chapter3.npc,'invited')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await screenshot('07-platform-mobile.png')
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false)
  await walkTo('front-b');await interact();await click('최종 확인 · 탑승')
  assert.equal((await state()).chapter3.npcBoarded,true);assert.equal((await state()).area,'trainB')
  await click('다음 대화');await wait(350);await screenshot('08-departure.png')
  await send('Page.reload');await wait(650);assert.equal((await state()).sceneIndex,1)
  await advanceAll();assert.equal((await state()).chapter3.escaped,true)
  await screenshot('09-escaped.png')
  await click('탈출 기록 저장');await send('Page.reload');await wait(650)
  assert.equal((await state()).scene.length,0);assert.equal((await state()).chapter3.escaped,true)
  assert.equal(await evaluate('!!document.querySelector(".overlay-backdrop")'),false)
  // Replay a real pre-boarding checkpoint to verify explicitly waiting rather than invitation.
  await evaluate(`localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(readyToLeave))});location.reload()`);await wait(650)
  await walkTo('survivor');await interact();await click('구조 대기 의사');await advanceAll()
  assert.equal((await state()).chapter3.npc,'waiting')
  await walkTo('front-b');await interact();await click('최종 확인 · 탑승');await advanceAll()
  assert.equal((await state()).chapter3.npcBoarded,false);assert.equal((await state()).chapter3.escaped,true)
  assert.equal((await state()).chapter3.npc,'waiting');assert.match(await evaluate('document.body.textContent'),/부스 옆 의자/)
  console.log('PASS chapter 3: survivor direction/invite/wait, train A return, questions, approval retry, signal/resume, call, boarding/company, ending persistence, mobile layout')
  assert.deepEqual(errors, [])
  console.log('PASS evidence/questions, locked door, one-time risk, all power pairs, recording persistence, mobile touch, ending/resume, no runtime errors')
  console.log(`Screenshots: ${artifacts}`)
} finally {
  ws?.close(); browser.kill('SIGTERM'); server.kill('SIGTERM')
}
