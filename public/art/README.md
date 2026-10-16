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
- 모델 경로는 `src/game/firstPerson.ts`의 `firstRoomAssets`에서 교체합니다. 2D 스프라이트와 초상화는 다른 챕터에서 그대로 사용합니다. 첫 방 현장 오반장은 아래 리깅 모델을 사용합니다.


## 첫 방 오반장 3D 인물

- 원본 제작·배포: **Kenney**, [Animated Characters Protagonists](https://kenney.nl/assets/animated-characters-protagonists).
- 실제 다운로드: https://kenney.nl/media/pages/assets/animated-characters-protagonists/608191acc4-1774773108/kenney_animated-characters-protagonists.zip
- 원본 동봉 라이선스: `kenney-characters/License.txt`, **CC0 1.0**. 상업적 이용·수정·재배포 가능. 구매·가입·외부 업로드 없음.
- 사용 파일: `kenney-characters/characterMedium.fbx`, `idle.fbx`. 원본 모델과 애니메이션 파일은 수정하지 않고 필요한 파일만 추출했습니다. FBX는 Three.js FBXLoader로 로컬 로드합니다.
- `oh-skin.svg`: 원본 `Skins/Source/criminalMaleA.svg`의 파생 스킨. UV 배치를 보존하고 512×512로 래스터화하도록 규격화했습니다. 원래 피부색·머리색·상의색을 기존 초상화의 피부·회색 머리·보라색 작업복 색으로 수정했습니다. 원본의 수염·흉터·강한 눈썹을 제거하고 사각 안경과 차분한 표정을 추가했습니다. 원본 파일명은 배포본 내부 식별자이며 **게임 인물의 역할·정체 설정과 관계가 없습니다**.
- 런타임: `src/game/ohModel.ts`. 키 1.74m로 정규화하고 기존 NPC 좌표에 배치합니다. 기존 판정용 사각형은 유지합니다. 대기 애니메이션만 재생하며 추종·전투 AI를 추가하지 않습니다. 동작 줄이기에서는 대기 동작을 멈춥니다. 이름·초상화·대사·숨겨진 역할은 기존 데이터 그대로입니다.
- 스킨과 애니메이션을 포함한 모든 파일은 프로젝트에서 제공하며 외부 URL에 의존하지 않습니다. 애니메이션 로드 실패 시 안내하고 게임 판정은 계속 사용할 수 있습니다.

## 자체 제작 환경 디테일

`firstRoomDetails.ts`의 벽 패널·걸레받이·케이블 트레이·천장 배관·전기함·국소 바닥 오염은 프로젝트 코드로 제작했습니다. 충돌 경로를 바꾸지 않도록 벽과 천장에 배치했습니다. 벤치 재질은 저채도 청회색, 높은 거칠기로 통일하고 따뜻한 비상등과 차가운 실내광으로 구역을 구분합니다. 눈에 보이던 벤치 충돌용 박스는 렌더링에서 제외했습니다. 정적 박스는 재질별로 병합하되 기존 충돌·레이캐스트 판정은 보존합니다. 그림자 맵은 사용하지 않습니다.
