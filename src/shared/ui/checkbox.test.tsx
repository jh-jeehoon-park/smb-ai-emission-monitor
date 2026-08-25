// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';

/**
 * 기본 그림을 걷어내고 네모를 직접 그리므로, **걷어내면서 같이 잃기 쉬운 것**을 고정한다 —
 * 라벨 연결, 키보드(Space), 그리고 체크 표시가 켠 상태에서만 보인다는 것.
 * 색·모서리 같은 생김새는 검사하지 않는다(값이 바뀌면 테스트만 깨진다).
 */
afterEach(cleanup);

function Harness() {
  const [on, setOn] = useState(false);
  return (
    <label>
      <Checkbox checked={on} onChange={(event) => setOn(event.target.checked)} />
      아이디 저장
    </label>
  );
}

describe('체크박스', () => {
  it('라벨 글자를 눌러도 켜진다', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const box = screen.getByRole('checkbox');
    expect(box).not.toBeChecked();

    await user.click(screen.getByText('아이디 저장'));
    expect(box).toBeChecked();
  });

  it('탭으로 옮겨 스페이스로 켜고 끈다', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole('checkbox')).toHaveFocus();

    await user.keyboard(' ');
    expect(screen.getByRole('checkbox')).toBeChecked();

    await user.keyboard(' ');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('체크 표시는 보조기술에서 숨긴다 — 상태는 input이 말한다', () => {
    render(<Checkbox checked onChange={() => {}} aria-label="아이디 저장" />);

    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
