// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getAlarmsForView } from '@/entities/alarm';
import { AlarmList } from './alarm-list';
import styles from './alarm-list.module.scss';

afterEach(cleanup);

/**
 * **첫 항목만 위 여백을 뺀다.** 패널이 이미 위쪽 여백을 주므로 첫 항목에 또 주면 목록이 처진다.
 *
 * 전에는 `article`에 `first:pt-0`을 걸었는데, 이 `article`은 `RiseItem` 안에 있어 항상 자기
 * 부모의 첫 자식이다 — 그래서 **모든** 항목에 `pt-0`이 걸려 둘째부터 위 여백이 사라졌다.
 * 클래스 이름이 아니라 **몇 번째 항목인지**로 검사한다.
 *
 * 여백 값은 모듈 SCSS에 있다 — jsdom은 스타일시트를 적용하지 않으므로 **어느 규칙이 붙었는가**는
 * 요소에서, **그 규칙이 무엇을 하는가**는 SCSS 원문에서 본다.
 */
const scss = readFileSync('src/widgets/alarm-list/ui/alarm-list.module.scss', 'utf8');

/** 중첩 없는 한 규칙의 본문. 없으면 빈 문자열이라 아래 단언이 함께 실패한다 */
const ruleBody = (name: string) => scss.match(new RegExp(String.raw`\.${name}\s*\{([^{}]*)\}`))?.[1] ?? '';

describe('알람 목록 위 여백', () => {
  const alarms = getAlarmsForView('S-02');

  it('위 여백 규칙은 위쪽 12px만, 기본 규칙은 아래쪽 12px을 준다', () => {
    expect(ruleBody('itemAfterFirst')).toMatch(/padding-top:\s*sp\(3\)/);
    expect(ruleBody('item')).toMatch(/padding-bottom:\s*sp\(3\)/);
    expect(ruleBody('item')).not.toMatch(/padding-top/);
  });

  it('여러 건일 때 첫 항목만 위 여백이 없다', () => {
    expect(alarms.length).toBeGreaterThan(1);
    const { container } = render(
      <AlarmList alarms={alarms} nowIso={DEMO_NOW_ISO} selectedSiteId="S-02" />,
    );
    const items = [...container.querySelectorAll('article')];
    expect(items).toHaveLength(alarms.length);

    expect(items[0]!.classList.contains(styles.itemAfterFirst)).toBe(false);
    for (const item of items.slice(1)) {
      expect(item.classList.contains(styles.itemAfterFirst)).toBe(true);
    }
  });

  it('한 건뿐이면 위 여백이 없다', () => {
    const { container } = render(
      <AlarmList alarms={alarms.slice(0, 1)} nowIso={DEMO_NOW_ISO} selectedSiteId="S-02" />,
    );
    expect(container.querySelector('article')!.classList.contains(styles.itemAfterFirst)).toBe(false);
  });

  /** 아래 여백은 모든 항목이 갖는다 — 구분선과 다음 항목이 붙어 보이면 안 된다 */
  it('아래 여백은 전 항목에 있다', () => {
    const { container } = render(
      <AlarmList alarms={alarms} nowIso={DEMO_NOW_ISO} selectedSiteId="S-02" />,
    );
    for (const item of container.querySelectorAll('article')) {
      expect(item.classList.contains(styles.item)).toBe(true);
    }
  });
});
