import assert from 'node:assert/strict'
export const verifyAiChat = async ({ evaluate, click, close, wait, state, send }) => {
  await click('휴대폰')
  await wait(500)
  const enter = async (text, actor) => {
    await evaluate(
      `(()=>{const s=document.querySelector('#ai-character');s.value=${JSON.stringify(actor)};s.dispatchEvent(new Event('change',{bubbles:true}));const t=document.querySelector('.ai-composer textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(text)});t.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    )
    await wait(100)
    await evaluate(`document.querySelector('.ai-composer form').requestSubmit()`)
  }
  for (const actor of ['seo', 'kang', 'min', 'oh']) {
    await enter('현재 확인할 것은 무엇인가요?', actor)
    await wait(120)
    assert.equal((await state()).aiChat.pending.status, 'pending')
    await wait(650)
    assert.equal((await state()).aiChat.pending, null)
    assert.equal((await state()).messages.at(-1).who, actor)
    assert.equal((await state()).messages.at(-1).kind, 'mock-answer')
  }
  await enter('재시도 검증', 'seo')
  await wait(700)
  const before = await state()
  assert.equal(before.aiChat.pending.status, 'error')
  const id = before.aiChat.pending.request.requestId
  await send('Page.reload')
  await wait(600)
  await click('휴대폰')
  await wait(300)
  assert.equal((await state()).aiChat.pending.request.requestId, id)
  await click('같은 질문 재시도')
  await wait(700)
  const after = await state()
  assert.equal(after.aiChat.pending, null)
  assert.equal(after.messages.filter((m) => m.id === `q-${id}`).length, 1)
  assert.equal(after.messages.filter((m) => m.id === `a-${id}`).length, 1)
  assert.equal(after.health, before.health)
  assert.equal(after.battery, before.battery)
  await close()
  console.log(
    'PASS chapter 2 AI UI (mock only): four selected actors, pending, failure, reload, same-ID retry, saved replies, unchanged resources',
  )
}
