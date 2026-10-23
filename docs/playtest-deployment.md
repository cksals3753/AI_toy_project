# 지인 테스트용 정적 배포

## 준비된 구성

챕터 1~6과 에피소드 1 결과 화면을 Spring·AI 없이 제공한다. 저장소에서 기존 호스팅 설정이나 연결 메타데이터는 발견되지 않았다. GitHub 원격은 `cksals3753/AI_toy_project`이다. 외부 계정에 이미 연결된 서비스가 있는지는 확인하지 않았다.

Netlify를 대상으로 `netlify.toml`과 `public/_redirects`를 준비했다. 배포는 아직 수행하지 않았다. 공식 문서: [Vite 설정](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/), [SPA 처리](https://docs.netlify.com/build/configure-builds/javascript-spas/), [Node 버전](https://docs.netlify.com/build/configure-builds/manage-dependencies/), [설정 파일](https://www.netlify.com/knowledge-base/how-to-configure-redirects-headers-and-env-vars-in-netlifyto/).

- 빌드: `npm run build:playtest`
- 공개 폴더: `dist`만 지정. 저장소 루트·`backend`·`docs`를 공개하지 않는다.
- Node.js: 24. Java·Maven·Spring 실행 불필요.
- 서비스 도메인 루트(`/`)에 배포한다. 기존 `/art/…` 경로를 유지한다. GitHub Pages의 `/저장소명/` 하위 경로 배포는 이 설정의 대상이 아니다.
- `playtest` 빌드는 로컬/호스팅 환경변수 값과 무관하게 AI를 false, 3D를 true로 고정한다. 일반 개발·선택적 AI 코드는 유지한다.
- 원래 파일은 그대로 제공하고 다른 경로는 `index.html`로 처리한다. URL은 챕터 식별자가 아니다. 직접 URL 접근도 시작/이어하기 화면이며 진행 위치는 브라우저 저장으로 결정된다.
- API·DB·로그인·새로운 분석 서비스·서비스 워커는 추가하지 않는다.
- Netlify 설정에 검색 제외 헤더를 넣었지만 비공개 접근 제어가 아니다. URL을 아는 사람은 접속할 수 있다.

## 로컬 확인

```sh
npm ci
npm run build:playtest
npm run preview -- --host 127.0.0.1
```

표시된 주소(기본 `http://127.0.0.1:4173`)를 Chrome으로 연다. 시작 → 3D 탐색 → E 조사 → Tab 단톡방 → I 단서 → 퍼즐 → 다음 구역을 확인한다. 새로고침 후 이어하기와 소리 설정·음소거도 확인한다. `/playtest/direct`에 직접 접근해도 시작 또는 이어하기 화면이 열린다.

```sh
npm test
npm run lint
npm run test:browser:production
# 이미 빌드한 dist에서 첫 방 오디오를 따로 검사
PRODUCTION_CHECK=1 FIRST_PERSON_CHECK=audio node scripts/verify-browser.mjs
```

프로덕션 브라우저 검사는 Vite preview와 Chrome만 실행한다. 기본값은 새 게임부터 엔딩까지 실제 입력을 사용하는 `episode` 검사다. 경로 탐색 보조 함수는 Node의 소스 로더에서 실행하며 배포 앱에 디버그 API나 개발 모드를 추가하지 않는다. 프로덕션의 카메라는 개발용 dataset 대신 실제 저장된 시점을 읽는다. 에셋 응답은 원본 바이트와 비교하고 API·외부 요청 및 콘솔/로딩 오류를 수집한다. 에피소드 검사 기록은 기존 `docs/episode1-3d-integration/`, 네트워크 기록은 로그에 표시된 임시 캡처 폴더에 저장한다. 오디오 검사는 Web Audio의 재생 상태·샘플과 입력/음소거 복구를 측정하며 실제 스피커 청취 검사를 대체하지 않는다.

`build:playtest`의 마지막 단계는 공개 에셋 누락·변경, 추적 중인 로컬 환경파일, 서버/제작자 소스·소스맵 포함, 알려진 키 형태를 검사한다. 이는 비밀 검출의 완전성을 보장하는 보안 도구는 아니다. 키를 `VITE_` 변수에 넣지 않고 서버 환경파일은 계속 Git에서 제외한다.

## 직접 할 배포 절차

1. 변경 파일을 검토하고 Git에 커밋한 뒤 배포할 브랜치로 push한다. 이 작업에서는 커밋·push하지 않았다.
2. Netlify에 로그인한다. 계정이 없다면 직접 생성한다. 요금과 사용 제한을 확인하고 유료 옵션을 선택하지 않는다.
3. 새 프로젝트 추가 → 기존 저장소 가져오기 → GitHub를 선택하고, 필요한 저장소 접근을 허용한다.
4. `cksals3753/AI_toy_project`와 위에서 push한 브랜치를 선택한다. Base directory는 저장소 루트, Build command는 `npm run build:playtest`, Publish directory는 `dist`인지 확인한다. 저장소의 `netlify.toml`을 사용한다.
5. AI 키·서버 주소 등 환경변수는 추가하지 않는다. 이 배포에는 필요 없다. 배포를 실행한다.
6. 생성된 HTTPS 주소에서 시작, 모델 로딩, E/Tab/I/Esc, 소리, 새로고침·이어하기를 확인한다. 개발자 도구 Network에서 `/api/` 요청과 에셋 404가 없는지 확인한 뒤 지인에게 URL을 전달한다.
7. 이후 같은 사이트에 배포를 갱신한다. 사이트/도메인이 달라지면 브라우저 저장도 분리된다. Git 연동 자동 배포 대상 브랜치는 직접 선택한 범위로 관리한다.

저장소 연결을 원하지 않으면 로컬 `npm run build:playtest` 후 Netlify의 수동 배포에 **dist 폴더만** 올릴 수 있다. `_redirects`는 포함되지만 수동 업로드에서는 루트 `netlify.toml`의 빌드/헤더 설정이 적용된다고 가정하지 않는다. 재현 가능한 갱신을 위해 Git 연동을 권장한다.

## 지인에게 전달할 안내

“챕터 1~6과 엔딩을 플레이할 수 있는 테스트 버전입니다. PC Chrome과 키보드·마우스를 권장합니다. 모바일은 터치 조작을 지원합니다. 소리는 첫 클릭 후 시작하며 설정에서 조절할 수 있습니다. 진행은 접속한 브라우저에만 저장되고 기기 간 공유되지 않습니다. 시크릿 모드 종료·브라우저 데이터 삭제 시 저장이 사라질 수 있습니다. 오류가 나면 챕터·장소·직전 행동·브라우저·기기와 화면을 알려주세요.”

실제 호스팅 배포·실제 모바일 기기·실제 GPU/스피커·다른 브라우저는 별도 확인이 필요하다. WebGL2가 없으면 기존 2D 대체 화면을 사용한다. 처음 3D 코드를 받을 때 번들 로딩 비용이 있으며 Vite의 큰 청크 경고는 남아 있다. 프론트만의 테스트 게임이므로 클라이언트 코드/저장 데이터의 변조 방지나 제작자 수준의 비밀 보장은 제공하지 않는다.

병렬 헤드리스 검사에서 첫 방 인물 로딩 실패가 한 번 있었고, 재실행에서는 통과했다. 원인은 확정하지 않았다. 기존 공간 로딩 제한은 8초이며 느린 기기·네트워크에서 재시도나 2D 대체가 필요할 수 있으므로 실제 배포 주소에서 첫 진입을 확인한다.

## 이번 검증 기록 (2026-10-23)

[검증 요약과 네트워크 기록](playtest-verification.json)을 참조한다. 프로덕션 새 게임 → 챕터 1~6 → 실제 도착 상호작용 → 엔딩 저장·재열기를 상태 주입 없이 453초에 완료했다. 전체 진행과 오디오 검사, 직접 URL 검사에서 API·외부 요청 및 최종 에셋 오류가 없었다. 실제 Netlify 헤더·배포는 아직 검증하지 않았다. 이번 캡처 원본은 로컬 임시 폴더 `last-transfer-ch5-nmhV9A`에 보관했으며 기존 개발 검증 캡처는 덮어쓰지 않았다.
