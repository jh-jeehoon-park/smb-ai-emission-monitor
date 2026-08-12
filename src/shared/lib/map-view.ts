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
const FOCUS_PADDING = 12;

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
