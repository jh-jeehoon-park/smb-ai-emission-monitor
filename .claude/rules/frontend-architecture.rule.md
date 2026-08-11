# 프론트엔드 폴더 구조 — Feature-Sliced Design (배출관리 시스템)

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | 프론트엔드 폴더 구조 — Feature-Sliced Design |
| 버전 | v3.0.0 |
| 작성일 | 2026-08-06 |
| 기반 문서 | https://feature-sliced.design (외부 표준), /docs/applications/HSKorea_AI_Application_Proposal.pdf |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|

---

## 2. 적용 범위

본 저장소(`smb-ai-emission-monitor`)의 **웹 대시보드(Next.js App Router)** 프론트엔드 소스에 적용한다. 대상은 `src/**/*.{ts,tsx}` 이며, 백엔드(Cloud AI 플랫폼)·Edge(ECP) 코드에는 적용하지 않는다.

- 단일 앱 구성이므로 저장소 간 공유 패키지는 두지 않는다. 내부 참조는 alias `@/*` 만 사용한다.
- 모바일 앱·관리자 앱이 추가되는 경우, 본 문서에 저장소별 차이 절을 추가한 뒤 적용한다(사전 협의 없이 임의 확장 금지).

---

## 3. 레이어 계층 — 위→아래로만 의존

| 레이어 | 역할 |
|---|---|
| `app/` | 앱 초기화·프로바이더·라우팅(Next.js App Router) |
| `pages/`(또는 routes 컴포지션) | 라우트 단위 화면 컴포지션 |
| `widgets/` | 큰 UI 블록(실시간 모니터링 패널·이상 이벤트 타임라인·예측 차트 패널 등) |
| `features/` | 사용자 상호작용 단위(사업장 전환·기간/항목 필터·알람 확인·조치 등록·리포트 내보내기 등) |
| `entities/` | 비즈니스 도메인 모델(site·sensor·measurement·anomaly·prediction·equipment·alarm·report·user 등) |
| `shared/` | 재사용 UI 키트·lib·api client·config(디자인 토큰·상수) |

### 의존 규칙
- 상위 → 하위만 import(단방향), 같은 레이어 slice 간 import 금지, 순환 금지(DAG).
- `shared/`는 어떤 레이어도 import하지 않는다.

---

## 4. 도메인 slice (entities)

| slice | 담는 도메인 |
|---|---|
| `site` | 사업장(업종·규모·처리/방류 타입), 사업장 목록·전환 |
| `sensor` | 센서·계측기 구성, ECP(Edge) 장치 상태·통신 상태 |
| `measurement` | 수질(pH·DO·EC·탁도·수온·색도·TOC·NO3-N 등)·설비(유량·전류·전력·약품 주입량) 시계열 계측값 |
| `anomaly` | 이상 탐지 결과(이상 점수·등급·이벤트 이력) |
| `prediction` | 수질 변화 예측·오염도 추정 경향(TOC/TN/TP 상승·유지·하락) |
| `equipment` | 설비 상태·예지보전(고장 징후·유지관리 우선순위) |
| `alarm` | 알람·경보 발송 이력, 확인·조치 상태 |
| `report` | 기간별 리포트·배출 집계 |
| `user` | 사용자·권한(RBAC: 관리자/운영자/게스트) |

> 신규 도메인이 필요하면 기존 slice에 억지로 넣지 말고 slice를 추가한다. 단, 한 slice에 도메인 2개를 합치지 않는다(§8).

---

## 5. Segment (slice 내부)

```
entities/measurement/
├── ui/       MeasurementChart.tsx, MeasurementValue.tsx
├── model/    types.ts, store.ts, selectors.ts
├── api/      useMeasurementsQuery.ts (TanStack Query)
├── lib/      formatMeasurementValue.ts
├── config/   constants.ts   ← 도메인 상수(예: MEASUREMENT_ITEM_UNITS)
└── index.ts  ★ Public API (배럴 export)
```

| Segment | 역할 |
|---|---|
| `ui/` | 컴포넌트 |
| `model/` | 상태·타입·selector |
| `api/` | 서버 통신(TanStack Query 훅, 응답 계약 소비) |
| `lib/` | 순수 함수 |
| `config/` | 상수·환경 설정 |

> 상수·타입의 배치 상세는 `code-organization.rule.md`를 따른다(공통 상수는 `shared/config`, 도메인 상수는 각 slice `config/`).

---

## 6. Public API 규칙
- 각 slice는 `index.ts`에서만 export. 외부는 `@/entities/measurement`처럼 slice 루트 경로 사용. 내부 파일 직접 import 금지. ESLint로 강제 권장.

## 7. 실시간·시계열 데이터 배치 규칙
- 실시간 수신(폴링/SSE/WebSocket 등) 로직은 해당 도메인 slice의 `api/`에 두고, 화면(`widgets`/`pages`)은 훅만 소비한다. 컴포넌트에서 직접 연결·구독을 만들지 않는다.
- 차트 컴포넌트는 데이터 가공 책임을 갖지 않는다. 집계·리샘플링·결측 처리 등은 slice `lib/`의 순수 함수로 분리한다.
- 여러 도메인(계측 + 이상 + 예측)을 겹쳐 보여주는 화면은 `widgets/`에서 조합한다. entities 간 직접 import는 금지(§8).

## 8. 안티 패턴 (즉시 거절)
- 같은 레이어 horizontal import(features↔features, entities↔entities 등)
- `entities → features` 역방향 import
- `shared/`가 상위 레이어 참조
- slice 내부 파일 직접 import
- 한 slice에 도메인 2개(`entities/measurement-and-anomaly`)

## 9. 점검 체크리스트(PR 전)
- [ ] 새 파일이 정확한 레이어에 있는가
- [ ] 같은 레이어 slice import 없음 / 외부 참조는 index.ts 경유
- [ ] `shared/`가 상위 레이어 미참조 / slice 단일 도메인
- [ ] 실시간 구독·데이터 가공이 컴포넌트가 아닌 `api/`·`lib/`에 있는가
