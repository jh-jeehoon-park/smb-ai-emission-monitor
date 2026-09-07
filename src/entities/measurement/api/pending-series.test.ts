import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TB_FIRST_LOAD_DEADLINE_MS } from '@/shared/api/thingsboard';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';

/**
 * **`pending`은 값을 들지 않는다** `[사용자 지적 2026-09-07]`.
 *
 * 한때 첫 응답이 오기 전 상태가 내장 데이터를 들고 있었다 — **답이 아닐 수 있는 값이
 * 답의 자리에** 앉았고, 응답이 오면 카드가 눈에 보이게 다시 그려졌다. «모른다»와
 * «이 값이다»를 가르는 규약(**E4**)을 라벨에만 적용하고 그림에는 적용하지 않고 있었다.
 *
 * 훅은 브라우저 상태(TanStack·타이머·네트워크)에 걸려 있어 jsdom으로 통째로 돌리면
 * 흉내를 검사하게 된다. 그래서 **계약이 지켜지는지**를 소스로 본다 — 되돌아가는 길이
 * 딱 몇 군데다.
 */
const hook = readFileSync('src/entities/measurement/api/use-site-series.ts', 'utf8');

/** `pendingSeries`가 만드는 모양 */
const pendingBody = hook.slice(
  hook.indexOf('function pendingSeries'),
  hook.indexOf('const settledSites'),
);

/** `fromFixture`가 만드는 모양 */
const fixtureBody = hook.slice(
  hook.indexOf('function fromFixture'),
  hook.indexOf('function pendingSeries'),
);

describe('pending — 아직 모르는 계열', () => {
  it('빈 계열이다 — 내장 데이터를 들지 않는다', () => {
    expect(pendingBody).toContain('points: []');
    expect(pendingBody).not.toContain('getMeasurementSeries');
  });

  it('상태가 `pending`이고 실패 이유가 없다', () => {
    expect(pendingBody).toContain("status: 'pending'");
    expect(pendingBody).toContain('failure: null');
  });
});

describe('fallback — 확인된 미도달', () => {
  /** 내장 데이터는 여기서만 쓴다. 그것이 이 단계의 **정식 대체 원천**이다 */
  it('내장 데이터를 들고 상태가 `fallback`이다', () => {
    expect(fixtureBody).toContain('getMeasurementSeries');
    expect(fixtureBody).toContain("status: 'fallback'");
  });

  /**
   * **`pending`으로 되돌아갈 길을 막는다.** 한때 이 함수가 `failure`가 `null`이면
   * `pending`을, 있으면 `fallback`을 돌려주어 **두 상태가 같은 값을 들었다** — 소비처가
   * 둘을 가릴 수 없었다.
   */
  it('실패 이유를 반드시 받는다 — `pending`을 만들 수 없다', () => {
    expect(fixtureBody).toContain('failure: TbFailure)');
    expect(fixtureBody).not.toContain("failure === null ? 'pending'");
  });
});

/**
 * **스켈레톤이 떠 있는 시간이 곧 이 숫자다.**
 *
 * 예산을 그대로 두면 최악 94초다 — 요청 둘(장비 등록부·계측) × 4회 시도 × 10초 타임아웃
 * + 백오프 7초. 첫 로드 전체에 마감을 하나 걸어 그 시간을 묶는다.
 */
describe('첫 로드 마감', () => {
  it('첫 로드에만 걸고 배경 갱신은 예산을 그대로 쓴다', () => {
    expect(hook).toContain('const firstLoad = !settledSites.has(siteId)');
    expect(hook).toMatch(/firstLoad\s*\n?\s*\?\s*await withDeadline/);
  });

  /** 마감이 폴링 주기를 넘으면 뜻이 없다 — 다음 폴링이 어차피 다시 물어본다 */
  it('마감이 폴링 주기보다 짧다', () => {
    expect(TB_FIRST_LOAD_DEADLINE_MS).toBeLessThan(COLLECTION_INTERVAL_MINUTES * 60_000);
  });

  /** 사람이 스켈레톤을 보고 있는 시간이다 — 초 단위로 길어지면 빈 화면과 같아진다 */
  it('마감이 3초를 넘지 않는다', () => {
    expect(TB_FIRST_LOAD_DEADLINE_MS).toBeLessThanOrEqual(3_000);
  });
});

/**
 * **격자가 스스로 가른다.** 쓰는 화면 넷이 같은 분기를 네 번 적으면 한 곳만 빠뜨려도
 * 그 화면에서만 옛 동작이 남는다 — 화면에서는 원인을 알 수 없다.
 */
describe('계측 격자를 쓰는 화면이 pending을 넘긴다', () => {
  const HOSTS = [
    'src/widgets/dashboard/ui/dashboard-view.tsx',
    'src/widgets/admin-overview/ui/admin-overview-view.tsx',
    'src/widgets/timeseries-view/ui/timeseries-view.tsx',
    'src/widgets/jurisdiction-view/ui/jurisdiction-view.tsx',
  ];

  it.each(HOSTS)('%s', (path) => {
    const source = readFileSync(path, 'utf8');

    expect(source, '격자를 쓰지 않는 화면이 목록에 있다').toContain('<WaterQualityGrid');
    expect(source).toContain("status: seriesStatus } = useSiteSeries");
    expect(source).toContain('pending={seriesPending}');
  });
});
