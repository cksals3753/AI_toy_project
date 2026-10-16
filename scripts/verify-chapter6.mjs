import assert from 'node:assert/strict'
export async function verifyChapter6({
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
}) {
  const reload = async (checkpoint) => {
    await evaluate(
      `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(checkpoint))});location.reload()`,
    )
    await wait(650)
    await state()
  }
  const inspect = async (id) => {
    await walkTo(id)
    await interact()
    await advanceAll()
  }
  const select = async (id, value) => {
    await evaluate(
      `(()=>{const e=document.querySelector('#${id}');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await wait(100)
  }
  for (const automatic of [false, true]) {
    const original = {
      ...completed,
      health: 1,
      battery: 0,
      inventory: [],
      clues: completed.clues.filter(
        (id) => !['panel', 'map', 'cabinet', 'hall-recording'].includes(id),
      ),
      asked: completed.asked.filter((id) => !['water', 'west', 'map'].includes(id)),
    }
    await reload(original)
    await click('챕터 6 · 정비 통로 진입')
    await advanceAll()
    assert.equal((await state()).area, 'maintenance')
    await inspect('final-map')
    await inspect('final-manual')
    await click('휴대폰')
    await click('자동 경로는 지상이')
    await close()
    await walkTo('final-control')
    await interact()
    await select('final-mode', 'remote')
    await click('장치 설정 대조')
    assert.equal((await state()).chapter6.settings, null)
    await select('final-door', automatic ? 'G-01' : 'S-01')
    await select('final-mode', automatic ? 'remote' : 'local')
    await click('장치 설정 대조')
    assert.equal((await state()).area, 'maintenance')
    await click('이동 전 근거 확인')
    const confirm = await evaluate('document.querySelector(".overlay-panel").innerText')
    assert.match(confirm, automatic ? /지하 등록 확인 구역/ : /지상 대피소 정문/)
    assert.ok(!confirm.includes('창 너머 표식'), 'undiscovered window evidence leaked')
    await screenshot(`18-final-choice-${automatic}-${completed.chapter3.npcBoarded}.png`)
    // Touch the automatic route confirmation on mobile; manual route uses mouse/keyboard UI.
    if (automatic) {
      const p = await evaluate(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('이 경로로 이동 확정'));b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
      )
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await wait(120)
    } else await click('이 경로로 이동 확정')
    await advanceAll()
    await reload(await state())
    assert.equal((await state()).chapter3.npcBoarded, completed.chapter3.npcBoarded)
    if (automatic) {
      await walkTo('recovery-bolt')
      await interact()
      assert.equal((await state()).chapter6.boltOpen, false)
      await inspect('recovery-note')
      await inspect('recovery-water')
      await walkTo('recovery-valve')
      await interact()
      await advanceAll()
      await reload(await state())
      assert.equal((await state()).chapter6.drained, true)
      await walkTo('recovery-bolt')
      await interact()
      await advanceAll()
      await reload(await state())
      assert.equal((await state()).chapter6.boltOpen, true)
      await walkTo('recovery-hatch')
      await interact()
      await advanceAll()
    }
    assert.equal((await state()).area, 'shelter')
    assert.equal((await state()).chapter6.completed, false)
    await inspect('shelter-sign')
    await reload(await state())
    await walkTo('shelter-arrival')
    await interact()
    await wait(180)
    const result = (await state()).chapter6.result
    assert.ok(result)
    assert.equal(result.npcTogether, completed.chapter3.npcBoarded)
    assert.equal(result.health, 1)
    assert.equal(result.battery, 0)
    assert.deepEqual(result.inventory, [])
    await screenshot(`19-episode-result-${automatic}-${result.npcTogether}.png`)
    assert.doesNotMatch(
      await evaluate('document.querySelector(".overlay-panel").innerText'),
      /진짜 조력자|악역 배지|오반장이 제출/,
    )
    await evaluate(
      `(()=>{const d=[...document.querySelectorAll('summary')].find(x=>x.textContent.includes('실제로 획득한'));d.click()})()`,
    )
    assert.deepEqual((await state()).chapter6.result, result)
    await reload(await state())
    await wait(180)
    assert.deepEqual((await state()).chapter6.result, result)
    await close()
    await click('저장된 결과 보기')
    await close()
    await walkTo('shelter-arrival')
    await interact()
    assert.deepEqual((await state()).chapter6.result, result)
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false)
    console.log(
      `PASS chapter 6 ${automatic ? 'recovery' : 'manual'} companion=${result.npcTogether}: low resources, missing optional clues, configuration/confirmation, route reload, recovery devices, physical arrival, frozen result/replay`,
    )
  }
}
