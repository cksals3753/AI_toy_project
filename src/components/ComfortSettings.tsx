import { defaultComfort } from '../game/comfort'
import type { ComfortSettings as Settings } from '../game/comfort'
const SettingRange = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) => (
  <label className="grid gap-2 text-sm">
    {label}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
)
export const ComfortSettings = ({
  settings,
  onChange,
  error,
}: {
  settings: Settings
  onChange: (settings: Settings) => void
  error: boolean
}) => (
  <fieldset className="my-4 grid gap-4 rounded-lg border border-slate-600 p-4">
    <legend>화면·조작</legend>
    <SettingRange
      label={`장면 밝기 ${Math.round(settings.brightness * 100)}%`}
      min={0.85}
      max={1.25}
      step={0.05}
      value={settings.brightness}
      onChange={(v) => onChange({ ...settings, brightness: v })}
    />
    <details>
      <summary>어두운 장면 식별표 확인</summary>
      <svg
        viewBox="0 0 320 100"
        role="img"
        aria-label="비상 동선·사람 실루엣·시설 표식 식별 샘플"
        style={{ filter: `brightness(${settings.brightness})` }}
      >
        <rect width="320" height="100" fill="#111c24" />
        <rect x="10" y="10" width="90" height="70" fill="#263640" />
        <path d="M10 90H310" stroke="#d7b66e" strokeWidth="5" />
        <circle cx="150" cy="30" r="10" fill="#8c999a" />
        <path d="M150 42V75M150 50L132 65M150 50L169 65" stroke="#8c999a" strokeWidth="9" />
        <text x="210" y="45" fill="#d7d9bb" fontSize="18">
          E-01
        </text>
        <text x="200" y="70" fill="#d7b66e" fontSize="12">
          건조 우회 →
        </text>
      </svg>
      <small>
        식별표와 실제 조명은 다릅니다. 설정을 닫아 현장도 확인하세요. 밝기는 전원·통행 판정을 바꾸지
        않습니다.
      </small>
    </details>
    <SettingRange
      label={`마우스 감도 ${Math.round((settings.mouseSensitivity / 0.0015) * 100)}%`}
      min={0.0005}
      max={0.004}
      step={0.0001}
      value={settings.mouseSensitivity}
      onChange={(v) => onChange({ ...settings, mouseSensitivity: v })}
    />
    <SettingRange
      label={`터치 감도 ${Math.round((settings.touchSensitivity / 0.003) * 100)}%`}
      min={0.001}
      max={0.008}
      step={0.0005}
      value={settings.touchSensitivity}
      onChange={(v) => onChange({ ...settings, touchSensitivity: v })}
    />
    <SettingRange
      label={`시야각 (세로 기준) ${settings.fov}°`}
      min={55}
      max={80}
      step={1}
      value={settings.fov}
      onChange={(v) => onChange({ ...settings, fov: v })}
    />
    <small>
      화면비에 따라 가로 시야각을 40–105°로 보정합니다. 이동 중 시야각은 바뀌지 않습니다. 2D에서는
      시점 설정이 적용되지 않습니다.
    </small>
    <SettingRange
      label={`편안한 이동 속도 ${Math.round(settings.moveSpeed * 100)}% · 감염자도 같은 비율`}
      min={0.6}
      max={1}
      step={0.05}
      value={settings.moveSpeed}
      onChange={(v) => onChange({ ...settings, moveSpeed: v })}
    />
    <button type="button" onClick={() => onChange({ ...defaultComfort })}>
      화면·조작 기본값 복원
    </button>
    <small role="status">
      {error
        ? '설정을 저장하지 못했습니다. 현재 플레이에는 적용됩니다.'
        : '즉시 적용 · 게임 진행과 별도로 이 브라우저에 저장됩니다. 설정 중 위협은 정지합니다.'}
    </small>
  </fieldset>
)
