import type { TreatmentType } from '../model/types';

/**
 * **단위공정 목록** — 공정을 추가할 때 고르는 후보 `[사용자 요청 2026-09-29: 공정 추가·삭제]`.
 *
 * `[TBD-53]`이 «플러스 알파 공정 목록을 회의가 주지 않았다»로 비워 둔 자리다. 지금은 근거가
 * 생겼다 — 실증 1차 5개소 현장조사가 공정 흐름을 적었다(`docs/analysis/demonstration-sites.md`
 * §4). **거기에 실제로 나온 이름만** 넣고, 항목마다 어느 사업장에서 나왔는지를 적는다.
 * 지어낸 공정이 목록에 있으면 화면이 없는 공정을 권한다.
 *
 * **목록 밖은 직접 입력한다** `[사용자 결정 2026-09-29: ECP로 들어오는 데이터와 공정을 매핑해야
 * 하므로 직접 입력이 필요]`. 이 목록은 편의이지 한계가 아니다.
 *
 * **처리 유형은 우리 판단이다** `[설계]` — 공정도의 색·아이콘과 «이 단계가 무엇을 바꾸는 곳인가»를
 * 정한다. 원문·현장조사는 유형을 적지 않았고, 사용자가 추가할 때 바꿀 수 있다.
 */
export interface UnitProcess {
  id: string;
  name: string;
  type: TreatmentType;
  /** 어느 현장조사 흐름에 나왔는가 — 사업장 이름 */
  seenAt: readonly string[];
}

export const UNIT_PROCESS_CATALOG: readonly UnitProcess[] = [
  { id: 'screen', name: '스크린', type: 'physical', seenAt: ['진선식품'] },
  { id: 'collection', name: '집수조', type: 'physical', seenAt: ['진선식품', '대호특수강'] },
  { id: 'equalization', name: '유량조정조', type: 'physical', seenAt: ['진선식품', '대호특수강'] },
  { id: 'ph-adjust', name: 'pH 조정조', type: 'chemical', seenAt: ['대호특수강'] },
  { id: 'coagulation', name: '반응·응집조', type: 'chemical', seenAt: ['대호특수강'] },
  { id: 'flotation', name: '부상조', type: 'physical', seenAt: ['에버'] },
  { id: 'chemical', name: '화학적 처리', type: 'chemical', seenAt: ['에버', '㈜배상면주가'] },
  { id: 'anaerobic', name: '혐기조', type: 'biological', seenAt: ['진선식품'] },
  { id: 'anoxic', name: '무산소조', type: 'biological', seenAt: ['진선식품', '대호특수강'] },
  { id: 'aeration', name: '폭기조', type: 'biological', seenAt: ['진선식품', '대호특수강'] },
  { id: 'primary-settling', name: '1차 침전지', type: 'physical', seenAt: ['대호특수강'] },
  /* 진선식품은 «폭기 → 침전»으로만 적었다 — 몇 차인지 모르므로 따로 둔다 */
  { id: 'settling', name: '침전조', type: 'physical', seenAt: ['진선식품'] },
  { id: 'secondary-settling', name: '2차 침전지', type: 'physical', seenAt: ['대호특수강'] },
  { id: 'treated-tank', name: '처리수조', type: 'physical', seenAt: ['대호특수강'] },
  { id: 'sand-filter', name: '모래여과', type: 'physical', seenAt: ['대호특수강'] },
  { id: 'membrane', name: '막여과', type: 'physical', seenAt: ['칠갑농산'] },
  { id: 'filtration', name: '여과·방류', type: 'physical', seenAt: ['진선식품'] },
  { id: 'parshall', name: '파샬플룸', type: 'monitoring', seenAt: ['대호특수강'] },
  { id: 'discharge', name: '방류', type: 'monitoring', seenAt: ['진선식품', '대호특수강'] },
];

/** 처리 유형 — 공정을 직접 입력할 때 고른다. 순서가 곧 선택지 순서다 */
export const TREATMENT_TYPES: readonly TreatmentType[] = [
  'physical',
  'chemical',
  'biological',
  'monitoring',
];

export const TREATMENT_TYPE_LABELS: Record<TreatmentType, string> = {
  physical: '물리',
  chemical: '화학',
  biological: '생물',
  monitoring: '측정',
};
