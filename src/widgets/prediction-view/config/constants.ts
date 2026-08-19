/** 어떤 항목의 예측을 보고 있는지 URL에 남긴다 — 링크로 그대로 공유된다 */
export const TARGET_QUERY_KEY = 'target';

/**
 * `전체` 보기 — 세 항목을 3단으로 함께 본다 `[사용자 결정 2026-08-18]`.
 *
 * 한 축에 겹치지 않는다. TOC 25.5 · TN 16 · **TP 1.5 mg/L**로 17배 차이라 겹치면
 * TP가 바닥에 눕는다. 시간축만 공유하고 세로 눈금은 각자 쓴다.
 */
export const ALL_TARGETS = 'ALL';

/**
 * URL에 실리는 값 목록. `전체`가 기본이다 — 오염도 세 항목을 한눈에 보는 것이 이 화면의 목적이다.
 *
 * **`flow`(유량)는 `전체`에 들어가지 않는다.** 단위가 ㎥/day라 mg/L 3단에 섞으면 눈금이
 * 무의미해지고, 원문도 "수질·**수량**"으로 나눠 부른다 `[원문 발표 p.11]` `[INC-95 판정]`.
 */
export const TARGET_VIEWS = [ALL_TARGETS, 'TOC', 'TN', 'TP', 'flow'] as const;
export type TargetView = (typeof TARGET_VIEWS)[number];
