# 프로젝트 작업 지침

## 개요와 현재 범위

마지막 환승은 모바일 우선 반응형 아포칼립스 생존 웹게임이다. 가상의 신도림역을 배경으로 직접 이동·현장 조사·초상화 대화·단톡방·퍼즐을 결합한다. React 19, TypeScript, Vite, 첫 방 Three.js(WebGL2), 이후 Canvas를 사용한다. 선택적 AI 자유 대화는 Java 21 / Spring Boot 4.1.1 / Maven Wrapper의 별도 `backend/`가 담당한다.

현재 플레이 범위는 첫 방부터 챕터 6의 지상 대피소 도착·에피소드 1 완료까지이며 상세 내용과 제약은 [README](README.md)를 따른다. 외부 AI 자유 대화는 챕터 2만 지원한다. 다음 챕터, 전투, 로그인, DB, 전체 게임 상태 서버 이전, 외부 배포는 구현 완료로 간주하지 않는다. 스크립트 기본 플레이에는 AI 키나 서버가 필요하지 않다.

## 작업 전 확인

- 대상과 관련된 실제 코드·문서를 먼저 읽는다. 기존 캐릭터 이름·숨겨진 역할·세계관·장소를 요청 없이 변경하지 않는다.
- 계획과 실제 구현을 구분한다. 문서와 코드가 충돌하면 실제 동작을 확인하고 차이를 보고한다.
- 현재 경로를 기준으로 문서를 안내한다: [README](README.md), [에셋 규격](public/art/README.md), [백엔드 실행](backend/README.md), [AI API 계약](docs/ai-api-contract.md), [챕터 6 제작자 설정](docs/chapter6-author.md). `docs/` 제작자 문서는 일반 플레이 안내와 구분하고 비공개 내용을 응답에 복제하지 않는다.

## 구조와 책임

- `src/game/engine.ts`의 판정·자원·상태 전이·저장 호환성과 기존 챕터 데이터 구조를 우선 활용한다. `world.ts`는 충돌·접근성, `renderWorld.ts`는 Canvas 표현, `src/components/`는 탐색 및 React UI를 담당한다.
- `src/game/dialogue.ts`는 스크립트 제공자, `src/chat/`는 선택적 AI 요청·공유 문맥을 담당한다. AI는 허용된 지식 안에서 대사만 생성한다. 정답·조건·아이템·자원·성공 판정은 게임 코드만 변경한다.
- 사용자 주장만으로 게임 상태를 변경하지 않는다. 인물별 지식, 조사한 단서, 단톡방에 공개한 정보, 비신뢰 대화를 구분한다. 제작자용 진실과 일반 플레이 기록을 섞지 않는다.
- 비공개 캐릭터 정책은 `backend/src/main/resources/private/characters.json`에 둔다. 프론트에서 import하지 않는다. 공개 증거 사본은 `chapter2-public.json`이며 프론트 `src/chat/chapter2Public.ts`와 계약 테스트로 일치를 확인한다. 이 지침에 숨겨진 역할이나 퍼즐 정답을 나열하지 않는다.
- Spring `chat/` 패키지는 gateway·controller·context·service·provider 경계를 유지한다. 기존 Node AI 서버는 제거되었으므로 중복 운영을 추가하지 않는다. AI 실패가 선택형 질문과 필수 진행을 막지 않게 한다.

## 구현과 저장

- 첫 방은 `ExplorationView.tsx`에서 지연 로드한 `FirstPersonRoom.tsx`를 사용한다. `firstRoomScene.ts`는 표현만 담당하며 `world.ts` 좌표·충돌과 기존 reducer 판정을 재사용한다. 새 3D 에셋은 `firstPerson.ts`에 등록하고 `public/art/README.md`에 출처·라이선스·수정 여부를 기록한다. 나머지 챕터를 요청 없이 3D로 변환하지 않는다.
- 탐색 키는 `explorationInput.ts`의 물리 `event.code`를 사용하고 입력창·contenteditable·반복 입력을 구분한다. 키·버튼·터치는 같은 선택 대상과 상호작용 함수를 사용한다. 첫 방의 짧은 조사는 비차단 현장 기록으로 표시한다. 3D 대화·메뉴·퍼즐은 마지막 사용자 입력에서 React 상태를 반영한 뒤 남은 UI가 없을 때만 잠금 복귀를 한 번 요청한다. 거부·Esc 해제 후 자동 재시도하지 않으며 화면의 복귀 클릭은 상호작용이나 이동에 재사용하지 않는다. 모바일은 잠금 없이 UI 종료 후 복구한다. blur·잠금 해제·UI 전환 시 이동과 드래그 입력을 비운다.
- 메뉴 단축키는 `App.tsx`에서 물리 Tab·KeyI·Escape로 처리한다. 탐색 영역 또는 열린 휴대폰·소지품 메뉴의 포커스에서만 가로채고 입력창·contenteditable·다른 페이지 요소·대화·퍼즐·전환 중에는 메뉴를 열지 않는다. Shift+Tab은 포커스 이동으로 유지한다. 반복 키는 눌림 상태와 repeat로 차단한다. 메뉴 전환은 일시정지 상태를 유지하고 닫을 때만 기존 복귀 함수를 호출한다. 메뉴를 떠날 때 기존 읽음 처리를 보존하며 PC에만 키 안내를 표시한다.
- 모바일 터치와 PC 키보드·마우스를 함께 고려한다. 대화·메뉴·퍼즐 중에는 기존 paused 입력 제어를 유지한다.
- 오답·잘못된 경로 뒤에도 의도된 복귀·재시도 경로를 제공한다. 일회성 사건과 자원 변경을 중복 실행하지 않는다.
- 요청 범위 밖의 챕터나 대규모 구조 변경을 임의로 추가하지 않는다.
- `localStorage` 기존 저장을 불필요하게 초기화하지 않는다. 새 필드는 기본값 또는 필요한 마이그레이션을 적용한다. 인물 관계·동행·자원·단서의 연속성을 지킨다.
- 분기·퍼즐 도중·완료 직후 새로고침과 이어하기를 검증한다. 보상·피해·완료 대사가 중복되지 않게 한다.

