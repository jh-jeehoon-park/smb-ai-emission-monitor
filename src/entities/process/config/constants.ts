import { WATER_QUALITY_CODES } from '@/shared/config/measurement';
import type { ProcessStage } from '../model/types';

/**
 * **표준 폐수처리 5단계** `[회의 2026-08-20]`.
 *
 * 회의가 표준 공정을 이렇게 정리했다 — "유입 및 전처리(스크린 거침) · 1차 침전 ·
 * 생물학적 처리 · 2차 침전 · 고도 처리 및 소독하고 방류". **방류는 마지막 단계의 끝이지
 * 별도 단계가 아니다** — 예전 6단계의 `측정 및 방류`를 5단계 안으로 합쳤다(`[INC-110]`).
 *
 * 매일유업 10단계를 쓰지 않는다 — TMS 부착 사업장 기준이라 비TMS 소규모에 맞지 않는다.
 *
 * **사업장마다 공정이 다르다.** 회의가 방식을 정했다 — 최대 공정을 두고 필요한 단계만
 * 활성화한다(`[TBD-44 판정]`). 여기 있는 것이 그 **최대 목록**이고, 무엇을 켤지는
 * `features/process-settings`가 사업장별로 갖는다.
 *
 * **단계마다 기본 계측 항목을 둔다** `[회의 2026-08-20]`. 회의가 공정별 모니터링을
 * 요구하며 예시를 함께 줬다 — 유입에 유량, 1차 침전에 TOC. 근거가 없는 단계는 비워 두고
 * 사용자가 설정에서 더한다(`[TBD-53]`).
 *
 * 계측 등급의 근거:
 * - ① 유입펌프 전류가 실제로 있다(데이터셋 04_… `전류계위치 = 유입펌프`)
 * - ⑤ 다항목 프로브 6종 + 광학 2종. 데이터셋이 방류구다 `[TBD-43]`
 * - ② 약품주입펌프는 신호 규정만 있고 실증 데이터에 없다(사업계획서 p.59)
 * - ③ 송풍기는 계측 채널 규정이 아예 없다 `[TBD-42]`
 */
export const PROCESS_STAGES: readonly ProcessStage[] = [
  {
    id: 'intake',
    order: 1,
    name: '유입 및 전처리',
    type: 'physical',
    // 스크린은 회의가 명시했다. 침사지·집수조·유량조정조는 표준 자료 + 설계값
    units: ['스크린', '침사지', '집수조', '유량조정조'],
    grade: 'actual',
    measurementNote: '유입 유량과 유입펌프 전류 — 들어오는 양과 펌프 부하를 본다',
    equipmentIds: ['EQ-02'],
    optional: false,
    /* 유량은 회의 예시 `[회의 2026-08-20]`, 전류는 데이터셋 `전류계위치 = 유입펌프` */
    defaultCodes: ['flow', 'current'],
  },
  {
    id: 'primary',
    order: 2,
    name: '1차 침전',
    type: 'physical',
    units: ['반응응집조', '1차 침전지'],
    grade: 'estimated',
    // 응집제 투입 지점 근거: 공정자료 p.4·6 (가라앉기 쉽게 뭉쳐 놓고 침전시킨다)
    measurementNote: 'TOC — 응집 뒤 유기물이 얼마나 떨어졌는지 본다. 약품주입펌프 신호는 실증 데이터가 없다',
    equipmentIds: ['EQ-03'],
    optional: false,
    /* 회의가 이 단계의 예시로 TOC를 들었다 `[회의 2026-08-20: 1차 침전에는 TOC 얼마 얼마]` */
    defaultCodes: ['TOC'],
  },
  {
    id: 'biological',
    order: 3,
    name: '생물학적 처리',
    type: 'biological',
    units: ['생물반응조(포기조)'],
    grade: 'none',
    measurementNote: '송풍기는 이상 탐지 대상이나 계측 채널이 원문에 규정되지 않았다',
    equipmentIds: ['EQ-01'],
    optional: false,
    /* **비운다.** 송풍기 계측 채널이 원문에 없고 `[TBD-42]` 회의도 이 단계를 예시로 들지 않았다 */
    defaultCodes: [],
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
    optional: false,
    defaultCodes: [],
  },
  {
    /**
     * 방류까지 이 단계에 든다 `[회의 2026-08-20]`. 방류구 프로브가 이 단계의 계측 지점이다 —
     * 예전에는 `측정 및 방류`를 따로 뒀는데 회의가 5단계로 정리했다(`[INC-110]`).
     */
    id: 'advanced',
    order: 5,
    name: '고도 처리 및 소독 · 방류',
    type: 'monitoring',
    units: ['모래 여과', '염소·UV·오존 소독', '방류수조'],
    grade: 'actual',
    measurementNote: '방류구 프로브 6종 + 광학 2종 + 방류 유량. TN·TP는 여기서 AI가 추정한다',
    equipmentIds: ['EQ-04'],
    optional: false,
    /*
     * 방류구가 계측 지점이라는 것은 데이터셋 근거다 `[TBD-43]`. 항목은 계측 사양의
     * 수질 8종 `[원문 p.55]` + 방류 유량이다 — 목록을 손으로 적지 않고 상수에서 가져온다(E1).
     */
    defaultCodes: [...WATER_QUALITY_CODES, 'flow'],
  },
];

/**
 * 표준 5단계 밖의 **플러스 알파** 단계.
 *
 * 회의가 "표준적인 공정이 있고 플러스 알파가 될 텐데"라고만 말했고 **그 목록은 주지 않았다**
 * `[TBD-53]`. 지어내면 없는 공정을 화면에 만드는 것이라 **비워 둔다** — 목록이 오면 여기에
 * 넣고, 활성/비활성 장치는 이미 돌아간다.
 */
export const OPTIONAL_PROCESS_STAGES: readonly ProcessStage[] = [];

/** 최대 공정 = 표준 + 플러스 알파. 설정 화면이 이 목록에서 켤 것을 고른다 */
export const ALL_PROCESS_STAGES: readonly ProcessStage[] = [
  ...PROCESS_STAGES,
  ...OPTIONAL_PROCESS_STAGES,
];

/** 방류 지점에서 직접 재는 것 (사업계획서 p.55) */
export const PROBE_ITEMS = ['pH', 'DO', 'EC', '탁도', '수온', '색도'] as const;
export const OPTICAL_ITEMS = ['TOC', 'NO3-N'] as const;

/** 직접 재지 않고 AI가 채우는 것 (사업계획서 p.44·67) */
export const ESTIMATED_ITEMS = ['T-N', 'T-P'] as const;

/** 법정 방류 기준 점검 대상 5항목 (공정자료 p.5·12) */
export const REGULATED_ITEMS = ['TOC', 'SS', 'T-N', 'T-P', 'pH'] as const;

export const STAGE_QUERY_KEY = 'stage';
export const STAGE_IDS = ALL_PROCESS_STAGES.map((s) => s.id);
