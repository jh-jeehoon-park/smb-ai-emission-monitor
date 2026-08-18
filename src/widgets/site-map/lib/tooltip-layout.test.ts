import { describe, expect, it } from 'vitest';
import { PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { projectToMap } from '@/shared/lib/geo';
import { provinceFocus } from '@/shared/lib/map-view';
import { SITES } from '@/entities/site';
import {
  MAP_LABEL_FONT_SIZE,
  TOOLTIP_DETAIL_SIZE,
  TOOLTIP_EDGE_PADDING,
  TOOLTIP_PIN_GAP,
  TOOLTIP_TITLE_SIZE,
} from '../config/constants';
import { estimateSvgTextWidth, placeTooltip, tooltipSize } from './tooltip-layout';

describe('estimateSvgTextWidth', () => {
  it('빈 문자열은 0이다', () => {
    expect(estimateSvgTextWidth('', 11)).toBe(0);
  });

  it('한글이 같은 개수의 숫자보다 넓다', () => {
    expect(estimateSvgTextWidth('안동염색', 11)).toBeGreaterThan(estimateSvgTextWidth('8888', 11));
  });

  it('가운뎃점을 전각으로 센다 — 라벨 구분자로 자주 쓰인다', () => {
    expect(estimateSvgTextWidth('·', 11)).toBe(11);
  });

  it('폰트 크기에 비례한다', () => {
    expect(estimateSvgTextWidth('안동 염색 1공장', 22)).toBe(
      estimateSvgTextWidth('안동 염색 1공장', 11) * 2,
    );
  });

  /** 좁게 틀리면 글자가 상자 밖으로 나간다. 실제 사업장명으로 하한을 박아 둔다 */
  it('가장 긴 사업장명을 넉넉히 감싼다', () => {
    expect(estimateSvgTextWidth('수원 전자부품 세정', 11)).toBeGreaterThan(80);
  });
});

describe('placeTooltip — 뷰박스 밖으로 잘리지 않게', () => {
  const view = PROVINCE_VIEWBOX;
  const base = { width: 120, height: 40, gap: 12, padding: 6, view };

  it('자리가 넉넉하면 핀 위 가운데에 놓는다', () => {
    const box = placeTooltip({ ...base, pinX: view.x + view.width / 2, pinY: view.y + 200 });
    expect(box.below).toBe(false);
    expect(box.y).toBe(view.y + 200 - 12 - 40);
    expect(box.x).toBe(view.x + view.width / 2 - 60);
  });

  it('위가 모자라면 아래로 뒤집는다', () => {
    const box = placeTooltip({ ...base, pinX: view.x + view.width / 2, pinY: view.y + 5 });
    expect(box.below).toBe(true);
    expect(box.y).toBe(view.y + 5 + 12);
  });

  it('왼쪽 끝 핀도 상자가 뷰박스 안에 남는다', () => {
    const box = placeTooltip({ ...base, pinX: view.x, pinY: view.y + 200 });
    expect(box.x).toBeGreaterThanOrEqual(view.x);
  });

  it('오른쪽 끝 핀도 상자가 뷰박스 안에 남는다', () => {
    const box = placeTooltip({ ...base, pinX: view.x + view.width, pinY: view.y + 200 });
    expect(box.x + 120).toBeLessThanOrEqual(view.x + view.width);
  });

  it('상자가 뷰박스보다 넓으면 왼쪽에 맞춘다 — 좌우 클램프가 서로 어긋나지 않게', () => {
    const box = placeTooltip({
      ...base,
      width: view.width + 100,
      pinX: view.x + view.width / 2,
      pinY: view.y + 200,
    });
    expect(box.x).toBe(view.x + 6);
  });
});

/**
 * 실제 사업장 10개소로 잘림을 센다. 좌표나 툴팁 치수가 바뀌면 여기서 먼저 걸린다 —
 * 브라우저를 열어 핀 열 개를 일일이 가리켜 확인할 수는 없다.
 */
describe('placeTooltip — 실제 사업장 좌표', () => {
  const view = PROVINCE_VIEWBOX;

  const cases = SITES.flatMap((site) =>
    [null, site.province].map((focused) => ({ site, focused })),
  );

  it.each(cases)('$site.name (확대: $focused) 툴팁이 지도 안에 있다', ({ site, focused }) => {
    // 컴포넌트가 그리는 것과 **같은 문자열·같은 함수**로 크기를 낸다
    const detail = site.status
      ? `${site.industry} · ${PROVISIONAL_STATUS_LABELS[site.status]} ${site.anomalyScore}`
      : `${site.industry} · 통신 두절`;
    const { width, height } = tooltipSize(site.name, detail);

    const focus = provinceFocus(focused);
    const { x, y } = projectToMap(site.coordinates[0], site.coordinates[1]);
    const box = placeTooltip({
      width,
      height,
      gap: TOOLTIP_PIN_GAP,
      padding: TOOLTIP_EDGE_PADDING,
      pinX: focus.translateX + focus.scale * x,
      pinY: focus.translateY + focus.scale * y,
      view,
    });

    expect(box.x).toBeGreaterThanOrEqual(view.x);
    expect(box.x + width).toBeLessThanOrEqual(view.x + view.width);
    expect(box.y).toBeGreaterThanOrEqual(view.y);
    expect(box.y + height).toBeLessThanOrEqual(view.y + view.height);
  });
});

/**
 * 툴팁 글자가 시도 라벨보다 작아지면 안 된다.
 *
 * 뷰박스가 화면에 맞춰지며 함께 줄어드는데, 지도 높이 하한 400px에서 배율이 0.73배다.
 * 라벨 11이 8px로 내려가는 것이 이미 읽기 한계로 잡혀 있다(site-map.tsx의 높이 주석).
 */
describe('툴팁 글자 크기', () => {
  it('상세 줄이 시도 라벨보다 작지 않다', () => {
    expect(TOOLTIP_DETAIL_SIZE).toBeGreaterThanOrEqual(MAP_LABEL_FONT_SIZE);
  });

  it('제목이 상세보다 크다', () => {
    expect(TOOLTIP_TITLE_SIZE).toBeGreaterThan(TOOLTIP_DETAIL_SIZE);
  });
});
