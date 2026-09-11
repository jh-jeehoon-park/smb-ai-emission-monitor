import { INLET_BY_OUTLET_CODE, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import {
  PROVISIONAL_DISPLAY_DECIMALS,
  PROVISIONAL_TREATMENT_SIMILAR_PERCENT,
} from '@/shared/config/provisional';
import {
  UNRESOLVED_LIMIT_TEXT,
  formatLimitRange,
  isOverLimit,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import { formatValue } from '@/shared/lib/format';
import { minutesToSamples } from '@/shared/lib/timeline';
import type { MeasurementGrade } from '@/shared/config/provisional';
import {
  DEMO_SERIES_CODES,
  ESTIMATE_SERIES_CODES,
  WATER_SERIES_CODES,
  changeRatePercent,
  isSimilar,
  isTreatmentJudged,
  summarizeSeries,
  type MeasurementPoint,
  type SeriesCode,
} from '@/entities/measurement';
import { TREND_BUCKET_MINUTES } from '../config/constants';

/**
 * 한 지점에서 읽는 값 하나.
 *
 * `stage-annotations.ts`(폐기)가 **단계별**로 묶던 것을 **지점별**로 다시 묶은 것이다 —
 * `[회의 2026-09-08]`이 *"단일 프로브는 공정별로 부착되지 않고 유입·유출에 부착된다"*로
 * 전제를 바꿨고, 단계마다 값을 적던 구조는 그 전제 위에 서 있지 않다.
 */
export interface PointReading {
  code: SeriesCode;
  symbol: string;
  label: string;
  unit: string;
  unitKo: string;
  /**
   * **마지막으로 «값이 온» 표본.** `null`이면 24시간 내내 한 점도 없었다는 뜻이다.
   *
   * `summarizeSeries().latest`(맨 끝 표본)를 쓰지 않는다 — 계측 서버가 우리 시간축보다
   * 1분쯤 뒤에 쓰기 때문에 **맨 끝 칸이 늘 비어 있고**, 그대로 읽으면 24시간치가 그려진
   * 옆에서 큰 값만 «수신 없음»이 된다(2026-09-10 실측: 서버에 69초 전 값이 있는데 화면은
   * 비었다). 앞 값을 «지금»이라 부르지 않기 위해 **관측 시각을 함께 낸다**(E5).
   */
  value: number | null;
  valueText: string;
  /** 그 값이 관측된 시각. 값이 없으면 `null` */
  observedIso: string | null;
  /** 최근 24시간 평균. 지금 값이 평소와 다른지 보는 축이다 */
  average: number | null;
  averageText: string;
  /** 최근 24시간의 폭. 지금 값이 오늘 범위의 어디쯤인지를 그리는 데 쓴다 */
  min: number | null;
  max: number | null;
  /** 실측인가 AI 추정인가 — 색이 이 축을 나른다(E3) */
  grade: MeasurementGrade;
  /**
   * **서버에 채널이 없거나 한 점도 오지 않았다.**
   *
   * 결측(`value === null`)과 다른 사실이다 — 결측은 «그 시각에 못 받았다»이고 이쪽은
   * «이 사업장에서는 이 항목을 아예 안 받는다»다. 히어로가 둘을 같게 적으면 «잠깐 끊겼다»로
   * 읽힌다.
   */
  unreceived: boolean;
  /**
   * **서버가 주지 않고 우리가 만든 값** `[TBD-59]`.
   *
   * 유입 수질 8종이 그렇다 — 계측 서버에 채널이 없어(2026-09-10 실측) 유출 실측에서
   * 역산한다. **화면이 항목마다 이 사실을 밝힌다** — 밝히지 않고 섞는 것이 E4가 막는 것이고,
   * 밝히면 `PROVISIONAL_DEMO_LIMITS`가 이미 쓴 방식과 같은 지위가 된다.
   */
  demo: boolean;
  /** 방류 기준이 걸리는 항목인가. 유량·전류에는 그 개념 자체가 없다 */
  regulated: boolean;
  limitText: string | null;
  /** `null`은 «판정하지 않았다» — `false`(기준 안)와 다른 사실이다 */
  overLimit: boolean | null;
}

/**
 * 한 항목의 **유입 ↔ 유출 대조 줄** — 이 화면의 주인공.
 *
 * **양이 아니라 수질이 축이다** `[사용자 지적 2026-09-10: 유입 유출의 방류량이 중요한 것이
 * 아닌 … 유출 때도 수질이 동일하다면 공정에 문제가 있는 것]`. 들어온 만큼 나가는 것은
 * 정상이라 물의 양은 처리 여부를 말하지 않는다.
 */
export interface TreatmentRow {
  code: SeriesCode;
  label: string;
  unit: string;
  inlet: PointReading;
  outlet: PointReading;
  /** 유입 대비 변화율(%). **부호를 살린다** — 폭기가 올리는 DO와 처리가 줄인 TOC는 다른 사실이다 */
  changePercent: number | null;
  changeText: string;
  /** 이 항목에 «유사 = 처리 미흡»이 성립하는가 `[TBD-59]` */
  judged: boolean;
  similar: boolean;
}

/**
 * 처리가 됐는가에 대한 한 줄 답.
 *
 * **상태 등급(정상·주의·경고·위험)을 쓰지 않는다.** 이 축은 이상 점수가 아니라 «두 지점이
 * 얼마나 다른가»다 — 같은 색 체계를 쓰면 화면 위쪽의 등급 띠와 같은 것을 말하는 것처럼 읽힌다.
 */
export interface TreatmentVerdict {
  kind: 'ok' | 'stall' | 'unknown';
  headline: string;
  detail: string;
  /** 판정 대상 중 유입과 거의 같은 항목 수 */
  similarCount: number;
  judgedCount: number;
}

/** 대조하는 두 지점 중 하나 */
export interface ComparePoint {
  key: 'inlet' | 'outlet';
  label: string;
  /** 그 지점의 유량 — 히어로의 큰 값 */
  flow: PointReading;
  /** 그 지점에서 함께 읽는 것. 유입은 펌프 전류·전력, 유출은 방류 수조 수위 */
  aside: PointReading[];
  /** 24시간 계열. 스파크라인이 그린다 */
  history: (number | null)[];
}

export interface InOutCompare {
  inlet: ComparePoint;
  outlet: ComparePoint;
  /**
   * **유입 − 유출.** 한쪽이라도 없으면 `null`이다 — 없는 값을 0으로 두면 «머문 양 0»이라는
   * 사실 주장이 된다(E4). 문구는 `WaterQualityGrid`가 이미 쓰는 `유입 − 유출`을 따른다.
   */
  held: number | null;
  heldText: string;
  /**
   * **수질 8종의 유입 ↔ 유출 대조** — 화면의 주인공이다.
   *
   * 한때 이 자리에 `quality`(유출수만)가 있었다. 그 판본은 «유입 수질 채널이 서버에 없다»는
   * **데이터 사정**을 축으로 삼은 것이었고, 회의가 준 판정 축은 처음부터 두 지점의 대조였다
   * `[사용자 지적 2026-09-10]`.
   */
  treatment: TreatmentRow[];
  verdict: TreatmentVerdict;
  /** 직접 재지 않고 AI가 내는 것. 유입 짝이 없어 대조 줄이 되지 않는다 */
  estimates: PointReading[];
}

/** 유입 지점에서 함께 읽는 것. 펌프가 도는지가 «들어오고 있는가»의 증거다 */
const INLET_ASIDE: SeriesCode[] = ['current', 'power'];
/** 유출 지점에서 함께 읽는 것. 방류 수조 수위 `[TBD-57]` */
const OUTLET_ASIDE: SeriesCode[] = ['level'];

function toReading(
  points: MeasurementPoint[],
  code: SeriesCode,
  grade: MeasurementGrade,
  unreceived: readonly SeriesCode[],
  limits: DischargeLimitTable,
): PointReading {
  const item = MEASUREMENT_ITEMS[code];
  const stats = summarizeSeries(points, code);
  const limit = limits[code];
  const observed = lastObserved(points, code);

  return {
    code,
    symbol: item.symbol,
    label: item.label,
    unit: item.unit,
    unitKo: item.unitKo,
    value: observed.value,
    valueText: formatValue(code, observed.value),
    observedIso: observed.iso,
    average: stats.avg,
    averageText: formatValue(code, stats.avg),
    min: stats.min,
    max: stats.max,
    grade,
    unreceived: unreceived.includes(code),
    demo: DEMO_SERIES_CODES.includes(code),
    /* 표에 항목이 있으면 기준이 걸리는 항목이다 — 값이 아직 없어도(`[TBD-45]`) 걸린다 */
    regulated: limit !== undefined,
    limitText: formatLimitRange(limit, item.decimals),
    overLimit: isOverLimit(code, observed.value, limits),
  };
}

/**
 * 뒤에서부터 훑어 **값이 있는 마지막 표본**을 찾는다.
 *
 * **빈칸을 앞 값으로 메우는 것이 아니다** — 그 값이 언제 것인지를 함께 내보내 화면이
 * «지금»이 아니라 «최신 관측»이라 적게 한다. 24시간 내내 없으면 `null`이고, 그때 화면은
 * 수신 없음이라 적는다(E4).
 */
function lastObserved(
  points: MeasurementPoint[],
  code: SeriesCode,
): { value: number | null; iso: string | null } {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i]![code];
    if (value !== null) return { value, iso: points[i]!.t };
  }
  return { value: null, iso: null };
}

