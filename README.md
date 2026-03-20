# Frontend

Vite 7 + React 18 + TypeScript 기반 프론트엔드 프로젝트.

## 기술 스택

| 분류 | 라이브러리 |
|------|-----------|
| 빌드 | Vite 7, TypeScript 5.9 |
| UI | React 18, Ant Design 5 |
| 라우팅 | React Router 7 |
| 상태 관리 | Zustand |
| 서버 상태 | TanStack Query |
| 차트 | ECharts 5, amCharts 5 |
| 코드 생성 | Kubb (OpenAPI → TS 타입, React Query 훅) |
| Mock | MSW |
| 린트/포맷 | Biome |
| 테스트 | Vitest, React Testing Library |

## 시작하기

```bash
pnpm install
pnpm dev
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | TypeScript 체크 + 프로덕션 빌드 |
| `pnpm preview` | 빌드 결과물 미리보기 |
| `pnpm test` | Vitest 감시 모드 실행 |
| `pnpm test:run` | Vitest 단일 실행 |
| `pnpm lint` | Biome 린트/포맷 체크 |
| `pnpm lint:fix` | Biome 자동 수정 |
| `pnpm format` | Biome 포맷 적용 |
| `pnpm generate` | Kubb OpenAPI 코드 생성 + `mock-endpoints.config.mjs` 자동 동기화 (서버 실행 필요) |
| `pnpm mock` | `src/mocks/data/*.json` 다운로드 + `handlers.ts` 자동 생성 (서버 실행 필요) |

## Mock 데이터 워크플로

```
1. pnpm generate          # kubb로 타입/훅 생성 + mock-endpoints.config.mjs 전체 갱신
                          # OpenAPI 스펙 기반으로 덮어씀, pathParams/queryParams 키 자동 추출 (값은 빈 문자열)
2. scripts/mock-endpoints.config.mjs 편집  # 빈 값으로 추가된 파라미터를 직접 채우기
3. pnpm mock              # 실제 API 호출로 src/mocks/data/*.json 다운로드 + handlers.ts 자동 생성
```

`pnpm generate` 실행 후 `mock-endpoints.config.mjs`에 자동 추가되는 예시:

```js
export const ENDPOINTS = [
  { file: "sites.json", path: "/api/v1/sites" },
  {
    file: "sites-siteid-alarms.json",
    path: "/api/v1/sites/:siteId/alarms",
    pathParams: { siteId: "" },          // ← 값을 직접 채워주세요
    queryParams: { from: "", to: "" },   // ← 값을 직접 채워주세요
  },
];
```

## 프로젝트 구조

```
src/
├── api/              # Kubb 자동 생성 코드 (models, clients, hooks)
├── components/       # 공통 컴포넌트
├── layouts/          # 레이아웃 컴포넌트
├── lib/              # 외부 라이브러리 설정 (antd, i18n 등)
├── mocks/            # MSW 핸들러 및 mock 데이터
│   ├── api/          # 임시 API 훅 (kubb generate 후 src/api/hooks로 교체 예정)
│   ├── data/         # mock JSON 데이터 (pnpm mock으로 다운로드)
│   ├── browser.ts
│   └── handlers.ts   # 기본 샘플 데이터 포함, pnpm mock 실행 시 자동 갱신
├── pages/            # 페이지 컴포넌트
├── router/           # 라우트 정의
├── stores/           # Zustand 스토어
├── App.tsx
└── main.tsx
scripts/
├── fetch-mock-data.mjs         # mock 데이터 fetch 로직
├── generate-handlers.mjs       # handlers.ts 자동 생성
├── mock-endpoints.config.mjs   # 엔드포인트 및 파라미터 설정 (직접 편집)
└── sync-mock-endpoints.mjs     # OpenAPI 스펙 기반 엔드포인트 자동 동기화
kubb.config.ts        # Kubb 코드 생성 설정
biome.json            # Biome 린트/포맷 설정
```
