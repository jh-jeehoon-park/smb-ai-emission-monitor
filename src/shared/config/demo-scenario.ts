/**
 * 시연 시나리오의 단일 원천.
 *
 * 사업장 카드·지도 핀·상세 패널이 같은 값을 보여야 하는데, 이들은 서로 다른 slice에 있고
 * slice끼리 직접 참조할 수 없다(FSD 수평 import 금지). 그래서 각 slice가 여기서 자기 몫만
 * 읽어 생성한다. 값이 우연히 맞는 게 아니라 구조적으로 맞는다.
 */

import type { DischargeScale, RegionGrade } from './discharge-limits';

export type Industry = '섬유·염색' | '식품' | '화학' | '도금' | '전자부품';

export interface SiteScenario {
  id: string;
  name: string;
  industry: Industry;
  region: string;
  /** 표시용 주소. 원문에 실증지 주소가 없어 시·군까지만 둔 시연 값이다 */
  address: string;
  /** 소속 시도. 지도에서 어느 시도를 칠할지 정하는 값이며 `korea-provinces.ts`의 name과 맞춘다 */
  province: string;
  /**
   * 위 주소를 지오코딩한 결과에 해당하는 좌표. 지금은 시·군 중심 근사값을 직접 적어 두었다.
   * 실제 주소가 확정되면 이 두 필드를 함께 갱신한다 — 주소와 좌표가 어긋나면 지도가 거짓말을 한다.
   */
  coordinates: [lat: number, lng: number];
  /** 이상 점수 기저값. 마지막 구간에서 여기에 상승분이 더해진다 */
  baseScore: number;
  /** 마지막 3시간 동안 얼마나 치솟는지 */
  eventRise: number;
  /** ECP 통신 상태. false면 계측·이상점수가 함께 결측이 된다 */
  online: boolean;
  /** 통신이 잠시 끊겼던 구간(표본 인덱스 기준 시작점). null이면 두절 이력 없음 */
  outageStartOffset: number | null;
  /** 방류가 멈춘 구간. null이면 24시간 내내 방류 */
  dischargeGap: DischargeGap | null;
  /** 방지시설이 멈춘 채 방류가 이어진 구간. null이면 그런 구간이 없다 */
  idleDischargeWindow: DischargeGap | null;
  /**
   * 배출허용기준을 고르는 두 축 `[공정자료 p.11]`.
   *
   * 둘을 알아야 기준표를 고를 수 있다. **원문에 없어 둘 다 `null`이다** — 진유원의
   * 규모만 데이터셋이 `4종`으로 알려 주고(50~200㎥/일), 지역구분은 어느 사업장도 없다.
   * `null`을 임의값으로 채우면 없는 기준으로 초과를 판정하게 된다 `[TBD-45]`.
   */
  regionGrade: RegionGrade | null;
  dischargeScale: DischargeScale | null;
  /** 데이터 처리율·가동률은 사업장마다 다르다 */
  dataThroughput: number;
  uptime: number;
}

/**
 * 방류 중단 구간.
 *
 * **설비는 돌아도 방류는 멈춘다** — 실증 데이터에서 방류 0시간이던 15일 중 13일은
 * 전류계가 24시간 가동이었다(`docs/datasets/…/04_…`). `가동배출 = 상시가동 간헐방류`가
 * 분류가 아니라 관측이다.
 *
 * 시간대·요일 패턴은 **없다** — 00~23시 전부 84~90%, 요일도 83~92%로 평평하다.
 * 그래서 야간·주말 같은 주기 모델을 쓰지 않고 구간 하나를 직접 지정한다.
 */
export interface DischargeGap {
  /** 표본 인덱스 기준 시작점(끝에서부터). `outageStartOffset`과 같은 규약 */
  startOffset: number;
  hours: number;
}

/**
 * 방지시설이 멈춘 채 방류가 이어진 구간(`idleDischargeWindow`)의 근거.
 *
 * 진유원 6,528시간 중 **184시간(2.8%)** 이 `유량=1 · 전류=0`이었다
 * (`docs/datasets/…/04_…`, 전류계 위치=유입펌프). 24시간 × 2.8% ≈ 40분이라 **1시간짜리
 * 구간 하나**면 실제와 비슷한 밀도가 된다 — 다만 판정 임계값(1시간)보다 짧으면 시연에서
 * 아무것도 잡히지 않으므로 1시간으로 올렸다.
 *
 * **이것이 곧 무단방류라는 뜻은 아니다.** 저류된 물을 내보내는 중일 수도 있다. 원문도
 * "방류 유무 판단 **가능성 검토**"까지만 말한다 `[원문 발표 p.13]` — 화면은 의심으로만 적는다.
 */

