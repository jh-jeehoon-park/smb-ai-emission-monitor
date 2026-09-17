// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

/**
 * 역할 컨텍스트는 라우터 위에 서 있어(`useRouter`) 이 화면만 따로 그릴 수 없다.
 * 이 검사가 보는 것은 **왼쪽 설명의 글자**뿐이라 로그인 동작을 흉내 내지 않고 잘라 낸다.
 */
vi.mock('@/entities/user', () => ({ useRole: () => ({ signIn: () => {} }) }));

const { LoginView } = await import('./login-view');

/**
 * **줄내림을 감췄을 때 문장이 붙지 않는지** `[사용자 지적 2026-09-17: 768px 기준]`.
 *
 * 왼쪽 설명은 xl에서만 지정한 자리에서 줄을 내리고, 그 아래에서는 `<br>`이 `display:none`이
 * 된다. **JSX가 엘리먼트에 붙은 «줄바꿈이 섞인 공백»을 지우므로** 그냥 두면 xl 미만에서
 * «결과를한 화면으로»처럼 낱말이 붙는다 — 1024px 화면에서 줄곧 그랬고 768px이 넓은 화면이
 * 되며 눈에 들어왔다.
 *
 * **소스에서 `{' '}`를 찾지 않고 그려진 글을 읽는다.** 표기를 바꿔도(`&nbsp;`·`{" "}`) 뜻이
 * 같으면 통과해야 하고, 반대로 표기가 남아 있어도 공백이 실제로 사라지면 잡아야 한다.
 *
 * `renderToString`을 쓰는 이유는 이 화면이 브라우저 저장소·미디어 질의를 만지기 때문이다 —
 * 서버 경로가 그 둘을 «모른다»로 답해 가장 단순하게 마크업만 얻는다.
 */
describe('왼쪽 설명 — 줄내림이 감춰져도 문장이 붙지 않는다', () => {
  /* 태그를 지우고 남는 글만 본다. `<br>`은 감춰질 수 있으니 공백으로 세지 않는다 */
  const text = renderToString(<LoginView />).replace(/<[^>]*>/g, '');

  it.each([
    ['읽고,', '이상 탐지'],
    ['결과를', '한 화면으로'],
  ])('«%s»와 «%s» 사이에 공백이 있다', (before, after) => {
    expect(text).toContain(`${before} ${after}`);
    expect(text, `«${before}${after}»로 붙어 있다`).not.toContain(`${before}${after}`);
  });
});
