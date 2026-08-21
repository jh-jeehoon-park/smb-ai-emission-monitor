import type { MeasurementItemCode } from './measurement';

/**
 * 배출허용기준 — **두 축으로 결정된다** `[공정자료 p.11]`.
 *
 * ① 지역구분 4단계 · ② 1일 폐수배출량 규모. 둘을 알아야 기준표를 고를 수 있다.
 * 사업장의 두 값이 없으면 **어떤 항목도 초과를 판정할 수 없다** — 표를 못 고른다.
 *
 * `[공정자료 p.11]`이 확인해 준 수치는 **1일 배출량 2,000㎥ 이상**(1종) 사업장의
 * BOD·SS·COD뿐이고, 그 셋은 **우리 계측 항목이 아니다.** 우리 실증 사업장은 4종
 * (50~200㎥/일 `[데이터셋 …/04_… 규모=4종]`)이라 그 표를 적용하면 틀린다.
 */
export const REGION_GRADES = ['청정지역', '가지역', '나지역', '특례지역'] as const;
export type RegionGrade = (typeof REGION_GRADES)[number];

/** 1일 폐수배출량 규모 구간 `[공정자료 p.11]`. 종별은 배출량으로 갈린다 */
export const DISCHARGE_SCALES = [
  '2,000㎥ 이상',
  '700~2,000㎥',
  '200~700㎥',
  '200㎥ 미만',
] as const;
export type DischargeScale = (typeof DISCHARGE_SCALES)[number];

/**
 * 항목별 기준값.
 *
 * **`null`은 "기준이 없다"가 아니라 "우리가 아직 그 표를 갖고 있지 않다"는 뜻이다.**
 * 법에는 있다 — `[공정자료 p.11]`이 *"규모·지역별 별도 기준표가 있으며"* 라고 적었다.
 * 값을 지어내면 없는 초과 판정을 만들게 되므로 비워 둔다(`README` §3.1).
 */
export interface DischargeLimit {
  /** 하한. pH처럼 양방향 기준이 있는 항목만 값을 갖는다 */
  min: number | null;
  /** 상한 */
  max: number | null;
  /** 근거 표기 — 화면이 이 문자열을 그대로 보여 준다 */
  source: string;
  /** 값이 없는 이유. 있으면 화면이 초과 판정 대신 이 문구를 적는다 */
  unavailableReason: string | null;
}

const NO_LIMIT_TABLE =
  '규모·지역별 기준표가 필요합니다 — 사업장 지역구분·배출량 규모 미확정 [TBD-45]';

/**
 * **pH만 지금 판정할 수 있다.**
 *
 * `[공정자료 p.11]`: *"pH는 통상 5.8~8.6 범위가 널리 적용됩니다."* 규모·지역과 무관하게
 * 널리 쓰이는 범위라 표를 고르지 않고도 쓸 수 있다.
 *
 * 다만 "통상"이다. 같은 쪽이 *"정확한 적용 구간은 사업장 폐수배출시설 설치허가(신고)증에서
 * 확인"* 이라고 못박았으므로, 화면은 이 값을 확정 기준처럼 보이게 하지 않는다.
 */
export type DischargeLimitTable = Partial<Record<MeasurementItemCode, DischargeLimit>>;

/**
 * 항목별 어떤 입력을 받는가. **pH만 양방향이다** — `DischargeLimit.min`의 주석이 이미 그
 * 사실을 갖고 있었고, 설정 화면이 칸을 하나 둘지 둘 둘지 정하는 근거가 된다.
 */
export const LIMIT_INPUT_KIND: Partial<Record<MeasurementItemCode, 'max' | 'range'>> = {
  TOC: 'max',
  TN: 'max',
  TP: 'max',
  pH: 'range',
};

export const DISCHARGE_LIMITS: DischargeLimitTable = {
  pH: {
    min: 5.8,
    max: 8.6,
    source: '[공정자료 p.11·16] 통상 적용 범위 · 사업장 허가증 확인 필요',
    unavailableReason: null,
  },
  TOC: { min: null, max: null, source: '[공정자료 p.12·19]', unavailableReason: NO_LIMIT_TABLE },
  TN: { min: null, max: null, source: '[공정자료 p.12·19]', unavailableReason: NO_LIMIT_TABLE },
  TP: { min: null, max: null, source: '[공정자료 p.12·19]', unavailableReason: NO_LIMIT_TABLE },
};

/**
 * 법적 방류기준 **점검 대상 5항목** `[공정자료 p.5·19]`.
 *
 * **`SS`가 우리 계측에도 AI 추정에도 없다.** 탁도(NTU)는 물리적 지표일 뿐 SS(mg/L)가 아니라
 * 대신 쓸 수 없다. 이 배열에 우리가 값을 가진 항목만 담으면 그 공백이 사라지므로,
 * **5항목을 그대로 적고 보유 여부를 따로 표시한다** — 화면이 "5항목을 다 본다"로 읽히면 안 된다.
 *
 * TMS 유무와 법적 기준 적용은 무관하다 `[공정자료 p.12]` — 비TMS 사업장도 같은 기준을 받는다.
 */
