# AI 기반 소규모 사업장 오염물질 배출 관리 시스템 구축 프로젝트 가이드

## 프로젝트 개요

비TMS 소규모 폐수배출사업장을 대상으로, 현장 센서·ECP(Edge)에서 수집한 수질·설비 시계열 데이터를 Cloud AI로 분석해 **이상 탐지·수질 예측·오염도 추정·설비 예지보전** 결과를 제공하는 시스템이다. 본 저장소가 담당하는 산출물은 **운영 웹 대시보드(Next.js App Router, 단일 앱)** 이다.

- 도메인: 사업장 / 센서·ECP / 계측(수질·설비 시계열) / 이상탐지 / 예측·추정 / 설비 / 알람 / 리포트 / 사용자(RBAC: 관리자·운영자·게스트)
- 내부 경로 별칭은 `@/*` 만 사용한다(공유 패키지 없음).

## 현재 단계 — R&D 프로토타입 (프론트엔드 전용)

> 이 절은 **현 단계에 한해** 아래 `규칙` 절의 일부를 덮어쓴다. 단계가 바뀌면 이 절을 먼저 갱신한다.

| 항목 | 값 |
|---|---|
| 성격 | R&D 과제 프로토타입 (심사·시연 대상) |
| **최우선순위** | **UI/UX 완성도.** 다른 목표와 충돌하면 화면 품질을 먼저 택한다 |
| 범위 | **프론트엔드 화면만.** 백엔드·API 서버가 존재하지 않는다 |
| 데이터 | 전량 fixture(고정 mock). 실 API 연동 없음 |

### 백엔드가 없어서 달라지는 것 (규칙 오버라이드)

| 원 규칙 | 프로토타입 적용 |
|---|---|
| `frontend.rule.md` **A1** — 실 API 연동 시 Mock 전량 제거 | **보류.** 제거할 실 API가 없다. fixture는 임시물이 아니라 이 단계의 정식 데이터 원천이다. 단 fixture는 `entities/<slice>/api/fixtures/` 안에만 두고 **컴포넌트에 인라인 금지** |
| **A3** — API 갭을 `docs/api-gaps.md`에 등록 | **미적용.** 갭 개념이 성립하지 않는다. 대신 화면이 요구하는 데이터 형태를 `docs/specs/screens/<화면ID>.md` §4와 `docs/specs/data-definition.md`에 남긴다 |
| **A4** — 화면 완성 전 백엔드 내용 배제 | **자동 충족.** 엔드포인트·스키마·매핑을 설계하지 않는다 |
| **E6** — 권한 노출은 서버 응답 근거 | **불가.** 서버가 없다. mock 사용자 컨텍스트로 역할을 전환하되, 클라이언트 분기는 **인가가 아니라 시연용 표시**임을 해당 코드에 WHY 주석으로 남긴다 |
| **P3** — 실시간 수신 방식 `[TBD]` | fixture 기반 시뮬레이션(고정 간격 갱신)으로 표현한다. 폴링/SSE/WebSocket 선택은 백엔드 확정 시로 미룬다 |
| `figma-implementation.rule.md` | **휴면.** Figma fileKey가 없다. 디자인 근거는 Figma node가 아니라 아래 `MASTER.md`다 |
| **A2** — UI·UX 임의 변경 금지 | **유지하되 범위를 나눈다.** *무엇을 보여주는가*(항목·라벨·단위·수치)는 `docs/` 근거를 그대로 따른다. *어떻게 보이는가*(레이아웃·색·타이포·모션)는 아래 스킬이 결정한다 |
| **R9** — 정의된 토큰만 사용, 하드코딩 금지 | **유지.** 토큰의 출처만 Figma → `MASTER.md` → `shared/config`로 바뀐다 |

### 확정 스택 (2026-08-11 사용자 확정 — `frontend.rule.md` P1·P7·P9·P11의 `[TBD]`를 대체한다)

