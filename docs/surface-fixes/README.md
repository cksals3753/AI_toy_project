# 열차 표면·NPC 몸통 표시 수정

## 재현 조건과 비교 범위

첨부 원본 이미지가 현재 대화에 전달되지 않아 원본의 정확한 위치·각도를 특정하지 못했습니다. 대신 실제 A-17 표면과 착석 생존자에서 같은 종류의 결함을 재현하고, 같은 저장·좌표·yaw/pitch·화면 크기에서 전후를 촬영했습니다. 원본 이미지와 완전히 같은 구도 검증은 미완료입니다.

Chrome 헤드리스 / SwiftShader, PC 1280×1000, 공통 3D 탐색기 사용. 각 시점에서 실제 키 입력으로 이동하고 마우스로 시점을 회전하며 3개 이동 프레임도 저장합니다. 테스트용 브라우저 프로필에 체크포인트를 넣으며 사용자 저장을 바꾸지 않습니다.

## 1. 열차 검은 줄무늬

**확인한 원인은 깊이 충돌입니다.** 승강장 열차 외벽의 앞면과 창문 상자의 앞면 좌표가 정확히 같았습니다. A의 외벽 끝 `y=155`와 창문 끝 `y=155`, B의 외벽 시작 `y=483`과 창문 시작 `y=483`이 겹쳐 창문 대신 벽색·검은색이 줄무늬로 번갈아 보였습니다. 카메라를 비스듬히 돌리거나 이동하면 패턴이 변했습니다.

| 후보 원인   | 확인                                                                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 겹친 면     | 외벽·창문의 앞면이 일치. 전후 캡처에서 재현·해소 확인                                                                                                    |
| 그림자 얼룩 | 해당 렌더러의 그림자맵은 수정 전부터 비활성이고 광원도 그림자를 생성하지 않음. `before.json`·`after.json`의 `shadows=false`. 그림자 설정은 변경하지 않음 |
| 중복 모델   | 외부 열차는 충돌 맵에서 만든 한 벌의 절차적 외벽. FBX/GLTF 열차의 이중 표시가 아님                                                                       |
| 투명도·재질 | 불투명 기본 깊이 검사·깊이 쓰기 사용. 투명도·깊이 검사 해제로 우회하지 않음                                                                              |

A·B 창문을 각 외벽 바깥으로 월드 좌표 0.5(현재 배율에서 1cm) 분리했습니다. 식별 표식·문·외벽·충돌 조건은 유지합니다. 같은 방식으로 기둥 위에 덧댄 띠의 면도 공면이어서 신도림·문래역의 띠를 미세하게 돌출시켰습니다. 재질·조명·전역 그림자 설정은 그대로입니다.

- 비스듬한 A-17: [수정 전](before-train-a-angle.png) / [수정 후](after-train-a-angle.png)
- 이동 중 A-17: [전](before-train-a-angle-motion-1.png) / [후](after-train-a-angle-motion-1.png)
- 근거리: [전](before-train-a-near.png) / [후](after-train-a-near.png)
- 원거리: [전](before-train-a-far.png) / [후](after-train-a-far.png)
- B-04: [전](before-train-b-angle.png) / [후](after-train-b-angle.png)

## 2. NPC 몸통 앞 박스

**회색·검은 박스는 NPC 판정체나 중복 캐릭터가 아니라 의자의 보이는 등받이·꽉 찬 좌석 형상이었습니다.** 앞을 바라보는 NPC 앞쪽에 등받이가 놓여 몸통을 가렸습니다. 공통 FBX 로더의 앉기 처리도 골반을 과하게 내리고 FBX의 관절 축을 고려하지 않은 로컬 Euler 회전으로 다리를 배치해 몸이 좌판 속에 묻혔습니다.

기존 충돌·상호작용 프록시는 `material.visible=false`이며 렌더링되지 않습니다. NPC는 장면마다 기존 모델 한 명만 생성하고 별도의 임시 인체를 생성하지 않습니다. 기존 메시·재질·스케일·스킨을 재사용합니다.

수정 내용:

