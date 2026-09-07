import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TELEMETRY_STATUS_LABELS, telemetrySourceLabel } from './constants';

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
