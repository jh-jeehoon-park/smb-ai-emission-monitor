import type { DischargeScale, RegionGrade } from '@/shared/config/discharge-limits';
import type { Industry } from '@/shared/config/demo-scenario';
import type { StatusLevel } from '@/shared/config/provisional';

export type { Industry };

export interface Site {
  id: string;
  name: string;
  industry: Industry;
  region: string;
  /** 표시용 주소. 원문에 실증지 주소가 없어 시·군까지만 둔 시연 값이다 */
  address: string;
  /** 소속 시도. 지도에서 어느 시도를 강조할지 정한다 */
  province: string;
  /**
   * 소속 시·군·구. 기초지자체의 관할 범위가 이 값으로 갈린다.
   *
   * **`region`을 잘라 쓰지 않는 이유**는 `demo-scenario.ts`의 같은 필드 주석에 있다 —
   * 지금 데이터에 실제로 걸리는 함정이 둘이다.
   */
  municipality: string;
  /** 위 주소에 대응하는 좌표. 지도 핀 위치의 근거다 */
  coordinates: [lat: number, lng: number];
  /**
   * 배출허용기준을 고르는 두 축 `[공정자료 p.11]`. **둘 중 하나라도 `null`이면 기준표를
   * 고를 수 없다** — 화면은 그 사실을 감추지 않고 `미확인`으로 적는다.
   */
  regionGrade: RegionGrade | null;
  dischargeScale: DischargeScale | null;
  /** 이상 점수 0~100 (사업계획서 p.64). 통신 두절이면 산출값이 없다 */
  anomalyScore: number | null;
  status: StatusLevel | null;
  /** ECP 통신 상태. 두절 시 계측 결측이 발생한다 */
  online: boolean;
  lastSyncIso: string;
  /** 최근 추이 스파크라인용 이상 점수 표본 */
  spark: (number | null)[];
  /** 데이터 처리율 목표 ≥98% (사업계획서 p.3) */
  dataThroughput: number;
  /** 시스템 가동률 목표 ≥95% (사업계획서 p.119) */
  uptime: number;
}
