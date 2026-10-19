# 첫 방 환경·시설 표현 개선

첫 방의 전체 화면 HUD와 기존 오반장 모델은 유지했습니다. `environment-before-*`는 이번 변경 직전, `environment-after-*`는 변경 후 실제 Chrome 캡처입니다. 기존 `before-*`·`after-*` 비교 자료도 보존했습니다.

| 시점           | 변경 전                                | 변경 후                               |
| -------------- | -------------------------------------- | ------------------------------------- |
| PC 1280×800    | [이전](environment-before-desktop.png) | [이후](environment-after-desktop.png) |
| 모바일 390×844 | [이전](environment-before-mobile.png)  | [이후](environment-after-mobile.png)  |
| 오반장         | [이전](environment-before-npc.png)     | [이후](environment-after-npc.png)     |

시작 좌표는 `(480,460)`, NPC 비교는 `(220,420)`이며 모두 yaw/pitch 0입니다. 카메라 눈높이는 1.55→1.50m, 수직 시야각은 72→64도로 조정했습니다. 천장·벽·충돌 범위와 초기 방향은 유지했으며, 시야각 변화 때문에 같은 좌표에서도 투영 범위는 달라집니다. 시점 흔들림이나 자동 회전은 없습니다.

## 변경 사항

- 시설에 붙던 ‘가까이에서 조사’·‘기록 확인’을 없앴습니다. 안내도는 구역 연결·현 위치·찢어진 종이로, 패널은 FD-01 계기와 경보 기록·수심·펌프 정지 표시로 구분합니다. 물품함은 기존 모델과 작은 EQ-03 라벨을 사용합니다. 필수 조사 대사·단서·퍼즐 문구는 유지합니다.
- 조준점에 맞춘 가까운 대상만 HUD 버튼에 `E 대상 이름 조사`를 표시합니다. 조사 후에는 기존 완료 표시·단서 재확인, NPC 대화와 문 확인을 유지합니다. [안내도](environment-after-facility-map.png) · [감지 패널](environment-after-facility-panel.png) · [물품함](environment-after-facility-cabinet.png).
- 오른쪽 벤치 모델을 기존 충돌 범위 안에서 소폭 이동·회전했습니다. 가방은 왼쪽 벤치 범위 안에 두고, 바닥 안내문·끌린 자국·먼지·벽 도장 손상을 소수 배치했습니다. 장식에는 조사 프록시·하이라이트·새 사건·추가 충돌을 부여하지 않았습니다. 종이와 오염은 평면이며 가방이 이동 경로를 점유하지 않습니다.
- 중앙광과 주변광을 조정하고 안내도·정비문 주변 조명과 NPC 얼굴 보조광을 추가했습니다. 벤치 아래에는 가벼운 접지 음영을 사용하며 그림자 맵은 계속 비활성입니다.

## 검증

- `npm test`: 기존 게임·저장·충돌·입력·AI 비활성 관련 111개 통과. `npm run build`, `npm run lint`, `npm run format:check` 수행.
- `npm run test:browser:first`: 실제 Chrome 키보드 이동·벤치/시설 충돌·세 조사 대상 E 입력·비차단 현장 기록·NPC 대화·암호·대합실 연결·모바일 이동/시점/조사·저장 재개 확인.
- `FIRST_PERSON_CHECK=resume npm run test:browser:first`: 조사/대화/메뉴/퍼즐 복귀, Esc, 잠금 거부 후 클릭 복귀 검사.
- `FIRST_PERSON_CHECK=shortcuts npm run test:browser:first`: Tab/I/Esc, 포커스·입력창·반복 입력·메뉴 전환 검사.
- `VISUAL_LABEL=environment-after FIRST_PERSON_CHECK=visual npm run test:browser:first`: 360×640, 390×844, 844×390, 1280×800, 1920×1080의 캔버스·HUD·넘침 확인. 세 시설에 실제 조준·접근해 HUD 대상명/활성 상태를 검사하고 캡처. NPC 모델·대기 애니메이션 로딩 확인. 챕터 2~6은 기존 2D 합성 저장 체크포인트의 렌더러/HUD만 확인하며 전체 플레이 재검증을 의미하지 않습니다.
- 브라우저 검증은 임시 저장을 사용하며 외부 AI 요청 0회를 검사합니다. 첫 방 전용 명령은 AI가 비활성화된 프론트만 실행하므로 Java가 필요하지 않습니다. Spring·모의 AI 통합 검증은 기존 `test:browser` 명령을 사용합니다. 현재 환경에 JDK가 없어 Spring 통합 검사는 수행하지 않았습니다.

원본 측정: [이전](environment-before-metrics.json), [이후](environment-after-metrics.json). SwiftShader·DPR 1·Vite 개발 빌드의 RAF 및 제출 드로콜 측정이며 GPU 프레임 시간이 아닙니다. 소품 추가로 드로콜은 증가합니다. 실제 모바일 GPU·Safari/Firefox·노치·발열·실기기 조작은 미검증입니다. 기존 3D 청크 크기 경고도 남아 있습니다.
