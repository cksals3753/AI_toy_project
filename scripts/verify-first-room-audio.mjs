import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
export const verifyFirstRoomAudio = async ({
  send,
  evaluate,
  click,
  close,
  state,
  hold,
  wait,
  resume3d,
  trustedClick,
  approach,
  pressE,
  advanceAll,
  inputCode,
}) => {
  const dir = 'docs/chapter2-audio'
  await mkdir(dir, { recursive: true })
  const install = `(()=>{
    const original=window.AudioContext,connect=AudioNode.prototype.connect;
    const probe=window.__soundProbe={contexts:[],sources:[]};
    window.AudioContext=new Proxy(original,{construct(target,args){const c=Reflect.construct(target,args);probe.contexts.push(c);probe.analyser=c.createAnalyser();probe.analyser.fftSize=2048;probe.recording=c.createMediaStreamDestination();
      for(const method of ['createBufferSource','createOscillator']){const f=c[method].bind(c);c[method]=()=>{const s=f();probe.sources.push(s);return s}}return c}});
    AudioNode.prototype.connect=function(destination,...args){if(probe.contexts.some(c=>c.destination===destination)){probe.master=this;connect.call(this,probe.analyser);connect.call(this,probe.recording);return connect.call(probe.analyser,destination,...args)}return connect.call(this,destination,...args)};
  })()`
  const injected = await send('Page.addScriptToEvaluateOnNewDocument', { source: install })
  await send('Page.reload')
  await wait(1100)
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier })
  await state()
  const rms = async () =>
    evaluate(
      `(()=>{const p=window.__soundProbe;if(!p.analyser)return 0;const a=new Float32Array(p.analyser.fftSize);p.analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length)})()`,
    )
  await resume3d()
  await wait(500)
  assert.equal(await evaluate('window.__soundProbe.contexts.length'), 1)
  assert.equal(await evaluate('window.__soundProbe.contexts[0].state'), 'running')
  const ambient = await rms()
  assert.ok(ambient > 0.00001, 'rendered ambient samples')
  await evaluate(
    `window.__recordPromise=new Promise(resolve=>{const r=new MediaRecorder(window.__soundProbe.recording.stream);const chunks=[];r.ondataavailable=e=>chunks.push(e.data);r.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(const b of bytes)s+=String.fromCharCode(b);resolve({data:btoa(s),mime:r.mimeType})};r.start();setTimeout(()=>r.stop(),2500)})` +
      ';void 0',
  )
  const start = await evaluate('window.__soundProbe.sources.length')
  await hold('w', 900)
  await wait(400)
  assert.ok(
    (await evaluate('window.__soundProbe.sources.length')) > start,
    'actual travel emits footsteps',
  )
  const stopped = await evaluate('window.__soundProbe.sources.length')
  await wait(500)
  assert.equal(
    await evaluate('window.__soundProbe.sources.length'),
    stopped,
    'no steps while still',
  )
  const recording = await evaluate('window.__recordPromise')
  await writeFile(`${dir}/room-preview.webm`, Buffer.from(recording.data, 'base64'))
  await evaluate('document.exitPointerLock()')
  await wait(100)
  await trustedClick('[aria-label="조작 도움말"]')
  const noMenuSteps = await evaluate('window.__soundProbe.sources.length')
  await hold('w', 400)
  assert.equal(await evaluate('window.__soundProbe.sources.length'), noMenuSteps)
  await trustedClick('.sound-settings input[type="checkbox"]')
  await wait(400)
  const muted = await rms()
  assert.ok(muted < 0.000001, 'mute silences actual samples')
  assert.equal(
    await evaluate("JSON.parse(localStorage.getItem('last-transfer-audio-v1')).muted"),
    true,
  )
  await trustedClick('.sound-settings input[type="checkbox"]')
  await evaluate(
    `(()=>{const e=document.querySelector('#sound-volume');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'20');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  await wait(150)
  assert.equal(
    await evaluate("JSON.parse(localStorage.getItem('last-transfer-audio-v1')).volume"),
    0.2,
  )
  const shot = await send('Page.captureScreenshot')
  await writeFile(`${dir}/settings.png`, Buffer.from(shot.data, 'base64'))
  await close()
  await resume3d()
  const targets = await send('Target.getTargets')
  const current = targets.targetInfos.find(
    (t) => t.type === 'page' && t.url.startsWith('http://127.0.0.1'),
  )
  const other = await send('Target.createTarget', { url: 'about:blank' })
  await send('Target.activateTarget', { targetId: other.targetId })
  await wait(400)
  assert.equal(
    await evaluate('window.__soundProbe.contexts[0].state'),
    'suspended',
    'real blur suspends audio rendering',
  )
  await send('Target.activateTarget', { targetId: current.targetId })
  await send('Page.bringToFront')
  await send('Target.closeTarget', { targetId: other.targetId })
  await wait(100)
  await resume3d()
  for (const id of ['map', 'panel', 'cabinet', 'oh']) {
    await approach(id)
    await pressE()
    await advanceAll()
  }
  await click('휴대폰')
  await click('동쪽 배수 기록')
  await close()
  await approach('west')
  await pressE()
  await click('이 경로 선택')
  const beforeDoor = await evaluate('window.__soundProbe.sources.length')
  await inputCode('0218')
  assert.equal((await state()).outcome, 'escaped')
  assert.ok(
    (await evaluate('window.__soundProbe.sources.length')) >= beforeDoor + 2,
    'door scrape and motor',
  )
  await click('대합실로 이동')
  await advanceAll()
  await resume3d()
  await wait(450)
  assert.equal(
    await evaluate('window.__soundProbe.contexts[0].state'),
    'running',
    'chapter 2 shares the same running audio context',
  )
  assert.equal(await evaluate('window.__soundProbe.contexts.length'), 1)
  const hallRms = await rms()
  assert.ok(hallRms > 0.00001 && hallRms < ambient * 1.3, 'hall remains restrained')
  const count = () => evaluate('window.__soundProbe.sources.length')
  const act = async (id) => {
    await approach(id)
    await pressE()
  }
  const finish = async () => {
    await advanceAll()
    await resume3d()
  }
  await act('hall-desk')
  assert.ok((await state()).inventory.includes('전기실 열쇠'))
  await finish()
  await act('hall-desk')
  const repeatKey = await count()
  await finish()
  assert.equal(await count(), repeatKey, 'reinspection does not replay key cue')
  await act('staff')
  const beforeDanger = await count()
  await click('직원 통로 진입')
  assert.equal((await state()).chapter2.staffEvent, 'active')
  assert.ok((await count()) >= beforeDanger + 4, 'warning and fire door sound')
  await click('회피 시작')
  await click('몸 빼기')
  await finish()
  await act('electrical')
  await wait(500)
  await resume3d()
  await act('powerboard')
  let n = await count()
  await click('개찰구')
  await wait(150)
  assert.ok((await count()) >= n + 3, 'switch and actual gate opening')
  await wait(300)
  n = await count()
  await click('조명')
  await wait(150)
  assert.ok((await count()) >= n + 3, 'switch and restoration')
  assert.deepEqual((await state()).chapter2.power, ['gate', 'lights'])
  await close()
  await resume3d()
  await wait(500)
  const poweredRms = await rms()
  await act('powerboard')
  await click('조명')
  await click('개찰구')
  await close()
  await resume3d()
  await wait(600)
  const idleRms = await rms()
  assert.ok(poweredRms > idleRms, 'electrical ambience reflects actual power')
  await act('powerboard')
  await click('개찰구')
  await wait(300)
  await click('조명')
  await close()
  await resume3d()
  const game = await state()
  await send('Page.reload')
  await wait(1100)
  await state()
  assert.equal((await state()).area, 'electrical')
  assert.equal((await state()).health, game.health)
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('last-transfer-audio-v1'))"), {
    muted: false,
    volume: 0.2,
  })
  // Probe a restored, completed power state: only the two continuous sources are created.
  const loadedProbe = await send('Page.addScriptToEvaluateOnNewDocument', { source: install })
  await send('Page.reload')
  await wait(1100)
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: loadedProbe.identifier })
  await state()
  await resume3d()
  await wait(400)
  assert.equal(await count(), 2, 'load does not replay key, gate, power or danger effects')
  for (let i = 0; i < 2; i++) {
    await act('hall-return')
    await wait(500)
    await resume3d()
    await act('electrical')
    await wait(500)
    await resume3d()
  }
  assert.equal(await evaluate('window.__soundProbe.contexts.length'), 1)
  assert.equal(await evaluate("document.querySelectorAll('.first-person canvas').length"), 1)
  await act('hall-return')
  await wait(500)
  await resume3d()
  await act('gate')
  await advanceAll()
  assert.equal((await state()).area, 'stairs')
  // Chapter 3 now has ambience; no AI is enabled by the shared browser harness.
  await click('완료 기록 저장')
  await wait(300)
  await resume3d()
  await act('next-chapter')
  await advanceAll()
  await resume3d()
  await wait(400)
  assert.equal(await evaluate('window.__soundProbe.contexts[0].state'), 'running')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  const mobileScript = await send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      install +
      `;localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify({ ...game, area: 'hall', view3d: null }))})`,
  })
  await send('Page.reload')
  await wait(1100)
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: mobileScript.identifier })
  await state()
  if (await evaluate("!!document.querySelector('.exploration-resume')"))
    await trustedClick('.exploration-resume')
  await trustedClick('.first-person canvas')
  await wait(350)
  assert.equal(
    await evaluate('window.__soundProbe.contexts.length'),
    1,
    'touch unlock creates one context',
  )
  assert.equal(await evaluate('window.__soundProbe.contexts[0].state'), 'running')
  const mobileSources = await evaluate('window.__soundProbe.sources.length')
  const j = await evaluate(
    "(()=>{const r=document.querySelector('[data-move-zone]').getBoundingClientRect();return {x:r.x+r.width/2+25,y:r.y+r.height/2}})()",
  )
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...j, id: 1 }] })
  await send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: j.x + 25, y: j.y, id: 1 }],
  })
  await wait(550)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(100)
  assert.ok(
    (await evaluate('window.__soundProbe.sources.length')) > mobileSources,
    'touch movement produces steps',
  )
  await trustedClick('[aria-label="조작 도움말"]')
  await trustedClick('.sound-settings input[type="checkbox"]')
  await wait(400)
  assert.ok((await rms()) < 0.000001)
  const mobileShot = await send('Page.captureScreenshot')
  await writeFile(`${dir}/settings-mobile.png`, Buffer.from(mobileShot.data, 'base64'))
  await writeFile(
    `${dir}/result.json`,
    JSON.stringify(
      {
        ambientRms: ambient,
        mutedRms: muted,
        oneContext: true,
        stepsOnTravel: true,
        noStepsAtRestOrMenu: true,
        doorOnUnlock: true,
        chapter2Audible: true,
        chapter3Audible: true,
        hallRms,
        poweredRms,
        idleRms,
        dangerAndPowerTransitions: true,
        noReplayOnLoad: true,
        settingsPersist: true,
        mobileTouchUnlockAndMute: true,
        recordingMime: recording.mime,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS chapters 1–2 audio: real WebAudio samples/recording, travel/still/menu, mute/volume/focus, door/chapter boundary, persistence',
  )
}
