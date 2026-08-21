import { PROVISIONAL_DECIMALS } from './provisional';

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
    range: [0, 100],
    accuracy: '±1%',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.power,
  },
  flow: {
    code: 'flow',
    label: '유량',
    symbol: 'Q',
    unit: 'm³/day',
    range: [0, 1000],
    accuracy: '±2%',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.flow,
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
    range: [0, 0],
    accuracy: '원문 미규정',
    category: 'equipment',
    decimals: PROVISIONAL_DECIMALS.vibration,
  },
  // TN·TP는 직접 계측 센서 사양이 원문에 없다. AI 추정(Soft Sensing) 대상이다(발표자료 p.17).
  TN: {
    code: 'TN',
    label: '총질소',
    symbol: 'TN',
    unit: 'mg/L',
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
