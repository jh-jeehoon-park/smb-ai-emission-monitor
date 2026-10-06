import { INLET_BY_OUTLET_CODE, WATER_QUALITY_CODES } from '@/shared/config/measurement';
import {
  DISCHARGING_KEY,
  INTERVAL_KEY,
  RECEIVED_SERIES_CODES,
} from '../config/constants';
import type { SeriesCode } from '../model/types';
import { channelOf } from './telemetry.mapper';

/*
 * **이 파일에 `'use client'`를 붙이지 않는다.** 공정 설정의 씨앗(`features/process-settings/lib/seed.ts`)이
 * 모듈을 읽을 때 `INLET_CHANNEL_ITEMS.map`을 부르는데, 그 모듈은 서버 컴포넌트 쪽 그래프에도
 * 실린다. 클라이언트 경계 뒤의 값은 서버에서 참조 껍데기로 바뀌어 `.map is not a function`으로
 * 페이지 전체가 500이 됐다(실측). 목록은 순수 값이라 경계가 필요 없다 — 훅만 `channels.ts`에 둔다.
 */

/**
 * **ECP가 보내는 채널 하나** `[사용자 요청 2026-09-29: 공정 편집 — ECP 데이터와 공정 매핑]`.
 *
 * 공정 편집이 «이 채널은 이 단계의 이 항목»을 거는 대상이다. 화면이 지금 값을 읽을 수 있는지
 * (`readableAs`)를 함께 든다 — 받는 채널과 **받고는 있지만 아직 화면 계열로 옮기지 않은**
 * 채널(유입 수질 8종: 서버는 주지만 화면은 역산 시연값을 쓴다, `docs/integration/README.md`
 * §8.0)을 갈라야 매핑 화면이 없는 값을 있는 것처럼 보이지 않는다.
 */
export interface KnownChannel {
  key: string;
  /** 이 채널을 지금 화면 계열로 읽을 수 있으면 그 계열. 아니면 `null` */
  readableAs: SeriesCode | null;
  /** 계측값이 아닌 채널(방류 플래그·수집 주기). 공정에 걸 대상이 아니다 */
  meta: boolean;
}

/**
 * **알려진 채널 목록** — 서버에 닿지 않을 때 이것을 쓴다.
 *
 * 손으로 적지 않는다: 받는 계열은 `RECEIVED_SERIES_CODES` + `channelOf`에서, 유입 수질은
 * 그 서버 이름 규칙(`pHIn` … — 연동 문서 §8.0이 확인한 이름)에서 만든다. 오타 하나가
 * «미매핑 채널»을 지어낸다.
 */
export const KNOWN_CHANNELS: readonly KnownChannel[] = [
  ...RECEIVED_SERIES_CODES.map((code) => ({ key: channelOf(code), readableAs: code, meta: false })),
  ...WATER_QUALITY_CODES.map((code) => ({
    key: `${code}In`,
    /* 서버는 주지만 화면은 아직 역산 시연값(`inletPH` …)을 그린다 — 읽을 수 있다고 적지 않는다 */
    readableAs: null,
    meta: false,
  })),
  { key: DISCHARGING_KEY, readableAs: null, meta: true },
  { key: INTERVAL_KEY, readableAs: null, meta: true },
];

const BY_KEY = new Map(KNOWN_CHANNELS.map((channel) => [channel.key, channel]));

/** 그 채널 이름으로 지금 화면이 읽을 수 있는 계열. 모르는 이름이면 `null` */
export function readableSeriesOf(key: string): SeriesCode | null {
  return BY_KEY.get(key)?.readableAs ?? null;
}

/** 계측값이 아닌 채널인가 — 공정 매핑 목록에서 뺀다 */
export function isMetaChannel(key: string): boolean {
  return BY_KEY.get(key)?.meta ?? false;
}

/** 유입 수질 채널 이름 → 그 항목(유입 계열 코드). 공정의 유입 단계 씨앗이 쓴다 */
export const INLET_CHANNEL_ITEMS: readonly { key: string; outlet: string; inlet: string }[] =
  WATER_QUALITY_CODES.map((code) => ({
    key: `${code}In`,
    outlet: code,
    inlet: INLET_BY_OUTLET_CODE[code as keyof typeof INLET_BY_OUTLET_CODE],
  }));