/** 실증 10개소 = 5개 업종 × 2개소 (사업계획서 p.33·p.37) */
export const SITE_SCENARIOS: SiteScenario[] = [
  {
    id: 'S-01',
    name: '안동 염색 1공장',
    industry: '섬유·염색',
    region: '경북 안동',
    address: '경상북도 안동시 풍산읍',
    province: '경상북도',
    coordinates: [36.5684, 128.7294],
    baseScore: 22,
    eventRise: 6,
    online: true,
    outageStartOffset: null,
    dischargeGap: null,
    idleDischargeWindow: null,
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 99.1,
    uptime: 97.8,
  },
  {
    id: 'S-02',
    name: '구미 염색 2공장',
    industry: '섬유·염색',
    region: '경북 구미',
    address: '경상북도 구미시 공단동',
    province: '경상북도',
    coordinates: [36.1195, 128.3446],
    baseScore: 18,
    eventRise: 74,
    online: true,
    outageStartOffset: 96,
    dischargeGap: null,
    /**
     * 방지시설이 멈춘 채 방류가 이어진 구간 `[원문 발표 p.13]`.
     * 길이의 근거는 위 주석(실측 2.8%)에 있다.
     */
    idleDischargeWindow: { startOffset: 132, hours: 1 },
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 98.6,
    uptime: 96.4,
  },
  {
    id: 'S-03',
    name: '칠곡 식품 A동',
    industry: '식품',
    region: '경북 칠곡',
    address: '경상북도 칠곡군 왜관읍',
    province: '경상북도',
    coordinates: [35.9954, 128.4017],
    baseScore: 31,
    eventRise: 4,
    online: true,
    outageStartOffset: null,
    dischargeGap: null,
    idleDischargeWindow: null,
    /** 데이터셋의 진유원이 `규모 4종`(50~200㎥/일) — 지역구분은 없다 `[데이터셋 …/04_…]` */
    regionGrade: null,
    dischargeScale: '200㎥ 미만',
    dataThroughput: 98.9,
    uptime: 98.2,
  },
  {
    id: 'S-04',
    name: '안동 식품 B동',
    industry: '식품',
    region: '경북 안동',
    address: '경상북도 안동시 남후면',
    province: '경상북도',
    coordinates: [36.5312, 128.8005],
    baseScore: 12,
    eventRise: 2,
    online: false,
    outageStartOffset: null,
    /** 통신 두절이라 방류 여부를 알 수 없다. 구간이 아니라 판정 자체가 null이다 */
    dischargeGap: null,
    idleDischargeWindow: null,
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 71.4,
    uptime: 82.1,
  },
  {
    id: 'S-05',
    name: '포항 화학 1공장',
    industry: '화학',
    region: '경북 포항',
    address: '경상북도 포항시 남구 대송면',
    province: '경상북도',
    coordinates: [36.019, 129.3435],
    baseScore: 44,
    eventRise: 22,
    online: true,
    outageStartOffset: null,
    dischargeGap: null,
    idleDischargeWindow: null,
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 98.2,
    uptime: 95.9,
  },
  {
    id: 'S-06',
    name: '경산 화학 2공장',
    industry: '화학',
    region: '경북 경산',
    address: '경상북도 경산시 진량읍',
    province: '경상북도',
    coordinates: [35.8251, 128.7411],
    baseScore: 39,
    eventRise: 5,
    online: true,
    outageStartOffset: 148,
    dischargeGap: null,
    /** **통신 두절 구간과 일부러 겹쳐 둔다** — 겹친 표본은 의심이 아니라 모름이어야 한다(E4) */
    idleDischargeWindow: { startOffset: 152, hours: 1 },
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 97.6,
    uptime: 96.8,
  },
  {
    id: 'S-07',
    name: '평택 도금 A라인',
    industry: '도금',
    region: '경기 평택',
    address: '경기도 평택시 청북읍',
    province: '경기도',
    coordinates: [36.9921, 127.1129],
    baseScore: 36,
    eventRise: 55,
    online: true,
    outageStartOffset: null,
    dischargeGap: null,
    idleDischargeWindow: null,
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 98.4,
    uptime: 94.7,
  },
  {
    id: 'S-08',
    name: '시흥 도금 B라인',
    industry: '도금',
    region: '경기 시흥',
    address: '경기도 시흥시 정왕동',
    province: '경기도',
    coordinates: [37.3799, 126.8031],
    baseScore: 27,
    eventRise: 3,
    online: true,
    outageStartOffset: null,
    /** **배출 없음.** 설비는 돌지만 24시간 내내 방류가 없다 — 데이터셋 272일 중 15일 */
    dischargeGap: { startOffset: 288, hours: 24 },
    idleDischargeWindow: null,
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 99.3,
    uptime: 98.6,
  },
  {
    id: 'S-09',
    name: '수원 전자부품 세정',
    industry: '전자부품',
    region: '경기 수원',
    address: '경기도 수원시 권선구',
    province: '경기도',
    coordinates: [37.2636, 127.0286],
    baseScore: 18,
    eventRise: 2,
    online: true,
    outageStartOffset: null,
    /** 지금 중단 2시간째. 사업장2 계정의 사업장이라 자사 현황에서도 이 상태가 보인다 */
    dischargeGap: { startOffset: 24, hours: 2 },
    idleDischargeWindow: null,
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 99.5,
    uptime: 99.1,
  },
  {
    id: 'S-10',
    name: '광주 전자부품 세정',
    industry: '전자부품',
    region: '경기 광주',
    address: '경기도 광주시 초월읍',
    province: '경기도',
    coordinates: [37.4292, 127.2551],
    baseScore: 51,
    eventRise: 11,
    online: true,
    outageStartOffset: null,
    /** 11:58 수질 알람이 이 구간에 든다 — 비방류 중 알람 사례 */
    dischargeGap: { startOffset: 48, hours: 3 },
    idleDischargeWindow: null,
    regionGrade: null,
    dischargeScale: null,
    dataThroughput: 98.8,
    uptime: 97.2,
  },
];

export const DEFAULT_SITE_ID = 'S-02';

export function getScenario(siteId: string): SiteScenario {
  return SITE_SCENARIOS.find((s) => s.id === siteId) ?? SITE_SCENARIOS[0]!;
}

/** 사업장마다 다른 시드를 주되 값은 결정적이어야 한다(SSR/CSR 일치·스크린샷 재현) */
export function siteSeed(siteId: string, salt: number): number {
  let h = salt >>> 0;
  for (let i = 0; i < siteId.length; i += 1) {
    h = (Math.imul(h, 31) + siteId.charCodeAt(i)) >>> 0;
  }
  return h;
}
