import { PROVINCE_SHAPES, PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import { roundTo } from '@/shared/lib/prng';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 확대 상한.
 *
 * 시도 경로는 이 크기에서 보려고 Douglas-Peucker 0.8px로 단순화해 구운 데이터다.
 * 확대하면 그 오차가 그대로 커져 3배에서 2.4px — 해안선이 각져 보이기 시작한다.
 * 광역시는 도형이 작아 계산상 8배까지 나오므로 반드시 여기서 묶는다.
 * 더 키우려면 원본에서 더 촘촘한 허용오차로 다시 구워야 한다.
 */
export const MAX_MAP_ZOOM = 3;

/** 확대했을 때 경계가 패널 가장자리에 붙지 않도록 남기는 여백(뷰박스 단위) */
const FOCUS_PADDING = 0;

/** 좌표를 소수 셋째 자리에서 끊는 이유는 geo.ts와 같다 */
const TRANSFORM_DECIMALS = 3;

function computeBBox(d: string): Rect {
  const nums = d.match(/-?[0-9.]+/g);
  if (!nums || nums.length < 2) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 도형 데이터가 고정이라 한 번만 계산하고 붙잡아 둔다 */
const bboxes = new Map<string, Rect>();

export function provinceBBox(name: string): Rect | null {
  const cached = bboxes.get(name);
  if (cached) return cached;

  const shape = PROVINCE_SHAPES.find((p) => p.name === name);
  if (!shape) return null;

  const box = computeBBox(shape.d);
  bboxes.set(name, box);
  return box;
}

export interface MapFocus {
  scale: number;
  translateX: number;
  translateY: number;
}

export const MAP_FOCUS_NONE: MapFocus = { scale: 1, translateX: 0, translateY: 0 };

/**
 * 시도 하나가 화면을 채우도록 하는 변환.
 *
 * viewBox를 바꾸지 않고 그룹에 transform을 거는 이유는 CSS 전환을 쓸 수 있어서다.
 * viewBox 속성은 CSS로 부드럽게 이어지지 않는다. 감속 설정은 전역 CSS가 처리한다.
 */
/**
 * 시도 **한 장만** 그리는 지도의 뷰박스(기초지자체 화면).
 *
 * 전국 뷰박스는 **세로로 긴 상자**다(307.5×548.4, 화면비 0.56) — 남한이 그런 모양이기
 * 때문이다. 그런데 시도 하나는 대개 정사각형에 가깝다(경상북도 0.93). 세로 상자에
 * 정사각형을 넣으면 **위아래가 비고 확대는 가로에서 먼저 막힌다** — 경북은 확대 후
 * 가로 86%를 쓰는데 세로는 52%만 쓴다. 칸이 가로로 남아도 도형이 커지지 못한다.
 *
 * **가로는 그대로 두고 세로만 잘라낸다.** 뷰박스 화면비가 칸에 가까워져 가로 폭을 다 쓰고,
 * 도형·핀·라벨·툴팁이 **같은 비율로 함께** 커진다(경북에서 1.27배).
 *
 * **가로를 건드리지 않는 것이 중요하다.** 화면 상수를 되돌리는 배율(`focus.scale`)은
 * 가로 기준이라, 폭을 바꾸면 라벨·핀·툴팁을 되돌리는 자리마다 배율을 다시 맞춰야 한다 —
 * 그렇게 했다가 두 곳을 놓쳐 지도가 사라지고 툴팁이 6배가 됐다.
 *
 * `FOCUS_PADDING`(확대 배율)과는 다른 축이다. 그쪽은 **얼마나 확대할지**를 정하고
 * 이쪽은 **확대한 것을 칸에 어떻게 앉힐지**를 정한다.
 */
const SINGLE_VIEW_PADDING = 24;

export function singleProvinceView(name: string | null): Rect {
  const box = name ? provinceBBox(name) : null;
  if (!box || box.height === 0) return PROVINCE_VIEWBOX;

  /* 확대한 뒤의 세로 폭에 여백을 더한다. 전국 뷰박스보다 커질 일은 없지만 묶어 둔다 */
  const height = Math.min(
    PROVINCE_VIEWBOX.height,
    box.height * provinceFocus(name).scale + SINGLE_VIEW_PADDING * 2,
  );

  /*
   * **중심을 옮기지 않는다.** `provinceFocus`가 도형을 전국 뷰박스의 중심에 놓으므로
   * 잘라낸 뷰박스도 그 중심을 그대로 둬야 도형이 가운데 온다.
   */
  const centerY = PROVINCE_VIEWBOX.y + PROVINCE_VIEWBOX.height / 2;

  return {
    x: PROVINCE_VIEWBOX.x,
    y: roundTo(centerY - height / 2, TRANSFORM_DECIMALS),
    width: PROVINCE_VIEWBOX.width,
    height: roundTo(height, TRANSFORM_DECIMALS),
  };
}

export function provinceFocus(name: string | null): MapFocus {
  if (!name) return MAP_FOCUS_NONE;

  const box = provinceBBox(name);
  if (!box || box.width === 0 || box.height === 0) return MAP_FOCUS_NONE;

  // 이동값은 **반올림한 배율**로 계산한다. 서로 다른 배율을 쓰면 중심이 어긋난다
  const scale = roundTo(
    Math.min(
      MAX_MAP_ZOOM,
      PROVINCE_VIEWBOX.width / (box.width + FOCUS_PADDING * 2),
      PROVINCE_VIEWBOX.height / (box.height + FOCUS_PADDING * 2),
    ),
    TRANSFORM_DECIMALS,
  );

  // 시도의 중심이 뷰박스 중심에 오도록 민다
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const viewCenterX = PROVINCE_VIEWBOX.x + PROVINCE_VIEWBOX.width / 2;
  const viewCenterY = PROVINCE_VIEWBOX.y + PROVINCE_VIEWBOX.height / 2;

  return {
    scale,
    translateX: roundTo(viewCenterX - scale * centerX, TRANSFORM_DECIMALS),
    translateY: roundTo(viewCenterY - scale * centerY, TRANSFORM_DECIMALS),
  };
}
