import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

// No state writes, reducer calls, position warps or completion fixtures in this run.
// Navigation reads world geometry, then uses CDP WASD/mouse/E through the real renderer.
export const verifyEpisodeThree = async (h) => {
  const {
    send,
    evaluate,
    click,
    close,
    state,
    advanceAll,
    hold,
    wait,
    approach,
    pressE,
    resume3d,
    inputCode,
  } = h
  const started = Date.now(),
    dir = 'docs/episode1-3d-integration'
  await mkdir(dir, { recursive: true })
  const records = [],
    checkpoints = {}
  const listeners = async () => {
    const r = await send('Runtime.evaluate', {
      expression:
        "JSON.stringify(Object.fromEntries(['keydown','keyup','mousemove','blur'].map(k=>[k,(getEventListeners(window)[k]??[]).length])))",
      returnByValue: true,
      includeCommandLineAPI: true,
    })
    return JSON.parse(r.result.value)
  }
  const record = async (name) => {
    await resume3d()
    assert.equal(await evaluate("document.querySelectorAll('.first-person canvas').length"), 1)
    assert.equal(
      await evaluate(
        "!!document.querySelector('.renderer-notice,.asset-error,[data-scene-loading]')",
      ),
      false,
    )
    const s = await state()
    checkpoints[name] = s
    const perf = await send('Performance.getMetrics')
    const data = {
      name,
      elapsedSeconds: Math.round((Date.now() - started) / 1000),
      area: s.area,
      position: s.position,
      view3d: s.view3d,
      health: s.health,
      battery: s.battery,
      clues: s.clues.length,
      inventory: s.inventory,
      listeners: await listeners(),
      metrics: Object.fromEntries(
        perf.metrics
          .filter((x) =>
            ['JSHeapUsedSize', 'Nodes', 'JSEventListeners', 'Documents'].includes(x.name),
          )
          .map((x) => [x.name, x.value]),
      ),
      renderer: await evaluate("({...document.querySelector('canvas').dataset})"),
    }
    records.push(data)
    const shot = await send('Page.captureScreenshot')
    await writeFile(`${dir}/${name}.png`, Buffer.from(shot.data, 'base64'))
    await writeFile(`${dir}/progress.json`, JSON.stringify(records, null, 2))
    await writeFile(`${dir}/checkpoints.json`, JSON.stringify(checkpoints, null, 2))
    console.log('PASS continuous 3D', name, data.elapsedSeconds + 's', s.area)
  }
  const act = async (id) => {
    console.log('ACT', (await state()).area, id)
    await approach(id)
    assert.equal(
      await evaluate("document.querySelector('.interaction button').disabled"),
      false,
      id,
    )
    await pressE(true)
  }
  const inspect = async (id) => {
    await act(id)
    await advanceAll()
  }
  const finish = async () => {
    await advanceAll()
    if (
      await evaluate(
        "[...document.querySelectorAll('button')].some(b=>b.textContent.includes('완료 기록 저장 · 현장으로'))",
      )
    )
      await click('완료 기록 저장 · 현장으로')
    await resume3d()
  }
  const reload = async () => {
    // Only the application's own save; never write localStorage from the harness.
    const s = await state()
    await send('Page.reload')
    await wait(1100)
    const after = await state()
    for (const k of [
      'area',
      'health',
      'battery',
      'clues',
      'inventory',
      'chapter2',
      'chapter3',
      'chapter4',
      'chapter5',
      'chapter6',
      'messages',
    ])
      assert.deepEqual(after[k], s[k], 'reload ' + k)
    if (s.view3d?.area === s.area) {
      assert.deepEqual(after.view3d, s.view3d)
      assert.deepEqual(after.position, s.position)
    }
    if (
      await evaluate(
        "[...document.querySelectorAll('button')].some(b=>b.textContent.includes('완료 기록 저장 · 현장으로'))",
      )
    )
      await click('완료 기록 저장 · 현장으로')
    if (after.chapter6.completed && (await evaluate("!!document.querySelector('.overlay-panel')")))
      await close()
    await resume3d()
  }
  const select = async (selector, value) => {
    await evaluate(
      `(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await wait(100)
  }
  await send('Performance.enable')
  await record('01-first')
  for (const id of ['map', 'panel', 'cabinet', 'oh']) await inspect(id)
  await click('휴대폰')
  await click('동쪽 배수 기록')
  await close()
  await act('west')
  await click('이 경로 선택')
  await inputCode('0218')
  assert.equal((await state()).outcome, 'escaped')
  await click('대합실로 이동')
  await finish()
  await record('02-hall')
  await reload()
  for (const id of ['hall-map', 'hall-window', 'hall-gate-note', 'hall-desk']) await inspect(id)
  await act('staff')
  await click('직원 통로 진입')
  await click('회피 시작')
  await click('몸 빼기')
  await finish()
  assert.ok(['failed', 'success'].includes((await state()).chapter2.staffEvent))
  await act('electrical')
  await resume3d()
  await act('powerboard')
  await click('개찰구')
  await click('조명')
  await close()
  await resume3d()
  await act('hall-return')
  await resume3d()
  const baseline = await listeners()
  for (let i = 0; i < 3; i++) {
    await act('electrical')
    await resume3d()
    await act('hall-return')
    await record('03-repeat-' + i)
    assert.deepEqual(await listeners(), baseline)
  }
  await act('gate')
  await finish()
  await record('04-stairs')
  await reload()
  await act('next-chapter')
  await finish()
  await record('05-platform')
  await act('survivor')
  await advanceAll()
  await click('부축해 승강장 의자까지 데려간다')
  await finish()
  await act('train-a')
  await advanceAll()
  await click('A-17 내부 조사')
  await finish()
  await inspect('train-a-stop')
  await act('exit-a')
  await finish()
  for (const id of ['train-b', 'platform-record', 'platform-signal']) {
    await inspect(id)
    if (await evaluate("!!document.querySelector('.overlay-panel')")) await close()
  }
  await act('approval')
  await select('#vehicle', 'B-04')
  await select('#track', '◇-2')
  await click('기록 대조 · 승인 요청')
  await wait(1600)
  assert.equal((await state()).chapter3.approved, true)
  await close()
  await act('call-b')
  await finish()
  await reload()
  await act('front-b')
  await click('최종 확인 · 탑승하고 출발')
  await advanceAll()
  await click('챕터 4 · 정차하지 않는 열차 시작')
  await finish()
  await record('06-train')
  await reload()
  for (const id of ['train-phone', 'train-route']) await inspect(id)
  await act('train-rear-door')
  await resume3d()
  await inspect('train-manual')
  await inspect('train-devices')
  await click('X-09 / 외부 송신기')
  if (await evaluate("!!document.querySelector('.close-button')")) await close()
  await finish()
  await act('train-central-door')
  await resume3d()
  await act('train-front-door')
  await resume3d()
  await inspect('train-stop')
  await click('신호 동기화 시작')
  for (let i = 0; i < 200; i++) {
    const n = await evaluate("+document.querySelector('.sync-track').getAttribute('aria-valuenow')")
    if (n >= 40 && n <= 58) break
    await wait(20)
  }
  await click('이 신호에 맞추기')
  assert.equal((await state()).chapter4.sync, 'accepted')
  await finish()
  await act('train-central-door')
  await resume3d()
  await act('train-exit')
  await advanceAll()
  await click('진입 승인 · 챕터 4 완료')
  await click('챕터 5 · 대답 없는 승강장 시작')
  await click('기본 이름')
  await finish()
  await record('07-mullae')
  await reload()
  for (const id of ['moon-warning', 'moon-shoes', 'moon-window', 'moon-broadcast'])
    await inspect(id)
  await inspect('moon-sensor')
  assert.equal((await state()).chapter5.response, 'undecided')
  await click('응답하지 않는다')
  await finish()
  await act('moon-booth-door')
  await resume3d()
  for (const id of ['moon-playback', 'moon-receipt', 'moon-attachment']) await inspect(id)
  await act('moon-terminal')
  await select('select[aria-label="등록 건 선택"]', 'REG-410')
  await click('등록 건·첨부 원본 대조')
  await click('미확인 등록 보류')
  await close()
  await reload()
  await act('moon-platform-door')
  await resume3d()
  await inspect('moon-route')
  await act('moon-maintenance')
  await select('select[aria-label="통행 문"]', 'D-02')
  await select('select[aria-label="승인 방식"]', 'local')
  await click('현장 통행 조건 대조')
  await click('열린 정비 통로 앞에서 이동 확인')
  await advanceAll()
  await click('정비 통로 이동 승인 · 챕터 5 완료')
  await click('챕터 6')
  await finish()
  await record('08-maintenance')
  await reload()
  await inspect('final-map')
  await inspect('final-manual')
  await act('final-control')
  await click('장치 설정 대조')
  await click('이동 전 근거 확인')
  await click('이 경로로 이동 확정')
  await finish()
  await record('09-shelter')
  await reload()
  await inspect('shelter-sign')
  await act('shelter-arrival')
  const s = await state(),
    result = s.chapter6.result
  assert.ok(s.chapter6.completed)
  assert.equal(result.npcTogether, true)
  assert.equal(result.route, 'manual')
  for (const k of ['health', 'battery', 'inventory', 'clues', 'messages'])
    assert.deepEqual(result[k], s[k], 'result ' + k)
  await close()
  await record('10-complete')
  await reload()
  await click('저장된 결과 보기')
  await close()
  await act('shelter-arrival')
  assert.deepEqual((await state()).chapter6.result, result)
  await record('11-replayed')
  await writeFile(
    `${dir}/result.json`,
    JSON.stringify(
      {
        durationSeconds: Math.round((Date.now() - started) / 1000),
        route:
          'fresh game → staff danger → help survivor → train A survey → train B → Mullae silent/held → manual S-01 → shelter → explicit ending',
        stateInjection: false,
        records,
        result,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS episode 1 continuous 3D, no state injection, seconds:',
    Math.round((Date.now() - started) / 1000),
  )
}
