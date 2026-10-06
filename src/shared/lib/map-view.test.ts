import { describe, expect, it } from 'vitest';
import { PROVINCE_SHAPES, PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import {
  MAP_FOCUS_NONE,
  MAX_MAP_ZOOM,
  provinceBBox,
  provinceFocus,
  singleProvinceView,
} from './map-view';

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

/**
 * **시도 한 장만 그리는 지도는 뷰박스 세로를 잘라낸다**(기초지자체 화면).
 *
 * 전국 뷰박스는 세로로 긴 상자(화면비 0.56)인데 시도 하나는 정사각형에 가깝다 —
 * 그대로 넣으면 위아래가 비고 **확대가 가로에서 먼저 막혀** 칸이 남아도 도형이 크지 못한다.
 * 경북은 확대 후 가로 86%를 쓰는데 세로는 52%만 썼다.
 */
describe('시도 한 장 뷰박스', () => {
  const NAME = '경상북도';

  it('가로는 건드리지 않는다 — 되돌림 배율이 가로 기준이다', () => {
    const view = singleProvinceView(NAME);
    expect(view.x).toBe(PROVINCE_VIEWBOX.x);
    expect(view.width).toBe(PROVINCE_VIEWBOX.width);
  });

  it('세로를 잘라 화면비가 정사각형에 가까워진다', () => {
    const view = singleProvinceView(NAME);
    expect(view.height).toBeLessThan(PROVINCE_VIEWBOX.height);
    expect(view.width / view.height).toBeGreaterThan(PROVINCE_VIEWBOX.width / PROVINCE_VIEWBOX.height);
  });

  /**
   * 잘라낸 뷰박스가 도형을 담지 못하면 경북 윤곽의 위아래가 잘린다.
   *
   * **딱 맞는 것으로는 부족하다** — 핀은 좌표에서 위로 20단위(배율로 되돌리면 `20/scale`)
   * 솟으므로, 도형 맨 위 사업장의 핀 머리가 여백 없이는 잘린다. 여백을 지워도 통과하던
   * 검사를 조인 것이다.
   */
  it('확대한 도형이 잘리지 않고 핀이 솟을 자리가 남는다', () => {
    const view = singleProvinceView(NAME);
    const box = provinceBBox(NAME)!;
    const { scale, translateY } = provinceFocus(NAME);

    const top = translateY + scale * box.y;
    const bottom = translateY + scale * (box.y + box.height);
    /** 핀 전체 높이(뷰박스 단위). 화면에서 일정하게 보이도록 배율로 되돌려 그린다 */
    const pinHeight = 20 / scale;

    expect(top - view.y).toBeGreaterThanOrEqual(pinHeight);
    expect(view.y + view.height - bottom).toBeGreaterThanOrEqual(pinHeight);
  });

  /** `provinceFocus`가 전국 뷰박스 중심에 놓으므로 잘라낸 쪽도 그 중심을 지켜야 한다 */
  it('중심이 전국 뷰박스와 같다', () => {
    const view = singleProvinceView(NAME);
    expect(view.y + view.height / 2).toBeCloseTo(
      PROVINCE_VIEWBOX.y + PROVINCE_VIEWBOX.height / 2,
      3,
    );
  });

  /** 도형이 클수록 덜 잘린다 — 상수를 박아 두면 다른 시도에서 잘린다 */
  it('시도마다 높이가 다르다 — 도형에서 유도한다', () => {
    const heights = new Set(
      ['경상북도', '경기도', '제주특별자치도'].map((n) => singleProvinceView(n).height),
    );
    expect(heights.size).toBe(3);
  });

  it('이름이 없거나 모르는 시도면 전국 뷰박스를 그대로 돌려준다', () => {
    expect(singleProvinceView(null)).toEqual(PROVINCE_VIEWBOX);
    expect(singleProvinceView('없는도')).toEqual(PROVINCE_VIEWBOX);
  });
});