| 슬롯 | 값 |
|---|---|
| 프레임워크 | Next.js App Router + TypeScript |
| 스타일링 | **Tailwind CSS** |
| 공용 컴포넌트 | **shadcn/ui** (`shared/ui`에 배치, 인라인 재구현 금지) |
| 차트 | **Recharts 단일** — 다른 차트 라이브러리를 섞지 않는다 |
| 서버 상태 | TanStack Query (fixture를 비동기로 반환해 로딩·에러 상태를 실제처럼 다룬다) |
| Mock 위치 | `entities/<slice>/api/fixtures/` — **MSW는 쓰지 않는다.** 백엔드가 없어 가로챌 네트워크 요청 자체가 없다(`test-guide.rule.md` §3의 MSW 항목은 현 단계 비적용) |
| 디자인 토큰 원천 | `ui-ux-pro-max`가 생성한 `design-system/<slug>/MASTER.md` → `shared/config`에 토큰으로 등록 |

### 임시값 규약 (`PROVISIONAL_`)

원문이 확정하지 않은 값을 프로토타입에서 쓸 때는 다음을 지킨다. 목적은 "나중에 한 곳만 고치면 전 화면이 바뀌게" 하는 것이다.

1. `shared/config/provisional.ts` **한 파일에만** 모은다.
2. 이름에 `PROVISIONAL_` 접두사를 붙인다.
3. 각 값에 근거와 `INC`/`TBD` 번호를 WHY 주석으로 남긴다.
4. 화면별로 등급·라벨을 **추가하거나 병합하지 않는다**(A2 유지).

| 임시값 | 채택 | 근거 |
|---|---|---|
| 상태 등급 4단계 | `정상 / 주의 / 경고 / 위험` | 발표자료 p.15. 원문 5가지 병존(INC-01·03·04) 중 시연 맥락에 맞는 것으로 사용자 확정 |
| 이상 점수 구간 경계 | `정상 0–49` · `주의 50–69` · `경고 70–79` · `위험 80–100` | TBD-02 — **원문에 근거 없음. 2026-08-11 추천값으로 채택.** 위험 하한 80은 저장소 내 유일한 수치 앵커(`unclear.rule.md` §5의 "이상 점수 80 이상은 위험 등급" 예시)에서 가져왔고, 나머지는 그 위에서 균등 배분했다. 실제 점수 분포를 확보하면 오탐지율 <10%(사업계획서 p.30) 기준으로 재조정한다 |
| 알람 우선순위 대응 | **미정** | INC-02 — 등급 4단계와 알람 우선순위 3단계(긴급/주의/정보)가 "별개 축인지 같은 축인지 원문에 설명이 없다". 알람 목록 구현 직전에 확인 필요 |
| 약품 주입량 단위 | `L/h` | TBD-31 관련 — 원문이 단위·형식·범위를 정하지 않았다(`data-dictionary.md` §5.1: "약품 주입량 — 원문 없음(형식·단위)", "최적 약품 투입량 권장값 — 원문 없음(범위)"). 계측 사양(p.55)에 없고 AI 입력 운영 데이터로만 언급된다. 액상 응집제 주입 펌프를 가정한 시연 표기이며, 확정 시 이 값과 `entities/optimization`의 기준 주입량을 함께 교체한다 |

## 디자인 스킬 — 무엇을 언제 쓰는가

> `.claude/skills/`에 4종이 설치되어 있다. **전부 쓰지 않는다.** 아래 라우팅을 따른다.

| 스킬 | 이 프로젝트에서의 역할 | 쓰는 시점 |
|---|---|---|
| **ui-ux-pro-max** | 기준 수립(컬러·타이포·레이아웃·간격)과 차트 유형 선택. 대시보드·차트를 명시적으로 지원하며 `nextjs`·`shadcn` 스택 데이터를 보유 | **착수 전 1회** 디자인시스템 생성 → 이후 페이지마다 조회 |
| **impeccable** | **Operate 모드**(대시보드·관리 UI가 명시 대상)로 계획·검수·정제 | 화면 계획 시 `shape`, 완성 후 `critique` → `audit` → `polish` |
| **frontend-design** | 시각 아이덴티티·타이포 방향, "템플릿처럼 보이지 않게" 하는 판단 | 시각 방향을 정할 때 |
| **design-taste-frontend** | **대시보드에는 쓰지 않는다.** 스킬 자신이 첫 줄에서 *"Not dashboards, not data tables, not multi-step product UI"* 로 범위를 못박았다 | 랜딩·소개 페이지를 만들 때만 |
| **dataviz** (번들 스킬) | 차트 색·축·범례·툴팁 체계 | **차트 코드 첫 줄을 쓰기 전 필수 로드** |

### 실행 환경 (검증 완료)

