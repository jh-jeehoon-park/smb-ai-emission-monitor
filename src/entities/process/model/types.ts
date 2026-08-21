import type { MeasurementItemCode } from '@/shared/config/measurement';
import type { MeasurementGrade } from '@/shared/config/provisional';

/**
 * 처리 유형. 화학·생물 처리를 결합한 하이브리드 구조가 일반적이다
 * (공정자료 p.6 — 유지방·단백질이 많은 폐수는 미생물만으로 부하가 커 화학응집을 더한다).
 */
export type TreatmentType = 'physical' | 'biological' | 'chemical' | 'monitoring';

export interface ProcessStage {
  /** URL 쿼리에 실린다. 사람이 읽을 수 있는 슬러그 */
  id: string;
  /** 표준 5단계는 1~5. 플러스 알파 단계는 그 뒤로 이어진다 */
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
  /**
   * 표준 5단계 밖의 **플러스 알파**인가 `[회의 2026-08-20]`.
   *
   * 사업장마다 공정이 달라 최대 공정을 두고 필요한 단계만 켠다. 표준 단계도 끌 수 있지만
   * 이 표시가 있어야 설정 화면이 **왜 그 단계가 목록에 있는지**를 구분해 적을 수 있다 —
   * 표준은 "보통 있는 것", 플러스 알파는 "있으면 켜는 것"이다.
   */
  optional: boolean;
  /**
   * 이 단계에서 **기본으로 재는 항목**.
   *
   * 회의가 공정별 모니터링을 요구하며 예시를 함께 줬다 `[회의 2026-08-20: 유입에 들어올 때
   * 유량하고 이러한 센서가 있을텐데 … 1차 침전에는 TOC 얼마 얼마]`. 그 예시와 이미 근거가
   * 있는 계측 지점(유입펌프 전류·방류구 프로브)을 기본값으로 둔다.
   *
   * **비어 있는 단계는 근거가 없는 단계다.** 지어내지 않고 빈 채로 두면 화면이 그 사실을
   * 적는다 — 사용자가 설정에서 더할 수 있다(`[TBD-53]`).
   */
  defaultCodes: MeasurementItemCode[];
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
