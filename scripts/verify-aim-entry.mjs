import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'

export const verifyAimEntry = async ({
  send,
  evaluate,
  click,
  close,
  state,
  advanceAll,
  wait,
  approach,
  pressE,
  resume3d,
  look,
  trustedClick,
}) => {
  const dir = 'docs/aim-entry'
  await mkdir(dir, { recursive: true })
  const checkpoints = JSON.parse(
    await readFile('docs/episode1-3d-integration/checkpoints.json', 'utf8'),
  )
  const restore = async (s) => {
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(s))})`,
    })
    await send('Page.reload')
    await wait(1100)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    await state()
  }
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot')
    await writeFile(`${dir}/${name}.png`, Buffer.from(data, 'base64'))
  }
  const roundTrips = []
  await restore(checkpoints['03-repeat-2'])
  await resume3d()
  for (const id of ['electrical', 'hall-return', 'electrical', 'hall-return']) {
    await approach(id)
    await pressE()
    await resume3d()
    const s = await state()
    roundTrips.push({ area: s.area, position: s.position, view3d: s.view3d })
    assert.equal(s.view3d.area, s.area)
    assert.ok(Math.abs(s.view3d.yaw) < 0.001, 'receiving south door faces north')
    if (s.area === 'hall') assert.deepEqual(s.position, { x: 215, y: 478 })
  }
  await look(0.6, -0.15)
  await evaluate('document.exitPointerLock()')
  await wait(150)
  const saved = await state()
  await restore(saved)
  assert.deepEqual((await state()).position, saved.position)
  assert.deepEqual((await state()).view3d, saved.view3d)
  await resume3d()
  await shot('01-door-resume')
  await restore(checkpoints['06-train'])
  await resume3d()
  await approach('train-phone')
  // Compute the old exact-center intersection against the actual phone proxy bounds.
  // This is geometry observation only; camera changes use trusted mouse input below.
  const aim = await evaluate(`(async()=>{
    const T=await import('/node_modules/.vite/deps/three.js');const {getWorld}=await import('/src/game/world.ts');const {sceneScale}=await import('/src/game/firstPerson.ts');
    const s=JSON.parse(localStorage.getItem('last-transfer-save-v1')),scale=sceneScale(s.area),e=getWorld(s.area,s.chapter3.npc,s.chapter3.npcBoarded,s.chapter2.power,s.chapter3.doorOpen,s.chapter4,s.chapter5,s.chapter6).entities.find(e=>e.id==='train-phone'),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
    const c=new T.PerspectiveCamera(64,r.width/r.height,0.05,40);c.position.set((s.position.x-480)/scale,1.5,(s.position.y-310)/scale);c.rotation.order='YXZ';const yaw=+canvas.dataset.yaw,pitch=+canvas.dataset.pitch;
    const box=new T.Box3(new T.Vector3((e.x+17-480)/scale,0,(e.y+3-310)/scale),new T.Vector3((e.x+36-480)/scale,0.3,(e.y+31-310)/scale));
    const hits=a=>{c.rotation.set(pitch,a,0,'YXZ');c.updateMatrixWorld();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(),c);return !!ray.ray.intersectBox(box,new T.Vector3())};
    if(!hits(yaw))throw Error('base aim must hit old proxy');
    const choices=[];for(const direction of [-1,1])for(let i=1;i<200;i++){const a=yaw+direction*i*0.005;if(!hits(a)){choices.push({yaw:a+direction*0.004,pitch,original:yaw});break}}return choices
  })()`)
  let selectedAim
  for (const candidate of aim) {
    await look(candidate.yaw, candidate.pitch)
    await wait(120)
    if (/휴대폰/.test(await evaluate("document.querySelector('.interaction').textContent"))) {
      selectedAim = candidate
      break
    }
  }
  if (!selectedAim) {
    console.log('Phone edge candidates', aim, (await state()).position)
    await shot('failure-phone')
  }
  assert.ok(selectedAim)
  assert.match(await evaluate("document.querySelector('.interaction').textContent"), /휴대폰/)
  await shot('02-phone-assisted')
  await pressE(true)
  await advanceAll()
  assert.ok((await state()).clues.includes('train-phone'))
  await resume3d()
  await look(selectedAim.original, selectedAim.pitch)
  await trustedClick('.first-person canvas')
  await advanceAll()
  assert.ok((await state()).clues.includes('train-phone'))
  const mobile = await state()
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  await restore(mobile)
  if (await evaluate("!!document.querySelector('.exploration-resume')"))
    await trustedClick('.exploration-resume')
  assert.match(await evaluate("document.querySelector('.interaction').textContent"), /휴대폰/)
  await trustedClick('.interaction button')
  await advanceAll()
  assert.ok((await state()).clues.includes('train-phone'))
  await shot('03-phone-mobile')
  await writeFile(
    `${dir}/result.json`,
    JSON.stringify(
      {
        roundTrips,
        saveRestored: true,
        phoneAim: selectedAim,
        unassistedCenterMisses: true,
        assistedE: true,
        mouseClick: true,
        mobileButton: true,
      },
      null,
      2,
    ),
  )
  console.log(
    'PASS aim/entry: receiving doorway round trips, exact saved pose, off-center phone beyond unassisted proxy center ray, E/click/mobile button',
  )
}
