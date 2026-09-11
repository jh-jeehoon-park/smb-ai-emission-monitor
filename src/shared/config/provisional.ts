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
 * 구간 라벨과 게이지 눈금은 경계값에서 파생시킨다.
 * 화면에 직접 적어 두면 경계를 바꿀 때 한쪽만 바뀌어 조용히 어긋난다.
 *
 * **숫자와 등급 이름을 함께 낸다** `[회의 피드백 2026-08-24: 범례를 숫자와 설명으로]`.
 * 예전에는 `50–69`만 내서 그 구간이 무슨 등급인지 범례가 말하지 않았다 — 색을 못 가리는
 * 사람에게는 알 방법이 아예 없었고, **색만으로 등급을 전달하지 않는다**는 규칙과도 어긋났다.
 *
 * 숫자만 필요한 자리(게이지 눈금)는 `PROVISIONAL_ANOMALY_TICKS`를 쓴다.
 */
export function anomalyBandLabel(level: StatusLevel): string {
  const band = PROVISIONAL_ANOMALY_BANDS.find((b) => b.level === level);
  return band ? `${band.min}–${band.max} ${PROVISIONAL_STATUS_LABELS[level]}` : '—';
}

/** 경계값만. 게이지 축처럼 이름이 들어갈 자리가 없는 곳이 쓴다 */
export function anomalyBandRange(level: StatusLevel): string {
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
 * 우리는 제어하지 않지만(REQ-CO-002 미구현) 사업장이 손으로 따라 할 수 있다.
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
 * 수신이 끊겼다고 볼 표본 수. **원문에 없다** `[TBD-58 관련]`.
 *
 * 계측 API 명세 §4.5가 장비의 비활성 판정(`inactivityTimeout`)을 **수집 주기 × 3**으로 두고
 * 있어 화면도 같은 기준을 쓴다 — 서버와 화면이 다른 잣대로 두절을 판정하면 배지와 값이
 * 어긋난다. 명세는 원문이 아니므로 여기 둔다.
 */
export const PROVISIONAL_STALE_SAMPLES = 3;

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
  /** 유입은 유출과 나란히 놓고 빼는 값이라 같은 자릿수를 쓴다 — 갈리면 차가 어긋나 보인다 */
  inflow: 0,
  /**
   * 진동은 **값을 표시하지 않는다.** 단위·범위가 원문에 없어(`[TBD-49]`) 화면은 이상 여부만
   * 낸다. 그래도 여기 적어 두는 이유는 `PROVISIONAL_DECIMALS`가 `Record<string, number>`라
   * 빠뜨리면 `undefined`가 `number`로 통과해 조용히 `NaN`을 만들기 때문이다.
   */
  vibration: 0,
  /** 수위는 미터라 값이 한 자릿수다 — 두 자리를 줘야 10cm 아래 변화가 보인다 */
  level: 2,
  // TN은 TOC와 값 크기가 비슷해(십 단위 mg/L) 같은 자릿수를 쓴다. TP는 한 자릿수라 두 자리가 필요하다.
  TN: 1,
  TP: 2,
  /*
   * **유입 수질은 유출과 같은 자릿수를 쓴다.** 나란히 놓고 빼는 값이라 갈리면 그 차가
   * 어긋나 보인다 — `inflow`/`flow`가 같은 이유로 짝을 맞춘다.
   *
   * **여덟 줄을 여기 적는 것이 유일한 방어선이다.** 이 상수는 `Record<string, number>`라
   * 타입이 누락을 막지 못하고, 빠뜨리면 `undefined`가 `number`로 통과해 화면에 `NaN`이
   * 조용히 흐른다(`vibration` 주석이 같은 함정을 적는다).
   */
  inletPH: 2,
  inletEC: 0,
  inletTurbidity: 1,
  inletDO: 2,
  inletTemperature: 1,
  inletChromaticity: 0,
  inletNO3N: 2,
  inletTOC: 1,
};

/**
 * 계측 항목이 아닌 표시 값의 소수 자릿수. **원문에 표기 규칙이 없다.**
 *
 * 계측 8+3항목은 위 PROVISIONAL_DECIMALS가 갖는다. 여기 있는 것은 파생·지표값이다.
 * 화면마다 따로 반올림하면 같은 값이 화면마다 다르게 보인다(E1).
 */
