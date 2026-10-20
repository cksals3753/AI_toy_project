import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { verifyChapter3Three } from './verify-chapter3-3d.mjs'
import { verifyChapter4Three } from './verify-chapter4-3d.mjs'

export const verifyChapter34Audio = async (api) => {
  const { evaluate, send, wait } = api
  const dir = 'docs/chapter34-audio'
  await mkdir(dir, { recursive: true })
  const snapshots = [],
    documents = []
  const install = `(()=>{
    const Original=window.AudioContext;
    const p=window.__audio34={contexts:[],sources:[],cues:[],profiles:[]};
    window.AudioContext=new Proxy(Original,{construct(T,args){const c=Reflect.construct(T,args);p.contexts.push(c);
      const connect=AudioNode.prototype.connect;
      p.analyser=c.createAnalyser();p.analyser.fftSize=2048;
      AudioNode.prototype.connect=function(dest,...rest){if(dest===c.destination){connect.call(this,p.analyser);return connect.call(this,dest,...rest)}return connect.call(this,dest,...rest)};
      for(const method of ['createBufferSource','createOscillator']){const f=c[method].bind(c);c[method]=()=>{const s=f();p.sources.push(s);s.addEventListener('ended',()=>s.__ended=true);return s}}return c}})
  })()`
  const injected = await send('Page.addScriptToEvaluateOnNewDocument', { source: install })
  const hook = async () =>
    evaluate(`(async()=>{
    const p=window.__audio34;if(!p||p.hooked)return;
    p.hooked=true;const {firstRoomAudio:a}=await import('/src/audio/firstRoomAudio.ts');
    const cue=a.cue;a.cue=k=>{p.cues.push(k);return cue(k)};
    const configure=a.configure;a.configure=(...args)=>{p.profiles.push({area:args[3],power:args[4],motion:args[5]});return configure(...args)};
  })()`)
  const sample = async () =>
    evaluate(`(()=>{
    const p=window.__audio34;if(!p)return null;
    const a=new Float32Array(p.analyser?.fftSize??1);p.analyser?.getFloatTimeDomainData(a);
    return {contexts:p.contexts.length,status:p.contexts[0]?.state,sources:p.sources.length,
      loops:p.sources.filter(s=>s.loop).map(s=>({id:p.sources.indexOf(s),ended:!!s.__ended})),
      rms:Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length),cues:p.cues,profiles:p.profiles}
  })()`)
  const capture = async (label) => {
    const value = await sample()
    if (value) snapshots.push({ label, ...value })
    return value
  }
  const wrapped = {
    ...api,
    send: async (method, args) => {
      if (method === 'Page.reload') {
        const old = await sample()
        if (old) documents.push(old)
      }
      return send(method, args)
    },
    state: async () => {
      const s = await api.state()
      await hook()
      return s
    },
    click: async (label) => {
      const before = await sample()
      // Restored puzzle overlays also need a real gesture to unlock audio.
      // DOM .click() used by the older gameplay suite does not grant activation.
      if (!before?.contexts && label === '이 신호에 맞추기') {
        await evaluate(
          `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('이 신호에 맞추기'));b.dataset.audioGesture='true'})()`,
        )
        await api.trustedClick('[data-audio-gesture="true"]')
      } else await api.click(label)
      await wait(160)
      const after = await capture(label)
      if (label === '최종 확인 · 탑승하고 출발') {
        assert.ok(after.cues.includes('depart'))
        assert.equal(
          after.loops.filter((s) => !s.ended).length,
          2,
          'fan buffer plus one rolling buffer (equipment hum is an oscillator)',
        )
      }
      if (label === '챕터 4 · 정차하지 않는 열차 시작') {
        assert.deepEqual(
          after.loops,
          before.loops,
          'chapter handoff preserves the very same rolling source',
        )
        assert.equal(after.cues.filter((k) => k === 'vibration').length, 1)
      }
      if (label === 'P-02 / 객실 전원') {
        assert.deepEqual(
          after.loops,
          before.loops,
          'power changes do not replace or stop rolling source',
        )
        assert.equal(after.status, 'running')
      }
      if (label === '챕터 5 · 대답 없는 승강장 시작') {
        assert.ok(
          after.loops.every((source, index) => index === 0 || source.ended),
          'chapter 5 retains no rolling source',
        )
      }
    },
  }
  // Existing suites use real movement and interaction from documented checkpoints.
  await verifyChapter3Three(wrapped)
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await send('Emulation.clearDeviceMetricsOverride')
  await verifyChapter4Three(wrapped)
  const final = await sample()
  if (final) documents.push(final)
  await writeFile(
    `${dir}/result.json`,
    JSON.stringify({ documents, snapshots, checkpointBased: true }, null, 2),
  )
  const cues = documents.flatMap((d) => d.cues)
  for (const cue of [
    'approved',
    'call',
    'door',
    'depart',
    'vibration',
    'switch',
    'restore',
    'request',
    'brake',
    'stop',
  ])
    assert.ok(cues.includes(cue), `observed actual game cue ${cue}`)
  assert.ok(
    snapshots.some((s) => s.rms > 0.00001),
    'actual rendered WebAudio samples',
  )
  for (const d of documents) assert.ok(d.contexts <= 1, 'one context per document')
  assert.ok(
    documents.some((d) => d.loops.length === 2 && d.loops[1].ended),
    'rolling source actually ends at stop',
  )
  assert.ok(
    documents.some((d) => d.profiles.some((p) => p.power === false && p.motion === 'moving')),
    'power off keeps motion',
  )
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier })
  await writeFile(
    `${dir}/result.json`,
    JSON.stringify({ documents, snapshots, checkpointBased: true }, null, 2),
  )
  console.log(
    'PASS chapters 3–4 audio: actual state cues, identical rolling source across handoff and power, stop cleanup, both NPC branches, save/retry and no rolling residue in chapter 5',
  )
}
