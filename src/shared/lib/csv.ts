/**
 * CSV 만들기와 내려받기.
 *
 * **두 화면이 같은 경로를 쓴다.** 리포트가 먼저 이 코드를 컴포넌트 안에 인라인으로 갖고
 * 있었는데, 회의가 시계열도 리포트 형식으로 볼 수 있어야 한다고 정리해
 * `[회의 2026-08-20]` 같은 것이 두 벌 필요해졌다 — 복사하면 한쪽만 BOM을 잃거나
 * 파일명 규칙이 갈린다.
 */

/** 값이 없는 칸은 **0이 아니라 빈 칸**이다. 표에서 `—`로 보이는 것과 같은 뜻이어야 한다(E4) */
export const csvCell = (value: number | null, decimals = 0): string =>
  value === null ? '' : value.toFixed(decimals);

/**
 * 칸 하나를 CSV 규칙으로 감싼다.
 *
 * 쉼표·따옴표·줄바꿈이 든 값을 그대로 이어 붙이면 열이 밀린다 — 사업장명이나 근거 문구에
 * 쉼표가 들어가는 순간 그 행부터 표가 어긋난다. 실제로 데이터셋 이름에 쉼표가 있다
 * (`04_사업장_유량,전력,전류 가동시간`).
 */
export function csvField(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.split('"').join('""')}"`;
}

/** 헤더 + 행을 CSV 문자열로. 행은 이미 문자열 배열이어야 한다 */
export function toCsvText(headers: readonly string[], rows: readonly string[][]): string {
  return [headers, ...rows].map((row) => row.map(csvField).join(',')).join('\n');
}

/**
 * 브라우저에서 내려받는다.
 *
 * **BOM을 붙인다.** 없으면 엑셀이 UTF-8을 인식하지 못해 한글이 깨진다 — 심사자가 파일을
 * 열었을 때 처음 보는 것이 깨진 글자면 그 뒤 숫자를 볼 이유가 없다.
 */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 파일명 규약. `배출관리_{무엇}_{기준일}_최근{N}시간.csv`
 *
 * 화면마다 다르게 지으면 내려받은 파일이 뒤섞였을 때 어느 화면에서 나온 것인지 알 수 없다.
 */
export function csvFileName(what: string, baseIso: string, hours: number): string {
  return `배출관리_${what}_${baseIso.slice(0, 10)}_최근${hours}시간.csv`;
}
