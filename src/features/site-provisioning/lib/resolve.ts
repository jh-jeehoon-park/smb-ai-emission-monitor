import { WATER_QUALITY_CODES, type MeasurementItemCode } from '@/shared/config/measurement';
import type { ProvisioningBySite } from './storage';

export interface ResolvedInstruments {
  /** 그 사업장이 보유한 항목 — 화면이 값을 그린다 */
  held: MeasurementItemCode[];
  /** 장비가 없는 항목 — 화면이 자리를 지킨 채 「미설치」라 적는다 */
  absent: MeasurementItemCode[];
  /** 사용자가 한 번이라도 설정했는가. 화면이 출처를 다르게 적는 데 쓴다 */
  isUserSet: boolean;
  /** 그 항목이 이 사업장에 있는가 — 위젯이 항목마다 묻는다 */
  has: (code: MeasurementItemCode) => boolean;
}

/**
 * 저장된 구성을 **수질 8종 위에 얹는다.**
 *
 * **설정이 없으면 전부 보유다.** 비어 있는 것을 «아무것도 없다»로 읽으면 처음 들어온 사업장의
 * 계측 격자가 통째로 「미설치」가 된다 — `resolveProcess`가 표준 5단계를 기본으로 두는 것과
 * 같은 이유다. 덜어내는 방향이지 채우는 방향이 아니다.
 *
 * **8종을 줄이지 않는다** `[사용자 결정 2026-09-28]`. 보유 여부는 **사업장 축**이고 항목 집합은
 * 전 화면 공통이다(`WATER_QUALITY_CODES`) — 집합 자체를 사업장마다 바꾸면 화면 넷의 격자가
 * 사업장마다 달라지고, 그때 «없는 항목»과 «안 그리는 항목»을 화면이 구분할 수 없게 된다.
 *
 * **순수 함수다.** localStorage도 React도 모른다 — 그래야 테스트가 쉽고 서버에서도 돈다.
 */
export function resolveInstruments(
  settings: ProvisioningBySite | null,
  siteId: string,
): ResolvedInstruments {
  const setting = settings?.[siteId]?.instruments;

  /* 저장값에 모르는 코드가 섞여 들어와도 8종 밖은 세지 않는다 — 파싱이 한 번 걸렀고 여기가 두 번째다 */
  const absentSet = new Set(
    (setting?.absentCodes ?? []).filter((code) => WATER_QUALITY_CODES.includes(code)),
  );

  const held: MeasurementItemCode[] = [];
  const absent: MeasurementItemCode[] = [];
  for (const code of WATER_QUALITY_CODES) {
    if (absentSet.has(code)) absent.push(code);
    else held.push(code);
  }

  return {
    held,
    absent,
    isUserSet: setting !== undefined,
    has: (code) => !absentSet.has(code),
  };
}

export interface ResolvedMetering {
  /** 전력을 계측하는 설비의 id */
  ids: readonly string[];
  /** 사용자가 한 번이라도 정했는가 — 「아직 고르지 않았다」와 「전부 껐다」를 가른다 */
  isUserSet: boolean;
  /** 그 설비가 전력 계측 대상인가 */
  isMetered: (equipmentId: string) => boolean;
}

/**
 * 어느 설비의 **전력을 재는가** `[사용자 요청 2026-09-21]` `[TBD-42]`.
 *
 * **기본값은 «아무것도 고르지 않았다»이다.** 현장조사에서 다섯 곳 모두 기존 전력량계가 통신
 * 불가이거나 미확인이었고, 대상 선정이 우리 몫으로 남았다 — 기본으로 전부 켜 두면 **이미
 * 정해진 것처럼** 보이고, 그것이 곧 설치 범위·비용이라 지어내면 안 된다(**X2**).
 *
 * 계측 항목(`resolveInstruments`)이 «전부 보유»에서 덜어내는 방향인 것과 **반대다** — 그쪽은
 * 장비가 이미 달려 있고 빠진 것이 소수이지만, 이쪽은 아직 아무것도 달지 않았다.
 *
 * **순수 함수다.** localStorage도 React도 모른다.
 */
export function resolveMetering(
  settings: ProvisioningBySite | null,
  siteId: string,
): ResolvedMetering {
  const ids = settings?.[siteId]?.meteredEquipmentIds;
  const set = new Set(ids ?? []);

  return {
    ids: ids ?? [],
    isUserSet: ids !== undefined,
    isMetered: (equipmentId) => set.has(equipmentId),
  };
}
