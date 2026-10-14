# little choice

React / TypeScript / Vite로 만드는 결정 도우미.

## 실행

```sh
npm install
npm run dev
```

개발 모드에서는 MSW가 시작된 후 React가 렌더링됩니다. 브라우저 Network 탭에서 API 요청을 확인할 수 있습니다.

## 데이터 흐름

- `features/decision/api.ts`: fetch 호출, HTTP 오류 처리, 응답 검증
- `features/decision/queries.ts`: TanStack Query 조회 캐시와 저장 mutation
- `features/decision/useDecision.ts`: reducer 기반 편집과 500ms 디바운스 자동 저장
- `features/decision/reducer.ts`: 편집 상태 변경
- `mocks/handlers.ts`: 가짜 API, 200ms 응답 지연
- `features/decision/storage.ts`: MSW 전용 브라우저 저장소. 기존 데이터도 유지합니다.

조회 실패 시 다시 불러오기, 저장 실패 시 다시 저장할 수 있습니다. 저장 요청은 한 번에 하나씩 진행하고, 저장 중 변경한 내용은 다음 요청에 반영합니다. 실패한 동일 데이터는 자동으로 계속 재전송하지 않습니다.

## API 계약

| 메서드 | 경로 | 요청 / 응답 |
| --- | --- | --- |
| GET | `/api/decisions` | 응답: `Decision[]` |
| POST | `/api/decisions` | 요청: `Decision`, 응답: 새 `Decision` (201) |
| GET | `/api/decisions/:id` | 응답: `Decision` |
| PUT | `/api/decisions/:id` | 요청: `Decision`, 응답: 저장된 `Decision` |

`Decision`은 `id`, `createdAt`, `title`, `criteria`, `options`, `chosenOptionId`, `rating`, `reflection`을 포함합니다. 형식은 `features/decision/types.ts`를 따릅니다. PUT은 전체 문서를 교체합니다. 잘못된 요청은 400, 없는 고민은 404, 중복 ID 생성은 409, mock 저장소 실패는 500을 반환합니다.

## 이후 Node 연결

`.env.example`을 참고해 `.env.local`에 설정합니다.

```env
VITE_ENABLE_MOCKS=false
VITE_API_BASE_URL=http://localhost:3000
```

Node 서버에서 위 경로와 응답을 구현하고 Vite 개발 서버를 다시 시작합니다. 다른 포트를 사용하는 경우 Node에서 프론트 주소에 대한 CORS를 허용해야 합니다. 같은 출처로 `/api`를 제공하면 base URL은 비워도 됩니다.

MSW는 개발 모드에서만 실행됩니다. `npm run preview`와 배포 빌드는 실제 API가 필요합니다. 현재 mock 데이터는 해당 브라우저에만 저장됩니다.

## 검증

```sh
npm test
npm run build
npm run lint
```

## 기능

고민 보관함에서 전체 / 고민 중 / 결정 완료를 필터링할 수 있습니다. 직접 만들기, 제품 구매, 주말 활동, 여행지 선택 템플릿을 제공합니다. 선택지와 기준을 편집하고 실제 선택을 확정하거나 취소할 수 있으며, 확정 뒤 만족도(1–5)와 회고를 기록합니다. 순위와 별개로 원하는 선택을 확정할 수 있습니다.

결과 설명은 1위와 2위의 차이, 가장 큰 가중 점수 우위, 기준별 기여도를 보여줍니다. 공동 순위와 작은 점수 차이도 안내합니다. 기존 `little-choice-v1` 데이터는 새 고민 목록으로 읽어오고 이후 `little-choice-v2`에 저장합니다.
