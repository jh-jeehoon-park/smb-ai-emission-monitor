# AI 기반 소규모 사업장 오염물질 배출 관리 시스템 구축 프로젝트 가이드

## 프로젝트 개요

비TMS 소규모 폐수배출사업장을 대상으로, 현장 센서·ECP(Edge)에서 수집한 수질·설비 시계열 데이터를 Cloud AI로 분석해 **이상 탐지·수질 예측·오염도 추정·설비 예지보전** 결과를 제공하는 시스템이다. 본 저장소가 담당하는 산출물은 **운영 웹 대시보드(Next.js App Router, 단일 앱)** 이다.

- 도메인: 사업장 / 센서·ECP / 계측(수질·설비 시계열) / 이상탐지 / 예측·추정 / 설비 / 알람 / 리포트 / 사용자(RBAC: 관리자·운영자·게스트)
- 내부 경로 별칭은 `@/*` 만 사용한다(공유 패키지 없음).
- 디자인시스템·Figma 파일·차트 라이브러리는 **미확정([TBD])** 이다. 확정 전에는 색·간격·차트 스택을 임의로 정하지 말고 `.claude/rules/unclear.rule.md` 절차로 확인한다.

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

- 문서에 없거나 `[TBD]`·`⚠ 모순`으로 표기된 값은 **임의로 정하지 않는다.** `.claude/rules/unclear.rule.md` 절차로 사용자에게 확인한다.
- 출처 표기는 PDF 파일 페이지 번호 기준이다(인쇄 쪽번호와 다름).

## 규칙 — 해당 상황에서만 읽어 적용
> 규칙은 **항상 로드하지 않는다.** 아래 "상황"에 해당하는 작업을 할 때 그 규칙 파일을 **먼저 열어(Read) 읽고 준수**한다. 해당 없으면 읽지 않는다.

| 상황(트리거) | 읽을 규칙 파일 |
|---|---|
| 프론트엔드 코드(TS/TSX) 작성·수정 | `.claude/rules/frontend.rule.md` · `.claude/rules/code-organization.rule.md` |
| 코드 주석 작성·정리 | `.claude/rules/code-comments.rule.md` |
| 폴더/레이어(FSD) 구조·slice 배치 결정 | `.claude/rules/frontend-architecture.rule.md` |
| Figma node-id로 UI 컴포넌트/화면 구현 | `.claude/rules/figma-implementation.rule.md` |
| 마크다운 문서(.md) 작성·수정 | `.claude/rules/document-template.rule.md` |
| 테스트 작성·구현 후 검증 | `.claude/rules/test-guide.rule.md` |
| 지시가 모호/검증 불가할 때 | `.claude/rules/unclear.rule.md` |