export const PROVISIONAL_DISPLAY_DECIMALS = {
  /**
   * 기준 대비 비율. **정수다** — 소수를 붙이면 `98.3%`처럼 정밀해 보이는데 원값이 소프트
   * 센싱 추정이라 그만한 정밀도가 없다. 겹침 차트의 눈금·툴팁·표가 이 값을 함께 쓴다.
   */
  limitPercent: 0,
  /**
   * 유입 대비 변화율. **정수다** — 원값의 한쪽(유입)이 우리가 역산한 시연값이라(`[TBD-59]`)
   * 소수를 붙이면 없는 정밀도를 주장하게 된다. `limitPercent`가 같은 이유로 정수다.
   */
  treatmentChangePercent: 0,
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
 * 방류 수조 수위의 **단위와 만수위**. `[TBD-57]` — 원문에 근거 없음.
 *
 * **항목 자체는 원문에 있다** — `[원문 p.1]`이 `배출 데이터` 3종을 `유량 · 수위 · 방류 여부`로
 * 규정하고 활용 목적을 *"배출량 및 부하량 산정 기반 데이터"* 라 적는다. 그런데
 * **단위·범위·측정 방식이 없다**(`data-dictionary.md` §4.2가 `[TBD]`로 등재해 두었다).
 *
 * **`[원문 p.53]`의 수위스위치 7대는 이 값이 아니다** — 스위치는 ON/OFF이고 우리가 내는 것은
 * 수치다. 그쪽을 근거로 쓰면 없는 계측을 주장하게 된다.
 *
 * 시연에서는 액상 수조에 흔한 표기인 미터를 쓰고 만수위를 3m로 둔다 `[사용자 결정 2026-08-28]`.
 * 확정되면 이 두 값만 바꾼다 — 항목 사양(`measurement.ts`)이 여기서 읽어 간다.
 */
export const PROVISIONAL_LEVEL_UNIT = 'm';
export const PROVISIONAL_LEVEL_RANGE: [number, number] = [0, 3];

/**
 * 방지시설 미가동 방류를 **의심으로 볼 최소 지속 시간**(분).
 *
 * **원문에 없다.** 원문은 방법만 준다 — *"전류 발생 시기와 유량 발생 시기를 비교"*,
 * *"공정 체류시간을 고려한 데이터 매칭"* `[원문 발표 p.13]` `[TBD-46]`. 몇 분부터 의심인지,
 * 체류시간을 몇 시간으로 볼지는 정해지지 않았다.
 *
 * 1시간으로 둔 이유: 실증 데이터가 **시간 단위 집계**라 그보다 짧은 판정은 원본 데이터로
 * 검증할 수 없다(`docs/datasets/…/04_…`). 확정되면 이 값만 바꾼다.
 *
 * **표본 수가 아니라 분이다** `[사용자 지적 2026-09-08]`. 한때 `= 12`(표본)였고 주석은
 * «1시간(12표본)»이라 적었다 — 5분 주기 전제였다. 수집 주기가 1분으로 확정되면서
 * `[INC-111]` **실제 임계가 조용히 12분으로 줄었고** 화면이 `연속 12분`이라 출력했다.
 * `timeline.ts`의 `minutesToSamples`가 이미 못박은 함정이 이 상수에서 그대로 재발했다.
 */
export const PROVISIONAL_IDLE_DISCHARGE_MIN_MINUTES = 60;

/**
 * 이상 점수가 **주의 경계 위로 이어진 구간**을 하나로 셀 최소 지속 시간(분).
 *
 * **원문에 없다** — 구간이라는 개념 자체가 우리 것이다(`[TBD-02]`가 점수 경계도 미정이라
 * 적는다). 짧게 잡으면 잡음이 경계를 스칠 때마다 구간이 늘어 목록이 읽히지 않고, 길게
 * 잡으면 짧고 날카로운 이상이 사라진다.
 *
 * 20분으로 둔 이유: 이상 점수 계열의 파형 주기가 약 3시간(`sin(i/29)`)이라 경계 근처에서
 * 오르내리는 사업장이 있고, 그보다 한참 짧은 스침은 «구간»이라 부를 것이 아니다.
 * **`PROVISIONAL_IDLE_DISCHARGE_MIN_MINUTES`와 같은 값으로 두지 않는다** — 그쪽은 방류
 * 판정이고 이쪽은 점수 구간이라 서로 다른 축이다.
 */
export const PROVISIONAL_ANOMALY_RUN_MIN_MINUTES = 20;

/**
 * 방류 의심 구간에서 **유입이 유출의 몇 배인가** — 1보다 작으면 나간 양이 들어온 양을 넘는다.
 *
 * 평상시에는 유입이 유출보다 약 4% 많다(기준선 430 대 412) — 증발·슬러지 반출로 빠지는
 * 만큼이다. 방지시설이 멈춘 채 방류가 이어지는 구간에서는 처리 없이 내보내므로 그 관계가
 * 뒤집힌다 `[PM 의견 2026-08-25]` `[사용자 결정 2026-08-25]`.
 *
 * **0.92는 시연값이다** `[TBD-46]`. 실제 손실률과 뒤집히는 폭은 현업 기준이 정한다 —
 * 확정되면 이 값 하나만 바꾼다. 값을 8% 차이로 잡은 이유는 평상시 4% 차이의 두 배라
 * 차 칸에서 부호가 바뀌는 것이 눈에 띄기 때문이다.
 */
export const PROVISIONAL_IDLE_INFLOW_RATIO = 0.92;

/**
 * **시연 기준치** `[사용자 결정 2026-08-25]` `[PROVISIONAL]`.
 *
 * `DISCHARGE_LIMITS`(법정 표)를 채우지 않는다 — 배출허용기준은 법령이 원천이고 우리가
 * 정하면 그냥 틀린 값이 된다(`README` §3.1의 *지어내지 않는 둘*). 대신 **사용자가 이미
 * 입력해 둔 상태**를 시연 데이터로 만든다 — 계측값·알람이 전부 시연값인 것과 같은 지위다.
 *
 * **화면이 스스로 밝힌다.** `출처` 열이 `시연 기본값 · 법정 기준 아님`이라 적어 심사자가
 * 이 값을 법정 판정으로 읽지 않는다. 사용자가 허가증 값을 넣으면 그 순간 덮인다.
 *
 * 값을 고른 기준: 계측 기저값 위에 두되 **이상 구간에서 넘도록** 잡았다(TOC 기저 26.5에
 * 이상 상승 +16이면 42.5 > 40). 넘지 않으면 초과 판정이 시연에서 한 번도 안 보인다.
 */
export const PROVISIONAL_DEMO_LIMITS: Record<string, { min: number | null; max: number }> = {
  TOC: { min: null, max: 40 },
  TN: { min: null, max: 20 },
  TP: { min: null, max: 2 },
};

/**
 * **처리 잔존율 — 유출 ÷ 유입** `[TBD-59]` `[PROVISIONAL]`.
 *
 * 회의가 판정 방법을 정했다 `[회의 2026-09-08: 유입·유출에 동일한 센서를 달아 … 동일할 시
 * 공정 처리 과정 중 문제]`. 그런데 **무엇이 얼마나 줄어야 정상인지는 어디에도 없다** —
 * 원문은 처리 효율을 KPI로만 적고 수질 항목별 제거율을 주지 않는다.
 *
 * 이 표는 두 가지 일을 한다.
 * 1. **유입값을 만든다** — 계측 서버에 유입 수질 채널이 없으므로(`[TBD-59]`) 유출 실측에서
 *    `유입 = 유출 ÷ retention`으로 역산한다. 따로 난수로 만들면 유출과 무관하게 움직여
 *    **대조가 뜻을 잃는다.**
 * 2. **어느 항목에 «유사=문제»가 성립하는지 가른다**(`judged`).
 *
 * **`judged: false`가 이 표의 알맹이다.** 회의의 판정은 *처리가 바꾸기로 되어 있는 항목*에만
 * 성립한다 — 수온은 공정이 바꾸려는 값이 아니고, EC는 응집제 투입으로 **오히려 오를 수
 * 있어** 방향이 정해지지 않으며, pH는 중화 목표가 중성이라 **유입이 이미 중성이면 같은 것이
 * 정상**이다. 그 셋을 알람에 넣으면 정상 사업장이 상시로 울려 **진짜 정체가 묻힌다.**
 * 화면은 여덟을 다 보이고 판정만 다섯에 건다.
 *
 * `retention > 1`은 처리가 **올리는** 항목이다 — 폭기가 DO를 올린다.
 */
export const PROVISIONAL_TREATMENT_RETENTION: Record<
  string,
  { retention: number; judged: boolean }
> = {
  TOC: { retention: 0.3, judged: true },
  turbidity: { retention: 0.15, judged: true },
  chromaticity: { retention: 0.3, judged: true },
  NO3N: { retention: 0.55, judged: true },
  DO: { retention: 2.6, judged: true },
  /** 염색·도금 폐수는 알칼리로 들어와 중화를 거친다 — 방향은 있으나 판정 축은 아니다 */
  pH: { retention: 0.8, judged: false },
  /** 응집제가 이온을 더해 오를 수도 줄 수도 있다 — 방향이 정해지지 않아 판정하지 않는다 */
  EC: { retention: 1.05, judged: false },
  /** 체류 중 자연 냉각뿐이다. 공정이 바꾸려는 값이 아니다 */
  temperature: { retention: 0.94, judged: false },
};

/**
 * **몇 %부터 «유입과 거의 같다»인가** `[TBD-59]` `[PROVISIONAL]`.
 *
 * `|유입 − 유출| ÷ 유입`이 이 값 미만이면 유사로 본다. `[TBD-01]`(항목별 알람 임계값)과 같은
 * 종류의 공백이라 현업 기준이 정할 값이고, 확정되면 이 한 줄만 바꾼다.
 *
 * 15%로 잡은 이유: 위 잔존율에서 정상 항목의 차이가 가장 작은 것이 `NO3N`의 45%다.
 * 그 절반보다 낮게 두면 계측 잡음이 경계를 스쳐도 판정이 뒤집히지 않는다.
 */
export const PROVISIONAL_TREATMENT_SIMILAR_PERCENT = 15;

/**
 * **시연에서 처리 정체를 심는 사업장** `[PROVISIONAL]`.
 *
 * 여기 있는 사업장은 잔존율을 1에 가깝게 밀어 유입≈유출이 되고, 그 결과 `처리 상태 확인`
 * 알람이 실제로 뜬다. `PROVISIONAL_DEMO_LIMITS`가 *"넘지 않으면 초과 판정이 시연에서 한 번도
 * 안 보인다"* 로 같은 판단을 이미 했다 — **없는 사건을 만드는 것이 아니라, 만들어 둔 판정이
 * 화면에서 보이게 하는 것**이다.
 *
 * 전 사업장에 심지 않는 이유는 정상과 대비되어야 판정이 읽히기 때문이다.
 *
 * **고른 두 곳이 임의가 아니다.** `SCR-AD-005`는 사업장 전용이라 **시연 계정이 보는 사업장에
 * 심지 않으면 그 화면에서 판정이 한 번도 보이지 않는다** — 처음 `S-03`에 심었다가 브라우저
 * 실측에서 그 사실이 드러났다(사업장 계정은 `S-02`·`S-09`만 연다, `accounts.ts`).
 *
 * | 사업장 | 왜 |
 * |---|---|
 * | `S-02` | 사업장1 계정이 여는 곳 — *"값이 가득한 화면"* 이 그 계정의 목적이라 사건이 하나 더 붙는다 |
 * | `S-07` | 계정이 열지 않는 곳 — **시스템 관리자의 알람 이력·통합 관제**에서 여러 사업장에 걸친 것이 보이게 한다 |
 *
 * **`S-09`에는 심지 않는다.** 사업장2 계정의 목적이 *"이상 14 정상 · 알람 0건 — 빈 상태 처리를
 * 확인한다"* 라, 사건을 심으면 그 계정이 확인하려던 것이 사라지고 **정상과의 대비도 함께 사라진다.**
 */
export const PROVISIONAL_TREATMENT_STALL_SITES: readonly string[] = ['S-02', 'S-07'];

/** 정체를 심은 사업장의 잔존율 — 1에 가까울수록 «처리가 안 됐다»에 가깝다 */
export const PROVISIONAL_TREATMENT_STALL_RETENTION = 0.93;
