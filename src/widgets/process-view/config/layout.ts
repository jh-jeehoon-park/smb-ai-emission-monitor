/**
 * 공정도 좌표. 이 화면 전용 레이아웃이라 `shared`가 아니라 위젯이 갖는다
 * (지도 도형은 여러 화면이 쓰는 지리 데이터라 shared에 있다).
 *
 * **좌표는 전부 정수 상수다.** 계산해서 SVG 속성에 넣으면 Node와 Chrome의 부동소수
 * 말단 비트가 달라 속성 문자열이 갈리고 hydration이 깨진다(shared/lib/geo.ts와 같은 이유).
 */
export const NODE_WIDTH = 140;
export const NODE_HEIGHT = 112;
export const NODE_GAP = 34;
export const DIAGRAM_PADDING = 18;

export const DIAGRAM_WIDTH = DIAGRAM_PADDING * 2 + NODE_WIDTH * 6 + NODE_GAP * 5;
export const DIAGRAM_HEIGHT = 236;

export const NODE_TOP = 40;

/** 수조 바닥 띠의 두께. 물이 담기는 곳이라는 것만 전하고 값을 뜻하지 않는다 */
export const BASIN_FLOOR = 14;

export function nodeX(order: number): number {
  return DIAGRAM_PADDING + (order - 1) * (NODE_WIDTH + NODE_GAP);
}

export function nodeCenterY(): number {
  return NODE_TOP + NODE_HEIGHT / 2;
}
