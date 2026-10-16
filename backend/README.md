# AI 대화 백엔드

Java 21 LTS + Spring Boot 4.1.1 + Spring MVC, Maven Wrapper를 사용합니다. 설치된 Temurin 21과 호환되므로 JDK 변경은 필요하지 않습니다. Maven은 별도 설치하지 않아도 되며 첫 실행에 배포본·의존성을 다운로드합니다. [Spring 지원 환경](https://docs.spring.io/spring-boot/system-requirements.html)을 참고하세요.

루트에서 실행합니다.

```sh
cp backend/.env.example backend/.env.server
npm run dev:server
```

다른 터미널에서 `npm run dev`를 실행합니다. 프론트는 `/api/chat`을 기본 `127.0.0.1:3001`로 프록시합니다. 기본 게임에는 백엔드가 필요하지 않습니다. 백엔드는 API만 제공하며 프론트 정적 파일은 제공하지 않습니다.

```sh
npm run backend:test
npm run backend:build
# Node 없이 실행하려면:
cd backend
./mvnw -B test
./mvnw -B package
java -jar target/last-transfer-api-0.0.1-SNAPSHOT.jar
```

루트 npm 명령은 Maven 캐시를 `backend/.m2`에 둡니다. 위 직접 Maven 명령은 기본 사용자 캐시를 사용합니다. `npm start`도 Spring 실행의 별칭입니다.

## 설정

`backend/.env.server`는 Java properties 형식입니다. `export`나 값 양쪽 따옴표를 쓰지 않습니다. OS 환경변수가 파일보다 우선합니다. 이전 루트 `.env.server`도 호환 목적으로 읽으며 같은 항목은 backend 파일이 우선합니다. 키는 어느 쪽이든 커밋하지 않습니다.

| 변수                 | 기본값 / 용도                               |
| -------------------- | ------------------------------------------- |
| AI_CHAT_ENABLED      | false: 키가 있어도 외부 AI 호출 중지        |
| OPENAI_API_KEY       | 빈 값: AI 비활성, 스크립트 진행 가능        |
| AI_PROVIDER          | openai만 지원                               |
| AI_MODEL             | 기존 gpt-5.4-mini 유지                      |
| API_HOST / API_PORT  | 127.0.0.1 / 3001                            |
| CHAT_ALLOWED_ORIGINS | http://localhost:5173,http://127.0.0.1:5173 |
| CHAT_SECURE_COOKIE   | 로컬 HTTP에서는 false                       |
| CHAT_TIMEOUT_MS      | 20000, 허용 범위 1~20000ms                  |

Vite 포트를 바꿨다면 허용 출처도 변경하세요. 프록시 목적지 변경은 Vite 실행 환경에서 `CHAT_API_TARGET=http://127.0.0.1:3002 npm run dev`로 지정합니다. 키에 `VITE_` 접두사를 사용하지 마세요.

## 구조와 검증

- `src/main/java/com/lasttransfer/api/chat/ChatGateway.java`: 익명 쿠키, 출처, IP 제한.
- `ChatController.java`, `ChatContext.java`: 요청 계약과 공개 증거·인물별 지식 경계.
- `ChatService.java`: 중복 요청 병합, 호출 제한, 타임아웃, 안전한 출력.
- `DialogueProvider.java`, `OpenAiProvider.java`: 제공자 경계와 Responses 호출.
- `src/main/resources/private/`: 서버 전용 인물 설정 및 챕터 2 공개 증거 사본.
- `src/test/`: 단위·실제 로컬 HTTP·모의 제공자 검증. 브라우저 fixture는 테스트 클래스에만 있으며 배포 JAR에 포함하지 않습니다.

API 계약·기존 Node 대비 변경은 [계약 문서](../docs/ai-api-contract.md)를 참고하세요. 게임 상태·DB·로그인·배포는 다루지 않습니다. 세션·캐시·호출 제한은 단일 프로세스 메모리이므로 재시작하면 초기화됩니다.

실제 키 없이 `npm run backend:build`, `npm test`, `npm run build`, `npm run lint`, `npm run test:browser`를 수행할 수 있습니다. 브라우저 검증에는 JDK 21과 로컬 Chrome이 필요합니다. 실제 모델 연동·비용·답변 품질을 모의 검증으로 확인했다고 보고하지 않습니다.

실제 호출을 재개할 때만 `AI_CHAT_ENABLED=true`와 프론트의 `VITE_AI_CHAT_ENABLED=true`를 설정합니다. 기본값은 모두 비활성입니다. 프론트는 `VITE_AI_CHAT_ENABLED=true npm run dev`로 명시적으로 켤 수 있습니다. 사용 한도 부족(크레딧·지출·조직 한도) 응답을 확인하면 해당 서버 프로세스의 제공자 호출을 중단합니다. 결제·한도 해결 후 서버를 재시작해야 해제되며 단순 요청 속도 429에는 이 차단을 적용하지 않습니다. 자동 재시도는 추가하지 않았습니다.

실제 키 설정 후 서버를 재시작하고 `/api/chat/status`의 `available: true`를 확인합니다. 챕터 2에서 휴대폰을 열어 네 인물을 각각 선택하고 질문하세요. 단서 조사만 한 상태와 명시적으로 공유한 상태의 답변을 비교하고, 연결 실패 후 동일 질문 재시도·새로고침·기존 선택형 질문 진행을 확인합니다. 이때 체력·배터리·아이템·퍼즐 판정이 AI 답변으로 바뀌면 안 됩니다. 요청 본문·키·제작자 설정을 로그에 남기지 마세요.
