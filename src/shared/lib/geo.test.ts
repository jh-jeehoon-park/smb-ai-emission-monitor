import { describe, expect, it } from 'vitest';
import { PROVINCE_SHAPES } from '@/shared/config/korea-provinces';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { MAP_BOUNDS } from '@/shared/config/korea-outline';
import { roundTo } from './prng';
import { PROJECTION_SIZE, projectToMap } from './geo';

/** 화면이 실제로 투영하는 좌표 — 시도 라벨 17개 + 사업장 핀 10개 */
const USED_COORDS: [lat: number, lng: number][] = [
  ...PROVINCE_SHAPES.map((p) => [p.labelAt[0], p.labelAt[1]] as [number, number]),
  ...SITE_SCENARIOS.map((s) => s.coordinates),
];

/**
 * 서버와 브라우저의 V8 버전이 달라 Math.log·Math.tan 결과가 마지막 비트에서 갈린다.
 * 관측된 차이는 1e-13 수준이었다. 그보다 100배 큰 흔들림을 줘도 반올림 결과가
 * 같아야 SSR HTML과 클라이언트 렌더가 일치한다.
 */
const ENGINE_DRIFT = 1e-11;

describe('projectToMap', () => {
  it('좌표를 소수 셋째 자리까지만 낸다', () => {
    for (const [lat, lng] of USED_COORDS) {
      const { x, y } = projectToMap(lat, lng);
      expect(x).toBe(roundTo(x, 3));
      expect(y).toBe(roundTo(y, 3));
    }
  });

  it('엔진 간 오차만큼 흔들려도 같은 값으로 떨어진다 — 반올림 경계에 걸린 좌표가 없다', () => {
    for (const [lat, lng] of USED_COORDS) {
      const { x, y } = projectToMap(lat, lng);

      for (const drift of [ENGINE_DRIFT, -ENGINE_DRIFT]) {
        expect(roundTo(x + drift, 3)).toBe(x);
        expect(roundTo(y + drift, 3)).toBe(y);
      }
    }
  });

  it('모든 좌표가 투영 캔버스 안에 있다', () => {
    for (const [lat, lng] of USED_COORDS) {
      const { x, y } = projectToMap(lat, lng);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(PROJECTION_SIZE.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(PROJECTION_SIZE.height);
    }
  });

  /**
   * Mercator는 경도와 위도에 같은 축척을 써야 도형이 늘어나지 않는다.
   * 처음엔 캔버스 높이를 520으로 잡아 y가 8.3% 눌려 한국이 가로로 뚱뚱했다.
   */
  it('경도와 위도의 축척이 같다 — 도형이 늘어나지 않는다', () => {
    const mercY = (v: number) => Math.log(Math.tan(Math.PI / 4 + (v * Math.PI) / 360));
    const lngScale = PROJECTION_SIZE.width / ((MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng) * (Math.PI / 180));
    const latScale = PROJECTION_SIZE.height / (mercY(MAP_BOUNDS.maxLat) - mercY(MAP_BOUNDS.minLat));

    expect(lngScale / latScale).toBeCloseTo(1, 3);
  });

  it('북쪽일수록 y가 작고 동쪽일수록 x가 크다', () => {
    const north = projectToMap(38.0, 127.0);
    const south = projectToMap(34.0, 127.0);
    const west = projectToMap(36.0, 126.0);
    const east = projectToMap(36.0, 129.0);

    expect(north.y).toBeLessThan(south.y);
    expect(west.x).toBeLessThan(east.x);
  });
});
