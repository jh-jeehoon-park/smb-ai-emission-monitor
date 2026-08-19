/**
 * 원문(사업계획서·발표자료)이 확정하지 않은 값을 프로토타입에서 쓰기 위한 잠정 정의.
 * 확정되면 이 파일만 교체하면 전 화면이 따라 바뀐다. 다른 파일에 흩뿌리지 않는다.
 */

export const PROVISIONAL_STATUS_LEVELS = ['normal', 'caution', 'warning', 'critical'] as const;

export type StatusLevel = (typeof PROVISIONAL_STATUS_LEVELS)[number];

/**
 * 원문이 정상/이상(2단계)·정상/주의/이상(3단계)·정상/주의/경고/위험(4단계)·
 * 정상/주의/위험(3단계)·정상/주의/경고/위협(4단계) 다섯 가지를 혼용한다(INC-01·03·04).
 * 발표자료 p.15의 4단계를 시연 기준으로 채택했다.
 */
export const PROVISIONAL_STATUS_LABELS: Record<StatusLevel, string> = {
  normal: '정상',
  caution: '주의',
  warning: '경고',
  critical: '위험',
};

/**
 * 이상 점수(0~100, 사업계획서 p.64)를 등급으로 나누는 경계. 원문에 근거가 없다(TBD-02).
 * 위험 하한 80은 저장소 내 유일한 수치 앵커(.claude/rules/unclear.rule.md §5 예시)에서 가져왔고
 * 나머지는 그 위에서 균등 배분했다. 실제 점수 분포 확보 후 오탐지율 <10%(p.30) 기준으로 재조정한다.
 */
export const PROVISIONAL_ANOMALY_BANDS: { level: StatusLevel; min: number; max: number }[] = [
  { level: 'normal', min: 0, max: 49 },
  { level: 'caution', min: 50, max: 69 },
  { level: 'warning', min: 70, max: 79 },
  { level: 'critical', min: 80, max: 100 },
];

export function toStatusLevel(anomalyScore: number): StatusLevel {
  const band = PROVISIONAL_ANOMALY_BANDS.find(
    (b) => anomalyScore >= b.min && anomalyScore <= b.max,
  );
  return band?.level ?? 'normal';
}

/**
 * 구간 라벨("50–69")과 게이지 눈금은 경계값에서 파생시킨다.
 * 화면에 직접 적어 두면 경계를 바꿀 때 한쪽만 바뀌어 조용히 어긋난다.
 */
export function anomalyBandLabel(level: StatusLevel): string {
  const band = PROVISIONAL_ANOMALY_BANDS.find((b) => b.level === level);
  return band ? `${band.min}–${band.max}` : '—';
}

/** 계기 바에 찍을 눈금 — 각 구간의 시작점과 최대값 */
export const PROVISIONAL_ANOMALY_TICKS: number[] = [
  ...PROVISIONAL_ANOMALY_BANDS.map((b) => b.min),
  PROVISIONAL_ANOMALY_BANDS[PROVISIONAL_ANOMALY_BANDS.length - 1]?.max ?? 100,
];

/**
 * 항목별 표시 소수 자릿수. 원문은 센서 정확도(±0.1 등)만 규정하고 표시 자릿수를 정하지 않았다
 * (data-dictionary.md §10 #2). 정확도 한 자리 아래까지 보이도록 잡았다.
 */
export const PROVISIONAL_DECIMALS: Record<string, number> = {
  pH: 2,
  EC: 0,
  turbidity: 1,
  DO: 2,
  temperature: 1,
  chromaticity: 0,
  NO3N: 2,
  TOC: 1,
  current: 1,
  power: 1,
  flow: 0,
  // TN은 TOC와 값 크기가 비슷해(십 단위 mg/L) 같은 자릿수를 쓴다. TP는 한 자릿수라 두 자리가 필요하다.
  TN: 1,
  TP: 2,
};

/**
 * 계측 항목이 아닌 표시 값의 소수 자릿수. **원문에 표기 규칙이 없다.**
 *
 * 계측 8+3항목은 위 PROVISIONAL_DECIMALS가 갖는다. 여기 있는 것은 파생·지표값이다.
 * 화면마다 따로 반올림하면 같은 값이 화면마다 다르게 보인다(E1).
 */
