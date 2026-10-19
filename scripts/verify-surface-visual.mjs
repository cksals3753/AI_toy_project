import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

export const verifySurfaceVisual = async ({
  send,
  evaluate,
  state,
  wait,
  resume3d,
  look,
  hold,
  approach,
  pressE,
  advanceAll,
}) => {
  const label = process.env.SURFACE_LABEL || 'before',
    dir = 'docs/surface-fixes'
  await mkdir(dir, { recursive: true })
  if (process.env.SURFACE_INSPECT_ONLY) {
    const geometry = await evaluate(
      `(async()=>{const {createTrainScene}=await import('/src/game/trainScene.ts');const s=JSON.parse(localStorage.getItem('last-transfer-save-v1'));const c3={...s.chapter3,npcBoarded:true},c4={...s.chapter4,started:true,arrived:false};const w=createTrainScene('trainB',c3,c4,()=>{});await w.ready;await new Promise(r=>setTimeout(r,400));w.updateTrain(c3,c4,0.016,false);w.scene.updateMatrixWorld(true);const out=[];w.scene.getObjectByName('survivor-low-poly').traverse(o=>{if(o.isBone)out.push({name:o.name,y:o.matrixWorld.elements[13]})});w.dispose();return out})()`,
    )
    await writeFile(`${dir}/skeleton-${label}.json`, JSON.stringify(geometry, null, 2))
    const hips = geometry.find((b) => b.name === 'Hips').y
    const feet = geometry.filter((b) => ['LeftFoot', 'RightFoot'].includes(b.name)).map((b) => b.y)
    assert.ok(hips > 0.3 && hips < 0.4, 'pelvis aligns with seat')
    assert.ok(
      feet.every((y) => y < hips && y > -0.1 && y < 0.2),
      'shins extend toward floor',
    )
    console.log('NPC skeleton: seat-aligned pelvis', hips, 'feet below pelvis', feet)
    return
  }
  const checkpoints = JSON.parse(
    await readFile('docs/episode1-3d-integration/checkpoints.json', 'utf8'),
  )
  const restore = async (s, area, p, yaw, pitch) => {
    const v = await evaluate(
      `import('/src/game/view3d.ts').then(m=>m.makeView3d(${JSON.stringify(area)},${JSON.stringify(p)},${yaw},${pitch}))`,
    )
    const save = { ...s, area, position: p, view3d: v, scene: [], sceneIndex: 0 }
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(save))})`,
    })
    await send('Page.reload')
    await wait(1100)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
    await resume3d()
    await wait(500)
  }
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`${dir}/${label}-${name}.png`, Buffer.from(data, 'base64'))
  }
  const views = process.env.SURFACE_OTHERS
    ? [
        ['oh-first', '01-first', 'first', { x: 220, y: 430 }, 0, -0.2],
        ['oh-hall', '02-hall', 'hall', { x: 745, y: 320 }, 0, -0.2],
        ['npc-mullae', '07-mullae', 'moonPlatform', { x: 615, y: 425 }, 0, -0.2],
        ['npc-shelter', '09-shelter', 'shelter', { x: 615, y: 260 }, Math.PI, -0.25],
      ]
    : [
        ['train-a-near', '05-platform', 'platform', { x: 350, y: 210 }, 0, 0],
        ['train-a-far', '05-platform', 'platform', { x: 350, y: 420 }, 0, 0],
        ['train-a-angle', '05-platform', 'platform', { x: 450, y: 210 }, 0.9, 0],
        ['train-b-angle', '05-platform', 'platform', { x: 760, y: 430 }, Math.PI, 0],
        ['npc-platform-north', '05-platform', 'platform', { x: 215, y: 270 }, Math.PI, -0.22],
        ['npc-platform-south', '05-platform', 'platform', { x: 215, y: 440 }, 0, -0.22],
        ['npc-seated-north', '06-train', 'trainB', { x: 615, y: 260 }, Math.PI, -0.35],
        ['npc-seated-south', '06-train', 'trainB', { x: 615, y: 435 }, 0, -0.35],
        ['npc-seated-west', '06-train', 'trainB', { x: 535, y: 345 }, -Math.PI / 2, -0.35],
        ['npc-seated-east', '06-train', 'trainB', { x: 700, y: 345 }, Math.PI / 2, -0.35],
      ]
  const records = []
  for (const [name, key, area, p, yaw, pitch] of views) {
    await restore(checkpoints[key], area, p, yaw, pitch)
    assert.deepEqual((await state()).position, p, 'safe visual fixture ' + name)
    await shot(name)
    if (name.includes('npc') || name.includes('oh-')) {
      await wait(1200)
      await shot(`${name}-idle-1`)
      await wait(1200)
      await shot(`${name}-idle-2`)
    }
    const before = await state()
    for (let i = 0; i < 3; i++) {
      await hold('d', 120)
      await look(yaw + (i + 1) * 0.025, pitch)
      await shot(`${name}-motion-${i}`)
    }
    assert.notDeepEqual((await state()).position, before.position)
    records.push({
      name,
      position: p,
      yaw,
      pitch,
      renderer: await evaluate("({...document.querySelector('canvas').dataset})"),
    })
    console.log('PASS visual', label, name)
  }
  if (!process.env.SURFACE_OTHERS) {
    // Same actor after genuine compartment re-entry and unmodified save resume.
    await restore(checkpoints['06-train'], 'trainB', { x: 615, y: 435 }, 0, -0.35)
    await approach('train-rear-door')
    await pressE()
    await resume3d()
    await approach('train-central-door')
    await pressE()
    await resume3d()
    await approach('survivor')
    await shot('npc-reentered')
    const s = await state()
    await send('Page.reload')
    await wait(1100)
    await state()
    await resume3d()
    assert.deepEqual((await state()).view3d, s.view3d)
    await shot('npc-resumed')
    await pressE()
    await advanceAll()
  }
  await writeFile(
    `${dir}/${label}.json`,
    JSON.stringify(
      {
        label,
        views: records,
        npcReentry: !process.env.SURFACE_OTHERS,
        npcResume: !process.env.SURFACE_OTHERS,
      },
      null,
      2,
    ),
  )
}
