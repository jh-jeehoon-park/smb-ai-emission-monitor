import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FLOW_FORECAST_CODE,
  FORECAST_TARGET_CODES,
  INFLOW_FORECAST_CODE,
  ORIGIN_DASH,
  SERIES_INK,
} from './config/constants';
import { SERIES_ORIGIN_LABELS } from './model/types';

/**
 * **겹침 차트에서 색은 항목을, 실선·파선은 출처를 맡는다** `[사용자 요청 2026-09-07]`.
 *
 * 앞선 판본은 그 둘이 뒤바뀌어 있었다 — 색이 출처라 **TN과 TP가 같은 색**이었고 항목은
 * 질감으로만 갈렸다. 2px 선에서 `7 4`와 `2 3`은 거의 같아 보여 셋이 한 선처럼 읽혔다.
 */
const css = readFileSync('src/app/globals.css', 'utf8');

/** 라이트에서 `--series-N`이 실제로 무슨 값인가. 첫 정의(`:root`)를 본다 */
function lightSlot(n: number): string {
  return /^\s*--series-\d+:\s*(.+);/m.exec(
    css.slice(css.indexOf(`--series-${n}:`)),
  )![1]!.trim();
}

describe('항목 색 — 겹치는 계열이 서로 갈린다', () => {
  /** 같은 그림에 겹치는 것끼리 색이 같으면 겹침 차트의 뜻이 없다 */
  it('수질 3종이 서로 다른 색이다', () => {
    const inks = FORECAST_TARGET_CODES.map((code) => SERIES_INK[code]);
    expect(new Set(inks).size).toBe(inks.length);
  });

  it('유입·유출이 서로 다른 색이다', () => {
    expect(SERIES_INK[INFLOW_FORECAST_CODE]).not.toBe(SERIES_INK[FLOW_FORECAST_CODE]);
  });

  /**
   * **순서를 돌려 쓰지 않는다.** 색은 항목에 붙고 목록의 자리에 붙지 않는다 — 필터로
   * 항목이 빠져도 남은 것의 색이 바뀌면 같은 항목이 화면마다 다른 색이 된다.
   */
  it('항목마다 색이 하나로 고정이다', () => {
    expect(SERIES_INK).toEqual({
      TOC: 'var(--series-1)',
      TN: 'var(--series-2)',
      TP: 'var(--series-3)',
      inflow: 'var(--series-1)',
      flow: 'var(--series-2)',
    });
  });
});

/**
 * **상태색·포인트색은 예약이다.** 계열이 그 색을 쓰면 등급을 뜻하지 않는 선이 등급으로
 * 읽힌다 — `screens.md` §8 `등급 색`·`포인트색`이 정한 것이다.
 */
describe('예약된 색을 계열로 쓰지 않는다', () => {
  const RESERVED = {
    '--normal': '#4caf50',
    '--caution': '#f9a825',
    '--warning': '#ef6c00',
    '--critical': '#d32f2f',
    '--accent': '#0d47a1',
  };

  it.each([1, 2, 3])('슬롯 %s가 예약된 값이 아니다', (n) => {
    const value = lightSlot(n).toLowerCase();
    for (const [name, hex] of Object.entries(RESERVED)) {
      expect(value, `슬롯 ${n}`).not.toBe(hex);
      expect(value, `슬롯 ${n}`).not.toBe(`var(${name})`);
    }
  });

  /** 슬롯 1은 새로 만들지 않고 기존 계열 토큰을 그대로 쓴다 — 값이 두 곳에 살면 갈린다 */
  it('슬롯 1은 `--actual`을 가리킨다', () => {
    expect(lightSlot(1)).toBe('var(--actual)');
  });

  /** 라이트·다크 두 벌이 있어야 한다 — 한 벌만 두면 다크에서 대비가 무너진다 */
  it('세 슬롯이 라이트·다크 두 벌로 정의돼 있다', () => {
    for (const n of [1, 2, 3]) {
      /* `:root`(라이트)와 다크 블록 두 벌. `@theme`의 `--color-series-N`은 이 패턴이 아니다 */
      expect((css.match(new RegExp(`  --series-${n}:`, 'g')) ?? []).length, `슬롯 ${n}`).toBe(2);
    }
  });
});

describe('출처는 질감이 맡는다', () => {
  it('계측은 실선, 추정은 파선이다', () => {
    expect(ORIGIN_DASH.measured).toBeUndefined();
    expect(ORIGIN_DASH.softSensed).toBeDefined();
  });

  /** 출처가 화면에서 사라지면 추정이 계측으로 읽힌다(E3) — 글자도 함께 남는다 */
  it('출처를 글자로도 적는다', () => {
    expect(SERIES_ORIGIN_LABELS.measured).toContain('계측');
    expect(SERIES_ORIGIN_LABELS.softSensed).toContain('추정');
  });
});