export const PROVISIONAL_DISPLAY_DECIMALS = {
  /** 이상 점수는 정수로 산출되므로 최신·최대는 자릿수가 없다. 평균에만 소수가 필요하다 */
  anomalyScoreAverage: 1,
  dataThroughput: 1,
  uptime: 1,
  /** 기여도는 0~1로 오고 %로 표시한다 */
  contributionPercent: 0,
  /** 절감률. 목표가 20~30%·≥10%처럼 정수 구간이라 한 자리면 목표 대비가 드러난다 */
  savingRate: 1,
  /** 1억 이상은 억으로 끊는다. `15,000만 원`은 자릿수를 세어야 읽힌다 */
  savingKrwEok: 1,
  /** 수분석 항목 중 **계측 대상이 아닌 것**(SS·COD). 실증 성적서 표기를 따랐다 */
  analysisSS: 1,
  analysisCOD: 1,
  /** 검증 지표 `[원문 p.38]`. R²는 0~1이라 세 자리, MAE는 계측값 크기라 두 자리 */
  validationR2: 3,
  validationMae: 2,
  /** 표본 수는 개수라 소수가 없다 */
  validationSampleCount: 0,
} as const;

/**
 * 계측 등급. **원문에 이런 등급 개념이 없다** — 공정 화면(SCR-AD-002)이 "어디를 재고
 * 어디를 추정하며 어디가 안 보이는가"를 보이려고 세운 구분이다.
 *
 * 색은 새로 만들지 않는다. `status-visual.ts`의 계열색(`--actual`·`--ai`·`--missing`)이
 * 이미 실측·추정·결측을 가르며, E3가 그 구분을 요구한다. 상태 등급 색과 다른 축이다.
 */
export const PROVISIONAL_MEASUREMENT_GRADES = ['actual', 'estimated', 'none'] as const;

export type MeasurementGrade = (typeof PROVISIONAL_MEASUREMENT_GRADES)[number];

export const PROVISIONAL_MEASUREMENT_GRADE_LABELS: Record<MeasurementGrade, string> = {
  actual: '실측',
  estimated: 'AI 추정',
  none: '계측 없음',
};

/**
 * 테두리 스타일. 색만으로 가르면 색각 이상에서 셋이 뭉친다.
 * 글리프(`●◆▲■`)는 이미 상태 등급이 쓰고 있어(`status-visual.ts`) 겹쳐 쓰지 않는다.
 */
export const PROVISIONAL_MEASUREMENT_GRADE_DASH: Record<MeasurementGrade, string> = {
  actual: 'none',
  estimated: '5 3',
  none: '2 3',
};

/**
 * 약품 주입량 단위. **TBD-31 관련 — 원문에 근거 없음.**
 *
 * data-dictionary §5.1이 "약품 주입량 — 원문 없음(형식·단위)", "최적 약품 투입량 권장값 —
 * 원문 없음(범위)"로 기록해 둔 항목이다. 계측 사양(사업계획서 p.55)에는 없고 AI 입력
 * 운영 데이터로만 언급된다. 시연에서는 액상 응집제 주입 펌프를 가정해 L/h로 표기한다.
 * 확정되면 이 값과 `entities/optimization`의 기준 주입량(BASE_DOSE)을 함께 교체한다.
 */
export const PROVISIONAL_DOSING_UNIT = 'L/h';

/**
 * 방지시설 미가동 방류를 **의심으로 볼 최소 지속 시간**(표본 수).
 *
 * **원문에 없다.** 원문은 방법만 준다 — *"전류 발생 시기와 유량 발생 시기를 비교"*,
 * *"공정 체류시간을 고려한 데이터 매칭"* `[원문 발표 p.13]` `[TBD-46]`. 몇 분부터 의심인지,
 * 체류시간을 몇 시간으로 볼지는 정해지지 않았다.
 *
 * 1시간(12표본)으로 둔 이유: 실증 데이터가 **시간 단위 집계**라 그보다 짧은 판정은
 * 원본 데이터로 검증할 수 없다(`docs/datasets/…/04_…`). 확정되면 이 값만 바꾼다.
 */
export const PROVISIONAL_IDLE_DISCHARGE_MIN_SAMPLES = 12;
