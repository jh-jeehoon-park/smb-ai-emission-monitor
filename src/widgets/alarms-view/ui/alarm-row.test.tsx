// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { getAlarmsForView } from '@/entities/alarm';
import { AlarmRow } from './alarm-row';

afterEach(cleanup);

/*
 * 상태를 바꿀 수 있는 알람이라야 `확인 처리` 버튼이 그려진다 — `조치 완료`는 다음 단계가 없어
 * `AlarmStateActions`가 아무것도 내지 않는다.
 */
const alarm = getAlarmsForView('S-02').find((a) => a.state !== 'resolved')!;

function renderRow() {
  const onOpen = vi.fn();
  const onChange = vi.fn();
  const view = render(<AlarmRow alarm={alarm} onChange={onChange} onOpen={onOpen} />);
  return { ...view, onOpen, onChange };
}

/**
 * **상세로 가는 길이 화면에 보여야 한다** `[사용자 요청 2026-09-08]`.
 *
 * 모달과 그 안의 `확인 처리`는 v1.4.0부터 있었는데 **여는 방법이 제목 글자 하나뿐**이었고
 * 밑줄이 투명이라 가만히 있을 때는 굵은 글자와 구분되지 않았다 — 상세가 있다는 사실 자체가
 * 화면에 없었다(§8 `상세 이동`: "글자는 누를 수 있다는 신호가 약하다").
 */
describe('알람 이력 줄 — 상세 입구', () => {
  it('줄마다 `상세` 버튼이 있다', () => {
    renderRow();
    expect(screen.getByRole('button', { name: `${alarm.title} 상세 보기` })).toBeTruthy();
  });

  it('`상세` 버튼을 누르면 모달이 열린다', () => {
    const { onOpen } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: `${alarm.title} 상세 보기` }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  /** 줄 클릭은 편의다 — 칸마다 눌리는 곳을 찾지 않아도 된다(§8 `누르는 줄`) */
  it('줄 아무 데나 눌러도 열린다', () => {
    const { container, onOpen } = renderRow();
    const cover = container.querySelector('[aria-hidden].absolute') as HTMLElement;
    fireEvent.click(cover);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  /**
   * 덮개는 **초점을 받지 않는다.** `상세` 버튼이 같은 일을 하는 정식 조작이라, 덮개까지 탭
   * 순서에 들면 한 줄에서 같은 동작이 두 번 걸린다. `aria-hidden`을 붙일 수 있는 것도
   * 초점을 받지 않기 때문이다 — 초점 가능한 요소를 숨기면 접근성 위반이다.
   */
  it('덮개는 탭 순서에 없다', () => {
    const { container } = renderRow();
    const cover = container.querySelector('[aria-hidden].absolute') as HTMLElement;
    expect(cover.tabIndex).toBe(-1);
  });
});

/**
 * **덮개가 처리 조작을 먹으면 안 된다.** 줄을 덮는 버튼을 깔면서 생기는 유일한 회귀 위험이고,
 * 먹히면 `확인 처리`를 눌렀는데 모달이 열린다.
 */
describe('알람 이력 줄 — 처리 조작', () => {
  it('확인 처리는 상태만 바꾸고 모달을 열지 않는다', () => {
    const { onOpen, onChange } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: `${alarm.title} 확인 처리` }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  /*
   * **여기서 클래스를 본다.** 덮개는 형제라 jsdom에서는 버튼의 클릭을 가로챌 수 없지만,
   * 실제 브라우저에서는 **쌓임 순서**가 어느 쪽이 눌리는지를 정한다 — jsdom에는 레이아웃이
   * 없어 그 판정을 재현할 방법이 없다. 순서가 뒤집히면 조작이 통째로 먹히므로 값으로 잠근다.
   */
  it('처리 조작이 덮개보다 위에 쌓인다', () => {
    const { container } = renderRow();
    const cover = container.querySelector('[aria-hidden].absolute') as HTMLElement;
    const actions = screen
      .getByRole('button', { name: `${alarm.title} 확인 처리` })
      .closest('div') as HTMLElement;

    expect(cover.className).toMatch(/(^|\s)z-10(\s|$)/);
    expect(actions.className).toMatch(/(^|\s)z-20(\s|$)/);
  });
});
