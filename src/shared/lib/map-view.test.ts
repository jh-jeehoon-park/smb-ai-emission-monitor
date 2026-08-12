import { describe, expect, it } from 'vitest';
import { PROVINCE_SHAPES, PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import { MAP_FOCUS_NONE, MAX_MAP_ZOOM, provinceBBox, provinceFocus } from './map-view';

describe('provinceBBox', () => {
  it('시도 17개 모두 넓이를 가진 상자를 낸다', () => {
    for (const province of PROVINCE_SHAPES) {
      const box = provinceBBox(province.name)!;
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });

  it('없는 이름에는 null을 준다', () => {
    expect(provinceBBox('없는도')).toBeNull();
  });
});

describe('provinceFocus', () => {
  it('선택이 없으면 확대하지 않는다 — 첫 렌더가 서버와 같아야 한다', () => {
    expect(provinceFocus(null)).toEqual(MAP_FOCUS_NONE);
  });

  it('배율이 상한을 넘지 않는다 — 넘으면 단순화한 지형이 각져 보인다', () => {
    for (const province of PROVINCE_SHAPES) {
      const focus = provinceFocus(province.name);
      expect(focus.scale).toBeGreaterThanOrEqual(1);
      expect(focus.scale).toBeLessThanOrEqual(MAX_MAP_ZOOM);
    }
  });

  it('광역시처럼 작은 도형도 상한에서 묶인다', () => {
    // 광주는 여백을 넣어도 계산상 8배가 나온다
    expect(provinceFocus('광주광역시').scale).toBe(MAX_MAP_ZOOM);
  });

  it('시도 중심이 화면 중심으로 온다', () => {
    const viewCenterX = PROVINCE_VIEWBOX.x + PROVINCE_VIEWBOX.width / 2;
    const viewCenterY = PROVINCE_VIEWBOX.y + PROVINCE_VIEWBOX.height / 2;

    for (const name of ['경기도', '경상북도']) {
      const box = provinceBBox(name)!;
      const { scale, translateX, translateY } = provinceFocus(name);

      const centerX = translateX + scale * (box.x + box.width / 2);
      const centerY = translateY + scale * (box.y + box.height / 2);

      expect(centerX).toBeCloseTo(viewCenterX, 1);
      expect(centerY).toBeCloseTo(viewCenterY, 1);
    }
  });

  it('사업장이 있는 두 시도는 실제로 확대된다', () => {
    expect(provinceFocus('경기도').scale).toBeGreaterThan(1.5);
    expect(provinceFocus('경상북도').scale).toBeGreaterThan(1.5);
  });

  it('변환값도 소수 셋째 자리까지만 낸다', () => {
    for (const province of PROVINCE_SHAPES) {
      const focus = provinceFocus(province.name);
      for (const v of [focus.scale, focus.translateX, focus.translateY]) {
        expect(Math.round(v * 1000) / 1000).toBe(v);
      }
    }
  });
});
