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

export const EQUIPMENT_CODES: MeasurementItemCode[] = ['current', 'power', 'flow'];

/** 수집 주기 1~10분 (사업계획서 p.30·p.48). 프로토타입 시뮬레이션은 5분 간격을 쓴다. */
export const COLLECTION_INTERVAL_MINUTES = 5;

/** 예측 지평 1~6시간 (사업계획서 p.32·p.65) */
export const FORECAST_HORIZON_HOURS = 6;

/** 학습·조회 축적 구간 24~72시간 (사업계획서 p.65) */
export const HISTORY_WINDOW_HOURS = 24;
