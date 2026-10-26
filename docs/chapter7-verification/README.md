# 챕터 7 검증 기록

2026-10-26. 구현·조작 설명은 [챕터 7 구현 기록](../chapter7-implementation.md)을 따른다. Chrome CDP 실제 키/마우스/터치 입력과 프로덕션 미리보기를 사용한다. Chrome의 모바일 에뮬레이션은 실제 휴대폰·GPU 검증이 아니다.

## 검사 범위

- 단위/계약: 기존 저장 기본값, 두 경로 × 동행 × 이전 수동/자동 완료, 체력 0/1·배터리 0, 운반/반납/단계 저장, 실제 질문 기록, 재시도 반복, 스냅샷 불변, 안전측 조사 표면, 오디오 종료 범위.
- 브라우저: 기존 완료 저장에서 명시적 진입, 사전 조사 시간 정지, 보강재 집기/반납/설치, 경로별 문·윈치 작업, 준비 확인·완료, 중간 저장/이어하기, 두 손가락 터치, 시간 만료와 실패 저장, 재시도와 시간 완화.
- 네트워크: Spring 없이 Vite preview만 실행. AI/API·외부 요청과 에셋 오류 확인.
- 회귀: 기존 챕터 1~6 및 결과 재열람은 별도 연속 실행으로 구분한다.

## 재현 명령

```sh
npm test
npm run lint
npm run build:playtest
PRODUCTION_CHECK=1 FIRST_PERSON_CHECK=chapter7 node scripts/verify-browser.mjs
PRODUCTION_CHECK=1 CHAPTER7_MOBILE_ONLY=1 FIRST_PERSON_CHECK=chapter7 node scripts/verify-browser.mjs
PRODUCTION_CHECK=1 FIRST_PERSON_CHECK=episode EPISODE_ARTIFACTS=docs/chapter7-verification/episode1-regression node scripts/verify-browser.mjs
```

검사 도구가 만드는 완료 저장 fixture는 기존 reducer로 생성한다. 앱에 디버그 API·제작자 메뉴·챕터 점프를 추가하지 않는다. fixture 검증과 새 게임부터의 에피소드 1 연속 검증을 구분한다. 시간 만료 검사는 제한 직전의 저장에서 실제 활성 프레임으로 만료시킨다. 180초 전체를 기다린 시험으로 보고하지 않는다.

## 판정 수치와 조정 근거

기본 180초, 입구 보강 추가 120초, 완화 옵션은 시간 감소 없음이다. 기획의 기본 120초보다 여유를 늘려 방향 확인·터치 조작·작업 취소에 대응한다. 실제 최저 이동 60% 브라우저 측정은 결과 JSON에 기록한다. 자동 이동·조준 소요 시간은 사람의 판단 시간과 다르므로 신규 플레이어에게 충분하다고 단정하지 않는다.

## 한계

실제 모바일 기기, 신규 플레이어의 시간 여유와 이해도, 실제 청취 음량·멀미·실기기 성능은 미검증이다. 3D 청크의 500kB 경고는 남아 있다. 전체 Prettier 검사에는 기존 다른 검증 기록 JSON의 형식 경고가 있으며, 해당 파일을 무관하게 재작성하지 않는다. 이번 변경 파일은 별도로 검사한다.

`partial-*.json`은 개별 경로 기록이며 전체 검사 성공을 뜻하지 않는다. `*-production-results.json`과 에피소드 회귀 결과를 최종 판정으로 사용한다. 초기 `entrance-solo.png`는 수정 전 완료 배너가 남던 캡처이며 최종 화면 검증에서 제외한다.

## 확인 결과

