# 문서 색인

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | 문서 색인 |
| 버전 | v1.2.0 |
| 작성일 | 2026-08-06 |
| 기반 문서 | /docs/applications/HSKorea_AI_Application_Proposal.pdf, /docs/applications/AIoT_Emission_Control_System.pdf |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0.0 | 2026-08-06 | Claude | 신규 작성 — 원문 분석 산출 문서 7종의 목적·범위·참조 순서 정리 |
| v1.1.0 | 2026-08-06 | Claude | 문서 디렉터리 재구성 반영 — 분석 문서 5종을 `analysis/`, 설계 착수용 문서 2종을 `requirements/`로 이동하고 전 문서 상호 참조 경로 갱신. §2에 디렉터리 구조도 추가 |
| v1.2.0 | 2026-08-13 | Claude | `specs/`(설계 명세) 추가 반영 — §2 구조도·구분표, §3.3 문서 목록, §4 읽는 순서에 등록. `page-data-spec/`은 `specs/`로 흡수 후 삭제. §2에 "정리한 것"과 "결정한 것"의 경계 명시 |

---

## 2. 이 디렉터리의 구성

`docs/`는 **정리한 것**과 **결정한 것**을 나눠 담는다. `analysis/`·`requirements/`는 두 원문 PDF를 분석해 정리한 것이며 새로운 설계 결정을 담지 않는다. 우리가 내린 결정은 `specs/`에만 있고, 거기서는 원문 인용과 우리 결정을 **표기로 구분**한다.

모든 서술에 출처 페이지가 붙어 있고, 원문에 없는 값은 `[TBD]`로, 원문끼리 어긋나는 값은 `⚠ 모순`으로 표시했다.

```
docs/
├── README.md          이 문서 (색인)
├── applications/      원문 PDF — 모든 분석의 근거
├── analysis/          원문을 정리한 결과 (무엇이 규정되어 있는가)
├── requirements/      설계 착수용 (무엇을 만들어야 하고, 무엇이 아직 안 정해졌는가)
├── specs/             설계 명세 (무엇을 어떻게 만들었고, 그 근거는 무엇인가)
└── datasets/          데이터셋
```

| 구분 | 경로 | 성격 |
|------|------|------|
| 원문(기반 문서) | [applications/](applications/) | `HSKorea_AI_Application_Proposal.pdf`(사업계획서, 121p), `AIoT_Emission_Control_System.pdf`(발표자료, 52p) |
| 분석 결과 | [analysis/](analysis/) | 원문에 **있는 것**을 정리. 5종 |
| 설계 착수용 | [requirements/](requirements/) | 원문이 요구하는 기능과, 원문이 **정하지 않은 것**. 2종 |
| **설계 명세** | [specs/](specs/) | 구현한 화면·요구사항·데이터를 **근거 표기와 함께** 확정. 산출물 xlsx 3종의 원천 |
| 데이터셋 | [datasets/](datasets/) | 시연 데이터 |

### 2.1 출처 표기 규칙 (전 문서 공통)

- `(사업계획서 p.30)` = `HSKorea_AI_Application_Proposal.pdf`
- `(발표자료 p.15)` = `AIoT_Emission_Control_System.pdf`
- 페이지 번호는 **PDF 파일 페이지 번호**이며, 문서 하단에 인쇄된 쪽번호와 다르다(예: 사업계획서 PDF p.28 = 인쇄 쪽번호 23).

---

## 3. 문서 목록

### 3.1 `analysis/` — 원문 분석 결과

| 문서 | 담는 내용 | 주로 쓰는 상황 |
|------|-----------|----------------|
| [project-overview.md](analysis/project-overview.md) | 사업 개요·추진 배경·목표·성과지표·제품 범위·수요처·실증 계획·일정·기대 효과, 본 저장소의 담당 범위 | 프로젝트 전체 맥락 파악 |
| [system-architecture.md](analysis/system-architecture.md) | 4계층 구조(Sensor/Edge/Cloud AI/Application), ECP 하드웨어·소프트웨어 사양, 통신 프로토콜·전송 주기, 저장·백업·보존, 보안·RBAC, 비기능 목표 | 연동 구조·인프라·성능 기준 확인 |
| [ai-model-spec.md](analysis/ai-model-spec.md) | AI 4종(AutoEncoder/LSTM/RandomForest/XMARL-PPO)과 보유 기술 2종의 입력·처리·출력·성능목표, XAI, 업종별 특화, 성능 종합표 | AI 산출값의 의미·범위 확인 |
| [data-dictionary.md](analysis/data-dictionary.md) | 수질 8항목·설비 3항목의 단위·정확도·측정 범위·교정 주기, 수집·전송·보존 규격, AI 산출 데이터 규격, H/W 성능지표 19항목 | 데이터 항목·단위·표시 규칙 확인 |
| [glossary.md](analysis/glossary.md) | 원문에 등장하는 약어·용어·단위, 원문 내 표기 흔들림과 오탈자 | 용어 통일 |

### 3.2 `requirements/` — 설계 착수용

