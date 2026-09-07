import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITES } from '@/entities/site';
import { TIMELINE_POINT_COUNT } from '@/shared/lib/timeline';
import { getAnomalySeries } from '@/entities/anomaly';
import { buildRibbon } from './ribbon-rows';

/**
 * **빈 계열로 리본을 지으면 던진다 — 그것이 옳다** `[사용자 지적 2026-09-07]`.
 *
 * `pending`을 빈 계열로 바꾼 뒤 **사업장 상세 화면이 렌더 중에 터졌다**: `assertFullDay`가
 * *"리본 '가동' 표본 0개 — 1440개여야 한다"* 를 던졌다. 그 단정은 네 행의 같은 x가 같은
 * 시각을 가리키게 하는 장치이고, 무르면 리본이 **어긋난 시간축을 조용히 그린다** — 겹쳐
 * 보는 목적 자체가 무너진다.
 *
 * 그래서 고친 곳은 단정이 아니라 **부르는 자리**다. 이 검사가 두 사실을 함께 잠근다.
 */
const site = SITES[0]!;

describe('빈 계열은 리본을 지을 수 없다', () => {
  it('던진다 — 단정을 무르지 않았다', () => {
    expect(() => buildRibbon(site.id, [], getAnomalySeries(site.id), [])).toThrowError(
      /표본 0개/,
    );
  });

  /** 시간축이 1440인지가 아니라 **한 값에서 온다**는 것이 요점이다 */
  it('요구 표본 수는 시간축에서 온다', () => {
    expect(TIMELINE_POINT_COUNT).toBeGreaterThan(0);
  });
});

/**
 * **부르는 자리가 막는다.** 화면이 `pending`일 때 `buildRibbon`을 부르지 않고 스켈레톤을
 * 그린다 — 그 계약이 소스에 남아 있는지 본다. 훅·TanStack에 걸려 있어 렌더로 재현하려면
 * 브라우저 상태를 흉내 내야 하고, 그러면 검사가 흉내를 검사한다.
 */
describe('사업장 상세는 대기 중에 리본을 짓지 않는다', () => {
  const view = readFileSync('src/widgets/admin-overview/ui/admin-overview-view.tsx', 'utf8');

  it('대기면 `null`을 두고 스켈레톤을 그린다', () => {
    expect(view).toMatch(/ribbon:\s*seriesPending\s*\?\s*null\s*:\s*buildRibbon\(/);
    expect(view).toContain('<DailyRibbonSkeleton />');
  });

  /**
   * `useMemo`가 `seriesPending`을 의존성에 넣지 않으면 **한 번 계산된 `null`이 굳는다** —
   * 값이 도착해도 스켈레톤이 남는다. 계열(`series`)이 함께 바뀌어 실제로는 다시 계산되지만,
   * 그 우연에 기대지 않는다.
   */
  it('대기 여부가 의존성에 있다', () => {
    expect(view).toMatch(/\[siteId,\s*series,\s*seriesPending\]/);
  });
});

/**
 * **스켈레톤과 실제가 같은 값을 본다.**
 *
 * 스켈레톤이 자리를 지키는 이유는 값이 도착할 때 카드가 흔들리지 않게 하려는 것이다 —
 * 높이를 글자로 박아 두면 그 목적이 스스로 깨진다(한쪽만 바뀌어 **스켈레톤이 점프를 만든다**).
 */
describe('리본 스켈레톤은 실제 상수를 읽는다', () => {
  const skeleton = readFileSync('src/widgets/daily-ribbon/ui/daily-ribbon-skeleton.tsx', 'utf8');

  it.each([
    'RIBBON_GRID_ROWS',
    'RIBBON_LABEL_WIDTH',
    'RIBBON_ROW_GAP',
    'RIBBON_SCORE_HEIGHT',
    'RIBBON_STRIP_HEIGHT',
  ])('%s를 상수에서 읽는다', (name) => {
    expect(skeleton).toContain(name);
  });

  /** 픽셀 값이 글자로 들어오는 것을 막는다 — 상수를 우회한 흔적이다 */
  it('높이·폭을 글자로 적지 않는다', () => {
    expect(skeleton.replace(/^\s*[/*].*$/gm, '')).not.toMatch(/h-\[\d+px\]|height:\s*\d+/);
  });

  /** 상태 띠는 셋이다 — 하나가 빠지면 값이 도착할 때 표가 한 줄 늘어난다 */
  it('상태 띠 세 줄을 그린다', () => {
    expect(skeleton).toMatch(/\['가동',\s*'방류',\s*'수신'\]/);
  });
});
