import {
  PROVISIONAL_DECIMALS,
  PROVISIONAL_LEVEL_RANGE,
  PROVISIONAL_LEVEL_UNIT,
} from './provisional';

export type MeasurementCategory = 'water' | 'equipment' | 'estimated';

export type MeasurementItemCode =
  | 'pH'
  | 'EC'
  | 'turbidity'
  | 'DO'
  | 'temperature'
  | 'chromaticity'
  | 'NO3N'
  | 'TOC'
  | 'current'
  | 'power'
  | 'flow'
  | 'inflow'
  | 'level'
  | 'vibration'
  | 'TN'
  | 'TP';

export interface MeasurementItem {
  code: MeasurementItemCode;
  /** 화면 표기 라벨 */
  label: string;
  /** 원문 기호 표기 (없으면 라벨과 동일) */
  symbol: string;
  unit: string;
  /**
   * 단위를 한글로 풀어 쓴 것 `[회의 피드백 2026-08-24]`.
   *
   * `NTU`·`Pt-Co`·`μS/cm`처럼 기호만으로는 무엇의 단위인지 알 수 없는 것이 있다. 단위가
   * 없는 항목(pH·진동)은 **빈 문자열이 아니라 그 사실을 적는다** — 빈 칸으로 두면 값을
   * 못 받은 것으로 읽힌다.
   *
   * **기호를 대체하지 않고 병기한다.** 계측 사양의 표기는 원문 값이므로(`[원문 p.55]`)
   * 화면에서 바꾸지 않고, 한글을 옆에 덧붙인다.
   */
  unitKo: string;
  /** 센서 사양 측정 범위 */
  range: [number, number];
  /** 센서 정확도 (원문 표기 그대로) */
  accuracy: string;
  category: MeasurementCategory;
  decimals: number;
}

/**
 * 계측 항목의 단위·측정 범위·정확도는 사업계획서 p.55(수질 8종·설비 3종) 기준이다.
 * 표시 소수 자릿수만 원문에 없어 PROVISIONAL_DECIMALS에서 가져온다.
 */