- 객실·복구 구역·대피소의 작은 NPC 의자는 아래가 열린 좌판·다리와 배우 뒤쪽의 등받이로 표현합니다. 기존 전체 충돌 영역은 보이지 않는 프록시로 유지합니다.
- 공통 앉기에서 골반을 좌판 높이에 맞추고, 허벅지는 앞쪽·종아리는 아래쪽으로 향하도록 실제 월드 관절 방향을 사용합니다. 대기 애니메이션의 상체 움직임은 유지합니다.
- 일어서기 때 원래 관절 자세를 복구합니다. 앉기 높이에 맞춰 기존 붕대 소품의 높이도 함께 조정합니다.
- [실제 모델의 수정 전 골격 높이](skeleton-before.json) / [수정 후](skeleton-after.json). 수정 전에는 발 관절이 골반보다 위에 있었으며, 수정 후에는 좌판에 맞춘 골반과 그 아래의 발을 검증합니다.

| 방향        | 수정 전                                           | 수정 후                                      |
| ----------- | ------------------------------------------------- | -------------------------------------------- |
| 앞          | [몸통을 가리는 박스](before-npc-seated-north.png) | [의상·몸통·다리](after-npc-seated-north.png) |
| 뒤          | [전](before-npc-seated-south.png)                 | [후](after-npc-seated-south.png)             |
| 옆          | [전](before-npc-seated-east.png)                  | [후](after-npc-seated-east.png)              |
| 구역 재진입 | [전](before-npc-reentered.png)                    | [후](after-npc-reentered.png)                |
| 저장 복원   | [전](before-npc-resumed.png)                      | [후](after-npc-resumed.png)                  |

공통 로더를 쓰는 [첫 방 오반장](other-after-oh-first.png), [대합실 오반장](other-after-oh-hall.png), [문래역 생존자](other-after-npc-mullae.png), [대피소 착석 생존자](other-after-npc-shelter.png)도 확인했습니다. `idle-1`·`idle-2` 파일은 1.2초 간격 대기 애니메이션 표본이며 `motion-0~2`는 실제 이동·시점 회전 중 표본입니다. 각 기록에서 모델·대기 애니메이션 로드가 성공했습니다.

## 검사와 실행

```sh
FIRST_PERSON_CHECK=surface-visual SURFACE_LABEL=after npm run test:browser:first
SURFACE_OTHERS=1 FIRST_PERSON_CHECK=surface-visual SURFACE_LABEL=other-after npm run test:browser:first
SURFACE_INSPECT_ONLY=1 FIRST_PERSON_CHECK=surface-visual SURFACE_LABEL=after npm run test:browser:first
```

`docs/episode1-3d-integration/checkpoints.json`의 실제 회차 저장을 사용하므로 그 파일이 없으면 연속 검증을 먼저 실행합니다. `SURFACE_LABEL=before`는 수정 전 코드에서 촬영할 때만 사용합니다. 원자료는 [수정 전](before.json), [수정 후](after.json), [다른 NPC](other-after.json)에 있습니다.

- `npm test`: 15개 파일·152개 테스트 통과.
- 타입 검사·빌드·린트 통과. 기존 청크 경고 유지, 임계값 변경 없음.
- 시각 검사: A·B 열차의 근거리·원거리·사선·이동 표본, NPC 앞·뒤·옆·대기·실제 객실 재진입·저장 복원 통과.
- 각 브라우저 검증의 런타임 예외·AI API 요청 0건.

## 미검증

원본 첨부 이미지의 정확한 구도, 실제 iOS/Android·Safari·서로 다른 GPU는 미검증입니다. 이동 표본은 연속 동영상이 아닌 실제 조작 중 캡처 프레임입니다. 모델·의상의 저폴리곤 스타일과 기존 임시 시설 재질은 변경하지 않았습니다.

추가 회귀: `FIRST_PERSON_CHECK=chapter4 npm run test:browser:first` 통과. 동행·비동행, 전원·중계기 복구, 정차 미니게임 재시도, 정차 후 착석→기립, 하차·챕터 5 연결, 저장·모바일·메뉴 복귀를 확인했습니다.
