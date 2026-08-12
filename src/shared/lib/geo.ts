import { MAP_BOUNDS } from '@/shared/config/korea-outline';
import { roundTo } from '@/shared/lib/prng';

/**
 * 도형을 구울 때 쓴 투영 캔버스. viewBox를 잘라도 이 값은 그대로여야 한다.
 *
 * **높이는 임의로 정할 수 없다.** Mercator는 경도와 위도에 같은 축척을 써야 도형이
 * 늘어나지 않는데, 처음엔 높이를 520으로 잡아 y가 8.3% 눌려 있었다 —
 * 한국이 가로로 8.3% 뚱뚱하게 그려졌다. MAP_BOUNDS(경도 5°, 위도 33~38.7°)에서
 * 폭 400에 맞는 높이는 563.05다. 경계를 바꾸면 이 값도 다시 계산해야 하고,
 * `korea-provinces.ts`의 구운 좌표도 같은 비율로 다시 구워야 한다.
 */
export const PROJECTION_SIZE = { width: 400, height: 563.05 } as const;

/**
 * SVG 좌표를 소수 셋째 자리에서 끊는다.
 *
 * `Math.log`·`Math.tan`은 ECMAScript가 정확한 반올림을 요구하지 않아 엔진 구현마다
 * 마지막 비트가 다르다. 서버(Node)와 브라우저(Chrome)의 V8 버전이 달라 같은 입력에서
 * `y`가 `89.34780313855485` / `89.34780313855524` 로 갈렸고, 이 값이 그대로 SVG 속성에
 * 실려 hydration이 깨졌다. 400x520 캔버스에서 0.001은 눈에 보이지 않으며,
 * 1e-13 수준의 차이는 반올림에서 함께 사라진다.
 *
 * 실제로 쓰는 좌표들이 반올림 경계에 걸리지 않는지는 `geo.test.ts`가 확인한다.
 */
const COORD_DECIMALS = 3;

/**
 * 위경도를 지도 SVG 좌표로 옮긴다.
 * 외곽선 경로를 구울 때 쓴 것과 **같은 투영**이어야 핀이 지형 위 제자리에 앉는다.
 */
export function projectToMap(lat: number, lng: number): { x: number; y: number } {
  const mercY = (v: number) => Math.log(Math.tan(Math.PI / 4 + (v * Math.PI) / 180 / 2));

  const top = mercY(MAP_BOUNDS.maxLat);
  const bottom = mercY(MAP_BOUNDS.minLat);

  const x =
    ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * PROJECTION_SIZE.width;
  const y = ((mercY(lat) - top) / (bottom - top)) * PROJECTION_SIZE.height;

  return { x: roundTo(x, COORD_DECIMALS), y: roundTo(y, COORD_DECIMALS) };
}