/**
 * 항목 하나의 24시간 계열을 **솎아서** 낸다.
 *
 * 원본 1440점을 420px에 그리면 픽셀당 3.4점이라 선이 «털»이 된다. 버킷은 **분**으로 세고
 * (`TREND_BUCKET_MINUTES`), 대표값은 **평균**이다 — 이 축이 묻는 것은 «얼마나 흘렀나»이지
 * 봉우리가 아니다(이상 점수 축이 최댓값을 쓰는 것과 갈리는 지점).
 *
 * **버킷이 통째로 결측이면 결측이다** — 남은 표본으로 메우면 두절 구간이 정상 추세로
 * 이어져 보인다(E4). 추이선이 그 자리를 끊는다.
 */
function historyOf(points: MeasurementPoint[], code: SeriesCode): (number | null)[] {
  const size = Math.max(minutesToSamples(TREND_BUCKET_MINUTES), 1);
  const out: (number | null)[] = [];

  for (let i = 0; i < points.length; i += size) {
    const known: number[] = [];
    for (let j = i; j < Math.min(i + size, points.length); j += 1) {
      const value = points[j]![code];
      if (value !== null) known.push(value);
    }
    out.push(known.length === 0 ? null : known.reduce((a, b) => a + b, 0) / known.length);
  }

  return out;
}

