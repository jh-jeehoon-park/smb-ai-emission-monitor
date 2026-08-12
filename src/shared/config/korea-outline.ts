/**
 * 지도 투영 기준.
 *
 * 시도 도형(`korea-provinces.ts`)과 사업장 핀(`shared/lib/geo.ts`)이 **같은 값**으로
 * 투영해야 핀이 제자리에 앉는다. 그래서 도형이 아니라 이 범위를 단일 원천으로 둔다.
 *
 * 출처: Natural Earth 1:10m Admin 1 (**퍼블릭 도메인 — 출처 표기 의무 없음**).
 * 타일 지도를 쓰지 않는 이유: OSM/CARTO 타일은 출처 표기가 법적 의무라 화면에서 지울 수 없고,
 * CARTO에는 한국어 라벨 변형이 없어 지명이 영문으로 나온다. 게다가 외부 네트워크에 의존한다.
 */
export const MAP_BOUNDS = {
  minLng: 125.0,
  maxLng: 130.0,
  minLat: 33.0,
  maxLat: 38.7,
} as const;
