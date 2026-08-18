import type { Rect } from '@/shared/lib/map-view';
import {
  TOOLTIP_DETAIL_SIZE,
  TOOLTIP_LINE_GAP,
  TOOLTIP_PADDING_X,
  TOOLTIP_PADDING_Y,
  TOOLTIP_TITLE_SIZE,
} from '../config/constants';

/**
 * 글자 폭 어림.
 *
 * **SVG에는 텍스트 레이아웃이 없다.** 배경 상자를 그리려면 폭을 직접 재야 하는데,
 * 실제 측정(`getBBox`)은 렌더 후에만 가능해 서버에서는 부를 수 없다 — 렌더 중에 쓰면
 * 서버와 클라이언트가 다른 상자를 그려 hydration이 깨진다.
 *
 * 한글은 폰트 크기와 거의 같은 폭을, 라틴·숫자는 그 절반쯤을 차지한다.
 * 어림이므로 **넉넉한 쪽으로 틀리게** 잡는다 — 좁게 틀리면 글자가 상자 밖으로 나간다.
 */
export function estimateSvgTextWidth(text: string, fontSize: number): number {
  let units = 0;

  for (const char of text) {
    if (char === ' ') units += 0.32;
    else if (isFullWidth(char)) units += 1;
    else units += 0.56;
  }

  return units * fontSize;
}

/** 한글 음절·자모와 전각 기호(·, ㆍ 등)를 전각으로 본다 */
function isFullWidth(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0x3130 && code <= 0x318f) ||
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0xff01 && code <= 0xff60) ||
    char === '·'
  );
}

/**
 * 두 줄 툴팁의 상자 크기.
 *
 * 컴포넌트와 테스트가 **같은 값**을 봐야 잘림 검사가 실물을 지킨다. 테스트가 넉넉한
 * 상수를 따로 들고 있으면, 사업장명이 길어져 상자가 커져도 검사는 계속 통과한다.
 */
export function tooltipSize(title: string, detail: string): { width: number; height: number } {
  return {
    width:
      Math.max(
        estimateSvgTextWidth(title, TOOLTIP_TITLE_SIZE),
        estimateSvgTextWidth(detail, TOOLTIP_DETAIL_SIZE),
      ) +
      TOOLTIP_PADDING_X * 2,
    height: TOOLTIP_TITLE_SIZE + TOOLTIP_LINE_GAP + TOOLTIP_DETAIL_SIZE + TOOLTIP_PADDING_Y * 2,
  };
}

export interface TooltipBox {
  /** 상자 좌상단 (뷰박스 좌표) */
  x: number;
  y: number;
  /** 핀 아래에 놓였는가 — 꼬리 방향을 정한다 */
  below: boolean;
}

/**
 * 툴팁을 잘리지 않는 자리에 놓는다.
 *
 * **뷰박스 밖으로 나간 부분은 그대로 사라진다.** 지도 가장자리 사업장(제주·강원 동해안)
 * 에서 실제로 그렇다 — 위로만 띄우면 북쪽 끝 핀의 툴팁이, 가운데 정렬만 하면 동서 끝
 * 핀의 툴팁이 잘린다. 위가 모자라면 아래로 뒤집고, 좌우는 가장자리에 붙여 세운다.
 */
export function placeTooltip(args: {
  /** 변환이 끝난 뒤의 핀 위치(뷰박스 좌표) */
  pinX: number;
  pinY: number;
  width: number;
  height: number;
  /** 핀과 상자 사이 간격 */
  gap: number;
  /** 뷰박스 가장자리에서 띄울 여백 */
  padding: number;
  view: Rect;
}): TooltipBox {
  const { pinX, pinY, width, height, gap, padding, view } = args;

  const below = pinY - gap - height < view.y + padding;
  const y = below ? pinY + gap : pinY - gap - height;

  const minX = view.x + padding;
  const maxX = view.x + view.width - width - padding;
  const centered = pinX - width / 2;
  // 상자가 뷰박스보다 넓으면 maxX < minX가 된다. 그때는 왼쪽에 맞춘다
  const x = maxX < minX ? minX : Math.min(Math.max(centered, minX), maxX);

  return { x, y, below };
}