export const MEASUREMENT_ITEMS: Record<MeasurementItemCode, MeasurementItem> = {
  pH: {
    code: 'pH',
    label: '수소이온농도',
    symbol: 'pH',
    unit: '',
    unitKo: '무차원 (0~14)',
    range: [0, 14],
    accuracy: '±0.1',
    category: 'water',
    decimals: PROVISIONAL_DECIMALS.pH,
  },
  EC: {
    code: 'EC',
    label: '전기전도도',
    symbol: 'EC',
    // 계측 사양(p.55)은 μS/cm, H/W 성능지표(p.35)는 mS/cm로 어긋난다. 계측 사양을 따랐다.
    unit: 'μS/cm',
    unitKo: '마이크로지멘스/센티미터',
    range: [0, 20000],
    accuracy: '±2%',
    category: 'water',
    decimals: PROVISIONAL_DECIMALS.EC,
  },
  turbidity: {
    code: 'turbidity',
    label: '탁도',
    symbol: 'Turb',
    unit: 'NTU',
    unitKo: '탁도 단위',
    range: [0, 4000],
    accuracy: '±5%',
    category: 'water',
    decimals: PROVISIONAL_DECIMALS.turbidity,
  },
  DO: {
    code: 'DO',
    label: '용존산소',
    symbol: 'DO',
    unit: 'mg/L',
    unitKo: '밀리그램/리터',
    range: [0, 20],
    accuracy: '±0.2 mg/L',
    category: 'water',
    decimals: PROVISIONAL_DECIMALS.DO,
  },
  temperature: {
    code: 'temperature',
    label: '수온',
    symbol: 'Temp',
    unit: '℃',
    unitKo: '섭씨온도',
    range: [0, 50],
    accuracy: '±0.5℃',
    category: 'water',
    decimals: PROVISIONAL_DECIMALS.temperature,
  },
  chromaticity: {
    code: 'chromaticity',
    label: '색도',
    symbol: 'Color',
    unit: 'Pt-Co',
    unitKo: '백금-코발트 색도 단위',
    range: [0, 500],
    accuracy: '±10 Pt-Co',
    category: 'water',
    decimals: PROVISIONAL_DECIMALS.chromaticity,
  },
  NO3N: {
    code: 'NO3N',
    label: '질산성질소',
    symbol: 'NO₃-N',
    unit: 'mg/L',
    unitKo: '밀리그램/리터',
    range: [0, 100],
    accuracy: '±5%',
    category: 'water',
    decimals: PROVISIONAL_DECIMALS.NO3N,
  },
  TOC: {
    code: 'TOC',
    label: '총유기탄소',
    symbol: 'TOC',
    unit: 'mg/L',
    unitKo: '밀리그램/리터',
    range: [0, 500],
    accuracy: '±10%',
    category: 'water',
    decimals: PROVISIONAL_DECIMALS.TOC,
  },
  current: {
    code: 'current',
    label: '전류',
    symbol: 'I',
    unit: 'A',
    unitKo: '암페어',
    range: [0, 500],
    accuracy: '±1%',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.current,
  },
  power: {
    code: 'power',
    label: '전력',
    symbol: 'P',
    unit: 'kW',
    unitKo: '킬로와트',
    range: [0, 100],
    accuracy: '±1%',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.power,
  },
  /**
   * **`flow`는 유출(방류) 유량이다** `[사용자 결정 2026-08-25]`.
   *
   * 한때 이 계열 하나를 화면 세 곳이 유입으로도 방류로도 불렀다 — 같은 숫자일 수 없으므로
   * 한쪽은 틀린 주장이었다. 방류로 확정하고 유입은 `inflow`가 따로 갖는다.
   *
   * 라벨을 `유량` → `유출 유량`으로 올린 이유가 이것이다. 이름이 중립이면 같은 혼동이
   * 되풀이된다.
   */
  flow: {
    code: 'flow',
    label: '유출 유량',
    symbol: 'Qout',
    unit: 'm³/day',
    unitKo: '세제곱미터/일',
    range: [0, 1000],
    accuracy: '±2%',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.flow,
  },
  /**
   * 유입 유량 — **PM 요청으로 화면에 낸다** `[PM 의견 2026-08-25]` `[사용자 결정 2026-08-25]`.
   *
   * 원문 계측 사양에는 유량이 한 종뿐이라(`[원문 p.55]`) 이 항목은 원문 근거가 없다. 그런데
   * 들어온 양과 나간 양을 함께 보지 못하면 **그 차이**를 볼 수 없고, 그 차이가 곧 방류 의심의
   * 단서다(`[TBD-46]`). 도메인 전문가가 필요하다고 짚은 값이라 시연에 싣는다.
   *
   * **단위는 `flow`와 같은 `m³/day`로 맞춘다** — 나란히 두고 빼는 값이라 단위가 갈리면
   * 그 차이가 뜻을 잃는다. 실제 계측 단위는 아직 갈려 있다(적산 · ㎥/h · m³/day, `[TBD-52]`).
   */
  inflow: {
    code: 'inflow',
    label: '유입 유량',
    symbol: 'Qin',
    unit: 'm³/day',
    unitKo: '세제곱미터/일',
    range: [0, 1000],
    accuracy: '원문 미규정 [TBD-52]',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.inflow,
  },
  /**
   * 진동 — **설비 이상 탐지의 주 입력** `[회의 2026-08-20]`.
   *
   * 고장 확률·잔여 수명을 내는 예지보전은 어렵고, 현실적으로 가능한 것은 진동 센서로
   * 이상을 탐지해 알리는 것과 가동 상태 확인이라는 판단이다(`[INC-107]`).
   *
   * **사양이 없다** `[TBD-49]`. 계측 사양표(p.55)에는 전류·전력·유량 3종만 있고 진동이 없다 —
   * 목표시스템 그림과 출력 화면 예시에만 나온다(`[원문 발표 p.11·18 그림]`, `[INC-96]`).
   * 단위·범위를 지어내지 않고 비워 둔다. 화면은 **이상 여부만** 보이고 값은 내지 않는다.
   */
  vibration: {
    code: 'vibration',
    label: '진동',
    symbol: 'Vib',
    unit: '',
    unitKo: '무차원 (신호 여부만)',
    range: [0, 0],
    accuracy: '원문 미규정',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.vibration,
  },
  /**
   * 방류 수조 수위 — **원문의 `배출 데이터` 3종 중 하나** `[원문 p.1]`.
   *
   * 그 대분류는 `유량 · 수위 · 방류 여부`이고 활용 목적이 *"배출량 및 부하량 산정 기반
   * 데이터"* 다. 셋 중 유량·방류 여부는 이미 화면에 있었고 **수위만 없었다**
   * `[사용자 요청 2026-08-28]`.
   *
   * **단위·범위는 원문에 없다** `[TBD-57]` — `provisional.ts`가 시연값을 갖고 여기서 읽어
   * 온다. `vibration`과 달리 **값을 낸다**: 방류 수조가 차고 비는 것을 보는 화면이라
   * 이상 여부만으로는 답이 되지 않는다.
   *
   * `category`는 `equipment`다 — 원문 대분류로는 `배출 데이터`이지만 코드의 세 분류에 그
   * 칸이 없고, 같은 대분류의 `flow`가 이미 `equipment`에 있다. 분류를 늘리기보다 **이웃과
   * 같은 자리**에 둔다(그 어긋남은 `items.md`가 적는다).
   */
  level: {
    code: 'level',
    label: '방류 수조 수위',
    symbol: 'LT',
    unit: PROVISIONAL_LEVEL_UNIT,
    unitKo: '미터',
    range: PROVISIONAL_LEVEL_RANGE,
    accuracy: '원문 미규정 [TBD-57]',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.level,
  },
  // TN·TP는 직접 계측 센서 사양이 원문에 없다. AI 추정(Soft Sensing) 대상이다(발표자료 p.17).
  TN: {
    code: 'TN',
    label: '총질소',
    symbol: 'TN',
    unit: 'mg/L',
    unitKo: '밀리그램/리터',
    range: [0, 100],
    accuracy: 'AI 추정',
    category: 'estimated',
    decimals: PROVISIONAL_DECIMALS.TN,
  },
  TP: {
    code: 'TP',
    label: '총인',
    symbol: 'TP',
    unit: 'mg/L',
    unitKo: '밀리그램/리터',
    range: [0, 20],
    accuracy: 'AI 추정',
    category: 'estimated',
    decimals: PROVISIONAL_DECIMALS.TP,
  },
};

