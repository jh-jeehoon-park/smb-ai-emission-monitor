/**
 * 서버 응답 원형. **접속 계층 밖으로 내보내지 않는다**(명세 §7.2).
 *
 * 컴포넌트가 이 모양을 알기 시작하면 문자열 `value`·유령 표본·격자 어긋남을 다루는 코드가
 * 전 화면에 퍼져, 나중에 백엔드를 경유할 때 전면 수정이 된다.
 */
export interface TbTsValue {
  ts: number;
  /** `useStrictDataTypes=true`면 숫자로 오지만 §4.7 일괄 조회는 그 옵션이 없다 */
  value: string | number | boolean | null;
}

export type TbTimeseries = Record<string, TbTsValue[]>;

export interface TbDevice {
  name: string;
  label: string;
  id: { entityType: string; id: string };
}

export interface TbDevicePage {
  totalElements: number;
  hasNext: boolean;
  data: TbDevice[];
}

/** §4.7 일괄 조회의 한 행. `value`가 **전부 문자열**이다 — `active`도 `"true"`로 온다 */
export interface TbEntityRow {
  entityId: { entityType: string; id: string };
  latest: {
    ENTITY_FIELD?: Record<string, TbTsValue>;
    TIME_SERIES?: Record<string, TbTsValue>;
    ATTRIBUTE?: Record<string, TbTsValue>;
  };
}

export interface TbEntityQueryResult {
  totalElements: number;
  data: TbEntityRow[];
}

/** §4.5 통신 상태. 배열이라 `key`로 찾아야 한다 */
export interface TbAttribute {
  key: string;
  value: string | number | boolean;
  lastUpdateTs: number;
}
