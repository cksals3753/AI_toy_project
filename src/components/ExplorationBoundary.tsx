import { Component } from 'react'
import type { ReactNode } from 'react'
import type { ExplorationProps } from './Exploration'
import { Exploration } from './Exploration'

// A failed lazy chunk cannot hold the player in an endless Suspense screen.
export class ExplorationBoundary extends Component<
  { children: ReactNode; exploration: ExplorationProps },
  { failed: boolean; flat: boolean }
> {
  state = { failed: false, flat: false }
  static getDerivedStateFromError = () => ({ failed: true, flat: false })
  render = () =>
    this.state.flat ? (
      <Exploration {...this.props.exploration} />
    ) : this.state.failed ? (
      <div className="renderer-notice" role="alert">
        <p>3D 탐색 화면을 불러오지 못했어요. 저장된 진행은 유지됩니다.</p>
        <button onClick={() => location.reload()}>다시 불러오기</button>
        <button onClick={() => this.setState({ flat: true })}>2D로 계속하기</button>
      </div>
    ) : (
      this.props.children
    )
}
