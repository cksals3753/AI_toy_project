import assert from 'node:assert/strict'

// Uses the shared CDP harness, real saved chapter-4 checkpoints, and real movement input.
export const verifyChapter5 = async ({
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
}) => {
  const reload = async (checkpoint) => {
    await evaluate(
      `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(checkpoint))});location.reload()`,
    )
    await wait(650)
  }
  const resume = async () => {
    const before = await state()
    await send('Page.reload')
    await wait(650)
    assert.deepEqual((await state()).chapter5, before.chapter5)
  }
  const approach = async (id) => {
    await walkTo(id)
    await interact()
    await advanceAll()
  }
  const select = async (label, value) => {
    await evaluate(
      `{const e=document.querySelector('select[aria-label="${label}"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))}`,
    )
    await wait(80)
  }
  const nameInput = async (text) => {
    await evaluate(
      `{const e=document.querySelector('#moon-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}))}`,
    )
    await wait(80)
  }
  try {
    for (const choice of ['silent', 'answered']) {
      const checkpoint = choice === 'answered' && accompanied ? accompanied : alone
      await send('Emulation.setDeviceMetricsOverride', {
        width: choice === 'silent' ? 390 : 1280,
        height: choice === 'silent' ? 844 : 1000,
        deviceScaleFactor: 1,
        mobile: choice === 'silent',
      })
      await reload(checkpoint)
      const previous = await state()
      await click('챕터 5 · 대답 없는 승강장 시작')
      await resume()
      assert.equal((await state()).chapter5.displayName, null)
      if (choice === 'silent') {
        await nameInput(' ')
        await click('이 표시 이름 확인')
        assert.equal((await state()).chapter5.displayName, null)
        await nameInput('너무긴표시이름'.repeat(4))
        await click('이 표시 이름 확인')
        assert.equal((await state()).chapter5.displayName, null)
        await nameInput('달빛')
        await resume()
        assert.equal((await state()).chapter5.profileDraft, '달빛')
        await screenshot('14-profile-mobile.png')
        // Native Enter submits the profile form; movement keys do not respond to the announcement.
        await evaluate('document.querySelector("#moon-name").focus()')
        await hold('Enter', 20)
      } else await click('기본 이름')
      assert.equal((await state()).area, 'moonPlatform')
      assert.equal((await state()).chapter5.displayName, choice === 'silent' ? '달빛' : '한결')
      await advanceAll()
      assert.equal((await state()).chapter5.response, 'undecided')
      assert.equal((await state()).chapter3.npcBoarded, previous.chapter3.npcBoarded)
      await screenshot(`15-platform-${choice}.png`)
      await approach('moon-sensor')
      assert.match(
        await evaluate('document.querySelector(".overlay-panel").innerText'),
        /응답하면 출구가 아닌 확인 구역 차단문/,
      )
      assert.equal(
        await evaluate(
          '[...document.querySelectorAll("button")].find(b=>b.textContent.includes("경고를 확인했으며")).disabled',
        ),
        true,
      )
      await close()
      for (const id of ['moon-warning', 'moon-shoes', 'moon-window']) await approach(id)
      await approach('moon-broadcast')
      assert.equal((await state()).chapter5.response, 'undecided')
      await click('휴대폰')
      const paused = (await state()).position
      await hold('w', 180)
      assert.deepEqual((await state()).position, paused)
      await click('대답하지 말라는 근거')
      await close()
      await approach('moon-sensor')
      if (choice === 'silent') {
        // The mobile branch uses an actual touch event on the explicit choice button.
        const point = await evaluate(
          '(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("응답하지 않는다"));b.scrollIntoView({block:"center"});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()',
        )
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await wait(120)
      } else await click('경고를 확인했으며 대답한다')
      await resume()
      await advanceAll()
      assert.equal((await state()).chapter5.response, choice)
      if (choice === 'answered') {
        assert.equal((await state()).area, 'moonHolding')
        await approach('moon-platform-door')
        assert.equal((await state()).area, 'moonHolding')
        for (const id of ['moon-active-record', 'moon-cancel-note']) await approach(id)
        await walkTo('moon-cancel-device')
        await interact()
        await select('등록 건 선택', 'REG-409')
        await click('활성 등록 취소')
        assert.equal((await state()).chapter5.registration, 'active')
        await select('등록 건 선택', 'REG-410')
        await click('활성 등록 취소')
        await advanceAll()
        await resume()
        assert.equal((await state()).chapter5.registration, 'cancelled')
        await approach('moon-platform-door')
      } else assert.equal((await state()).area, 'moonPlatform')
      await approach('moon-booth-door')
      for (const id of ['moon-playback', 'moon-receipt', 'moon-attachment']) await approach(id)
      await click('휴대폰')
      for (const text of ['차단문이 작동', '예전 직원 호출', '외부 송신 기록과']) await click(text)
      await close()
      await walkTo('moon-terminal')
      await interact()
      await select('등록 건 선택', 'REG-411')
      await click('등록 건·첨부 원본 대조')
      assert.equal((await state()).chapter5.matched, false)
      await select('등록 건 선택', 'REG-410')
      await click('등록 건·첨부 원본 대조')
      assert.equal((await state()).chapter5.matched, true)
      await screenshot(`16-registration-${choice}.png`)
      await close()
      await resume()
      await walkTo('moon-terminal')
      await interact()
      await click(choice === 'silent' ? '미확인 등록 보류' : '취소된 등록의 외부 유도 보류')
      assert.equal((await state()).chapter5.externalPaused, true)
      assert.equal((await state()).chapter5.routeOpen, false)
      await close()
      await resume()
      await approach('moon-platform-door')
      await walkTo('moon-maintenance')
      await interact()
      await select('통행 문', 'D-02')
      await select('승인 방식', 'local')
      await click('현장 통행 조건 대조')
      assert.equal((await state()).chapter5.routeOpen, false)
      await close()
      await approach('moon-route')
      await walkTo('moon-maintenance')
      await interact()
      await select('통행 문', 'D-03')
      await select('승인 방식', 'remote')
      await click('현장 통행 조건 대조')
      assert.equal((await state()).chapter5.routeOpen, false)
      await select('통행 문', 'D-02')
      await select('승인 방식', 'local')
      await click('현장 통행 조건 대조')
      assert.equal((await state()).chapter5.routeOpen, true)
      await close()
      await resume()
      await click('휴대폰')
      await click('누가 제 표시 이름')
      await close()
      await walkTo('moon-maintenance')
      await interact()
      await click('열린 정비 통로 앞')
      await advanceAll()
      await resume()
      assert.equal((await state()).chapter5.completed, false)
      await click('승강장에서 더 확인')
      await walkTo('moon-maintenance')
      await interact()
      await click('열린 정비 통로 앞')
      await screenshot(`17-exit-${choice}.png`)
      await click('정비 통로 이동 승인')
      await resume()
      const completed = await state()
      assert.equal(completed.chapter5.completed, true)
      assert.equal(completed.area, 'moonPlatform')
      assert.equal(completed.health, previous.health)
      assert.equal(completed.battery, previous.battery)
      assert.deepEqual(completed.inventory, previous.inventory)
      assert.deepEqual(completed.chapter4, previous.chapter4)
      assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false)
      const visible = await evaluate('document.body.innerText')
      assert.match(visible, /문래역/)
      assert.doesNotMatch(visible, /구로역|진짜 조력자|의도적인 거짓말|오반장이 제출/)
      console.log(
        `PASS chapter 5 ${choice}: profile validation/resume, physical investigation, explicit warnings, questions, record matching, independent route proof, saved completion, companion=${previous.chapter3.npcBoarded}`,
      )
    }
  } catch (error) {
    await screenshot('chapter5-failure.png')
    console.error(
      'Chapter 5 browser failure',
      await state(),
      await evaluate('document.body.innerText'),
    )
    throw error
  }
}
