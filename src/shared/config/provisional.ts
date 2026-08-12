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
  const band = PROVISIONAL_ANOMALY_BANDS.find((b) => anomalyScore >= b.min && anomalyScore <= b.max);
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
  TN: 2,
  TP: 2,
};
