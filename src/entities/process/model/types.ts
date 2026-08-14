import type { MeasurementGrade } from '@/shared/config/provisional';

/**
 * 처리 유형. 화학·생물 처리를 결합한 하이브리드 구조가 일반적이다
 * (공정자료 p.6 — 유지방·단백질이 많은 폐수는 미생물만으로 부하가 커 화학응집을 더한다).
 */
export type TreatmentType = 'physical' | 'biological' | 'chemical' | 'monitoring';

export interface ProcessStage {
  /** URL 쿼리에 실린다. 사람이 읽을 수 있는 슬러그 */
  id: string;
  /** 1~6 */
  order: number;
  name: string;
  type: TreatmentType;
  /** 이 단계 안의 조(槽). 표준 자료 + 일부는 설계값 */
  units: string[];
  grade: MeasurementGrade;
  /** 이 단계에서 무엇을 재는가 — 계측이 없으면 빈 문자열이 아니라 왜 없는지 */
  measurementNote: string;
  /**
   * 배치된 설비 ID. **설비 자체는 entities/equipment가 갖는다.**
   * 공정은 배치만 알고, 둘을 잇는 일은 위젯이 한다(FSD §8 — entities 간 직접 import 금지).
   */
  equipmentIds: string[];
}

/** 가동·방류 상태. 실증 데이터의 시간별 0/1 채널에서 온다 */
export interface OperatingState {
  running: boolean;
  discharging: boolean;
  /** 방류가 멈춘 지 몇 시간인가. 방류 중이면 null */
  idleHours: number | null;
  /** `상시가동 간헐방류` 같은 운영 분류 */
  pattern: string;
}