| 문서 | 담는 내용 | 주로 쓰는 상황 |
|------|-----------|----------------|
| [functional-requirements.md](requirements/functional-requirements.md) | 원문이 "시스템이 제공한다"고 명시한 기능만 정리(FR-01~FR-42), 사용자·권한, 알람·경보, 운영 시나리오, 비기능 요구 | **화면 기획·설계의 입력 자료** |
| [source-inconsistencies.md](requirements/source-inconsistencies.md) | 원문 간 모순 93건(INC), 원문 미정의 항목 39건(TBD), 추출 불가 대상, 확인 절차 | **설계 착수 전 사용자 확인 목록** |

### 3.3 `specs/` — 설계 명세

원문이 아니라 **우리가 만든 것**을 담는다. 모든 수치·라벨에 `[원문 p.nn]` / `[파생: 식]` / `[PROVISIONAL]` / `[TBD-nn]` / `[INC-nn]` / `[설계]` 중 하나가 붙어 있어, **어떤 값이 원문 근거이고 어떤 값이 우리 결정인지 문서만 보고 구분된다.**

| 문서 | 담는 내용 | 변환 대상 xlsx |
|------|-----------|----------------|
| [specs/README.md](specs/README.md) | **근거 표기 규약**·ID 체계·공통 URL 상태·E1~E6·백엔드 확인사항·화면 문서 템플릿 | — |
| [specs/requirements.md](specs/requirements.md) | FR-01~42 전체와 구현 상태 추적표(FR ↔ REQ ID ↔ 화면 ↔ 상태) | 요구사항정의서 |
| [specs/screens.md](specs/screens.md) | 화면 목록(1행 = 1화면)·역할별 권한 매트릭스·구성요소 어휘 | 화면설계서 |
| [specs/data-definition.md](specs/data-definition.md) | 7개 도메인의 전 필드 — 타입·단위·계산식·출처 | 데이터 정의서 |
| [specs/screens/](specs/screens/) | 화면별 설계 상세 8종 — 구성·요구 데이터·상호작용·예외·**설계 근거** | (화면설계서 셀의 원천) |

> xlsx 3종(v0.1)은 같은 디렉터리에 있으며 **각 권한별 화면 구현이 끝난 뒤** 위 markdown에서 옮겨 채운다.

---

## 4. 읽는 순서

1. **처음 참여한다면** → [project-overview.md](analysis/project-overview.md) → [system-architecture.md](analysis/system-architecture.md) → [glossary.md](analysis/glossary.md)
2. **화면을 기획·설계한다면** → [functional-requirements.md](requirements/functional-requirements.md) → [data-dictionary.md](analysis/data-dictionary.md) → [source-inconsistencies.md](requirements/source-inconsistencies.md) §3·§4
3. **AI 결과 표시를 구현한다면** → [ai-model-spec.md](analysis/ai-model-spec.md) → [data-dictionary.md](analysis/data-dictionary.md) §7
4. **이미 만든 화면을 파악한다면** → [specs/README.md](specs/README.md) §3(표기 규약) → [specs/screens.md](specs/screens.md) → 해당 [specs/screens/](specs/screens/) 문서
5. **새 화면을 추가한다면** → [specs/README.md](specs/README.md) §8(체크리스트)·§9(템플릿). **구현과 같은 작업에서 문서도 함께 쓴다**

---

## 5. 착수 전 반드시 확인할 사항

아래는 원문이 값을 정하지 않았거나 서로 다르게 규정해 **임의로 결정하면 안 되는** 항목이다. 상세는 [source-inconsistencies.md](requirements/source-inconsistencies.md) 참조.

| 항목 | 상태 |
|------|------|
| 상태 등급 체계 | 정상/이상(2단계)·정상/주의/이상(3단계)·정상/주의/경고/위험(4단계)·정상/주의/위험(3단계)·정상/주의/경고/위협(4단계)이 병존 (INC-01, INC-03, INC-04) |
| 알람 임계값·우선순위 판정 기준 | 조건 4종과 우선순위 3단계(긴급/주의/정보) 명칭만 존재, 수치 기준 없음 (TBD-01~03) |
| 계측 항목 수 | 8개 / 11개 / 12개가 병존 (INC-06, INC-07) |
| 아키텍처 계층 수 | 4계층을 "3-Tier"로 표기 (INC-10) |
| TOC·TN·TP의 실측/추정 구분 | 직접 계측과 AI 추정이 함께 규정됨 (INC-90, TBD-21) |
| 역할별 세부 권한 매핑 | RBAC 3역할까지만 규정, 화면·기능 단위 매핑 없음 (TBD-07, TBD-08) |
| 디자인시스템·차트 라이브러리 | 원문에 없음. 2026-08-11 사용자 확정 — Tailwind + shadcn/ui + Recharts (루트 `CLAUDE.md`) |

이 중 일부는 프로토타입 진행을 위해 **임시값으로 채택**했다. 무엇을 어떤 근거로 정했는지는 [specs/](specs/)가 `[PROVISIONAL]` 표기와 함께 기록하며, 값의 실체는 `src/shared/config/provisional.ts` 한 파일에만 있다. **여전히 확정된 값이 아니다.**

---

> `analysis/`·`requirements/`의 모든 문서는 위 '기반 문서'의 원문에 근거하며, 출처 페이지는 PDF 파일 페이지 번호다. `specs/`는 여기에 우리 결정을 더하되 표기로 구분한다.