Python 3.12.10 / Node 20.19.5, 두 스킬의 스크립트·데이터 모두 정상. 명령은 **프로젝트 루트에서** 실행한다.

```bash
# 1회: 디자인시스템 생성 → design-system/<slug>/MASTER.md
python .claude/skills/ui-ux-pro-max/scripts/search.py \
  "industrial water quality monitoring dashboard" \
  --design-system --persist -p "SMB AI Emission Monitor" \
  --density 8 --motion 3 --variance 6 --output-dir .

# 페이지별 조회 / 차트 유형 확인
python .claude/skills/ui-ux-pro-max/scripts/search.py "time series anomaly" --domain chart
python .claude/skills/ui-ux-pro-max/scripts/search.py "dashboard" --stack shadcn
```

다이얼 초기값은 **density 8**(대시보드 밀도) · **motion 3**(운영 화면은 모션 절제) · **variance 6**(신뢰감을 지키되 'AI 티' 기본값은 피함)이다. 대화로 조정한다.
`--persist`는 `MASTER.md`가 이미 있으면 건너뛴다. **재생성 전에 반드시 읽어보고**, 덮어쓸 때만 `--force`를 붙인다.

### 스킬끼리 충돌할 때

`impeccable` Operate 모드는 *"스캔 가능성·일관성이 표현보다 우선"* 이라 하고, 이번 과제는 UI/UX가 1순위다. 둘 다 만족시키는 방법은 **대담함을 한 곳에만 쓰는 것**이다.

- 시그니처(첫 화면 히어로, 대표 차트 1개)에 시각적 인상을 몰아준다.
- 계측값·표·알람 목록 등 **데이터를 읽는 영역은 절제**한다. 여기서의 화려함은 오독을 만든다.
- 도메인 규칙(E1 단위·자릿수, E3 AI 산출 근거 병기, E4 결측 구간 끊김, E5 시간대 표기)은 **디자인보다 위**다. 결측을 0으로 그리면 예쁜 차트가 아니라 틀린 차트다.

### 작업 순서

1. `ui-ux-pro-max --design-system --persist` → `MASTER.md` 생성 (1회)
2. `MASTER.md` 토큰을 `shared/config` + Tailwind theme에 등록 (이후 R9 적용 대상)
3. 화면별: `MASTER.md`(+ `pages/<page>.md` 오버라이드) 확인 → `impeccable shape`로 계획 → 구현
4. 차트: `dataviz` 로드 → Recharts로 구현 (E3·E4 준수)
5. 마감: `impeccable critique` → `audit` → `polish` 각 1회. **끝없이 돌리지 않는다**(스킬 자체 지침)

## 원문 분석 문서 — 도메인 값이 필요할 때 여기서 찾는다

원문 PDF 2건(사업계획서·발표자료)을 분석한 결과가 `docs/`에 있다. **도메인 수치·항목·기능을 추측하지 말고 아래 문서에서 확인한다.** 색인: `docs/README.md`

| 필요한 것 | 문서 |
|---|---|
| 사업 목표·성과지표·범위·일정 | [project-overview.md](docs/analysis/project-overview.md) |
| 계층 구조·ECP 사양·통신·보안·RBAC·비기능 목표 | [system-architecture.md](docs/analysis/system-architecture.md) |
| AI 모델 4종의 입출력·성능목표·XAI | [ai-model-spec.md](docs/analysis/ai-model-spec.md) |
| 계측 항목 단위·정확도·수집 주기·AI 산출 데이터 규격 | [data-dictionary.md](docs/analysis/data-dictionary.md) |
| 원문이 규정한 기능(FR-01~42)·알람·권한 — **화면 기획 입력** | [functional-requirements.md](docs/requirements/functional-requirements.md) |
| 약어·용어·표기 흔들림 | [glossary.md](docs/analysis/glossary.md) |
| **원문 모순·미정의 항목 — 임의 결정 금지 목록** | [source-inconsistencies.md](docs/requirements/source-inconsistencies.md) |

- 문서에 없거나 `[TBD]`·`⚠ 모순`으로 표기된 값은 **임의로 정하지 않는다.** `.claude/rules/unclear.rule.md` 절차로 사용자에게 확인한다. 프로토타입 진행상 값이 꼭 필요하면 위 **`PROVISIONAL_` 규약**을 따른다.
- 출처 표기는 PDF 파일 페이지 번호 기준이다(인쇄 쪽번호와 다름).

