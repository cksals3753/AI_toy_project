# 에피소드 1 시설 식별·조사 표면 점검

2026-10-25. 승인된 [챕터 2 개선](../facility-review/README.md)을 기준으로 챕터 1·3·4·5·6의 실제 시설을 점검했다. 기존 단서·대사·정답·조사 ID·분기·NPC·완료 조건과 저장 형식은 변경하지 않았다. 챕터 2 시설과 침수·감염자·IS-02 동작도 유지한다.

## 챕터별 수정과 유지

| 장  | 수정한 대상                                                                                                                                    | 유지한 대상/판정                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | 안내도의 두꺼운 몸체를 얇은 프레임/받침으로 정리, 역명 간판 축소, 감지 패널에 상단 계기와 하단 그릴 추가, 제목을 가리던 상태등을 상단으로 이동 | 기존 안내 도식·02:18/1.8m 단서, Kenney 물품함 모델·NPC·출구                 |
| 3   | 비상 부스는 기록 상판·서류, 승인기는 화면·두 조작부, 호출기는 보호 덮개·원형 버튼으로 구분. A 내부 운행 중지 표식은 얇은 프레임                | A/B 열차 모델·번호·선로·신호·열린 문/닫힌 문 판정·NPC·탑승 확인             |
| 4   | 통신함은 개방 랙·세 포트·케이블, 정차 패널은 화면·단일 조작부. 연결 상태에 따라 플러그 이동·표시 변경. 설명서 라벨 축소                        | 휴대폰 실물·위치·60 거리, 노선 표시기·설명서 책·주행/전원/정차 퍼즐·하차    |
| 5   | 감지기는 원형 센서 헤드·그릴, 등록기는 화면/조작부, 기록은 서류 상판, 취소 장치는 보호 버튼. 정비문 손잡이/환기 슬롯                           | 신발·열차·NPC·방송/다시 보기·응답 명시 선택·점검창 허용 대상·등록/통행 조건 |
| 6   | 제어반은 세 조작부, 배수는 계기/눈금·배관/휠, 빗장은 두 브래킷·밀림 봉/손잡이, 해치는 보강재·손잡이, 도착 확인대는 서류·도장                   | 두 경로·배수→빗장→해치 순서·사다리·NPC·수위·별도 도착 확인·결과 재열람      |

긴 설명은 기존 조사/기록 UI에 그대로 남긴다. 라벨은 줄 수에 맞는 작은 단면 시설 표식이며, 접근 행동은 공통 HUD에서 표시한다. 시점/FOV를 강제 변경하거나 충돌을 키워 간판 접근을 막지 않는다. 새 형상은 기존 팔레트와 Three.js 기본 도형으로 직접 구성했으며 외부 에셋 추가가 없다.

## 거리와 판정 기준

아래는 월드 단위다. **변경 전 모두 60**이며, 변경 대상만 용도에 따라 다르게 정했다. 렌더러 단위는 해당 구역 `sceneScale`로 나누면 된다. 경계값 미만에서 활성화한다. 모든 문·사람·신발·해치 등 미기재 대상의 60 정책과 챕터 2의 확인된 정책은 유지한다.