export const LEGAL_CHECK_ITEMS = [
  { label: 'TOC', code: 'TOC' as MeasurementItemCode },
  { label: 'SS', code: null },
  { label: 'T-N', code: 'TN' as MeasurementItemCode },
  { label: 'T-P', code: 'TP' as MeasurementItemCode },
  { label: 'pH', code: 'pH' as MeasurementItemCode },
] as const;

/**
 * 기준을 아직 모른다고 적는 **정본 문구**.
 *
 * 네 화면이 `배출허용기준 미확정` · `미확정` · `기준값 미확정` · `기준 미설정`을 각자 쓰고
 * 있었다. 같은 사실을 네 가지로 적으면 읽는 사람이 서로 다른 상태로 읽는다. 설정 화면이
 * 사용자에게 "이 문구로 남습니다"라고 **약속**하고 있어 문구가 갈리면 그 약속이 거짓이 된다.
 */
export const UNRESOLVED_LIMIT_TEXT = '기준값 미확정 [TBD-45]';

/**
 * 사업장 분류를 사람이 읽는 한 줄로. `가지역 · 200㎥ 미만` 꼴.
 *
 * **기준치는 지역과 규모로 갈린다** `[공정자료 p.11]`. 값만 보이고 어느 구분의 값인지
 * 안 보이면 다른 사업장의 기준과 구별되지 않는다 — 회의가 요구한 것이 그 모니터링이다
 * `[회의 2026-08-20: 어느 지역의 TN 기준치는 몇이고 TP 기준치는 몇인 이러한 사항의 모니터링]`.
 */
export function formatClassification(
  regionGrade: string | null,
  dischargeScale: string | null,
): string | null {
  if (!regionGrade && !dischargeScale) return null;
  /* 한쪽만 골랐으면 나머지를 물음표로 남긴다 — 빈 칸으로 두면 다 골랐다고 읽힌다 */
  return `${regionGrade ?? '지역구분 미설정'} · ${dischargeScale ?? '규모 미설정'}`;
}

/**
 * 기준을 사람이 읽는 꼴로.
 *
 * **한쪽만 있는 기준을 다룬다.** `LIMIT_INPUT_KIND`가 TOC·TN·TP를 `'max'`로 규정하고 설정
 * 화면이 상한 한 칸만 받는데, 표기하는 쪽이 `min`과 `max`를 **둘 다** 요구하면 사용자가
 * 값을 넣어도 화면은 계속 미확정으로 적는다.
 *
 * 기준을 모르면 `null`이다 — 소비처가 `UNRESOLVED_LIMIT_TEXT`를 적는다.
 */
export function formatLimitRange(
  limit: DischargeLimit | undefined,
  decimals: number,
): string | null {
  if (!limit || limit.unavailableReason !== null) return null;
  const { min, max } = limit;
  if (min !== null && max !== null) return `${min.toFixed(decimals)}–${max.toFixed(decimals)}`;
  if (max !== null) return `≤ ${max.toFixed(decimals)}`;
  if (min !== null) return `≥ ${min.toFixed(decimals)}`;
  return null;
}

/**
 * 기준이 정해진 항목인가. 화면은 이 값으로 기준선을 그릴지 정한다.
 *
 * **표를 인자로 받고 기본값을 둔다.** 사용자가 설정한 기준치가 정적 표를 덮어쓸 수 있어야
 * 하는데(`[회의 2026-08-20]`), 이 파일이 localStorage를 읽으면 `shared`가 브라우저에
 * 묶이고 서버 렌더에서 터진다. 표는 **밖에서 넘어오고** 여기는 순수하게 남는다 —
 * 기본값이 있으므로 기존 호출은 한 곳도 고치지 않는다.
 */
export function hasLimit(
  code: MeasurementItemCode,
  table: DischargeLimitTable = DISCHARGE_LIMITS,
): boolean {
  const limit = table[code];
  return Boolean(limit && limit.unavailableReason === null);
}

/**
 * 기준을 벗어났는가.
 *
 * **경계값은 초과가 아니다** — 5.8과 8.6은 허용 범위 안이다. `<`·`>`로 비교한다.
 * 기준이 없거나 값이 결측이면 **판정하지 않는다**(`null`) — `false`를 돌려주면
 * "기준 안에 있다"는 사실 주장이 되어 없는 판정을 만든다(E4).
 */
export function isOverLimit(
  code: MeasurementItemCode,
  value: number | null,
  table: DischargeLimitTable = DISCHARGE_LIMITS,
): boolean | null {
  if (value === null || !hasLimit(code, table)) return null;

  const limit = table[code]!;
  if (limit.min !== null && value < limit.min) return true;
  if (limit.max !== null && value > limit.max) return true;
  return false;
}
