import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **표와 파일이 같은 말을 해야 한다**(E1).
 *
 * `bucketReportToCsv`의 `absentCodes`는 **선택 인자**라, 패널이 넘기기를 그만두어도 타입이
 * 막지 않는다(실제로 그렇게 깨뜨려 보니 `tsc`가 통과했다). 그러면 화면의 표는 「미설치」인데
 * 내려받은 파일에는 **재지도 않은 숫자**가 들어간다 — 값을 파일로 들고 나간 사람은 그것이
 * 계측값인 줄 안다.
 *
 * 소스를 읽는다. 렌더 결과로는 «CSV에 무엇을 넘겼는가»를 볼 수 없다(내려받기를 눌러야 한다).
 */
const source = readFileSync('src/widgets/bucket-report/ui/bucket-report-panel.tsx', 'utf8');
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('구간 리포트 — 표와 CSV가 갈리지 않는다', () => {
  it('파일을 실제로 읽었다', () => {
    expect(code).toContain('bucketReportToCsv');
  });

  it('CSV에도 미설치 항목을 넘긴다', () => {
    expect(code).toMatch(/bucketReportToCsv\([^)]*absentCodes[^)]*\)/);
  });

  it('표도 같은 목록을 본다', () => {
    expect(code).toMatch(/<BucketTable[^>]*absentCodes=\{absentCodes\}/);
  });
});
