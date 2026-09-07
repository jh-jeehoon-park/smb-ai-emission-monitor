import type { TbFailure } from '@/shared/api/thingsboard';
import { COLLECTION_INTERVAL_MINUTES, HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import type { SeriesCode, TelemetryStatus } from '../model/types';

/**
 * 원천을 적는 문구. **한 곳에 모은다** — 화면마다 다르게 적으면 같은 상태가 다른 말로 보인다.
 *
 * `수신 확인 중`과 `서버 미연결`을 가르는 것이 요점이다. 기존 어휘(`—`·`수신 없음`)를 여기
 * 쓰지 않는다 — 그쪽은 **확인된 부재**를 뜻하고, 아직 안 온 것에 같은 말을 쓰면 모름을 사실
 * 주장으로 둔갑시킨다(E4).
 *
 * **«진짜냐»가 아니라 «어디서 오느냐»로 가른다** `[사용자 결정 2026-09-01]`.
 *
 * 한때 서버 쪽을 `실측 수신 중`, 폴백을 `시연 데이터`라 적었다 — 그 대비가 거짓이었다.
 * **계측 서버로 들어오는 값도 센서에서 온 것이 아니다**: 주관사에게 받은 자료를 참고해 만든
 * **에뮬레이터 출력**이다 `[사용자 확인 2026-09-01]`. 둘 다 생성값인데 한쪽만 «시연»이라
 * 적으면 보는 사람이 다른 쪽을 관측으로 읽는다 — 결측을 0으로 그리지 않는 것과 같은 종류의
 * 거짓말이다(**E3**·**E4**).
 *
 * 그래서 두 문구가 각자 **출처만** 말한다: 계측 서버에서 왔는가, 앱에 내장된 값인가.
 */
export const TELEMETRY_STATUS_LABELS: Record<TelemetryStatus, string> = {
  pending: '수신 확인 중',
  live: '계측 서버 수신 중',
  fallback: '내장 데이터 · 서버 미연결',
};

/**
 * **접속 정보를 두지 않은 것은 실패가 아니다.** 그 상태를 `서버 미연결`이라 적으면 전 화면에
 * 경고가 상시로 떠 정작 진짜 두절일 때 눈에 띄지 않는다.
 *
 * (한때 근거를 *"계측 서버는 사설망에 있어 배포본과 사외에서는 애초에 닿지 않는다"* 로 적었다 —
 * 공인 IP 포트포워딩으로 그 전제는 깨졌고, 접속 정보를 비워 둘 수 있다는 사실만 남았다.)
 */
export function telemetrySourceLabel(
  status: TelemetryStatus,
  failure: TbFailure | null,
): string {
  if (status === 'fallback' && failure === 'unconfigured') return '내장 데이터';
  return TELEMETRY_STATUS_LABELS[status];
}

/**
 * 시계열이 실제로 존재하는 항목만. TN·TP는 센서가 없어 계측 시계열이 없고
 * AI 추정(Soft Sensing) 대상이라 예측 화면에서 다룬다.
 */
export const WATER_SERIES_CODES: SeriesCode[] = [
  'pH',
  'DO',
  'EC',
  'turbidity',
  'TOC',
  'NO3N',
  'temperature',
  'chromaticity',
];

export const EQUIPMENT_SERIES_CODES: SeriesCode[] = ['current', 'power', 'inflow', 'flow'];

/**
 * 계열이 실제로 있는 항목 전부. **긍정 목록이다.**
 *
 * 한때 `code !== 'vibration' && code !== 'TN' && code !== 'TP'`처럼 부정 목록이었는데,
 * 계열 없는 항목을 새로 등재하면(`inflow`·`outflow`) 그 술어가 **참을 돌려주어**
 * `MeasurementPoint`를 없는 키로 인덱싱하고 `undefined`가 조용히 흐른다. 긍정 목록은
 * 새 항목이 기본적으로 제외되므로 같은 실수가 되풀이되지 않는다.
 */
/**
 * 배출 데이터에만 있는 계열 — 지금은 **수위 하나**다 `[사용자 요청 2026-08-28]`.
 *
 * **`EQUIPMENT_SERIES_CODES`에 넣지 않는다.** 그 배열이 시계열 화면의 `설비`·`전체` 필터를
 * 만들므로, 넣으면 요청하지 않은 화면이 함께 바뀐다(**A2**). 계열은 여기서 갖고, 계열의
 * 존재만 아래 `SERIES_CODES`에 합류시킨다 — `isSeriesCode`와 fixture 생성 루프가 그것을 읽는다.
 *
 * 같은 대분류의 유량 2종(`FLOW_SERIES_CODES`)이 여기 없는 것은 그쪽이 **이미 설비 필터에
 * 실려 있어서**다. 대분류를 코드에서 다시 그리는 배열이 아니라, **아직 자리가 없는 것**을
 * 담는 배열이다.
 */
export const DISCHARGE_SERIES_CODES: SeriesCode[] = ['level'];

export const SERIES_CODES: SeriesCode[] = [
  ...WATER_SERIES_CODES,
  ...EQUIPMENT_SERIES_CODES,
  ...DISCHARGE_SERIES_CODES,
];

/**
 * 계측 서버가 실제로 주는 계열. 채널 이름이 `SeriesCode`와 같아 매핑은 항등이다.
 *
 * **목록을 명시한다.** 서버에 없는 키를 물으면 에러가 아니라 **유령 표본**이 온다
 * (`{"NOPE":[{"ts":<지금>,"value":null}]}` — 명세 §7.1) — 오타 하나가 격자에 null 한 점을
 * 조용히 심는다. 그래서 요청 키는 이 배열에서만 만든다.
 */
export const RECEIVED_SERIES_CODES: SeriesCode[] = [
  ...WATER_SERIES_CODES,
  'current',
  'power',
  'inflow',
  'flow',
  ...DISCHARGE_SERIES_CODES,
];

/**
 * 화면 계열 ↔ 서버 채널. **이름이 다른 둘만 적는다.**
 *
 * 유입·유출 유량이 `flowIn`·`flowOut`으로 들어왔다 `[TBD-58 해소 2026-08-27]` — 요청해 둔
 * 것이 반영됐다. 우리 이름(`inflow`·`flow`)을 서버 이름에 맞춰 바꾸지 않는다: 화면·문서·CSV가
 * 전부 그 이름을 쓰고 있고, 서버 채널 이름이 화면 계약이 되면 저쪽이 바꿀 때마다 전 화면이
 * 깨진다(명세 §7.3이 경계한 그것이다). 이름을 잇는 일은 매퍼 한 곳에서 한다.
 *
 * **옛 `flow` 채널을 쓰지 않는다.** 5분 주기였고 1분 백필과 섞여 5분 배수 시각에만 옛 값이
 * 남아 있었다 — 지금은 **서버 키 목록에서 아예 사라졌다**(2026-09-07 실측: 16종 중 없다).
 * 매핑을 지우지 않는 이유는 이름이 우리 계열 `flow`와 같아서다: 매핑이 없으면 `channelOf`가
 * 항등으로 떨어져 **없는 채널을 다시 묻게 된다**(유령 표본, 명세 §7.1).
 */
export const TB_CHANNEL_BY_CODE: Partial<Record<SeriesCode, string>> = {
  inflow: 'flowIn',
  flow: 'flowOut',
};

/**
 * 서버에 채널이 없는 계열. **화면이 fixture로 메우지 않고 전 구간 `null`**이 되게 하는 자리다 —
 * 서버가 준 값과 내장 값을 한 행에 섞으면 어느 칸이 어디서 왔는지 알 수 없다(E4).
 *
 * **지금은 비어 있다** `[사용자 확인 2026-09-07]`. `level`(방류 수조 수위)이 마지막 하나였는데
 * 백엔드에 요청해 둔 채널이 도착해(`[사용자 요청 2026-09-01]` → 반영) 10개소 전부에서 값이
 * 온다 — 계열 13개가 전부 서버로 덮인다. 사양은 여전히 미정이라 `[TBD-57]`은 살아 있다:
 * 단위·만수위는 `PROVISIONAL_LEVEL_*`가 계속 맡는다.
 *
 * **빈 배열 자체는 위험하지 않다. 빠진 계열이 위험하다.** 여기에도 `RECEIVED_SERIES_CODES`에도
 * 없는 계열은 매퍼가 손대지 않아 `MeasurementPoint`의 그 칸이 `undefined`로 남는데, 타입은
 * `number | null`이라 소비처가 `=== null`로 걸러도 통과한다 — 병합 뒤 실제로 그 상태였다.
 * 그래서 «둘의 합이 곧 `SeriesCode` 전부»를 산문이 아니라 **테스트가 지킨다**
 * (`telemetry.mapper.test.ts`).
 */
export const UNRECEIVED_SERIES_CODES: SeriesCode[] = [];

/** 방류 여부는 계열이 아니라 플래그다. 서버가 채널로 준다 — 파생하지 않는다 */
export const DISCHARGING_KEY = 'discharging';

/**
 * 유량 2종 — **들어온 양과 나간 양**. 화면은 여기에 **차**(유입−유출) 칸을 하나 더 붙인다.
 *
 * 나란히 두는 것이 목적이다 — 그 차이가 방류 의심의 단서다(`[TBD-46]`). 증발·슬러지로
 * 설명되는 범위를 벗어나면(유출 > 유입) 처리 없이 내보낸 정황이 된다.
 */
export const FLOW_SERIES_CODES: SeriesCode[] = ['inflow', 'flow'];

/**
 * 집계 단위.
 *
 * **일·월이 없다.** 시연 데이터의 축적 구간이 24시간이다 `[원문 p.65]` — 일 단위로 묶으면
 * 한 행뿐이고 월은 만들 수가 없다. 없는 기간을 지어내면 리포트가 관측이 아니라 창작이 된다
 * (비용 절감 현황의 월별 추이를 빈 상태로 둔 것과 같은 이유다).
 *
 * 서버가 생겨 이력이 쌓이면 여기에 `'1d'`·`'1mo'`를 더한다 — 표와 CSV는 그대로 돈다.
 */
export const BUCKET_UNITS = ['raw', '1h'] as const;
export type BucketUnit = (typeof BUCKET_UNITS)[number];
export const DEFAULT_BUCKET: BucketUnit = '1h';

export const BUCKET_MINUTES: Record<BucketUnit, number> = {
  raw: COLLECTION_INTERVAL_MINUTES,
  '1h': 60,
};

export const BUCKET_OPTIONS: { value: BucketUnit; label: string }[] = [
  { value: 'raw', label: `${COLLECTION_INTERVAL_MINUTES}분` },
  { value: '1h', label: '1시간' },
];

/**
 * 구간마다 어느 통계를 보일지.
 *
 * **한 번에 하나만 보인다.** 11항목 × 3통계 = 33열은 표가 아니라 벽이다 — 센서 리포트는
 * 보통 구간을 행으로 두고 통계 하나를 고르게 한다.
 */
export const BUCKET_STATS = ['avg', 'min', 'max'] as const;
export type BucketStat = (typeof BUCKET_STATS)[number];
export const DEFAULT_STAT: BucketStat = 'avg';

export const STAT_OPTIONS: { value: BucketStat; label: string }[] = [
  { value: 'avg', label: '평균' },
  { value: 'min', label: '최소' },
  { value: 'max', label: '최대' },
];

export const STAT_LABELS: Record<BucketStat, string> = {
  avg: '평균',
  min: '최소',
  max: '최대',
};

/** 축적 구간을 화면이 근거로 적는다 — 왜 일·월 집계가 없는지 말할 때 쓴다 */
export const WINDOW_HOURS = HISTORY_WINDOW_HOURS;