| 장  | 대상 ID                                                                | 전 → 후                        | 기준                                                            |
| --- | ---------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| 1   | map / panel / cabinet                                                  | 60 → 110 / 90 / 70             | 프레임/계기/물품함 앞면                                         |
| 3   | platform-record / approval / call-b                                    | 60 → 110 / 95 / 65             | 기록대 앞면 / 조작 전면 / 북쪽 호출 버튼                        |
| 3   | train-a-stop                                                           | 60 → 115                       | 운행 중지 안내 프레임 앞면                                      |
| 4   | train-phone                                                            | 60 → **60**                    | 휴대폰 실제 평면 x+17,y+3,19×28; 좌석 전체를 대상으로 하지 않음 |
| 4   | train-route / train-manual                                             | 60 → 105 / 95                  | 높은 표시기 / 책의 조사 높이                                    |
| 4   | train-devices / train-stop                                             | 60 → 100 / 90                  | 연결 포트 / 요청 패널 앞면                                      |
| 5   | moon-warning / moon-broadcast / moon-window / moon-route               | 60 → 115 / 90 / 90 / 100       | 전광판 / 방송 장치 / 점검창 / 현장 표식 앞면                    |
| 5   | moon-playback / moon-receipt / moon-attachment / moon-terminal         | 60 → 80 / 110 / 100 / 90       | 기록 상판·등록 조작면                                           |
| 5   | moon-sensor / moon-cancel-device                                       | 60 → 70 / 65                   | 센서 헤드 / 취소 버튼                                           |
| 5   | moon-active-record / moon-cancel-note                                  | 60 → 100 / 105                 | 내부 기록·취소 안내 프레임                                      |
| 6   | final-map / final-manual / final-window / final-review / final-control | 60 → 120 / 110 / 90 / 85 / 100 | 대피도·설명·점검창·서류·제어반 앞면                             |
| 6   | recovery-note / recovery-water / recovery-valve / recovery-bolt        | 60 → 115 / 100 / 65 / 70       | 내부 안내·상태 계기·밸브 휠·빗장                                |
| 6   | shelter-sign / shelter-arrival                                         | 60 → 105 / 80                  | 내부 표식 / 도착 확인대                                         |

`facilityProfiles.ts`는 표현 종류·조사 높이·거리만 관리한다. 진행/정답 데이터는 포함하지 않는다. `interaction.ts`의 같은 표면·거리 정책을 2D와 3D에서 공유한다. 3D는 모델 피벗이 아닌 광선 충돌점까지 수평 거리를 계산하고, 실제 시설 높이 밖의 허공은 선택하지 않는다. E·클릭·모바일 버튼은 동일한 선택 결과를 사용한다.

조사 면만 얇게 만들면 뒷면이 투명한 판정체가 될 수 있어, 기존 몸체 안쪽에 보이지 않는 차폐 면을 별도로 유지했다. 뒤에서 앞면을 관통해 조사하거나 다른 시설을 투과해 선택하지 못한다. 2D도 조사 면의 방향과 벽·다른 시설의 가림을 확인한다. NPC 자신의 의자만 대화 가림에서 제외하며, 다른 물체의 뒤에 있는 대상에는 가림을 적용한다. 기존 제한적 조준 보조와 선택 안정화는 유지한다. 시설의 바닥 충돌 크기·출입구·기존 저장 좌표는 변경하지 않는다.

## 같은 위치의 전후 화면

PC 1280×1000, 밝기 기본값, 같은 회차 상태·위치·yaw/pitch로 촬영했다. 시각 체크포인트를 주입한 비교용 화면이며 연속 플레이의 증거와 구분한다. 비교 시점에서 판정 높이가 낮은 물체는 실제 조사를 위해 내려다보며, 그 조작은 별도로 검사한다.

| 장/대상             | 수정 전                             | 수정 후                            |
| ------------------- | ----------------------------------- | ---------------------------------- |
| 1 안내도            | [전](before-map.png)                | [후](after-map.png)                |
| 1 감지 패널         | [전](before-panel.png)              | [후](after-panel.png)              |
| 1 물품함(외형 유지) | [전](before-cabinet.png)            | [후](after-cabinet.png)            |
| 3 호출기            | [전](before-call-b.png)             | [후](after-call-b.png)             |
| 3 승인기            | [전](before-approval.png)           | [후](after-approval.png)           |
| 3 비상 부스         | [전](before-platform-record.png)    | [후](after-platform-record.png)    |
| 4 휴대폰(외형 유지) | [전](before-train-phone.png)        | [후](after-train-phone.png)        |
| 4 통신함            | [전](before-train-devices.png)      | [후](after-train-devices.png)      |
| 4 요청 패널         | [전](before-train-stop.png)         | [후](after-train-stop.png)         |
| 5 감지기            | [전](before-moon-sensor.png)        | [후](after-moon-sensor.png)        |
| 5 등록 단말         | [전](before-moon-terminal.png)      | [후](after-moon-terminal.png)      |
| 5 취소 장치         | [전](before-moon-cancel-device.png) | [후](after-moon-cancel-device.png) |
| 6 제어반            | [전](before-final-control.png)      | [후](after-final-control.png)      |
| 6 밸브              | [전](before-recovery-valve.png)     | [후](after-recovery-valve.png)     |
| 6 빗장              | [전](before-recovery-bolt.png)      | [후](after-recovery-bolt.png)      |
| 6 해치              | [전](before-recovery-hatch.png)     | [후](after-recovery-hatch.png)     |
| 6 도착 확인대       | [전](before-shelter-arrival.png)    | [후](after-shelter-arrival.png)    |

