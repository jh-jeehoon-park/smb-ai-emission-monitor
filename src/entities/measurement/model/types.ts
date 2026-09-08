/** 결측·통신두절은 null이다. 0으로 채우지 않는다(E4). */
export type Reading = number | null;

export interface MeasurementPoint {
  t: string;
  pH: Reading;
  EC: Reading;
  turbidity: Reading;
  DO: Reading;
  temperature: Reading;
  chromaticity: Reading;
  NO3N: Reading;
  TOC: Reading;
  current: Reading;
  power: Reading;
  inflow: Reading;
  flow: Reading;
  /** 방류 수조 수위 — 원문 `배출 데이터` 3종 중 하나 `[원문 p.1]` · 사양 `[TBD-57]` */
  level: Reading;
  /**
   * 총질소·총인 — **계측 서버가 임시로 보내 주는 값이다** `[사용자 요청 2026-09-08]`.
   *
   * 실증에서는 센서가 없고 AI 소프트 센싱이 낼 항목이다 `[원문 발표 p.17]` `[회의 2026-08-20]`.
   * 그 모델이 아직 없어 **프로토타입에서는 화면에 값이 그려지는 것이 먼저**라, 백엔드가
   * 에뮬레이터 채널로 넣어 둔 것을 그대로 받는다 — 과제가 성공하면 이 자리를 AI 산출이
   * 대신한다.
   *
   * **그래서 «직접 계측»이라 적지 않는다.** 오염도 추정 화면의 원천 라벨이 그 사실을
   * 드러낸다(`entities/prediction`의 `SeriesOrigin`).
   */
  TN: Reading;
  TP: Reading;
}

/**
 * 계열이 있는 항목. **진동만 빠진다** — 사양이 없다 `[TBD-49]`.
 *
 * TN·TP는 한때 여기 없었다(센서가 없어 AI 추정 대상이라). 계측 서버가 그 둘을 채널로
 * 보내면서 합류했고, «어디서 왔는가»는 이 타입이 아니라 화면의 원천 라벨이 말한다.
 */
export type SeriesCode = Exclude<keyof MeasurementPoint, 't'>;

/**
 * 계열이 어디서 왔는가.
 *
 * **셋을 가른다.** `pending`은 아직 모르는 것이고 `fallback`은 확인된 미도달이다 — 둘을 같게
 * 적으면 확인 전에 "서버 미연결"이라고 단정하게 된다. 결측을 0으로 그리지 않는 것과 같은
 * 이유다(E4).
 */
export type TelemetryStatus = 'pending' | 'live' | 'fallback';

