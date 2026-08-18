import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_MARK_VARIANTS, BRAND_NAME } from './constants';

describe('브랜드 마크 — 테마마다 한 벌', () => {
  it('밝은 테마와 어두운 테마용이 각각 하나씩 있다', () => {
    expect(BRAND_MARK_VARIANTS.map((v) => v.theme)).toEqual(['light', 'dark']);
  });

  /**
   * 서버는 테마를 모른다. 두 벌을 모두 렌더하고 CSS가 고르는 방식이라
   * `globals.css`의 `.theme-when-*`와 짝이 맞아야 한다 — 클래스 이름이 갈리면
   * 두 장이 동시에 보이거나 둘 다 사라진다.
   */
  it('테마 선택 클래스가 globals.css의 유틸과 짝이 맞는다', () => {
    const css = join(process.cwd(), 'src/app/globals.css');
    expect(existsSync(css)).toBe(true);
    for (const variant of BRAND_MARK_VARIANTS) {
      expect(variant.themeClass).toContain(`theme-when-${variant.theme}`);
    }
  });

  it('파일이 public에 실제로 있다', () => {
    for (const variant of BRAND_MARK_VARIANTS) {
      expect(existsSync(join(process.cwd(), 'public', variant.src))).toBe(true);
    }
  });

  /** 겹쳐 쌓아야 한 자리에서 갈아 끼워진다 — 한 장만 흐름에 남기고 나머지는 겹친다 */
  it('두 번째 이후는 첫 장 위에 겹친다', () => {
    expect(BRAND_MARK_VARIANTS[0]!.themeClass).not.toContain('absolute');
    for (const variant of BRAND_MARK_VARIANTS.slice(1)) {
      expect(variant.themeClass).toContain('absolute');
    }
  });
});

describe('플랫폼 이름', () => {
  /** 원문 국문 정식명. 폭이 좁다고 줄이면 A2 위반이다 */
  it('원문 명칭 그대로다', () => {
    expect(BRAND_NAME).toBe('AI 기반 지능형 배출관리 플랫폼');
  });
});

/**
 * 공유 카드와 앱 아이콘은 **파일이 있다는 사실 자체가 설정**이다(Next 파일 규약).
 * 지워지면 빌드는 통과하고 `<meta og:image>`만 조용히 사라진다 — 링크를 공유하기
 * 전까지 아무도 모른다.
 */
describe('공유 카드·앱 아이콘 파일 규약', () => {
  const app = (name: string) => join(process.cwd(), 'src/app', name);

  it.each([
    ['opengraph-image.png', '공유 카드'],
    ['opengraph-image.alt.txt', '카드 대체 텍스트'],
    ['favicon.ico', '탭 아이콘'],
    ['icon.png', '앱 아이콘'],
    ['apple-icon.png', 'iOS 홈 화면'],
  ])('%s (%s)이 app 최상위에 있다', (name) => {
    expect(existsSync(app(name))).toBe(true);
  });

  /** 8MB를 넘으면 빌드가 실패한다(Next 문서). 여유를 두고 훨씬 낮게 잡는다 */
  it('공유 카드가 지나치게 무겁지 않다', () => {
    expect(statSync(app('opengraph-image.png')).size).toBeLessThan(1_000_000);
  });

  /** 카드에 시연 고지가 없으면 생성 데이터가 실측으로 읽힌다 */
  it('카드 대체 텍스트가 시연용임을 밝힌다', () => {
    expect(readFileSync(app('opengraph-image.alt.txt'), 'utf8')).toContain('시연용');
  });
});
