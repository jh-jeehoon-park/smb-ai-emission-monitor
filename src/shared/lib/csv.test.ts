import { describe, expect, it } from 'vitest';
import { csvCell, csvField, csvFileName, toCsvText } from './csv';

/**
 * 리포트와 시계열이 **같은 유틸**을 쓴다 `[회의 2026-08-20]`. 두 벌로 갈리면 한쪽이 BOM을
 * 잃거나 파일명 규칙이 어긋난다 — 그것을 여기서 못박는다.
 */
describe('CSV 만들기', () => {
  it('값이 없으면 0이 아니라 빈 칸이다 — 표의 `—`와 같은 뜻이어야 한다(E4)', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(0)).toBe('0');
  });

  it('자릿수를 지킨다 — 화면과 파일이 다르게 반올림하면 안 된다(E1)', () => {
    expect(csvCell(6.4712, 2)).toBe('6.47');
    expect(csvCell(6.4712, 0)).toBe('6');
  });

  /**
   * 쉼표가 든 값을 그대로 이어 붙이면 그 행부터 열이 밀린다. 실제로 데이터셋 이름에
   * 쉼표가 있다(`04_사업장_유량,전력,전류 가동시간`).
   */
  it('쉼표·따옴표·줄바꿈이 든 칸을 감싼다', () => {
    expect(csvField('유량,전력')).toBe('"유량,전력"');
    expect(csvField('그는 "말했다"')).toBe('"그는 ""말했다"""');
    expect(csvField('한 줄\n두 줄')).toBe('"한 줄\n두 줄"');
  });

  it('감쌀 필요가 없으면 그대로 둔다 — 전부 감싸면 파일이 읽기 어려워진다', () => {
    expect(csvField('pH')).toBe('pH');
  });

  it('헤더와 행을 이어 붙인다', () => {
    const csv = toCsvText(['항목', '값'], [['pH', '6.47'], ['유량,전력', '']]);
    expect(csv.split('\n')).toEqual(['항목,값', 'pH,6.47', '"유량,전력",']);
  });

  it('파일명 규약이 하나다 — 어느 화면에서 나온 파일인지 알아야 한다', () => {
    expect(csvFileName('센서통계', '2026-08-21T14:20:00Z', 24)).toBe(
      '배출관리_센서통계_2026-08-21_최근24시간.csv',
    );
  });
});