## 보안과 AI 호출

- API 키는 서버 환경변수 또는 Git에서 제외한 `backend/.env.server`에서만 관리한다. 프론트 번들·`VITE_` 변수·로그·커밋에 넣지 않는다. 설정 예시는 `backend/.env.example`에 비밀 값 없이 둔다.
- 입력과 모델 응답을 검증하고 요청 크기·빈도·동시 호출·시간 제한을 유지한다. 오류 응답에 키·원문 제공자 오류·프롬프트·스택을 노출하지 않는다.
- 동일 요청 재시도와 실패 복구 계약을 보존한다. 세션·제한·캐시는 현재 단일 프로세스 메모리이다.
- 외부 AI 호출은 현재 보류 중이다. 프론트 `VITE_AI_CHAT_ENABLED`와 서버 `AI_CHAT_ENABLED`는 기본 false로 유지한다. 키 설정만으로 활성화하지 않는다. 사용 한도 부족으로 차단된 제공자는 문제 해결 후 서버 재시작 시 해제된다.
- 실제 모델 호출 검증과 테스트 fixture·모의 응답 검증을 명확히 구분한다. Spring은 API만 제공한다. Vite에서 backend·제작자 문서·환경 파일 직접 접근 차단을 유지한다.

## 실행과 검증

루트 `package.json`에 실제 있는 명령을 사용한다.

| 명령                               | 목적                                       |
| ---------------------------------- | ------------------------------------------ |
| `npm ci`, `npm run dev`            | 프론트 설치·개발                           |
| `npm run build`                    | 프론트 TypeScript 검사·Vite 빌드           |
| `npm run lint`                     | ESLint                                     |
| `npm test`                         | 게임·저장·접근성·AI 문맥 계약 테스트       |
| `npm run dev:server` / `npm start` | Spring 개발 실행                           |
| `npm run backend:test`             | Java 단위·로컬 HTTP 테스트                 |
| `npm run backend:build`            | Java 테스트·실행 JAR 생성                  |
| `npm run test:browser`             | Spring 모의 제공자·Vite·Chrome 플레이 검증 |
| `npm run format:check`             | Prettier 대상 파일 형식 검사               |

JDK 21이 필요하며 Maven은 wrapper가 준비한다. 브라우저 검증에는 로컬 Chrome이 필요하다. 기본 `test:browser`는 기존 2D로 챕터 1~6 회귀, `FIRST_PERSON_CHECK=1 npm run test:browser`는 3D 첫 방과 터치, `FIRST_PERSON_CHECK=resume npm run test:browser`는 비차단 조사·UI 종료 복귀·Esc·잠금 거부 후 클릭 복귀를, `E_KEY_CHECK=after npm run test:browser`는 한글 E키 입력을 검증한다. `FIRST_PERSON_CHECK=shortcuts npm run test:browser`는 메뉴 단축키·입력/포커스 범위·2D 구간을 검사한다. 헤드리스 3D는 SwiftShader를 사용할 수 있으며 실제 GPU·모바일 성능 검증과 구분한다. Java 소스는 Prettier 대상이 아니다. 변경 범위에 맞는 검사와 플레이 확인을 수행하며 분기·복구·저장·이어하기를 중점 검증한다. 브라우저 모바일 에뮬레이션과 실제 기기 검증을 구분한다. 수행하지 않은 검사를 통과했다고 보고하지 않는다. 완료 보고에는 변경 내용·검증 결과·미확인 항목·제약을 포함하고 동작·실행 방법이 바뀌면 관련 문서를 갱신한다.
