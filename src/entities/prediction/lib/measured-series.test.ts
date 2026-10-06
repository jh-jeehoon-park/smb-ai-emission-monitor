import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FORECAST_SERIES_CODES } from '../config/constants';
import { getFlowForecast, getForecast } from '../api/fixtures';
import { toMeasuredSeries, type SeriesSample } from './measured-series';

/**
 * **오염도 추정이 계측을 보게 됐다** `[사용자 요청 2026-09-08]`.
 *
 * 그전에는 다섯 계열(TOC·TN·TP·유입·유출)이 전부 시드 난수 생성값이었다 — 서버에 채널이 다
 * 있고 다른 화면들은 실측을 보는데 이 화면만 그랬고, 그러면서 TOC·유량을 **`직접 계측`이라
 * 적었다**(**E3**). 같은 사업장의 TOC를 시계열 화면은 4.4로, 이 화면은 25.5 언저리로 말했다.
 */
const sample = (t: string, v: Partial<SeriesSample> = {}): SeriesSample => ({
  t,
  TOC: null,
  TN: null,
  TP: null,
  inflow: null,
  flow: null,
  ...v,
});

const WINDOW: SeriesSample[] = [
  sample('2026-09-08T09:00:00Z', { TOC: 4.4, TN: 1.6, TP: 0.28, inflow: 788, flow: 453 }),
  sample('2026-09-08T09:01:00Z'),
  sample('2026-09-08T09:02:00Z', { TOC: 4.6, TN: 1.7, TP: 0.3, inflow: 790, flow: 455 }),
];

describe('계측 계열 옮기기', () => {
  it('다섯 계열을 모두 만든다', () => {
    const measured = toMeasuredSeries(WINDOW);
    expect(Object.keys(measured).sort()).toEqual([...FORECAST_SERIES_CODES].sort());
  });

  it('시각과 값을 그대로 옮긴다', () => {
    const { TOC, flow } = toMeasuredSeries(WINDOW);
    expect(TOC[0]).toEqual({ t: WINDOW[0]!.t, value: 4.4 });
    expect(flow[2]).toEqual({ t: WINDOW[2]!.t, value: 455 });
  });

  /** 결측을 0으로 채우면 «그때 0이었다»는 사실 주장이 된다(**E4**) */
  it('결측은 `null`로 남는다 — 값을 지어내지 않는다', () => {
    const { TOC, TN } = toMeasuredSeries(WINDOW);
    expect(TOC[1]!.value).toBeNull();
    expect(TN[1]!.value).toBeNull();
  });

  it('빈 창은 빈 계열이다', () => {
    const measured = toMeasuredSeries([]);
    for (const code of FORECAST_SERIES_CODES) expect(measured[code]).toEqual([]);
  });
});

describe('요약이 받은 계열을 쓴다', () => {
  const measured = toMeasuredSeries(WINDOW);

  /** 이것이 이 작업의 요점이다 — 지어낸 값이 아니라 **받은 값**이 차트에 간다 */
  it('오염도 계열이 받은 그대로다', () => {
    expect(getForecast('S-01', 'TOC', measured).points).toEqual(measured.TOC);
    expect(getForecast('S-01', 'TN', measured).points).toEqual(measured.TN);
  });

  it('수량 계열도 받은 그대로다', () => {
    expect(getFlowForecast('S-01', 'inflow', measured).points).toEqual(measured.inflow);
    expect(getFlowForecast('S-01', 'flow', measured).points).toEqual(measured.flow);
  });

  /**
   * 경향 카드도 같은 계열에서 나와야 한다 — 차트와 카드가 다른 원천을 보면 그래프가 내려가는데
   * 카드가 `상승`이라 말할 수 있다(그 결함을 한 번 겪었다).
   */
  it('경향 카드의 값이 계열의 마지막 값이다', () => {
    const trends = getForecast('S-01', 'TOC', measured).trends;
    expect(trends.find((t) => t.code === 'TOC')?.value).toBe(4.6);
    expect(trends.find((t) => t.code === 'TP')?.value).toBe(0.3);
  });

  /** 수량만 보고 있어도 경향 카드는 오염도 3항목이다(FR-12) — 그 값도 받은 계열에서 온다 */
  it('수량 보기에서도 경향 카드가 받은 계열을 쓴다', () => {
    const trends = getFlowForecast('S-01', 'flow', measured).trends;
    expect(trends.find((t) => t.code === 'TN')?.value).toBe(1.7);
  });

  /** 안 넘기면 내장 생성값이다 — 서버에 못 닿을 때의 대체 */
  it('넘기지 않으면 지어낸 계열이다', () => {
    const generated = getForecast('S-01', 'TOC').points;
    expect(generated).not.toEqual(measured.TOC);
    expect(generated.length).toBeGreaterThan(WINDOW.length);
  });
});

/**
 * **한 사업장을 화면마다 다르게 말하지 않는다**(**E1**·**E3**).
 *
 * 오염도 판정과 계열은 네 화면에 나온다 — 오염도 추정 · 통합 관제 · 관내 감독 · 리포트.
 * 한 곳만 계열을 안 넘기면 그 화면의 TOC가 다른 셋과 갈린다.
 */
describe('오염도를 그리는 화면이 모두 계측을 넘긴다', () => {
  const HOSTS = [
    'src/widgets/prediction-view/ui/prediction-view.tsx',
    'src/widgets/dashboard/ui/dashboard-view.tsx',
    'src/widgets/jurisdiction-view/ui/jurisdiction-view.tsx',
    'src/widgets/reports-view/ui/reports-view.tsx',
  ];

  it.each(HOSTS)('%s', (path) => {
    const source = readFileSync(path, 'utf8');
    expect(source, '계측을 옮기지 않는다').toContain('toMeasuredSeries(');
    expect(source, '창을 자르지 않으면 24시간이 통째로 간다').toContain('SERIES_WINDOW_HOURS');
  });

  /**
   * 계열을 안 넘기는 호출이 한 곳이라도 남으면 **그 화면만 지어낸 값을 그린다.** 인자 하나로
   * 부르는 꼴(`getForecast(siteId)`)을 소스에서 잡는다 — 그것이 옛 호출 모양이다.
   *
   * 위 목록은 손으로 적은 것이라 새 화면이 늘면 놓친다. 이 검사가 그 자리를 지킨다.
   */
  it('계열 없이 부르는 화면이 없다', () => {
    const bare = walk('src/widgets', '.tsx').filter((path) =>
      /get(?:Flow)?Forecast\(\s*[\w.]+\s*\)/.test(readFileSync(path, 'utf8')),
    );

    expect(bare, '계측 계열을 넘기지 않는 호출이 남아 있다').toEqual([]);
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