export const WATER_QUALITY_CODES: MeasurementItemCode[] = [
  'pH',
  'EC',
  'turbidity',
  'DO',
  'temperature',
  'chromaticity',
  'NO3N',
  'TOC',
];

/**
 * 설비 계열 3종. **진동을 넣지 않는다.**
 *
 * 이 배열은 *시계열로 그릴 수 있는* 설비 채널이다. 진동은 단위·범위가 없어(`[TBD-49]`)
 * y축을 세울 수 없고, 지금 화면이 쓰는 것은 값이 아니라 **이상 여부**다. 넣으면 시계열
 * 화면이 빈 계열을 하나 더 그린다 — 없는 데이터를 있는 것처럼 보이게 된다.
 */
export const EQUIPMENT_CODES: MeasurementItemCode[] = ['current', 'power', 'flow'];

/**
 * 수집 주기 **5분**.
 *
 * 처음에는 임시값이었다 — 원문 텍스트가 "1~10분(설정 가능)"까지만 적어(p.30·48) 그 범위에서
 * 골랐다. **판독 결과 `[원문 발표 p.7 그림]`이 본 과제의 측정 주기를 `5분 단위 + AI 추론`으로
 * 명시한다**(수동 자가측정 `월·분기 1회` · 수질TMS `5분 단위 자동 송신`과 나란히 비교하는 표).
 * 값은 그대로지만 **근거가 임시값에서 원문으로 바뀌었다.**
 */
export const COLLECTION_INTERVAL_MINUTES = 5;

/** 예측 지평 1~6시간 (사업계획서 p.32·p.65) */
export const FORECAST_HORIZON_HOURS = 6;

/** 학습·조회 축적 구간 24~72시간 (사업계획서 p.65) */
export const HISTORY_WINDOW_HOURS = 24;
