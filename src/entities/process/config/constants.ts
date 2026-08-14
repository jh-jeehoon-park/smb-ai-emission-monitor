import type { ProcessStage } from '../model/types';

/**
 * 표준 폐수처리 6단계. **사업장이 달라도 같은 구성을 쓴다**(사용자 결정 2026-08-14).
 * 사업장마다 공정이 조금씩 다르지만 원문·데이터에 단계 구성이 없다(TBD-44).
 *
 * 매일유업 10단계를 쓰지 않는다 — TMS 부착 사업장 기준이라 비TMS 소규모에 맞지 않는다.
 *
 * 계측 등급의 근거:
 * - ① 유입펌프 전류가 실제로 있다(데이터셋 04_… `전류계위치 = 유입펌프`)
 * - ⑥ 다항목 프로브 6종 + 광학 2종. 설치 지점은 원문 미규정이고 데이터셋이 방류구다(TBD-43)
 * - ② 약품주입펌프는 신호 규정만 있고 실증 데이터에 없다(사업계획서 p.59)
 * - ③ 송풍기는 예지보전 대상인데 계측 채널 규정이 아예 없다(TBD-42)
 */
export const PROCESS_STAGES: readonly ProcessStage[] = [
  {
    id: 'intake',
    order: 1,
    name: '유입 및 전처리',
    type: 'physical',
    // 스크린·침사지는 표준 자료, 집수조·유량조정조는 설계값(공정자료 p.4도 전처리로 센다)
    units: ['스크린', '침사지', '집수조', '유량조정조'],
    grade: 'actual',
    measurementNote: '유입펌프 전류 — 가동 여부와 부하를 본다',
    equipmentIds: ['EQ-02'],
  },
  {
    id: 'primary',
    order: 2,
    name: '1차 침전',
    type: 'physical',
    units: ['반응응집조', '1차 침전지'],
    grade: 'estimated',
    // 응집제 투입 지점 근거: 공정자료 p.4·6 (가라앉기 쉽게 뭉쳐 놓고 침전시킨다)
    measurementNote: '약품주입펌프 On/Off·속도·운전시간 — 신호 규정만 있고 실증 데이터는 없다',
    equipmentIds: ['EQ-03'],
  },
  {
    id: 'biological',
    order: 3,
    name: '생물학적 처리',
    type: 'biological',
    units: ['생물반응조(포기조)'],
    grade: 'none',
    measurementNote: '송풍기는 예지보전 대상이나 계측 채널이 원문에 규정되지 않았다',
    equipmentIds: ['EQ-01'],
  },
  {
    id: 'secondary',
    order: 4,
    name: '2차 침전',
    type: 'physical',
    units: ['2차 침전지', '슬러지 반송'],
    grade: 'none',
    measurementNote: '계측하지 않는다 — 물리적 침전이라 제어할 변수가 적다',
    equipmentIds: [],
  },
  {
    id: 'advanced',
    order: 5,
    name: '고도 처리 및 소독',
    type: 'chemical',
    units: ['모래 여과', '염소·UV·오존 소독'],
    grade: 'none',
    measurementNote: '계측하지 않는다',
    equipmentIds: [],
  },
  {
    id: 'discharge',
    order: 6,
    name: '측정 및 방류',
    type: 'monitoring',
    units: ['방류수조', '수질 계측'],
    grade: 'actual',
    measurementNote: '다항목 프로브 6종 + 광학 2종. TN·TP는 여기서 AI가 추정한다',
    equipmentIds: ['EQ-04'],
  },
];

/** 방류 지점에서 직접 재는 것 (사업계획서 p.55) */
export const PROBE_ITEMS = ['pH', 'DO', 'EC', '탁도', '수온', '색도'] as const;
export const OPTICAL_ITEMS = ['TOC', 'NO3-N'] as const;

/** 직접 재지 않고 AI가 채우는 것 (사업계획서 p.44·67) */
export const ESTIMATED_ITEMS = ['T-N', 'T-P'] as const;

/** 법정 방류 기준 점검 대상 5항목 (공정자료 p.5·12) */
export const REGULATED_ITEMS = ['TOC', 'SS', 'T-N', 'T-P', 'pH'] as const;

export const STAGE_QUERY_KEY = 'stage';
export const STAGE_IDS = PROCESS_STAGES.map((s) => s.id);
