import { ExplorationBoundary } from './ExplorationBoundary'
import { usesFirstPerson } from '../game/firstPerson'
import { lazy, Suspense } from 'react'
import { Exploration } from './Exploration'
import type { ExplorationProps } from './Exploration'
const FirstPersonRoom = lazy(() =>
  import('./FirstPersonRoom').then((module) => ({ default: module.FirstPersonRoom })),
)
export function ExplorationView(props: ExplorationProps) {
  return usesFirstPerson(props.area) && import.meta.env.VITE_FIRST_ROOM_3D !== 'false' ? (
    <ExplorationBoundary exploration={props}>
      <Suspense fallback={<div className="renderer-notice">탐색 공간 준비 중…</div>}>
        <FirstPersonRoom {...props} />
      </Suspense>
    </ExplorationBoundary>
  ) : (
    <Exploration {...props} />
  )
}
