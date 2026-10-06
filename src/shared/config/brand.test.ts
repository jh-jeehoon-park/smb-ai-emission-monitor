import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BRAND_NAME } from './constants';

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

  /**
   * **자산이 지금 로고에서 나왔는지**를 색으로 확인한다 `[사용자 지시 2026-08-24]`.
   *
   * 로고가 초록 PNG에서 파란 물방울로 바뀐 뒤에도 탭 아이콘·공유 카드는 옛 초록으로 남아
   * 있었다. 화면과 자산이 갈라진 것을 눈으로만 잡으면 다음에도 같은 일이 난다 —
   * 아이콘의 주색이 **파랑 계열**(B > R)인지 재서 못박는다. 다시 구우려면
   * `node scripts/build-brand-assets.mjs`.
   */
  it.each([['icon.png'], ['apple-icon.png']])('%s이 파란 물방울 마크다', async (name) => {
    const { dominant } = await sharp(app(name)).stats();
    expect(dominant.b).toBeGreaterThan(dominant.r + 60);
    expect(dominant.b).toBeGreaterThan(dominant.g + 40);
  });

  /** 파비콘은 ICO 컨테이너다 — 앞 4바이트가 예약 0 + 종류 1이면 아이콘 파일이다 */
  it('favicon.ico가 ICO 컨테이너 형식이다', () => {
    const head = readFileSync(app('favicon.ico'));
    expect(head.readUInt16LE(0)).toBe(0);
    expect(head.readUInt16LE(2)).toBe(1);
    /* 16·32·48 세 벌을 담는다 — 한 벌만 담으면 작은 탭에서 축소 흐림이 생긴다 */
    expect(head.readUInt16LE(4)).toBe(3);
  });

  /** 카드에 시연 고지가 없으면 생성 데이터가 실측으로 읽힌다 */
  it('카드 대체 텍스트가 시연용임을 밝힌다', () => {
    expect(readFileSync(app('opengraph-image.alt.txt'), 'utf8')).toContain('시연용');
  });
});