[전 위치 기록](before-views.json) · [후 위치/조사 기록](after-views.json)

## 검증 기록

- 자동 검사: 25개 파일 **239개 통과**. 기존 챕터 1–6 상태·저장·결과·공개 증거 계약, 기존 조준 보조/밀집 후보 검사와 신규 시설의 표면·높이·거리 밖·벽 가림·뒷면·2D 방향을 검사했다.
- 타입 검사·ESLint·정적 플레이테스트 빌드/배포 감사: 통과. Three.js 지연 청크는 약 **765.75 kB**이며 기존 500 kB 경고는 유지했다. 임계값을 바꾸지 않았다.
- Chrome 프로덕션 대표 시설: 17개 동일 시점 촬영과 대상 선택·E 조사, 각 장 대표 시설의 390×844 터치 조사를 통과했다. [요청/콘솔 기록](production-network.json)의 API·외부 요청 0회, 예외·콘솔 오류·에셋 실패 0건이다. 화면을 직접 비교해 몸체/부품·표식의 가독성을 확인했다. 콘솔 화면을 뒤로 옮겨 조작부가 가려지지 않도록 보정한 최종 빌드에서 캡처를 갱신했다. 수정 전후 17개 위치·yaw/pitch가 모두 일치함을 별도로 확인했다.
- 대표 시설 근접/사선/거리 밖: 안내도·승인기·통신함·등록기·경로 제어반의 **15개 체크포인트 통과**. [검사 기록](after-angles-views.json), [사선 안내도](after-map-oblique.png), [근접 통신함](after-train-devices-near.png), [거리 밖 제어반](after-final-control-outside.png). [모바일 패널](after-panel-mobile.png) · [모바일 승인기](after-approval-mobile.png) · [모바일 통신함](after-train-devices-mobile.png) · [모바일 등록기](after-moon-terminal-mobile.png) · [모바일 제어반](after-final-control-mobile.png).
- 챕터 2 회귀: 첫 대합실 진입 체크포인트부터 최저 이동 배율 0.6·체력 1·배터리 0·음소거로 침수 우회, 두 단계 셔터 중단/재시도/저장, 회로 변경·방송 기록·누수 증가·개찰구·챕터 3 연결을 통과했다. 해당 경로 붙잡힘 재시도는 0회였다. [진행](../chapter2-restructure/production-result.json) · [PC/터치·밝기·직원 통로 분기](../chapter2-restructure/production-controls.json).
- 2D 대체 화면: WebGL 컨텍스트 실패를 의도적으로 유도한 별도 실행에서 **대표 17곳 선택·조사/장치 UI 호출 통과**. [2D 기록](fallback-views.json) · [2D 통신함](fallback-train-devices.png) · [2D 취소 장치](fallback-moon-cancel-device.png). 의도적 렌더러 오류는 프로덕션 무오류 검사에 섞지 않는다. 이 검사는 체크포인트별 대체 조작 검사이며 2D 새 게임→엔딩 완주 검사는 아니다.
- 챕터별 체크포인트 분기: [실행 결과](branches/results.json). 챕터 3의 도움/초대/비동행·A 조사 왕복·승인 오답/수정·탑승, 챕터 4의 연결/전원 복구·동기화 실패/재시도/보조·하차, 챕터 5의 응답/무응답 × 동행/비동행 **4조합**, 챕터 6의 수동/자동 × 동행/비동행 **4조합**을 통과했다. 각 장 PC 메뉴·모바일 입력, 과거/신규 3D 저장 복원과 결과 고정도 확인했다. 캡처는 [3장](branches/chapter3/01-platform-desktop.png) · [4장](branches/chapter4/03-rear-restored.png) · [5장](branches/chapter5/02-holding-released-true.png) · [6장](branches/chapter6/06-result-true-true.png). 완료되지 않은 실행은 통과로 집계하지 않는다.

