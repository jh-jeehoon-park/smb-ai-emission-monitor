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
 * 운전 조건 조정폭의 **크기**를 정하는 배율. 방향과 근거는 계측이 준다.
 *
 * **왜 필요한가** — 원문은 조정 대상(`폭기량, 펌프 속도 등` p.67)과 인과(`폭기량 감소 → DO
 * 저하 → 질산화 저해 → TN 증가` p.24·62)까지 주고 **몇 %를 조정하라는 값은 주지 않는다.**
 * 관측된 변화율을 그대로 조정폭으로 쓰면 DO가 20% 떨어진 순간 폭기량 +20%를 권하게 되는데
 * 그 등가성에도 근거가 없다.
 *
 * **원문에 왜 없는가** — XMARL-PPO가 낼 값이고(p.66) 모델이 아직 없다.
 *
 * **확정되면 무엇을 바꾸나** — 모델이 붙으면 이 배율과 `buildOperating`이 함께 사라진다.
 * 화면은 서버가 준 조정폭을 그리기만 한다.
 *
 * **상한을 둔다.** 계측이 튀는 순간 `+180%` 같은 제안이 나오면 그것이 곧 안전 문제다 —
 * 우리는 제어하지 않지만(REQ-CO-002 미구현) 운영자가 손으로 따라 할 수 있다.
 */
export const PROVISIONAL_OPERATING_GAIN = {
  /** 관측 변화율을 조정폭으로 옮길 때의 배율 */
  ratio: 0.6,
  /** 조정폭 상한 % — 양방향 공통 */
  maxPercent: 20,
  /** 이보다 작은 변화는 조정을 권하지 않는다 — 잡음에 설비를 흔들지 않는다 */
  minPercent: 2,
} as const;

/**
 * 관측 변화율(`recent / baseline`)을 조정폭 %로.
 *
 * `sign`은 인과의 방향이다 — DO가 내려가면 폭기량을 **올려야** 하므로 `-1`, 유입 유량이
 * 내려가면 펌프 속도도 **내려야** 하므로 `+1`.
 *
 * 값이 없거나 변화가 문턱 아래면 `null`이다. `0`을 돌려주면 "조정할 필요가 없다고 판단했다"는
 * 사실 주장이 되는데, 판단하지 못한 것과 다르다(E4).
 */
export function toOperatingDelta(ratio: number | null, sign: 1 | -1): number | null {
  if (ratio === null) return null;

  const { ratio: gain, maxPercent, minPercent } = PROVISIONAL_OPERATING_GAIN;
  const raw = (ratio - 1) * 100 * gain * sign;
  if (Math.abs(raw) < minPercent) return null;

  const clamped = Math.max(-maxPercent, Math.min(maxPercent, raw));
  return Math.round(clamped);
}

/**
 * 설비 이상을 등급으로 나누는 임시 규칙. **원문에 판정 기준이 없다** `[TBD-50]`.
 *
 * 예전에는 고장 확률이 등급을 정했는데 회의가 그것을 내리게 했다 `[INC-107]`. 남은 축은
 * **이상 신호의 개수와 지속 시간** 둘뿐이라 그것으로 나눈다 — 진동 사양이 없어(`[TBD-49]`)
 * 값의 크기는 쓸 수 없다.
 *
 * 이상 점수 구간(`PROVISIONAL_ANOMALY_BANDS`)과 **다른 축이다.** 그쪽은 0~100 점수를
 * 자르고 이쪽은 신호를 센다. 등급 라벨만 공유한다.
 */
export const PROVISIONAL_EQUIPMENT_ANOMALY_RULE = {
  /** 신호가 이 개수 이상이면 위험 — 두 가지가 동시에 걸리면 한 부위 문제로 보기 어렵다 */
  criticalSignals: 2,
  /** 신호 하나가 이 시간 이상 이어지면 경고 — 스쳐 지난 것과 이어지는 것을 가른다 */
  warningHours: 3,
} as const;

/**
 * 설비 등급을 낸다. 규칙은 위 상수가 갖고, 여기서는 그것을 읽기만 한다.
 *
 * `hours`가 `null`이면 지속을 모르는 것이다 — 신호가 있으니 `정상`은 아니고, 오래됐다고
 * 단정할 근거도 없어 `주의`에 둔다(E4).
 */
export function toEquipmentStatus(signalCount: number, hours: number | null): StatusLevel {
  if (signalCount <= 0) return 'normal';
  if (signalCount >= PROVISIONAL_EQUIPMENT_ANOMALY_RULE.criticalSignals) return 'critical';
  if (hours !== null && hours >= PROVISIONAL_EQUIPMENT_ANOMALY_RULE.warningHours) return 'warning';
  return 'caution';
}

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
  /**
   * 진동은 **값을 표시하지 않는다.** 단위·범위가 원문에 없어(`[TBD-49]`) 화면은 이상 여부만
   * 낸다. 그래도 여기 적어 두는 이유는 `PROVISIONAL_DECIMALS`가 `Record<string, number>`라
   * 빠뜨리면 `undefined`가 `number`로 통과해 조용히 `NaN`을 만들기 때문이다.
   */
  vibration: 0,
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
  validationRmse: 2,
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
