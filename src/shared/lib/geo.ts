import { MAP_BOUNDS } from '@/shared/config/korea-outline';

/** 외곽선을 구울 때 쓴 투영 캔버스 크기. viewBox를 잘라도 이 값은 그대로여야 한다 */
const PROJECTION_SIZE = { width: 400, height: 520 };

/**
 * 위경도를 지도 SVG 좌표로 옮긴다.
 * 외곽선 경로를 구울 때 쓴 것과 **같은 투영**이어야 핀이 지형 위 제자리에 앉는다.
 */
export function projectToMap(lat: number, lng: number): { x: number; y: number } {
  const mercY = (v: number) => Math.log(Math.tan(Math.PI / 4 + (v * Math.PI) / 180 / 2));

  const top = mercY(MAP_BOUNDS.maxLat);
  const bottom = mercY(MAP_BOUNDS.minLat);

  return {
    x: ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * PROJECTION_SIZE.width,
    y: ((mercY(lat) - top) / (bottom - top)) * PROJECTION_SIZE.height,
  };
}
