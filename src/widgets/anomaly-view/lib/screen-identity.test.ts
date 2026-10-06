import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **두 화면이 같은 그림이면 안 된다** `[사용자 지적 2026-09-08]`.
 *
 * 이상 탐지와 통합 관제가 `<AnomalyPanel summary={…} legend={…} />`에 **같은 props**를
 * 넘겨 카드 제목까지 같았다. 「전용 페이지인데 디테일이 없다」는 지적이 그것이다.
 *
 * 되돌아가는 길은 하나다 — 이상 탐지가 `AnomalyPanel`을 다시 쓰는 것. 이 검사가 그 자리를
 * 지킨다. 화면을 눈으로 비교하는 것은 사람만 할 수 있으므로 **부품 공유**를 값으로 잠근다.
 */
const view = readFileSync('src/widgets/anomaly-view/ui/anomaly-view.tsx', 'utf8');

describe('이상 탐지 화면의 정체성', () => {
  it('`AnomalyPanel`을 쓰지 않는다 — 그것이 통합 관제의 카드다', () => {
    expect(view).not.toContain('AnomalyPanel');
  });

  it('이 화면에만 있는 조사 카드를 쓴다', () => {
    expect(view).toContain('RunInvestigation');
  });

  /** 통합 관제는 그대로여야 한다(**A2**) — 요청 범위 밖이다 */
  it('통합 관제는 `AnomalyPanel`을 그대로 쓴다', () => {
    const dashboard = readFileSync('src/widgets/dashboard/ui/dashboard-view.tsx', 'utf8');
    expect(dashboard).toContain('<AnomalyPanel');
  });

  /**
   * `focus`를 넘기는 화면은 이상 탐지 하나여야 한다. 다른 화면이 넘기기 시작하면 그 화면도
   * 구간을 고를 수 있다는 뜻인데, 고를 수단이 없으므로 선만 그어진다.
   */
  it('타임라인의 `focus`는 이 화면만 넘긴다', () => {
    const users = walk('src/widgets', '.tsx').filter((path) => {
      const source = readFileSync(path, 'utf8');
      return source.includes('<AnomalyTimeline') && /focus=\{/.test(source);
    });

    expect(users).toEqual(['src/widgets/anomaly-view/ui/anomaly-view.tsx']);
  });

  /**
   * **알람에서 들어온 사람이 그 시각으로 간다.** 이 화면에 오는 가장 흔한 경로이고,
   * 그 연결이 «접근한 이유에 답한다»의 절반이다.
   */
  it('알람 줄이 그 시각의 구간을 연다', () => {
    expect(view).toContain('onReveal={revealAlarm}');
    expect(view).toContain('timelineIndexAt(');
  });

  /** 고른 구간이 URL에 남아야 링크로 «왜 91점이지?»가 전달된다(§8 `URL 상태`·**P6**) */
  it('고른 구간이 URL에 남는다', () => {
    expect(view).toContain('useQueryState(');
    expect(view).toContain('RUN_QUERY_KEY');
  });

  /** 첫 응답 전에는 값을 그리지 않는다(§8 `로딩`) — 판독의 절반이 계측이다 */
  it('대기 중에는 스켈레톤이다', () => {
    expect(view).toContain('seriesPending ? (');
    expect(view).toContain('RunInvestigationSkeleton');
  });

  /**
   * 계산해 놓고 아무도 읽지 않던 `idleRuns`를 걷었다 — 패널이 같은 함수를 다시 부르고 있어
   * 렌더마다 두 번 돌았다.
   */
  it('죽은 계산이 없다', () => {
    expect(view).not.toContain('idleRuns:');
  });
});

/**
 * 두 결함은 **주기를 글자로 박아** 생겼다. 수집 주기가 1분으로 확정되면서 `[INC-111]`
 * 스크린리더 설명이 틀렸고 표가 120행이 됐다.
 */
describe('타임라인이 주기를 상수에서 읽는다', () => {
  const timeline = readFileSync('src/widgets/anomaly-timeline/ui/anomaly-timeline.tsx', 'utf8');
  const code = timeline.replace(/^\s*[/*].*$/gm, '');

  it('주기를 글자로 적지 않는다', () => {
    expect(code).not.toContain('5분 주기');
    expect(code).toContain('COLLECTION_INTERVAL_MINUTES');
  });

  it('표 행 간격을 표본 수로 박지 않는다', () => {
    expect(code).not.toMatch(/sampleEvery=\{\d+\}/);
    expect(code).toContain('minutesToSamples(');
  });
});

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(path, ext));
    else if (entry.name.endsWith(ext)) out.push(path);
  }
  return out;
}
