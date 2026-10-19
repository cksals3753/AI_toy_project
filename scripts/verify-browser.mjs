import { verifyFirstPerson } from './verify-first-person.mjs'
import { verifyChapter6 } from './verify-chapter6.mjs'
import { verifyUx } from './verify-ux.mjs'
// Real Chromium checks via CDP; no additional npm dependency. Node 22+ required.
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { verifyAiChat } from './verify-ai-chat.mjs'
import { verifyChapter5 } from './verify-chapter5.mjs'
const browserPort = process.env.BROWSER_PORT || '5175'
const debugPort = process.env.BROWSER_DEBUG_PORT || '9223'
const base = `http://127.0.0.1:${browserPort}`,
  debug = `http://127.0.0.1:${debugPort}`
const chrome =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
await access(chrome)
const artifacts = await mkdtemp(join(tmpdir(), 'last-transfer-ch5-'))
const backendJar = 'backend/target/last-transfer-api-0.0.1-SNAPSHOT.jar'
const frontendOnly = !!process.env.FIRST_PERSON_CHECK && !process.env.MOCK_CHAT_CHECK
const chatServer = frontendOnly
  ? null
  : spawn(
      process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'java') : 'java',
      process.env.KEYLESS_CHAT_CHECK ||
        (process.env.FIRST_PERSON_CHECK && !process.env.MOCK_CHAT_CHECK)
        ? ['-jar', backendJar]
        : [
            '-Dloader.main=com.lasttransfer.fixture.BrowserFixtureApplication',
            '-Dloader.path=backend/target/test-classes',
            '-cp',
            backendJar,
            'org.springframework.boot.loader.launch.PropertiesLauncher',
          ],
      {
        stdio: 'ignore',
        env: {
          ...process.env,
          OPENAI_API_KEY: '',
          AI_PROVIDER: 'openai',
          API_PORT: '3301',
          API_HOST: '127.0.0.1',
          CHAT_ALLOWED_ORIGINS: base,
          CHAT_SECURE_COOKIE: 'false',
        },
      },
    )
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', browserPort, '--strictPort'],
  {
    stdio: 'ignore',
    env: {
      ...process.env,
      CHAT_API_TARGET: 'http://127.0.0.1:3301',
      VITE_AI_CHAT_ENABLED: process.env.MOCK_CHAT_CHECK ? 'true' : 'false',
      VITE_FIRST_ROOM_3D: process.env.FIRST_PERSON_CHECK ? 'true' : 'false',
    },
  },
)
const browser = spawn(
  chrome,
  [
    '--headless',
    '--enable-unsafe-swiftshader',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${join(artifacts, 'profile')}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let ws
try {
  async function ready(url) {
    for (let i = 0; i < 100; i++) {
      try {
        const r = await fetch(url)
        if (r.ok) return r
      } catch {
        /* Wait for our child process. */
      }
      await wait(100)
    }
    throw new Error(`Could not start ${url}`)
  }
  if (!frontendOnly) await ready('http://127.0.0.1:3301/api/chat/status')
  await ready(base)
  for (const path of [
    '/backend/src/main/resources/private/characters.json',
    '/backend/.env.example',
    '/backend/target/classes/private/characters.json',
    '/docs/chapter5-author.md',
    '/.env.example',
  ]) {
    // Java build output is absent in frontend-only checks; existing private files are still checked.
    if (frontendOnly && path.includes('/target/')) continue
    const response = await fetch(base + path)
    assert.equal(response.status, 403, `Private development file exposed: ${path}`)
  }
  const pages = await (await ready(`${debug}/json`)).json()
  ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map(),
    errors = []
  let aiRequests = 0
  const consoleErrors = [],
    assetFailures = [],
    requestUrls = new Map()
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (
      message.method === 'Network.requestWillBeSent' &&
      message.params.request.url.includes('/api/chat')
    )
      aiRequests++
    if (message.id) {
      const job = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) job.reject(new Error(JSON.stringify(message.error)))
      else job.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
      consoleErrors.push(message.params.args.map((x) => x.value ?? x.description).join(' '))
    if (message.method === 'Network.requestWillBeSent')
      requestUrls.set(message.params.requestId, message.params.request.url)
    if (
      message.method === 'Network.responseReceived' &&
      message.params.response.url.includes('/art/') &&
      message.params.response.status >= 400
    )
      assetFailures.push({
        url: message.params.response.url,
        status: message.params.response.status,
      })
    if (
      message.method === 'Network.loadingFailed' &&
      requestUrls.get(message.params.requestId)?.includes('/art/')
    )
      assetFailures.push({
        url: requestUrls.get(message.params.requestId),
        error: message.params.errorText,
      })
  })
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const key = ++id
      pending.set(key, { resolve, reject })
      ws.send(JSON.stringify({ id: key, method, params }))
    })
  }
  async function evaluate(expression) {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  const resume = async () => {
    const resumed = await evaluate(
      `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('이어하기 →')); if(b){b.click();return true}return false})()`,
    )
    if (resumed) await wait(100)
    if (await evaluate("!!document.querySelector('.chapter-transition')")) await wait(1200)
  }
  const state = async () => {
    await resume()
    return evaluate("JSON.parse(localStorage.getItem('last-transfer-save-v1'))")
  }
  async function click(text) {
    await resume()
    await evaluate(
      `(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)})&&!b.disabled); if(!b)throw new Error('Button missing: '+${JSON.stringify(text)});b.click() })()`,
    )
    await wait(80)
  }
  async function close() {
    await evaluate("document.querySelector('.close-button').click()")
    await wait(80)
  }
  async function advanceAll() {
    for (let n = 0; n < 8 && (await state()).scene.length; n++) {
      await click(
        (await state()).sceneIndex + 1 < (await state()).scene.length ? '다음 대화' : '탐색 계속',
      )
    }
  }
  async function screenshot(name) {
    const r = await send('Page.captureScreenshot')
    await writeFile(join(artifacts, name), Buffer.from(r.data, 'base64'))
  }
  async function hold(key, milliseconds) {
    const code =
      key === 'Enter'
        ? 'Enter'
        : key === ' '
          ? 'Space'
          : key.startsWith('Arrow')
            ? key
            : `Key${key.toUpperCase()}`
    const windowsVirtualKeyCode = key === 'Enter' ? 13 : key === ' ' ? 32 : undefined
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code,
      windowsVirtualKeyCode,
      ...(key === 'Enter' ? { text: '\r' } : {}),
    })
    await wait(milliseconds)
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode })
    await wait(40)
  }
  async function interact() {
    await hold('e', 15)
    await wait(70)
  }
  // Follow collision-valid waypoints with actual key input, using persisted coordinates as feedback.
  async function walkTo(id) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const route = await evaluate(`(async()=>{
        const m=await import('/src/game/world.ts'),s=JSON.parse(localStorage.getItem('last-transfer-save-v1')),w=m.getWorld(s.area,s.chapter3?.npc,s.chapter3?.npcBoarded,s.chapter2?.power,s.chapter3?.doorOpen,s.chapter4,s.chapter5,s.chapter6),p=s.position;
        if(m.nearestEntity(p,w)?.id===${JSON.stringify(id)}&&(${JSON.stringify(id)}!=='train-phone'||Math.hypot(p.x-w.entities.find(e=>e.id==='train-phone').x-26.5,p.y-w.entities.find(e=>e.id==='train-phone').y-17)<60))return [];
        const start={x:Math.round(p.x/10)*10,y:Math.round(p.y/10)*10};
        const queue=[start],seen=new Set(),parents=new Map();let goal;
        for(let i=0;i<queue.length;i++){const q=queue[i],k=q.x+','+q.y;if(seen.has(k))continue;seen.add(k);
          const entity=w.entities.find(e=>e.id===${JSON.stringify(id)});const distance=Math.hypot(q.x-Math.max(entity.x,Math.min(q.x,entity.x+entity.w)),q.y-Math.max(entity.y,Math.min(q.y,entity.y+entity.h)));if(m.nearestEntity(q,w)?.id===${JSON.stringify(id)}&&distance<40&&(entity.id!=='train-phone'||Math.hypot(q.x-entity.x-26.5,q.y-entity.y-17)<58)){goal=q;break}
          for(const d of [{x:10,y:0},{x:-10,y:0},{x:0,y:10},{x:0,y:-10}]){const v={x:q.x+d.x,y:q.y+d.y},vk=v.x+','+v.y;if(m.walkable(v,w)&&!seen.has(vk)&&!parents.has(vk)){parents.set(vk,q);queue.push(v)}}}
        if(!goal)throw Error('No route to '+${JSON.stringify(id)});
        const path=[goal];while(path.at(-1).x!==start.x||path.at(-1).y!==start.y){path.push(parents.get(path.at(-1).x+','+path.at(-1).y));if(path.length>2000)throw Error('Invalid path')}
        path.reverse();let points=[path[0]];for(let i=1;i<path.length-1;i++){if(path[i].x-path[i-1].x!==path[i+1].x-path[i].x||path[i].y-path[i-1].y!==path[i+1].y-path[i].y)points.push(path[i])}points.push(goal);return points;
      })()`)
      if (!route.length) return
      for (const target of route) {
        for (let step = 0; step < 3; step++) {
          const p = (await state()).position,
            dx = target.x - p.x,
            dy = target.y - p.y
          if (Math.hypot(dx, dy) < 2) break
          const horizontal = Math.abs(dx) >= Math.abs(dy),
            distance = horizontal ? dx : dy
          await hold(
            horizontal ? (distance > 0 ? 'd' : 'a') : distance > 0 ? 's' : 'w',
            Math.max(25, Math.min(2200, (Math.abs(distance) / 165) * 1000)),
          )
        }
      }
    }
    await screenshot('failure-navigation.png')
    console.error('Navigation state', await state())
    throw new Error(`Could not approach ${id}; screenshot at ${artifacts}`)
  }
  async function inputCode(code) {
    await evaluate(
      `{const i=document.querySelector('#code');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(code)});i.dispatchEvent(new Event('input',{bubbles:true}))}`,
    )
    await wait(80)
    await click('잠금 해제')
  }
  await send('Network.enable')
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: base })
  await wait(700)
  const verifyFive = (alone, accompanied) =>
    verifyChapter5({
      alone,
      accompanied,
      state,
      evaluate,
      click,
      close,
      advanceAll,
      walkTo,
      interact,
      send,
      wait,
      screenshot,
      hold,
    })
  if (process.env.FIRST_PERSON_CHECK) {
    await verifyFirstPerson({
      send,
      evaluate,
      click,
      close,
      state,
      advanceAll,
      hold,
      wait,
      screenshot,
      inputCode,
      walkTo,
    })
  } else if (process.env.E_KEY_CHECK) {
    const seed = await evaluate(
      `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,stage:'explore',position:{x:480,y:150},scene:[],sceneIndex:0}})()`,
    )
    await evaluate(
      `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(seed))})`,
    )
    await send('Page.reload')
    await wait(700)
    await state()
    await evaluate("document.querySelector('.exploration canvas').focus()")
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'ㄷ',
      code: 'KeyE',
      windowsVirtualKeyCode: 69,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'ㄷ',
      code: 'KeyE',
      windowsVirtualKeyCode: 69,
    })
    await wait(150)
    const worked = (await state()).clues.includes('map')
    console.log('Physical KeyE with Korean key ㄷ:', worked ? 'investigated' : 'NO INTERACTION')
    if (process.env.E_KEY_CHECK === 'before') {
      assert.equal(worked, false)
      await click('조사')
      assert.ok((await state()).clues.includes('map'))
      console.log('BEFORE: same target works via mouse button, Korean KeyE fails')
    } else {
      assert.equal(worked, true)
      await advanceAll()
      await evaluate(
        `(()=>{const box=document.createElement('div');box.contentEditable='true';box.id='input-check';box.innerHTML='<span>대화 입력</span>';document.body.append(box);box.focus()})()`,
      )
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'ㄷ',
        code: 'KeyE',
        windowsVirtualKeyCode: 69,
      })
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'ㄷ',
        code: 'KeyE',
        windowsVirtualKeyCode: 69,
      })
      await wait(100)
      assert.equal((await state()).scene.length, 0, 'editable text must not trigger investigation')
      await evaluate(
        "document.querySelector('#input-check').remove();document.querySelector('canvas').focus()",
      )
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'e',
        code: 'KeyE',
        autoRepeat: true,
      })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE' })
      await wait(100)
      assert.equal((await state()).scene.length, 0, 'held E must not replay interaction')
      await click('단서 재확인')
      assert.ok((await state()).scene.length, 'mouse uses same selected target')
      console.log('PASS physical E, editable exclusion, repeat suppression, mouse same target')
    }
  } else if (process.env.CHAPTER6_ONLY) {
    const completed = await evaluate(
      `(async()=>{const {initialState:s}=await import('/src/game/engine.ts');return {...s,stage:'explore',area:'moonPlatform',health:1,battery:0,inventory:[],chapter3:{...s.chapter3,started:true,npc:'invited',approved:true,signal:'green',doorOpen:true,boarded:true,npcBoarded:true,escaped:true,ending:'complete'},chapter4:{...s.chapter4,started:true,sync:'accepted',arrived:true,doorSeen:true,completed:true},chapter5:{...s.chapter5,started:true,displayName:'한결',response:'answered',registration:'cancelled',matched:true,externalPaused:true,routeOpen:true,exitSeen:true,completed:true}}})()`,
    )
    await send('Emulation.setTouchEmulationEnabled', { enabled: true })
    await verifyChapter6({
      completed,
      evaluate,
      state,
      click,
      close,
      walkTo,
      interact,
      advanceAll,
      send,
      wait,
      screenshot,
    })
  } else if (process.env.KEYLESS_CHAT_CHECK) {
    await evaluate(
      `(async()=>{const {initialState}=await import('/src/game/engine.ts');localStorage.setItem('last-transfer-save-v1',JSON.stringify({...initialState,stage:'explore',area:'hall',scene:[],position:{x:420,y:400}}))})()`,
    )
    await send('Page.reload')
    await wait(600)
    await evaluate(
      `(()=>{window.__chatRequests=0;const original=window.fetch;window.fetch=(input,...args)=>{if(String(input).includes('/api/chat')){window.__chatRequests++;throw new Error('AI requests must remain paused')}return original(input,...args)}})()`,
    )
    await click('휴대폰')
    await wait(500)
    assert.match(
      await evaluate("document.querySelector('.ai-composer').textContent"),
      /AI 자유 대화 사용 불가/,
    )
    assert.equal(
      await evaluate("document.querySelector('.ai-composer button[type=submit]').disabled"),
      true,
    )
    await close()
    await walkTo('hall-map')
    await interact()
    await advanceAll()
    assert.ok((await state()).clues.includes('hall-map'))
    await click('휴대폰')
    await click('직원 통로 끝에')
    await close()
    assert.ok((await state()).asked.includes('hall-path'))
    assert.equal(await evaluate('window.__chatRequests'), 0)
    console.log(
      'PASS keyless real server: AI disabled, movement/investigation/scripted questions available',
    )
  } else if (process.env.CHAPTER5_CHECKPOINT) {
    const checkpoint = JSON.parse(await readFile(process.env.CHAPTER5_CHECKPOINT, 'utf8'))
    const companion = process.env.CHAPTER5_COMPANION_CHECKPOINT
      ? JSON.parse(await readFile(process.env.CHAPTER5_COMPANION_CHECKPOINT, 'utf8'))
      : undefined
    await verifyFive(checkpoint, companion)
  } else {
    await click('몸을 일으키기')
    await advanceAll()
    for (const id of ['panel', 'map', 'cabinet']) {
      await walkTo(id)
      await interact()
      await advanceAll()
    }
    await click('휴대폰')
    const before = (await state()).position
    await hold('w', 300)
    assert.deepEqual((await state()).position, before)
    await click('동쪽 배수 기록')
    await close()
    await walkTo('west')
    await interact()
    await click('이 경로 선택')
    await inputCode('0218')
    const chapter1 = await state()
    assert.equal(chapter1.outcome, 'escaped')
    await click('대합실로 이동')
    await advanceAll()
    assert.equal((await state()).area, 'hall')
    assert.equal((await state()).health, chapter1.health)
    await screenshot('01-hall-desktop.png')
    console.log('PASS first room → chapter 2 with real keyboard navigation')
    await verifyUx({ evaluate, click, close, wait, state, send, screenshot })
    // Locked electrical room provides hint before the key is collected.
    await walkTo('electrical')
    await interact()
    assert.equal((await state()).area, 'hall')
    assert.match((await state()).scene[0].text, /안내 데스크/)
    await advanceAll()
    for (const id of ['hall-map', 'hall-window', 'hall-gate-note', 'hall-desk']) {
      await walkTo(id)
      await interact()
      await advanceAll()
    }
    await click('휴대폰')
    for (const label of ['직원 통로 끝에', '파란 불빛은', '개찰구는 예비']) await click(label)
    await close()
    assert.equal((await state()).asked.filter((id) => id.startsWith('hall-')).length, 3)
    if (process.env.MOCK_CHAT_CHECK)
      await verifyAiChat({ evaluate, click, close, wait, state, send })
    // A failed risk returns to the hall and cannot deduct health twice, including after reload.
    await walkTo('staff')
    await interact()
    await click('직원 통로 진입')
    await click('회피 시작')
    await click('몸 빼기')
    assert.equal((await state()).chapter2.staffEvent, 'failed')
    assert.equal((await state()).health, chapter1.health - 20)
    await advanceAll()
    await send('Page.reload')
    await wait(600)
    await walkTo('staff')
    await interact()
    assert.equal((await state()).chapter2.staffEvent, 'failed')
    await advanceAll()
    assert.equal((await state()).health, chapter1.health - 20)
    await walkTo('electrical')
    await interact()
    assert.equal((await state()).area, 'electrical')
    await walkTo('powerboard')
    await interact()
    await click('조명')
    await click('방송')
    await click('개찰구')
    assert.deepEqual((await state()).chapter2.power, ['lights', 'broadcast'])
    assert.ok((await state()).clues.includes('hall-recording'))
    await screenshot('02-power-puzzle.png')
    await click('조명')
    await click('개찰구')
    await close()
    await walkTo('hall-return')
    await interact()
    await walkTo('gate')
    await interact()
    assert.equal((await state()).area, 'hall')
    assert.match((await state()).scene[0].text, /조명/)
    await advanceAll()
    // Mobile actual touch input and responsive UI.
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    await wait(150)
    const b = await evaluate(
      "(()=>{const r=document.querySelector('.joystick').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()",
    )
    const mobileBefore = (await state()).position
    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: b.x, y: b.y, id: 1 }],
    })
    await send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: b.x - 32, y: b.y, id: 1 }],
    })
    await wait(400)
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await wait(80)
    assert.ok((await state()).position.x < mobileBefore.x - 10)
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false)
    await screenshot('03-mobile-hall.png')
    await walkTo('electrical')
    await interact()
    await walkTo('powerboard')
    await interact()
    await click('방송')
    await click('조명')
    await close()
    await walkTo('hall-return')
    await interact()
    await send('Page.reload')
    await wait(600)
    assert.deepEqual((await state()).chapter2.power, ['gate', 'lights'])
    assert.ok((await state()).clues.includes('hall-recording'))
    assert.equal((await state()).inventory.filter((i) => i === '전기실 열쇠').length, 1)
    await walkTo('gate')
    await interact()
    assert.equal((await state()).area, 'stairs')
    await click('다음 대화')
    await screenshot('04-footstep-ending.png')
    await send('Page.reload')
    await wait(600)
    assert.equal((await state()).sceneIndex, 1)
    await advanceAll()
    assert.equal((await state()).chapter2.completed, true)
    await click('완료 기록 저장')
    await send('Page.reload')
    await wait(600)
    assert.equal((await state()).scene.length, 0)
    assert.equal((await state()).chapter2.completed, true)
    assert.equal(await evaluate('!!document.querySelector(".overlay-backdrop")'), false)
    await screenshot('05-completed.png')
    console.log('PASS chapter 2 regression, touch controls, power persistence and ending resume')
    // Continue the same real playthrough through chapter 3.
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await walkTo('next-chapter')
    await interact()
    await advanceAll()
    assert.equal((await state()).area, 'platform')
    await screenshot('06-platform.png')
    await walkTo('survivor')
    await interact()
    await advanceAll()
    assert.equal((await state()).chapter3.npc, 'found')
    await click('위치와 대피 방향')
    await advanceAll()
    assert.equal((await state()).chapter3.npc, 'directed')
    await click('휴대폰')
    const pausedAt = (await state()).position
    await hold('d', 300)
    assert.deepEqual((await state()).position, pausedAt)
    await close()
    await walkTo('train-a')
    await interact()
    await click('A-17 내부 조사')
    await walkTo('train-a-stop')
    await interact()
    await advanceAll()
    const explained = (await state()).messages.length
    await send('Page.reload')
    await wait(600)
    await interact()
    await advanceAll()
    assert.equal((await state()).messages.length, explained)
    await walkTo('exit-a')
    await interact()
    assert.equal((await state()).area, 'platform')
    await walkTo('train-b')
    await interact()
    await close()
    await walkTo('platform-record')
    await interact()
    await advanceAll()
    await walkTo('platform-signal')
    await interact()
    await advanceAll()
    await click('휴대폰')
    for (const label of ['A-17은 운행 중지', '오늘 비상 운행', 'B-04가 출발 대상'])
      await click(label)
    await close()
    assert.equal((await state()).asked.filter((id) => id.startsWith('platform-')).length, 3)
    await walkTo('approval')
    await interact()
    async function select(id, value) {
      await evaluate(
        `{const e=document.querySelector('#${id}');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))}`,
      )
      await wait(80)
    }
    await select('vehicle', 'A-17')
    await select('track', '△-1')
    await click('기록 대조')
    assert.equal((await state()).chapter3.approved, false)
    assert.match((await state()).notice, /불일치/)
    await select('vehicle', 'B-04')
    await select('track', '◇-2')
    await click('기록 대조')
    assert.equal((await state()).chapter3.signal, 'changing')
    await send('Page.reload')
    await wait(700)
    assert.equal((await state()).chapter3.approved, true)
    await wait(1500)
    assert.equal((await state()).chapter3.signal, 'green')
    await walkTo('call-b')
    await interact()
    await advanceAll()
    assert.equal((await state()).chapter3.doorOpen, true)
    const readyToLeave = await state()
    await walkTo('survivor')
    await interact()
    await click('함께 탑승하자고')
    await advanceAll()
    assert.equal((await state()).chapter3.npc, 'invited')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await screenshot('07-platform-mobile.png')
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false)
    await walkTo('front-b')
    await interact()
    await click('최종 확인 · 탑승')
    assert.equal((await state()).chapter3.npcBoarded, true)
    assert.equal((await state()).area, 'trainB')
    await click('다음 대화')
    await wait(350)
    await screenshot('08-departure.png')
    await send('Page.reload')
    await wait(650)
    assert.equal((await state()).sceneIndex, 1)
    await advanceAll()
    assert.equal((await state()).chapter3.escaped, true)
    const accompaniedDeparture = await state()
    await screenshot('09-escaped.png')
    await click('탈출 기록 저장')
    await send('Page.reload')
    await wait(650)
    assert.equal((await state()).scene.length, 0)
    assert.equal((await state()).chapter3.escaped, true)
    assert.equal(await evaluate('!!document.querySelector(".overlay-backdrop")'), false)
    // Replay a real pre-boarding checkpoint to verify explicitly waiting rather than invitation.
    await evaluate(
      `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(readyToLeave))});location.reload()`,
    )
    await wait(650)
    await walkTo('survivor')
    await interact()
    await click('구조 대기 의사')
    await advanceAll()
    assert.equal((await state()).chapter3.npc, 'waiting')
    await walkTo('front-b')
    await interact()
    await click('최종 확인 · 탑승')
    await advanceAll()
    assert.equal((await state()).chapter3.npcBoarded, false)
    assert.equal((await state()).chapter3.escaped, true)
    assert.equal((await state()).chapter3.npc, 'waiting')
    assert.match(await evaluate('document.body.textContent'), /부스 옆 의자/)
    // Chapter 4: continue the actual solo departure; no injected puzzle answers.
    await click('챕터 4 · 정차하지 않는 열차 시작')
    await advanceAll()
    assert.equal((await state()).chapter4.started, true)
    assert.equal((await state()).chapter3.npcBoarded, false)
    await click('휴대폰')
    assert.equal(
      await evaluate(
        "[...document.querySelectorAll('button')].some(b=>b.textContent.includes('왜 객실 전원을'))",
      ),
      false,
    )
    const lockedPosition = (await state()).position
    await hold('w', 200)
    assert.deepEqual((await state()).position, lockedPosition)
    await close()
    for (const object of ['train-phone', 'train-route']) {
      await walkTo(object)
      await interact()
      await advanceAll()
    }
    await click('휴대폰')
    await click('자동으로 선다는 정보')
    await close()
    await walkTo('train-rear-door')
    await interact()
    assert.equal((await state()).area, 'trainRear')
    for (const object of ['train-manual', 'train-devices']) {
      await walkTo(object)
      await interact()
      await advanceAll()
    }
    await click('P-02 / 객실 전원')
    assert.equal((await state()).chapter4.links.power, false)
    await screenshot('10-train-dark-mobile.png')
    await close()
    await send('Page.reload')
    await wait(650)
    assert.equal((await state()).chapter4.links.power, false)
    await walkTo('train-devices')
    await interact()
    await advanceAll()
    await click('P-02 / 객실 전원')
    await click('R-01 / 객실 중계기')
    assert.equal((await state()).chapter4.links.relay, false)
    await close()
    await walkTo('train-central-door')
    await interact()
    await walkTo('train-front-door')
    await interact()
    await walkTo('train-stop')
    await interact()
    await advanceAll()
    assert.match(await evaluate('document.body.innerText'), /연결 오류/)
    await close()
    await walkTo('train-cab')
    await interact()
    await advanceAll()
    assert.equal((await state()).area, 'trainFront')
    await walkTo('train-central-door')
    await interact()
    await walkTo('train-rear-door')
    await interact()
    await walkTo('train-devices')
    await interact()
    await advanceAll()
    await click('R-01 / 객실 중계기')
    await click('X-09 / 외부 송신기')
    assert.equal((await state()).chapter4.interruption, 'interrupted')
    await send('Page.reload')
    await wait(650)
    await advanceAll()
    assert.equal((await state()).chapter4.interruption, 'restored')
    assert.equal((await state()).messages.filter((m) => m.text === '지금 뭘 끊었어요?').length, 1)
    await click('휴대폰')
    for (const text of ['왜 객실 전원을', '어디로 보내고', '전송 기록이 겹쳐']) await click(text)
    await close()
    await walkTo('train-central-door')
    await interact()
    await walkTo('train-front-door')
    await interact()
    await walkTo('train-stop')
    await interact()
    await advanceAll()
    await click('신호 동기화 시작')
    assert.equal((await state()).chapter4.sync, 'active')
    const syncPosition = (await state()).position
    await hold('d', 200)
    assert.deepEqual((await state()).position, syncPosition)
    // Resume a running mini-game, fail twice, then use its built-in slow assist.
    await send('Page.reload')
    await wait(250)
    await click('이 신호에 맞추기')
    await click('이 신호에 맞추기')
    assert.ok((await state()).chapter4.failures >= 2)
    await click('느린 신호 보조 켜기')
    await screenshot('11-sync-mobile.png')
    for (let n = 0; n < 200; n++) {
      const value = await evaluate(
        'Number(document.querySelector(".sync-track").getAttribute("aria-valuenow"))',
      )
      if (value >= 38 && value <= 60) break
      await wait(40)
    }
    // Actual touch input triggers the same native button as keyboard and mouse.
    const hit = await evaluate(
      '(()=>{const r=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("이 신호에 맞추기")).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()',
    )
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [hit] })
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await wait(150)
    assert.equal((await state()).chapter4.sync, 'accepted')
    await advanceAll()
    assert.equal((await state()).chapter4.arrived, true)
    assert.equal((await state()).chapter4.destination, '문래역')
    await walkTo('train-central-door')
    await interact()
    await walkTo('train-exit')
    await interact()
    assert.equal((await state()).scene[0].text, '거기서는 안내방송에 대답하지 마세요.')
    await advanceAll()
    await screenshot('12-arrival-entry.png')
    assert.equal((await state()).chapter4.completed, false)
    await click('문 앞에서 더 생각')
    await interact()
    await click('진입 승인')
    assert.equal((await state()).chapter4.completed, true)
    await send('Page.reload')
    await wait(650)
    assert.equal((await state()).chapter4.completed, true)
    assert.equal((await state()).chapter3.escaped, true)
    assert.equal((await state()).area, 'trainB')
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false)
    const chapter4SoloComplete = await state()
    await writeFile(join(artifacts, 'chapter4-alone.json'), JSON.stringify(chapter4SoloComplete))
    // Accompanied chapter-3 checkpoint migration and old chapter-4 defaults.
    delete accompaniedDeparture.chapter4
    await evaluate(
      `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(accompaniedDeparture))});location.reload()`,
    )
    await wait(650)
    await click('챕터 4 · 정차하지 않는 열차 시작')
    await advanceAll()
    assert.equal((await state()).chapter3.npcBoarded, true)
    assert.match(await evaluate('document.body.innerText'), /객실 2명/)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await walkTo('survivor')
    await interact()
    assert.match((await state()).scene[0].text, /고마워요|부축/)
    await advanceAll()
    await screenshot('13-train-accompanied-desktop.png')
    // Complete the companion run without changing its flags, then use both real checkpoints for chapter 5.
    await walkTo('train-rear-door')
    await interact()
    await walkTo('train-devices')
    await interact()
    await advanceAll()
    await click('X-09 / 외부 송신기')
    await advanceAll()
    await walkTo('train-central-door')
    await interact()
    await walkTo('train-front-door')
    await interact()
    await walkTo('train-stop')
    await interact()
    await advanceAll()
    await click('신호 동기화 시작')
    for (let n = 0; n < 200; n++) {
      const marker = await evaluate(
        'Number(document.querySelector(".sync-track").getAttribute("aria-valuenow"))',
      )
      if (marker >= 38 && marker <= 60) break
      await wait(40)
    }
    // Native keyboard activation verifies the signal mini-game's PC input path.
    await evaluate(
      '[...document.querySelectorAll("button")].find(b=>b.textContent.includes("이 신호에 맞추기")).focus()',
    )
    await hold('Enter', 20)
    assert.equal((await state()).chapter4.sync, 'accepted')
    await advanceAll()
    await walkTo('train-central-door')
    await interact()
    await walkTo('train-exit')
    await interact()
    await advanceAll()
    await click('진입 승인')
    const chapter4CompanionComplete = await state()
    await writeFile(
      join(artifacts, 'chapter4-companion.json'),
      JSON.stringify(chapter4CompanionComplete),
    )
    await verifyFive(chapter4SoloComplete, chapter4CompanionComplete)
    console.log(
      'PASS chapter 4: solo/company, evidence questions, dark recovery, relay error, suspicion once/resume, sync retry/assist/touch, arrival confirmation, persistence, explicit next-chapter transition',
    )
    console.log(
      'PASS chapter 3: survivor direction/invite/wait, train A return, questions, approval retry, signal/resume, call, boarding/company, ending persistence, mobile layout',
    )
  }
  if (process.env.FIRST_PERSON_CHECK === 'episode') {
    await writeFile(
      'docs/episode1-3d-integration/network.json',
      JSON.stringify({ aiRequests, errors, consoleErrors, assetFailures }, null, 2),
    )
    assert.deepEqual(consoleErrors, [])
    assert.deepEqual(assetFailures, [])
  }
  assert.deepEqual(errors, [])
  if (!process.env.MOCK_CHAT_CHECK) assert.equal(aiRequests, 0, 'AI requests must remain disabled')
  console.log(
    process.env.FIRST_PERSON_CHECK
      ? 'PASS first-person first room (focused browser check)'
      : process.env.E_KEY_CHECK
        ? 'PASS focused E-key check only'
        : process.env.KEYLESS_CHAT_CHECK
          ? 'PASS keyless chapter 2, no runtime errors'
          : process.env.CHAPTER6_ONLY
            ? 'PASS chapter 6 isolated fixture replay, no runtime errors'
            : process.env.CHAPTER5_CHECKPOINT
              ? 'PASS chapter 5 checkpoint replay, no runtime errors'
              : 'PASS chapters 1–6, evidence/questions, one-time events, mobile touch, ending/resume, no runtime errors',
  )
  console.log(`Screenshots: ${artifacts}`)
} finally {
  ws?.close()
  browser.kill('SIGTERM')
  server.kill('SIGTERM')
  chatServer?.kill('SIGTERM')
}
