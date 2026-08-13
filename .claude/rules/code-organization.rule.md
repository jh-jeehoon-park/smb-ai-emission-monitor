# 코드 구조 전략 — 상수 & 타입 관리 (FSD 정합)

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | 코드 구조 전략 — 상수 & 타입 관리 |
| 버전 | v3.1.1 |
| 작성일 | 2026-08-06 |
| 기반 문서 | .claude/rules/frontend-architecture.rule.md |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v3.1.0 | 2026-08-13 | Claude | §3 상수 배치표에 **임시값** 행 추가 — 원문 미확정 값은 공통 상수보다 우선해 `provisional.ts` 한 파일에만 둔다(루트 `CLAUDE.md` 임시값 규약과의 우선순위 명시). `STATUS_LEVELS` 예시는 `provisional.ts`로 이관되어 공통 상수 예시에서 제거 |
| v3.1.1 | 2026-08-13 | Claude | §3 배치원칙 #5에 "한 세트"의 뜻을 명시 — 한 파일이 아니라 같은 `StatusLevel` 키를 공유한다는 뜻이며 `Record`가 이미 강제한다. 라벨(`provisional.ts`)과 색(`status-visual.ts`)을 합치지 말 것 |

---

## 2. 원칙

`frontend-architecture.rule.md`의 FSD를 **단일 기준**으로 삼는다. 상수·타입은 별도의 전역 `lib/`·`types/` 디렉터리로 분리하지 않고 **FSD 레이어/세그먼트에 귀속**시킨다.

---

## 3. 상수 배치

| 분류 | 위치 | 예시 |
|------|------|------|
| **임시값**(원문이 정하지 않은 값) | `shared/config/provisional.ts` **한 파일에만** | `PROVISIONAL_DECIMALS`, `PROVISIONAL_DISPLAY_DECIMALS`, `PROVISIONAL_STATUS_LABELS` |
| **공통 상수**(2개 이상 slice·앱 전역) | `shared/config/constants.ts` | `ROWS_PER_PAGE`, `MEASUREMENT_ITEM_UNITS` |
| **도메인 상수**(특정 slice 전용) | `entities|features/<slice>/config/constants.ts` | `ANOMALY_SCORE_THRESHOLDS`, `PREDICTION_HORIZON_HOURS`, `ALARM_CHANNEL_LABELS` |

> **임시값이 공통 상수보다 우선한다.** 원문 근거가 없는 값은 공통으로 쓰이더라도 `constants.ts`가 아니라 `provisional.ts`에 둔다 — 확정될 때 한 파일만 고치면 전 화면이 바뀌게 하려는 규약이다(루트 `CLAUDE.md` 임시값 규약). 두 곳에 나뉘면 그 목적이 깨진다. `npm run verify:docs`의 검사 10이 이를 확인한다.
>
> `shared/config/constants.ts`는 현재 비어 있다(파일 없음). 위 예시에 해당하는 값이 생기면 그때 만든다.

### 배치 원칙
1. 컴포넌트/페이지 파일에 상수를 인라인 선언하지 않는다(해당 `config/constants.ts`로).
2. `lib/`(순수 함수) 세그먼트에 상수를 섞지 않는다.
3. 동일 값이 2개 이상 slice에서 쓰이면 `shared/config`로 올린다.
4. **계측 항목의 단위·소수 자릿수·표시 라벨**은 항목별로 한 곳(`shared/config`)에 모은다. 화면별로 다시 정의하지 않는다.
5. **상태 등급의 라벨·색 토큰·정렬 순서**는 한 세트로 묶어 `shared/config`에 둔다. 등급 값과 색이 따로 흩어지면 한쪽만 바뀌어 조용히 어긋난다. 등급 체계 자체는 아직 미확정이다(→ `docs/requirements/source-inconsistencies.md`).
   - **"한 세트"는 한 파일이 아니라 같은 키를 공유한다는 뜻이다.** 현재 라벨은 `provisional.ts`(임시값이므로 위 표의 우선순위), 색은 `status-visual.ts`(대비 검증 결과를 함께 담는다)에 있다. 둘 다 `Record<StatusLevel, …>`이라 **등급을 추가하면 양쪽이 컴파일 에러로 강제된다** — 규칙이 막으려는 "한쪽만 바뀜"은 타입이 이미 막고 있다.
   - 두 파일을 합치지 않는다. 합치면 임시값이 `provisional.ts` 밖으로 나가 위 표를 어긴다.

### 네이밍
`UPPER_SNAKE_CASE` / 배열 복수형 / 매핑 `_MAP`·`_LABEL`·`_BADGE` / 옵션 배열 `_OPTIONS` / 임계값 `_THRESHOLDS` / 시간·주기 값은 단위를 이름에 포함(`_MS`·`_HOURS`) / 리터럴 타입 필요 시 `as const`.

### 허용 예외
- 컴포넌트 내부 전용 스타일/컬럼 정의 배열(UI 로직의 일부) · 테스트 mock 데이터.

---

## 4. 타입 배치 (FSD + API 추상화)

| 타입 종류 | 위치 | Import 허용 |
|-----------|------|-------------|
| 서버 원본(백엔드 JSON 1:1) | `entities/<slice>/api/*.dto.ts` | 해당 slice `api/`, 테스트 |
| UI 비즈니스 모델(안정 계약) | `entities/<slice>/model/types.ts` | 모든 상위 레이어 |
| API Request/Response·오류코드 | `shared/api/types.ts` | 모든 계층 |

- 백엔드 변경 파급을 줄이기 위해 `api/` 세그먼트의 **mapper**로 서버 DTO → UI 모델을 변환한다. 컴포넌트는 UI 모델(`model/types.ts`)에만 의존.
- 센서 항목 코드·등급 코드처럼 서버가 문자열로 주는 값은 DTO에서 그대로 받고, mapper에서 UI 모델의 리터럴 유니온으로 좁힌다. 매핑되지 않는 값은 임의 기본값으로 대체하지 말고 그대로 드러내 처리한다(빈 상태·미지원 표기).

---

## 5. 인라인 상수 금지
컴포넌트/페이지 최상단 `const FOO = ...` 금지(위 §3 예외 제외). 사유: 중복 방지·변경 영향 파악·관심사 분리.