비교용 호출기 저장은 이미 문이 열린 상태이므로 E 재조작으로 사건이 반복되지 않는 것이 정상이다. 실제 닫힘→호출→개방은 챕터 3 분기 검사에서 확인했다.

검사 과정에서 새 게임 연속 경로는 대합실 단계에서 자동 조준/현장 조작 처리 때문에 중단됐다. 이 시설 개선 당시에는 새 게임→엔딩 무주입 연속 플레이를 완료하지 못했다. **후속 검증에서는 프로덕션 새 게임부터 엔딩까지 356초의 무주입 연속 경로를 완료했다.** [실제 경로·저장·엔딩·오류·제약](continuous-final/README.md)을 따른다. 넓은 시설의 모서리에서 중심을 겨누던 자동 경로를 실제 가까운 조사 표면으로 바꾸고, 조작 완료를 상태 변화로 기다리도록 보완했다. 챕터 3의 과거 모바일 검사도 현재 동적 조이스틱의 시작→이동 입력으로 갱신했다. 시각 보정 중 개발 서버 HMR로 잠금이 풀린 실행도 제외하고, 소스 수정을 멈춘 뒤 챕터 5–6을 다시 통과했다. 게임의 감염자·셔터·거리 판정을 약하게 만들지 않았다. 저장 주입을 사용하는 시각 비교·분기 검증과 실제 입력 진행을 구분한다.

## 제약

2D는 카메라 조준이 아닌 최근접 자동 선택이므로, 호출기·감지기처럼 다른 시설의 범위와 겹치면 원하는 작은 장치 쪽으로 조금 더 이동해야 한다. 3D와 거리 상한·표면·가림 정책은 공유하지만 선택 방식은 다르다.

실제 iOS/Android 터치, 실제 GPU·디스플레이의 암부 가독성·체감 거리는 미검증이다. Chrome 터치 에뮬레이션과 사람이 실제 기기에서 느끼는 조작감은 구분한다. 시설에 아주 가까이 붙으면 실제 몸체가 화면을 채울 수 있으며 카메라 강제 밀기나 통로 축소는 적용하지 않았다. 작은 시설 라벨은 HUD 이름과 기존 조사 기록으로 보완한다.

## 재현 명령

```sh
npm test
npm run lint
npm run build:playtest
PRODUCTION_CHECK=1 FIRST_PERSON_CHECK=facilities FACILITY_ANGLES=both VISUAL_LABEL=after node scripts/verify-browser.mjs
FIRST_PERSON_CHECK=facility-branches FACILITY_REGRESSION_ROOT=docs/episode-facilities/branches node scripts/verify-browser.mjs
FIRST_PERSON_CHECK=facilities-2d VISUAL_LABEL=fallback node scripts/verify-browser.mjs
```

분기 검사에서 `FACILITY_BRANCH_START=5`를 지정하면 챕터 5–6만 재개한다. 비교용 before 빌드는 작업 전 소스 스냅샷을 별도 임시 디렉터리에서 빌드해 촬영했으며 현재 작업 트리를 되돌리지 않았다. 모든 실행은 로컬이며 배포·Spring·외부 AI를 사용하지 않는다.