/**
 * 화면이 읽는 값 한 벌.
 *
 * **기준치는 밖에서 받는다** — 사용자가 사업장 설정에서 입력한 값(`useDischargeLimits`)이
 * 정적 표를 덮어써야 하는데, 여기서 localStorage를 읽으면 순수 함수가 아니게 되고 서버
 * 렌더에서 터진다.
 */
export function buildCompare(
  points: MeasurementPoint[],
  unreceived: readonly SeriesCode[],
  limits: DischargeLimitTable,
): InOutCompare {
  const read = (code: SeriesCode, grade: MeasurementGrade) =>
    toReading(points, code, grade, unreceived, limits);

  const inflow = read('inflow', 'actual');
  const outflow = read('flow', 'actual');
  const treatment = WATER_SERIES_CODES.map((code) => toTreatmentRow(code, read));

  /*
   * **두 지점 이름은 여기 한 곳에서 온다** — 카드·표·유량 상자가 같은 문자열을 본다.
   *
   * `들어온 물`·`나간 물` → **`유입수`·`유출수`** `[사용자 요청 2026-09-10]`. 아래 주석과
   * 화면 문서에 남은 `[사용자 …]` 인용은 **그때 사용자가 실제로 쓴 낱말이라 고치지 않는다** —
   * 인용을 새 용어로 바꾸면 근거가 아니라 우리가 지은 말이 된다.
   */
  return {
    inlet: {
      key: 'inlet',
      label: '유입수',
      flow: inflow,
      aside: INLET_ASIDE.map((code) => read(code, 'actual')),
      history: historyOf(points, 'inflow'),
    },
    outlet: {
      key: 'outlet',
      label: '유출수',
      flow: outflow,
      aside: OUTLET_ASIDE.map((code) => read(code, 'actual')),
      history: historyOf(points, 'flow'),
    },
    held: heldVolume(inflow.value, outflow.value),
    heldText: formatValue('inflow', heldVolume(inflow.value, outflow.value)),
    treatment,
    verdict: toVerdict(treatment),
    estimates: ESTIMATE_SERIES_CODES.map((code) => read(code, 'estimated')),
  };
}

/**
 * 유출 항목 하나를 **유입 짝과 묶는다.**
 *
 * 변화율은 `entities/measurement`의 함수를 지난다 — 알람 빌더가 보는 것과 **같은 식**이라
 * 화면이 «처리 확인됨»이라 적는데 헤더 배지가 «미확인 1건»으로 오르는 어긋남이 없다.
 */
function toTreatmentRow(
  outletCode: SeriesCode,
  read: (code: SeriesCode, grade: MeasurementGrade) => PointReading,
): TreatmentRow {
  const inletCode = INLET_BY_OUTLET_CODE[outletCode as keyof typeof INLET_BY_OUTLET_CODE];
  const inlet = read(inletCode, 'actual');
  const outlet = read(outletCode, 'actual');
  const changePercent = changeRatePercent(inlet.value, outlet.value);
  const judged = isTreatmentJudged(outletCode);

  return {
    code: outletCode,
    label: MEASUREMENT_ITEMS[outletCode].label,
    unit: MEASUREMENT_ITEMS[outletCode].unit,
    inlet,
    outlet,
    changePercent,
    changeText: changeText(changePercent),
    judged,
    similar: judged && isSimilar(changePercent),
  };
}

