// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OptionCard } from './option-card';
import { Switch } from './switch';
import { ToggleCard } from './toggle-card';

/**
 * **설정 화면 개편에서 새로 들인 부품 셋** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * 셋 다 **그림을 직접 그리되 진짜 입력을 남긴다** — 가짜 단추를 그리면 라벨 연결·키보드·화면
 * 읽기 프로그램이 한꺼번에 죽는다. 이 파일은 그 «진짜 입력»이 살아 있는지를 잡는다. 눈에
 * 보이는 모양은 jsdom이 재 주지 않는다(브라우저 캡처로 확인했다).
 */
afterEach(cleanup);

describe('Switch', () => {
  it('진짜 체크박스이고 역할이 switch다', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="켜기" />);
    const input = screen.getByRole('switch', { name: '켜기' });

    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe('checkbox');
    expect(input.getAttribute('aria-checked')).toBe('false');
  });
});

describe('ToggleCard', () => {
  /**
   * **카드 어디를 눌러도 켜진다.** 스위치(36×20)는 손가락 최소를 밑돌아 누르는 자리를 카드 전체가
   * 맡는다 — 라벨 연결이 끊기면 스위치 한 점만 눌리는 카드가 된다.
   */
  it('제목을 눌러도 다음 상태를 넘긴다', () => {
    const onChange = vi.fn();
    render(<ToggleCard checked={false} onChange={onChange} mark="pH" title="수소이온농도" />);

    fireEvent.click(screen.getByText('수소이온농도'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  /** 끄는 쪽도 **다음 상태**다 — 현재 상태를 넘기면 뒤집힌다(계측 폼에서 한 번 밟았다) */
  it('켠 카드를 누르면 false를 넘긴다', () => {
    const onChange = vi.fn();
    render(<ToggleCard checked onChange={onChange} mark="pH" title="수소이온농도" />);

    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('끈 것에만 끈 이유를 적는다', () => {
    const { rerender } = render(
      <ToggleCard checked onChange={() => {}} mark="C" title="색도" offNote="미설치" />,
    );
    expect(screen.queryByText('미설치')).toBeNull();

    rerender(<ToggleCard checked={false} onChange={() => {}} mark="C" title="색도" offNote="미설치" />);
    expect(screen.getByText('미설치')).toBeTruthy();
  });
});

describe('OptionCard', () => {
  /** 같은 `name`으로 묶여야 화살표 키로 옮겨 다니는 하나의 선택이 된다 */
  it('진짜 라디오이고 카드를 누르면 그 값을 고른다', () => {
    const onSelect = vi.fn();
    render(
      <div role="radiogroup">
        <OptionCard name="route" value="A" checked={false} onSelect={onSelect} title="직접방류" />
        <OptionCard name="route" value="B" checked onSelect={onSelect} title="하수처리" />
      </div>,
    );

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios.every((radio) => radio.getAttribute('name') === 'route')).toBe(true);

    fireEvent.click(screen.getByText('직접방류'));
    expect(onSelect).toHaveBeenCalledWith('A');
  });
});
