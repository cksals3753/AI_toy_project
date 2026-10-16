# 마지막 환승 · 에셋 기록

## 기존 벡터 에셋

아래 SVG는 프로젝트를 위해 직접 작성했습니다. 인물 외형과 초상화는 기존 설정을 유지합니다.

- survivors.svg: 48×64 프레임. 행: 플레이어/오반장/서윤/강태오/민재/다친 생존자. 열: 아래/위/왼쪽/오른쪽 방향마다 4프레임(정지 0, 걷기 0→1→2→3).
- station-atlas.svg: 64×64 타일. 순서: 바닥/벤치/기둥/센서/안내도/물품함/데스크/배전반/차단문.
- 초상화: src/components/Portrait.tsx의 SVG. 인물별 머리·의상·장신구를 구분합니다.

규격을 유지한 SVG 또는 PNG 스프라이트로 교체할 수 있습니다. 렌더러는 로딩 전에도 대체 도형으로 플레이를 지원합니다.


## 첫 방 3D 환경 소품

- 제작자: **Kenney** (https://kenney.nl)
- 공식 원본: https://kenney.nl/assets/furniture-kit
- 실제 내려받은 배포본: https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip
- 라이선스: **CC0 1.0 Universal**, 개인·상업적 사용, 수정·재배포 가능. 원본 동봉문은 `kenney-furniture/License.txt`, 정식 조건은 https://creativecommons.org/publicdomain/zero/1.0/ 참조.
- 적용 파일: `kenney-furniture/bench.glb`(대기 벤치), `bookcaseClosedDoors.glb`(비상 물품함), `doorwayFront.glb`(양쪽 문틀). 다운로드 ZIP에서 필요한 GLB와 원본 라이선스만 추출했습니다. GLB 원본 파일 자체는 수정하지 않았습니다.
- 런타임 수정: 기존 충돌 사각형에 맞춰 크기·회전·높이를 정규화하고 재질 밝기·거칠기를 조정합니다. 외부 텍스처 추가 없이 원본 저폴리 재질을 사용합니다. 충돌 판정은 모델 메시 대신 기존 `world.ts`를 따릅니다.
- 벽·바닥·패널·표식·조명은 `src/game/firstRoomScene.ts`에서 직접 구성합니다. 타일 텍스처 128×128, 안내 표식 512×192를 로컬 Canvas로 생성합니다. 외부 CDN·런타임 원격 파일·계정·구매·업로드를 사용하지 않습니다.
- 모델 경로·기존 오반장 스프라이트 행은 `src/game/firstPerson.ts`의 `firstRoomAssets`에서 교체합니다. 오반장은 기존 SVG를 사용하는 빌보드이며 신규 3D 캐릭터 모델이 아닙니다. 초상화는 `src/components/Portrait.tsx`에서 유지합니다.
- 무료 캐릭터 모델은 기존 인물 외형과 일치하는 최소 자산을 확보하지 않아 이번에는 적용하지 않았습니다. 캐릭터 전체 3D화는 범위 밖입니다.
