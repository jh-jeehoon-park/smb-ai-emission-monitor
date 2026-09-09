import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  TELEMETRY_PENDING_NOTE,
  TELEMETRY_STATUS_LABELS,
  telemetrySourceLabel,
} from './constants';

/**
 * 원천 배지의 문구를 못박는다.
 *
 * **«진짜냐»가 아니라 «어디서 오느냐»로 가른다** `[사용자 결정 2026-09-01]`. 계측 서버로
 * 들어오는 값도 센서에서 온 것이 아니라 에뮬레이터 출력이라 `[사용자 확인 2026-09-01]`,
 * 한쪽을 `실측`이라 부르면 다른 쪽이 시연이라는 **거짓 대비**가 선다(**E3**·**E4**).
 */
describe('원천 배지 문구', () => {
  it('어느 상태도 관측이라 주장하지 않는다', () => {
    for (const label of Object.values(TELEMETRY_STATUS_LABELS)) {
      expect(label).not.toMatch(/실측|실제 계측|관측/);
    }
  });

  it('아직 모르는 것을 미연결이라 적지 않는다', () => {
    expect(TELEMETRY_STATUS_LABELS.pending).not.toMatch(/미연결|두절|없음/);
  });

  it('접속 정보 없음은 실패로 적지 않는다', () => {
    expect(telemetrySourceLabel('fallback', 'unconfigured')).toBe('내장 데이터');
    expect(telemetrySourceLabel('fallback', 'unreachable')).toMatch(/서버 미연결/);
  });

  /**
   * 헤더가 `live` 문구를 하드코딩해 두 벌이 된 적이 있다 — 문구를 고쳐도 헤더만 옛말로
   * 남았다. 상수를 읽는지 소스로 확인한다: 렌더 테스트로는 두 벌이 같은 값일 때 통과한다.
   */
  it('헤더가 문구를 다시 적지 않는다', () => {
    const shell = readFileSync('src/widgets/app-shell/ui/app-shell.tsx', 'utf8');
    expect(shell).toContain('TELEMETRY_STATUS_LABELS.live');
    expect(shell.replace(/^\s*\*.*$/gm, '')).not.toMatch(/수신 중 ·/);
  });
});

/**
 * 화면 안에서 대기 자리를 채우는 한 줄 `[사용자 지적 2026-09-07]`.
 *
 * 배지와 **같은 규약을 받는다** — 확인된 부재의 어휘를 쓰지 않는다. 실제로 그 어휘를 그대로
 * 쓰고 있던 자리가 여섯 화면에 있었다(`통신 두절 — 수신 없음` · `이 구간에 표본이 없습니다` ·
 * `계측값이 없어 산출 불가` · `결측 없음` · `그 시각 수신값이 없습니다` · `초과 0건`).
 */
describe('대기 문구', () => {
  it('확인된 부재의 어휘를 쓰지 않는다', () => {
    expect(TELEMETRY_PENDING_NOTE).not.toMatch(/없음|없습니다|두절|불가|미연결|결측/);
  });

  /** 「받고 있다」는 사실을 말해야 한다 — 빈 문자열이나 `…`로는 무엇을 기다리는지 알 수 없다 */
  it('무엇을 기다리는지 말한다', () => {
    expect(TELEMETRY_PENDING_NOTE).toMatch(/계측/);
    expect(TELEMETRY_PENDING_NOTE.length).toBeGreaterThan(6);
  });

  /**
   * **화면마다 다시 적지 않는다.** 열 곳 넘는 자리가 이 문구를 쓰는데 각자 글자로 적으면
   * 같은 상태가 화면마다 다른 말로 보인다 — 원천 배지에서 이미 겪은 일이다(위 검사).
   */
  it.each([
    'src/widgets/discharge-view/ui/discharge-view.tsx',
    'src/widgets/bucket-report/ui/bucket-report-panel.tsx',
    'src/widgets/timeseries-view/ui/timeseries-view.tsx',
    'src/widgets/reports-view/ui/reports-view.tsx',
    'src/widgets/optimization-view/ui/optimization-view.tsx',
    'src/widgets/anomaly-view/ui/idle-discharge-panel.tsx',
    'src/widgets/alarms-view/ui/alarm-detail-modal.tsx',
    /*
     * `daily-ribbon`은 목록에서 빠졌다 `[사용자 요청 2026-09-08]` — 상태 띠 셋이 걷히면서
     * 리본이 계측 계열을 아예 읽지 않게 됐고, 기다릴 것이 없어 스켈레톤도 함께 사라졌다.
     */
  ])('%s가 상수를 읽는다', (path) => {
    const source = readFileSync(path, 'utf8');
    expect(source).toContain('TELEMETRY_PENDING_NOTE');
    /* 주석은 뺀다 — 옛 문구를 «이렇게 적었다»로 인용하는 자리가 있다 */
    expect(source.replace(/^\s*[/*].*$/gm, '')).not.toContain(TELEMETRY_PENDING_NOTE);
  });
});