## 설계 명세 (`docs/specs/`) — 만든 것의 근거를 남기는 곳

위 `docs/analysis/`·`docs/requirements/`가 **원문에 있는 것**이라면, `docs/specs/`는 **우리가 만든 것과 그 근거**다. 산출물 xlsx 3종(화면설계서·요구사항정의서·데이터 정의서)의 원천이다. 색인: `docs/specs/README.md`

| 필요한 것 | 문서 |
|---|---|
| **근거 표기 규약**·ID 체계·공통 URL 상태·백엔드 확인사항·화면 문서 템플릿 | [specs/README.md](docs/specs/README.md) |
| FR-01~42 구현 상태 추적표 (FR ↔ REQ ID ↔ 화면 ↔ 상태) | [specs/requirements.md](docs/specs/requirements.md) |
| 화면 목록·역할별 권한 매트릭스 | [specs/screens.md](docs/specs/screens.md) |
| 도메인 전 필드의 타입·단위·계산식·출처 | [specs/data-definition.md](docs/specs/data-definition.md) |
| 화면별 구성·요구 데이터·상호작용·예외·설계 근거 | [specs/screens/](docs/specs/screens/) |

**모든 수치·항목·라벨에 근거 표기가 붙는다.** 붙지 않은 값은 이 디렉터리에 쓸 수 없다.

`[원문 p.nn]` 원문에 그대로 · `[파생: 식]` 계산 · `[PROVISIONAL]` 임시값 · `[TBD-nn]` 원문 미정 · `[INC-nn]` 원문 모순 · `[설계]` 우리 결정(**이유 병기**)

### 화면·도메인 값을 추가할 때 (필수)

새 화면을 만들거나 새 도메인 값을 도입하면 **같은 작업에서** 문서도 함께 갱신한다. 나중에 몰아 쓰면 근거를 잊는다.

- [ ] `specs/screens.md`에 1행 추가
- [ ] `specs/screens/<화면ID>-<이름>.md` 작성 (`specs/README.md` §9 템플릿 복사)
- [ ] `specs/requirements.md`의 해당 FR 행에 화면 ID·구현 상태 갱신
- [ ] `specs/data-definition.md`에 신규 필드 추가
- [ ] 새 임시값이면 `shared/config/provisional.ts` + 위 **임시값 표**에 등록

## 규칙 — 해당 상황에서만 읽어 적용
> 규칙은 **항상 로드하지 않는다.** 아래 "상황"에 해당하는 작업을 할 때 그 규칙 파일을 **먼저 열어(Read) 읽고 준수**한다. 해당 없으면 읽지 않는다.

| 상황(트리거) | 읽을 규칙 파일 |
|---|---|
| 프론트엔드 코드(TS/TSX) 작성·수정 | `.claude/rules/frontend.rule.md` · `.claude/rules/code-organization.rule.md` |
| 코드 주석 작성·정리 | `.claude/rules/code-comments.rule.md` |
| 폴더/레이어(FSD) 구조·slice 배치 결정 | `.claude/rules/frontend-architecture.rule.md` |
| 마크다운 문서(.md) 작성·수정 | `.claude/rules/document-template.rule.md` |
| **화면 추가·변경, 새 도메인 값 도입** | 위 **설계 명세** 절의 체크리스트 — `docs/specs/` 갱신은 구현과 같은 작업이다 |
| **산출물 xlsx 3종(요구사항정의서·화면설계서·데이터 정의서) 작성·갱신** | `.claude/rules/deliverable-xlsx.rule.md` — 적합성 1순위. 근거 없는 행 금지, **영역이 아니라 항목 단위**로 쓴다 |
| 테스트 작성·구현 후 검증 | `.claude/rules/test-guide.rule.md` |
| 지시가 모호/검증 불가할 때 | `.claude/rules/unclear.rule.md` |
| Figma node-id로 UI 구현 | `.claude/rules/figma-implementation.rule.md` — **현 단계 휴면**(Figma 파일 없음). 사용자가 node URL을 주면 그때 활성 |

스킬은 규칙 파일이 아니라 `Skill` 도구로 호출한다. 어떤 스킬을 언제 쓸지는 위 **디자인 스킬** 절을 따른다.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
