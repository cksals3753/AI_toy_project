import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
// Visual checkpoints are deliberately separate from the actual episode route.
export const verifyEpisodeFacilities = async ({
  send,
  evaluate,
  state,
  wait,
  resume3d,
  pressE,
  advanceAll,
  close,
  trustedClick,
  look,
}) => {
  const dir = 'docs/episode-facilities',
    label = process.env.VISUAL_LABEL ?? 'after',
    fallback = process.env.FIRST_PERSON_CHECK === 'facilities-2d'
  await mkdir(dir, { recursive: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const originals = [
    ['first', 'map', 100],
    ['first', 'panel', 75],
    ['first', 'cabinet', 62],
    ['platform', 'call-b', -60],
    ['platform', 'approval', 75],
    ['platform', 'platform-record', 90],
    ['trainB', 'train-phone', 0],
    ['trainRear', 'train-devices', 90],
    ['trainFront', 'train-stop', 70],
    ['moonPlatform', 'moon-sensor', 63],
    ['moonBooth', 'moon-terminal', 75],
    ['moonHolding', 'moon-cancel-device', 60],
    ['maintenance', 'final-control', 85],
    ['recovery', 'recovery-valve', 60],
    ['recovery', 'recovery-bolt', 65],
    ['recovery', 'recovery-hatch', 55],
    ['shelter', 'shelter-arrival', 70],
  ]
  const cases = process.env.FACILITY_ANGLES
    ? originals
        .filter(([, id]) =>
          ['map', 'approval', 'train-devices', 'moon-terminal', 'final-control'].includes(id),
        )
        .flatMap((c) => ['near', 'oblique', 'outside'].map((angle) => [...c, angle]))
    : originals
  const results = []
  for (const [area, id, offset, angle] of cases) {
    const checkpoint = await evaluate(`(async()=>{
      const {initialState:s}=await import('/src/game/engine.ts');const {getWorld,walkable}=await import('/src/game/world.ts');const {makeView3d}=await import('/src/game/view3d.ts');
      const boarded=!['first','platform','trainA'].includes('${area}');const moon=['moonPlatform','moonBooth','moonHolding','maintenance','recovery','shelter'].includes('${area}');const c3={...s.chapter3,started:'${area}'!=='first',approved:true,signal:'green',doorOpen:true,boarded,escaped:boarded,ending:boarded?'complete':'none'};
      const c4={...s.chapter4,started:boarded,arrived:moon,sync:moon?'accepted':'idle',doorSeen:moon,completed:moon};
      const late=['maintenance','recovery','shelter'].includes('${area}');const c5={...s.chapter5,started:moon,displayName:'한결',response:late?'silent':'answered',registration:late?'held':'active',matched:late,externalPaused:late,exitSeen:late,completed:late,routeOpen:late};
      const c6={...s.chapter6,started:late,route:'${area}'==='recovery'?'automatic':null};
      const w=getWorld('${area}','unseen',false,[],true,c4,c5,c6),e=w.entities.find(e=>e.id==='${id}');
      let p={x:e.x+e.w/2,y:${offset}<0?e.y+${offset}:e.y+e.h+${offset}};
      if('${id}'==='platform-record')p={x:720,y:245};
      if('${id}'==='train-phone')p={x:216.5,y:350};
      if('${id}'==='train-devices')p={x:610,y:175};
      if('${id}'==='train-stop')p={x:350,y:175};
      if(${JSON.stringify(angle ?? '')}!=='') {
        const {interactionReach,interactionSurface,surfaceDistance}=await import('/src/game/interaction.ts');const r=interactionSurface(e),reach=interactionReach(e.id),a=${JSON.stringify(angle ?? '')};
        const desired={x:r.x+r.w/2+(a==='oblique'?reach*.55:0),y:e.y+e.h+(a==='outside'?reach+35:a==='near'?26:reach*.55)};
        const points=[];for(let x=65;x<900;x+=5)for(let y=e.y+e.h+15;y<535;y+=5)if(walkable({x,y},w)&&(a==='outside'?surfaceDistance({x,y},e)>reach+10:surfaceDistance({x,y},e)<reach-6))points.push({x,y});
        p=points.sort((a,b)=>Math.hypot(a.x-desired.x,a.y-desired.y)-Math.hypot(b.x-desired.x,b.y-desired.y))[0];
      }
      if(!walkable(p,w)) {const candidates=[];for(let x=60;x<900;x+=10)for(let y=90;y<535;y+=10)if(walkable({x,y},w))candidates.push({x,y});p=candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]}
      if(${fallback}) {
        // 2D selects the nearest facility rather than the camera's aim. Stand
        // slightly closer to the intended small device when two ranges overlap.
        const {nearestEntity}=await import('/src/game/world.ts');
        if(nearestEntity(p,w)?.id!=='${id}') {const candidates=[];for(let x=70;x<890;x+=5)for(let y=90;y<535;y+=5)if(walkable({x,y},w)&&nearestEntity({x,y},w)?.id==='${id}')candidates.push({x,y});p=candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]}
      }
      const tx='${id}'==='train-phone'?216.5:e.x+e.w/2,ty='${id}'==='train-phone'?287:e.y+e.h/2;
      const yaw=Math.atan2(p.x-tx,p.y-ty),pitch='${id}'==='train-phone'?-.9:'${id}'==='recovery-bolt'?-.15:0;
      return {...s,stage:'explore',area:'${area}',scene:[],threat:null,chapter3:c3,chapter4:c4,chapter5:c5,chapter6:c6,position:p,view3d:makeView3d('${area}',p,yaw,pitch)}
    })()`)
    const inject = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${fallback ? "const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).startsWith('webgl'))return null;return original.call(this,kind,...args)};" : ''}localStorage.setItem('last-transfer-save-v1',${JSON.stringify(JSON.stringify(checkpoint))});localStorage.setItem('last-transfer-comfort-v1',JSON.stringify({brightness:1}));localStorage.setItem('last-transfer-audio-v1',JSON.stringify({muted:true,volume:.35}))`,
    })
    await send('Page.reload')
    await wait(1300)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: inject.identifier })
    await state()
    await advanceAll()
    assert.equal((await state()).area, area)
    if (!fallback) await resume3d()
    else
      assert.ok(
        await evaluate("!!document.querySelector('.exploration:not(.first-person) canvas')"),
      )
    await wait(100)
    const shot = await send('Page.captureScreenshot')
    await writeFile(
      `${dir}/${label}-${id}${angle ? '-' + angle : ''}.png`,
      Buffer.from(shot.data, 'base64'),
    )
    const result = {
      area,
      id,
      angle,
      position: (await state()).position,
      view3d: (await state()).view3d,
      target: await evaluate("document.querySelector('.interaction').textContent"),
      enabled: !(await evaluate("document.querySelector('.interaction button').disabled")),
    }
    if (label === 'after' || fallback) {
      const aim = await evaluate(
        `(async()=>{const {getWorld}=await import('/src/game/world.ts');const {interactionSurface,interactionAim}=await import('/src/game/interaction.ts');const {sceneScale}=await import('/src/game/firstPerson.ts');const s=JSON.parse(localStorage.getItem('last-transfer-save-v1')),e=getWorld(s.area,s.chapter3.npc,s.chapter3.npcBoarded,s.chapter2.power,s.chapter3.doorOpen,s.chapter4,s.chapter5,s.chapter6,s.chapter2).entities.find(e=>e.id==='${id}'),r=interactionSurface(e),p=s.position,dx=p.x-r.x-r.w/2,dy=p.y-r.y-r.h/2;return {label:e.label,yaw:Math.atan2(dx,dy),pitch:-Math.atan2(1.5-interactionAim(e.id),Math.hypot(dx,dy)/sceneScale(s.area))}})()`,
      )
      if (!fallback) await look(aim.yaw, aim.pitch)
      if (angle === 'outside') {
        assert.ok(
          !(await evaluate("document.querySelector('.interaction').textContent")).includes(
            aim.label,
          ),
          id + ' outside reach',
        )
        result.outsideRejected = true
        results.push(result)
        continue
      }
      assert.equal(
        await evaluate("document.querySelector('.interaction button').disabled"),
        false,
        id,
      )
      assert.ok(
        (await evaluate("document.querySelector('.interaction').textContent")).includes(aim.label),
        id,
      )
      const beforeAction = await state()
      if (['panel', 'approval', 'train-devices', 'moon-terminal', 'final-control'].includes(id)) {
        await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
        await send('Emulation.setDeviceMetricsOverride', {
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          mobile: true,
        })
        await wait(250)
        const mobileShot = await send('Page.captureScreenshot')
        await writeFile(
          `${dir}/${label}-${id}${angle ? '-' + angle : ''}-mobile.png`,
          Buffer.from(mobileShot.data, 'base64'),
        )
        await trustedClick('.interaction button')
        result.input = 'mobile touch, 390×844'
      } else {
        await pressE(true)
        result.input = 'PC E'
      }
      await wait(100)
      const afterAction = await state()
      assert.ok(
        afterAction.clues.includes(id) ||
          afterAction.scene.length > 0 ||
          (await evaluate("!!document.querySelector('[role=dialog],.field-note')")) ||
          afterAction.notice !== beforeAction.notice ||
          (id === 'call-b' && beforeAction.chapter3.doorOpen && afterAction.chapter3.doorOpen),
        id + ' must open existing UI or change investigation/notice',
      )
      result.investigated = true
      await advanceAll()
      if (await evaluate("!!document.querySelector('.close-button')")) await close()
      await send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      })
    }
    results.push(result)
  }
  await writeFile(
    `${dir}/${label}${process.env.FACILITY_ANGLES ? '-angles' : ''}-views.json`,
    JSON.stringify(results, null, 2) + '\n',
  )
  console.log(
    'CAPTURE episode facilities ' + label + ': ' + results.length + ' same-view checkpoints',
  )
}