/**
 * 변화율 문구. **부호를 말로 바꾼다** — `-68%`보다 `68% 감소`가 한눈에 읽히고, 폭기가 올린
 * DO를 «감소»라 적는 실수가 형태에서 막힌다.
 *
 * 모르는 것은 `수신 없음`이 아니라 **`판정 불가`** 다 — 한쪽만 없어도 대조가 성립하지 않는데
 * `수신 없음`이라 적으면 둘 다 없는 것으로 읽힌다(E4).
 */
function changeText(changePercent: number | null): string {
  if (changePercent === null) return '판정 불가';
  const magnitude = Math.abs(changePercent).toFixed(
    PROVISIONAL_DISPLAY_DECIMALS.treatmentChangePercent,
  );
  if (changePercent < 0) return `${magnitude}% 감소`;
  if (changePercent > 0) return `${magnitude}% 증가`;
  return '변화 없음';
}

/**
 * 처리가 됐는가 — **한 줄 답.**
 *
 * 셋을 가른다. `unknown`은 «판정 대상 항목의 값이 한쪽이라도 없다»이고 `ok`는 «재 봤더니
 * 달라졌다»다 — 둘을 같게 적으면 두절된 사업장이 «처리 확인됨»으로 읽힌다(**E4**).
 *
 * 임계가 우리 값임을 문구가 스스로 밝힌다 `[TBD-59]`.
 *
 * **`kind: 'stall'`의 문구가 «처리 상태 확인»이다** `[사용자 요청 2026-09-10: 처리 미흡 의심 →
 * 처리 상태 확인]`. 키와 문구가 더는 같은 낱말이 아니므로 **키를 문구에 맞춰 고치지 않는다** —
 * `kind`는 판정 갈래(정체가 있다)이고 문구는 그것을 운영자에게 어떻게 말하는가다. 판정 규칙·
 * 임계·알람 발생 조건은 하나도 바뀌지 않았고 바뀐 것은 낱말뿐이다.
 */
function toVerdict(rows: readonly TreatmentRow[]): TreatmentVerdict {
  const judged = rows.filter((row) => row.judged);
  const known = judged.filter((row) => row.changePercent !== null);
  const similar = known.filter((row) => row.similar);

  if (known.length === 0) {
    return {
      kind: 'unknown',
      headline: '판정 불가',
      detail: '유입·유출 수질을 함께 받은 항목이 없습니다',
      similarCount: 0,
      judgedCount: judged.length,
    };
  }

  if (similar.length === 0) {
    return {
      kind: 'ok',
      headline: '처리 확인됨',
      detail: `판정 대상 ${known.length}개 항목이 모두 유입과 ${PROVISIONAL_TREATMENT_SIMILAR_PERCENT}% 넘게 달라졌습니다`,
      similarCount: 0,
      judgedCount: known.length,
    };
  }

  return {
    kind: 'stall',
    headline: '처리 상태 확인',
    detail: `판정 대상 ${known.length}개 항목 중 ${similar.length}개가 유입과 거의 같습니다`,
    similarCount: similar.length,
    judgedCount: known.length,
  };
}

/**
 * 기준 판정을 화면에 어떻게 적는가.
 *
 * 세 갈래다 — **기준이 걸리지 않는 항목은 `null`**(그 자리에 아무것도 적지 않는다) ·
 * 걸리지만 표를 못 고른 항목은 정본 문구 · 판정할 수 있으면 판정. 첫째를 둘째와 섞으면
 * 전류·유량 옆에 «기준값 미확정»이 붙어 **없는 기준이 정해질 예정인 것처럼** 읽힌다.
 */
export function verdictText(row: PointReading): string | null {
  if (!row.regulated) return null;
  if (row.limitText === null) return UNRESOLVED_LIMIT_TEXT;
  if (row.overLimit === null) return '판정 불가';
  return row.overLimit ? '기준 초과' : '기준 이내';
}

/**
 * 들어온 양에서 나간 양을 뺀 것.
 *
 * **한쪽이라도 모르면 모른다.** 0으로 채우면 «머문 양이 0이다»라는, 재 보지 않은 주장이 된다.
 * 음수도 그대로 둔다 — 나간 양이 더 많은 구간은 실제로 있고(수조를 비우는 중), 그것을 0으로
 * 자르면 화면이 물의 수지를 거짓으로 적는다.
 */
export function heldVolume(inflow: number | null, outflow: number | null): number | null {
  if (inflow === null || outflow === null) return null;
  return inflow - outflow;
}