- `npm test`: 26개 파일 / 254개 테스트 통과. `npm run lint`: 경고 없이 통과. `npm run build:playtest`: TypeScript·Vite 빌드와 정적 배포 감사 통과.
- PC: 두 경로 × NPC 동행 여부 네 조합 완주. 설치 중 메뉴 열기, 윈치·방화문 작업 중 잠금 해제 후 재개, 실제 다른 탭 전환, Tab 단톡방, 중간 새로고침, 명시적 완료를 확인했다.
- 모바일 에뮬레이션: 입구/비동행, 후면/동행 완주. 두 손가락 이동·시점 동시 입력과 해제 후 정지, 운반·설치·문·완료 상태 복원을 확인했다.
- 제한 직전 fixture를 실제 프레임으로 만료시켜 실패 화면·실패 저장을 확인했다. PC에서는 실제 만료·재시도를 두 번 반복했고 자원은 보존됐다. 모바일의 만료 검사는 경로 완주와 별도 Chrome 실행으로 확인했다. 두 경로 기록에 `verifiedInPreviousRun` 표시를 남겨 이를 구분한다.
- 도착 시점 결과의 자원·단서·대화·동행·완료 시각을 비교했고 변경되지 않았다. PC/모바일 수집품 메뉴에서 결과를 열고 ‘에피소드 2 이어하기’로 돌아와도 챕터 7 완료는 유지됐다. 큰 결과 버튼을 탐색 화면에서 제거해 목표와 겹치지 않게 했다.
- 프로덕션 preview의 에셋 전체 응답·직접 URL·이어하기를 확인했다. Spring 프로세스 없이 API/외부 요청 0회, 브라우저 예외·콘솔 오류·에셋 실패 0회였다.

| 입력 / 회차       | 입구 우선 활성 시간 | 후면 우선 활성 시간 |
| ----------------- | ------------------: | ------------------: |
| PC 비동행         |              58.6초 |              34.6초 |
| PC 동행           |              49.1초 |              31.4초 |
| 모바일 에뮬레이션 |     73.6초 (비동행) |       52.5초 (동행) |

모두 이동 배율 60%에서 측정했다. PC 비동행에는 작업 중단 검사가 포함돼 있다. 모바일은 자동 터치 조준·이동 시간이 포함돼 있으므로 입력 방식 간 성능 순위나 사람의 실제 소요 시간으로 해석하지 않는다. 측정 최댓값보다 여유를 두었지만 초보자 충분성은 미확인이고, 시간 완화 옵션을 제공한다.

최종 UI 캡처: [모바일 기록 메뉴 종료 후](archive-mobile.png), [PC 기록 메뉴 종료 후](archive-desktop.png). 경로별 최종 화면은 `desktop-*.png`, `mobile-*.png`와 결과 JSON을 참고한다.

### 기존 에피소드 1 연속 회귀

최종 프로덕션 빌드에서 새 게임 → 챕터 1~6 → 대피소 도착 확인 → 결과 재열람까지 **369초에 연속 완주**했다. 상태 주입·챕터 점프는 없었다. 직원 통로 회피 실패 후 복귀, 생존자 부축 동행, 문래역 무응답, S-01 수동 대피 경로다. 반복 구역 왕복·저장·이어하기도 포함한다. 에셋 오류·브라우저 예외·API/외부 요청은 0회였다. 실제 기록은 `episode1-regression/result.json`, `network.json`과 캡처를 참조한다. 자동 플레이 시간이며 사람의 소요 시간은 아니다.

연속 완주가 실제 생성한 `episode1-regression/checkpoints.json`의 완료 저장을 별도 Chrome에서 이어 열고, 결과 화면 → 에피소드 2 시작 → 휴식까지 UI로 진행했다. 에피소드 1 결과·소지품·표시 이름·동행이 유지됐고, 휴식 중 시간은 0이었다. [실제 저장 연결 확인](actual-save-bridge.json)을 참조한다. 이 연결 검사는 별도 실행이며 369초 연속 완주 시간에 포함하지 않는다.

```sh
PRODUCTION_CHECK=1 CHAPTER7_BRIDGE_ONLY=1 CHAPTER7_REAL_SAVE=docs/chapter7-verification/episode1-regression/checkpoints.json FIRST_PERSON_CHECK=chapter7 node scripts/verify-browser.mjs
```
