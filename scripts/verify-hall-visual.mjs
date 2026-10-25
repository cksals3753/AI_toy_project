import { mkdir, writeFile } from 'node:fs/promises'
// Fixed safe visual checkpoints. These captures do not count as gameplay completion.
export const verifyHallVisual = async ({ send, evaluate, state, wait, resume3d }) => {
  const dir = 'docs/chapter2-restructure'
  await mkdir(dir, { recursive: true })
  for (const shutter of ['locked', 'unlatched', 'open']) {
    const saved = await evaluate(`(async()=>{
      const {initialState:s}=await import('/src/game/engine.ts');
      const {makeView3d}=await import('/src/game/view3d.ts');
      const position={x:215,y:340};return {...s,stage:'explore',area:'hall',scene:[],
      position, view3d:makeView3d('hall',position,Math.PI,-.12),
      chapter2:{...s.chapter2,shutter:'${shutter}'}}})()`)
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(saved))});localStorage.setItem('last-transfer-audio-v1',JSON.stringify({muted:true,volume:.35}))`,
    })
    await send('Page.reload')
    await wait(1300)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    await resume3d()
    const image = await send('Page.captureScreenshot')
    await writeFile(`${dir}/13-shutter-${shutter}-wide.png`, Buffer.from(image.data, 'base64'))
  }
  console.log('CAPTURE hall shutter fixed safe viewpoints (visual checkpoints only)')
}
