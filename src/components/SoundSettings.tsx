import { firstRoomAudio } from '../audio/firstRoomAudio'
import type { SoundSettings as Settings } from '../audio/firstRoomAudio'
export const SoundSettings = ({
  settings,
  onChange,
  status,
}: {
  settings: Settings
  onChange: (settings: Settings) => void
  status: string
}) => (
  <fieldset className="sound-settings">
    <legend>사운드 · 챕터 1–7</legend>
    <label>
      <input
        type="checkbox"
        checked={settings.muted}
        onChange={(e) => onChange({ ...settings, muted: e.target.checked })}
      />{' '}
      음소거
    </label>
    <label htmlFor="sound-volume">전체 음량 {Math.round(settings.volume * 100)}%</label>
    <input
      id="sound-volume"
      type="range"
      min="0"
      max="100"
      value={Math.round(settings.volume * 100)}
      onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) / 100 })}
    />
    <button
      type="button"
      disabled={settings.muted || settings.volume === 0 || status === 'unavailable'}
      onClick={() => void firstRoomAudio.preview()}
    >
      소리 확인
    </button>
    <small role="status">
      {status === 'unavailable'
        ? '이 브라우저에서 소리를 재생할 수 없습니다. 자막으로 계속할 수 있습니다.'
        : status === 'locked'
          ? '화면을 누르거나 키를 입력하면 소리가 준비됩니다.'
          : '환풍·설비 환경음, 발걸음, 문·장치 효과음 · 소리 자막 유지'}
    </small>
  </fieldset>
)
