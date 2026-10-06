/**
 * 공정도 노드에 이름이 들어갈 폭(SVG 단위). 노드 폭 140에서 왼쪽 여백 12와 오른쪽 여백 8을 뺐다.
 */
export const NODE_NAME_MAX_WIDTH = 120;

/**
 * 13px 글자의 어림 폭. **측정하지 않고 어림한다** — 렌더 중에 글자를 재면 서버(Node)와 브라우저가
 * 다른 값을 내 하이드레이션이 깨진다. 넉넉히 잡아 넘치기보다 한 글자 일찍 접는 쪽을 택했다.
 */
const WIDE_CHAR_WIDTH = 13;
const SPACE_WIDTH = 3.6;
const NARROW_CHAR_WIDTH = 7.2;

const ELLIPSIS = '…';
/** 줄이 여기서 끊기면 이어 주는 말이 줄 끝·줄 머리에 홀로 남는다 — 끊는 자리에서 떼어 낸다 */
const SEPARATORS = /^[·\-–—,]+|[·\-–—,]+$/g;

const isWide = (ch: string) => /[ᄀ-ᇿ㄰-㆏가-힣一-鿿]/.test(ch);

export function estimateTextWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    if (isWide(ch)) width += WIDE_CHAR_WIDTH;
    else if (ch === ' ') width += SPACE_WIDTH;
    else width += NARROW_CHAR_WIDTH;
  }
  return width;
}

/** 폭을 넘으면 글자 단위로 줄이고 `…`을 붙인다 */
function fitLine(text: string): string {
  if (estimateTextWidth(text) <= NODE_NAME_MAX_WIDTH) return text;
  let out = '';
  for (const ch of text) {
    if (estimateTextWidth(out + ch + ELLIPSIS) > NODE_NAME_MAX_WIDTH) break;
    out += ch;
  }
  return out.trimEnd() + ELLIPSIS;
}

const tidy = (line: string) => line.trim().replace(SEPARATORS, '').trim();

/**
 * 노드에 적을 단계 이름 — **한 줄, 넘치면 두 줄**.
 *
 * 사업장이 단계를 직접 입력하게 되면서 이름 길이가 정해지지 않았다 `[사용자 요청 2026-09-29]`.
 * SVG 글자는 줄바꿈이 없어 넘치면 노드 밖으로 나간다. 표준 단계 「고도 처리 및 소독 · 방류」도
 * 이미 넘치고 있었다 — 한 줄로 자르면 핵심어 «방류»가 잘린다. 낱말 경계에서 두 줄로 나누고,
 * 두 줄로도 넘칠 때만 둘째 줄을 줄인다. 전체 이름은 `<title>`과 스크린리더 이름이 갖는다.
 */
export function nodeNameLines(name: string): string[] {
  const whole = name.trim();
  if (estimateTextWidth(whole) <= NODE_NAME_MAX_WIDTH) return [whole];

  const words = whole.split(/\s+/);
  let first = '';
  for (const word of words) {
    const next = first === '' ? word : `${first} ${word}`;
    if (estimateTextWidth(next) > NODE_NAME_MAX_WIDTH) break;
    first = next;
  }

  /* 첫 낱말부터 넘치면 낱말 경계가 없다 — 글자 단위로 나눈다 */
  if (first === '') {
    for (const ch of whole) {
      if (estimateTextWidth(first + ch) > NODE_NAME_MAX_WIDTH) break;
      first += ch;
    }
  }

  const rest = whole.slice(first.length);
  const firstLine = tidy(first) || first.trim();
  const secondLine = tidy(rest);
  return secondLine === '' ? [firstLine] : [firstLine, fitLine(secondLine)];
}
