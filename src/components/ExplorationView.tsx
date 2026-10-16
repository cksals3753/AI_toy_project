import { lazy, Suspense } from 'react'
import { Exploration } from './Exploration'
import type { ExplorationProps } from './Exploration'
const FirstPersonRoom = lazy(() =>
  import('./FirstPersonRoom').then((module) => ({ default: module.FirstPersonRoom })),
)
export function ExplorationView(props: ExplorationProps) {
  return props.area === 'first' && import.meta.env.VITE_FIRST_ROOM_3D !== 'false' ? (
    <Suspense fallback={<div className="renderer-notice">정비 대기실 준비 중…</div>}>
      <FirstPersonRoom {...props} />
    </Suspense>
  ) : (
    <Exploration {...props} />
  )
}
