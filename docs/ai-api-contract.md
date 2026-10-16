# AI 대화 API 계약

기존 Node 서버는 챕터 2의 선택형 게임 진행과 별개인 자유 대화만 담당했습니다. Spring으로 옮긴 책임은 익명 세션·출처 검사, 입력 검증, 인물별 비공개 프롬프트, OpenAI Responses 호출, 호출 제한·중복 방지·안전한 오류 응답입니다. 판정·자원·저장·스크립트는 계속 프론트 게임 엔진에 있습니다.

프론트 `src/chat/api.ts`의 상대 URL·요청·응답 형식과 `src/chat/client.ts`의 문맥 구성을 유지합니다. 기존 Node `server/`, 모의 Node 서버, 서버용 tsconfig와 실행 명령은 제거했습니다. Spring은 API만 제공하며 기존 Node의 프로덕션 정적 파일 서빙은 이전하지 않았습니다. 프론트 개발은 Vite, 프론트 산출물은 `dist/`입니다.

## 엔드포인트

`GET /api/chat/status` → `{ "available": false, "mode": "openai" }`. 키가 없거나 기본 비활성 상태여도 200입니다. 추가 `reason` 필드는 ready/disabled/key_missing/quota/unavailable 상태를 나타내며 기존 available/mode 계약을 유지합니다. 만료되지 않은 익명 세션이 없으면 `last_transfer_chat` 쿠키를 발급합니다. HttpOnly, SameSite=Strict, Path=/api/chat, 30분, 선택적 Secure입니다.

`POST /api/chat`: 허용된 Origin, 유효한 쿠키, application/json이 필요합니다.

```json
{
  "requestId": "request-1234567890",
  "characterId": "seo",
  "text": "무엇을 확인해야 할까요?",
  "context": {
    "chapter": 2,
    "area": "hall",
    "discovered": [],
    "asked": [],
    "shared": [],
    "recent": []
  }
}
```

성공은 `{requestId, characterId, text, mode}`, 실패는 `{error: "안전한 사용자 안내"}`입니다. 인물은 기존 4개 ID, 구역은 hall/electrical/stairs입니다. recent는 `{who,text}` 배열입니다. 필드와 공개 단서는 `ChatContracts.java`, `ChatContext.java`, `src/chat/chapter2Public.ts`를 참조합니다. 비공개 설정과 정답은 이 문서에 복제하지 않습니다.

## 제한과 오류

- 본문 최대 24,000 UTF-8 바이트(분할 전송 포함), 질문 600자, 답변 700자.
- 최근 대화 최대 12개, 각 700자, 합계 4,500자. 길이는 기존 JS와 같은 UTF-16 단위입니다.
- 챕터 2만 허용하며 알려진 단서·질문 ID와 선행 단서·공유 부분집합을 검증합니다.
- IP 100회/분, 생성 세션 6회/분·전체 30회/분, 동시 세션 1개·전체 2개.
- 세션 최대 1,000개, IP 버킷 최대 1,000개, 요청 캐시 최대 500개. 캐시·세션은 30분입니다.
- 동일 세션+requestId+본문의 진행 중 요청을 병합하고 성공 응답을 재사용합니다. 같은 ID로 본문 변경은 409, 실패는 캐시에서 제거해 같은 ID로 재시도할 수 있습니다.
- 서버 전체 생성 제한 20초(설정으로 단축 가능), 프론트 요청 제한은 기존 25초입니다. OpenAI 연결 제한은 5초, 응답은 최대 256KiB입니다.

| 상태      | 의미                                     |
| --------- | ---------------------------------------- |
| 400       | JSON·필드·문맥 오류                      |
| 401 / 403 | 세션 만료 / 허용되지 않은 출처           |
| 404       | 지원하지 않는 경로·메서드                |
| 409       | 동일 ID의 본문 변경                      |
| 413 / 415 | 본문 초과 / JSON이 아닌 요청             |
| 429       | 빈도·동시 호출·용량 제한 또는 제공자 429 |
| 503       | AI 비활성·키 미설정·사용 한도 차단       |
| 504       | 시간 초과                                |
| 502 / 500 | 제공자·응답 오류 / 내부 오류             |

제공자 오류 본문·키·스택·프롬프트는 응답에 노출하지 않습니다. 알려진 제작자 설정 요청은 제공자 호출 없이 거절하며 출력 필터도 적용합니다. 필터만으로 모델의 누설·환각 방지를 보장하지는 않습니다.

## 정보와 제공자 경계

선택한 캐릭터의 챕터 2 정책만 전달합니다. 조사했지만 공유하지 않은 단서는 전달하지 않습니다. 선택형 질문은 실제 발언에 담긴 부분만, 명시적 공유는 해당 공개 단서 전문만 전달합니다. 최근 대화와 플레이어 주장은 비신뢰 인용입니다. localStorage 진행 보고를 서버가 실제 플레이 증거로 인증하는 구조는 아닙니다.

공개 단서 JSON과 프론트 스크립트의 일치는 `src/chat/backend-contract.test.ts`로 검사합니다. 비공개 JSON은 프론트에서 import하지 않고 Vite의 backend 직접 접근도 차단합니다. 과거 Git에 공개된 내용을 소급해 숨기지는 못합니다.

기존 모델 설정과 요청 옵션을 유지했습니다. [OpenAI Responses 가이드](https://developers.openai.com/api/docs/guides/migrate-to-responses)에 맞춰 instructions와 인용 context를 분리하고 `store:false`, `reasoning.effort:none`, `max_output_tokens:600`을 사용합니다. 도구 호출이나 게임 명령을 허용하지 않습니다. 키 없는 검증과 실제 모델 검증 절차는 [backend README](../backend/README.md)를 참조하세요.

## 외부 호출 보류

서버 `AI_CHAT_ENABLED`와 프론트 `VITE_AI_CHAT_ENABLED`는 기본 false입니다. 프론트 비활성 시 상태 확인을 포함한 AI API 요청을 보내지 않습니다. 서버 비활성 시 키 유무와 관계없이 제공자 호출이 차단됩니다. 모의 제공자는 테스트에서만 사용하며 화면에 모의 응답으로 표시합니다. 크레딧·사용 한도 부족 응답은 원문을 노출하지 않고 해당 서버 프로세스의 제공자를 비활성화합니다. 결제 문제 해결 후 재시작해야 해제하며 일반 속도 제한은 이 차단 대상이 아닙니다.
