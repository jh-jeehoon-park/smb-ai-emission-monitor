import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FLOW_CHART_HEIGHT, SIDE_CHART_HEIGHT, TILE_LABELS } from '../config/constants';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';

/**
 * **한 화면에서 세 자리가 같은 높이를 봐야 한다** `[사용자 지적 2026-09-07]` — 실제 차트 ·
 * 빈 상태 · 대기 스켈레톤. 세 곳에 숫자를 박아 두면 한 곳만 바뀌어도 값이 도착할 때 카드가
 * 튄다: **스켈레톤이 없애려던 점프를 스켈레톤이 만든다.**
 *
 * 렌더로 재우려면 Recharts의 `ResponsiveContainer`가 jsdom에서 0px을 재는 문제를 흉내 내야
 * 해서, 계약이 지켜지는지를 소스로 본다.
 */
const view = readFileSync('src/widgets/discharge-view/ui/discharge-view.tsx', 'utf8');
/** 주석에는 옛 값이 인용될 수 있다 — 코드만 본다 */
const code = view.replace(/^\s*[/*].*$/gm, '');

describe('금일 배출 차트 높이', () => {
  it('픽셀을 글자로 적지 않는다', () => {
    expect(code).not.toMatch(/h-\[\d+px\]/);
    expect(code).not.toMatch(/height=\{\d+\}/);
  });

  it('두 상수를 쓴다', () => {
    expect(code).toContain('FLOW_CHART_HEIGHT');
    expect(code).toContain('SIDE_CHART_HEIGHT');
  });

  /** 전폭 차트가 반폭 둘보다 높다 — 뒤집히면 나란한 카드가 더 커진다 */
  it('전폭이 더 높다', () => {
    expect(SIDE_CHART_HEIGHT).toBeLessThan(FLOW_CHART_HEIGHT);
  });
});

/**
 * 타일 넷의 제목은 스켈레톤과 실제가 **같은 순서**여야 한다. 순서는 읽는 차례이고
 * (내보내고 있나 → 얼마나 → 수조는 → 오늘 합쳐서) 값이 도착할 때 자리가 바뀌면 안 된다.
 */
describe('대기 타일 제목', () => {
  it('넷이다', () => {
    expect(TILE_LABELS).toHaveLength(4);
  });

  it('수위는 항목 사전에서 온다 — 글자로 박지 않는다', () => {
    expect(TILE_LABELS[2]).toBe(MEASUREMENT_ITEMS.level.label);
  });

  /** 실제 타일이 이 제목들을 그대로 쓰는지 — 어긋나면 대기 중에 다른 이름이 보인다 */
  it.each(TILE_LABELS.filter((label) => label !== MEASUREMENT_ITEMS.level.label))(
    '실제 타일도 `%s`를 쓴다',
    (label) => {
      expect(code).toContain(`label="${label}"`);
    },
  );

  it('수위 타일은 사전 값을 참조한다', () => {
    expect(code).toContain('label={LEVEL.label}');
  });
});
