import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { verifyChapter5Three } from './verify-chapter5-3d.mjs'
import { verifyChapter6Three } from './verify-chapter6-3d.mjs'

export const verifyChapter56Audio = async (api) => {
  const { evaluate, send, wait } = api
  const dir = 'docs/chapter56-audio'
  const onlySix = process.env.AUDIO56_CHAPTER === '6'
  const resultPath = `${dir}/${onlySix ? 'result6' : 'result'}.json`
  await mkdir(dir, { recursive: true })
  const snapshots = [],
    documents = []
  const install = `(()=>{
    const Original=window.AudioContext;
    const p=window.__audio56={contexts:[],sources:[],cues:[],profiles:[],peak:0};
    window.AudioContext=new Proxy(Original,{construct(T,args){const c=Reflect.construct(T,args);p.contexts.push(c);
      const connect=AudioNode.prototype.connect;
      p.analyser=c.createAnalyser();p.analyser.fftSize=2048;setInterval(()=>{const a=new Float32Array(2048);p.analyser.getFloatTimeDomainData(a);for(const x of a)p.peak=Math.max(p.peak,Math.abs(x))},20);
      AudioNode.prototype.connect=function(dest,...rest){if(dest===c.destination){connect.call(this,p.analyser);return connect.call(this,dest,...rest)}return connect.call(this,dest,...rest)};
      for(const method of ['createBufferSource','createOscillator']){const f=c[method].bind(c);c[method]=()=>{const s=f();p.sources.push(s);s.addEventListener('ended',()=>s.__ended=true);return s}}return c}})
  })()`
  const injected = await send('Page.addScriptToEvaluateOnNewDocument', { source: install })
  const hook = async () =>
    evaluate(`(async()=>{
    const p=window.__audio56;if(!p||p.hooked)return;
    p.hooked=true;const {firstRoomAudio:a}=await import('/src/audio/firstRoomAudio.ts');
    const cue=a.cue;a.cue=k=>{p.cues.push(k);return cue(k)};
    const complete=a.complete;a.complete=()=>{p.cues.push('complete');return complete()};
    const configure=a.configure;a.configure=(...args)=>{p.profiles.push({area:args[3],power:args[4],motion:args[5],water:args[6],finished:args[7]});return configure(...args)};
  })()`)
  const sample = async () =>
    evaluate(`(()=>{
    const p=window.__audio56;if(!p)return null;
    const a=new Float32Array(p.analyser?.fftSize??1);p.analyser?.getFloatTimeDomainData(a);
    return {peak:p.peak,contexts:p.contexts.length,status:p.contexts[0]?.state,sources:p.sources.length,
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
      if (s.chapter6.completed) {
        await wait(550)
        const p = await sample()
        assert.ok(
          !p.contexts || p.status === 'suspended',
          'ending has no playing exploration audio',
        )
      }
      return s
    },
    click: async (label) => {
      const beforeState = await api.state()
      const before = await sample()
      if (!before?.contexts) {
        await evaluate(
          `(()=>{document.querySelectorAll('[data-audio-gesture]').forEach(b=>b.removeAttribute('data-audio-gesture'));const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(label)}));if(b)b.dataset.audioGesture='true'})()`,
        )
        await api.trustedClick('[data-audio-gesture="true"]')
      } else await api.click(label)
      await wait(160)
      const after = await capture(label)
      const afterState = await api.state()
      const delta = after.cues.slice(before?.cues.length ?? 0)
      if (
        label === '장치 설정 대조' &&
        beforeState.chapter6.settings?.door !== afterState.chapter6.settings?.door &&
        afterState.chapter6.settings
      )
        assert.ok(delta.includes('door'), 'route door sounds at successful settings')
      if (label === '이 경로로 이동 확정' && afterState.chapter6.route === 'manual')
        assert.ok(!delta.includes('door'), 'manual door already opened before movement')
      if (label === '저장된 결과 보기')
        assert.ok(!after.cues.includes('complete'), 'result reopen never completes again')
    },
  }
  // Existing suites use real movement and interaction from documented checkpoints.
  if (!onlySix) await verifyChapter5Three(wrapped)
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await send('Emulation.clearDeviceMetricsOverride')
  await verifyChapter6Three(wrapped)
  const final = await sample()
  if (final) documents.push(final)
  await writeFile(
    resultPath,
    JSON.stringify({ documents, snapshots, checkpointBased: true }, null, 2),
  )
  const cues = documents.flatMap((d) => d.cues)
  for (const cue of onlySix
    ? ['door', 'switch', 'warning', 'valve', 'latch', 'complete']
    : ['chime', 'sensor', 'processed', 'door', 'switch', 'warning', 'valve', 'latch', 'complete'])
    assert.ok(cues.includes(cue), `observed ${cue}`)
  assert.ok(
    documents.some((d) => d.profiles.some((p) => p.water) && d.loops.some((s) => s.ended)),
    'water loop ends on drainage',
  )
  for (const d of documents) {
    assert.ok(d.contexts <= 1)
    assert.ok(d.peak < 0.3, `restrained default-volume peak ${d.peak}`)
  }
  assert.ok(
    documents.some((d) => d.peak > 0.0001),
    'actual rendered output',
  )
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier })
  await writeFile(
    resultPath,
    JSON.stringify({ documents, snapshots, checkpointBased: true }, null, 2),
  )
  console.log(
    'PASS chapters 5–6 audio: response/silent, NPC combinations, both escape routes, water cleanup, restrained peaks, ending/reopen and save restoration',
  )
}
