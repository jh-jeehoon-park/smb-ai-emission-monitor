import type { StatusLevel } from '@/shared/config/provisional';

export interface Equipment {
  id: string;
  name: string;
  /** 고장 확률 0~100% (사업계획서 p.66) */
  failureProbability: number;
  /** 잔여 수명 RUL. 원문에 단위가 없어 일 단위로 표기한다 */
  remainingUsefulLifeDays: number;
  /**
   * 설비 유지보수 우선순위 지수. 산정식·값 범위·단위가 원문에 없다(TBD-22).
   * 여기서는 0~100 상대 지수로만 표시하고 산식은 세우지 않는다.
   */
  maintenancePriorityIndex: number;
  status: StatusLevel;
  runtimeHours: number;
}
