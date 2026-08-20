import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { PROVISIONAL_ANOMALY_BANDS, PROVISIONAL_STATUS_LEVELS } from '@/shared/config/provisional';
import { LEGAL_CHECK_ITEMS } from '@/shared/config/discharge-limits';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import {
  ALARM_CONDITION_LABELS,
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
} from '@/entities/alarm';
import { getEquipment } from '@/entities/equipment';
import { FLOW_FORECAST, FORECAST_TARGETS } from '@/entities/prediction';
import { PROCESS_STAGES } from '@/entities/process';
import { ANALYSIS_ITEMS } from '@/entities/water-analysis';

/**
 * 항목 사전([`docs/specs/items.md`](../docs/specs/items.md))이 선언한 개수와 **코드 상수의
 * 원소 수**가 같은지 본다. 규칙은 `deliverable-xlsx.rule.md` §6.3 — 상수가 정본이고 문서가
 * 따른다.
 *
 * **여기 있는 이유는 import다.** `verify-docs.mjs`는 Node 스크립트라 `@/` 별칭이 걸린 `.ts`를
 * 불러올 수 없어 소스를 정규식으로 훑어야 하는데, 상수의 모양이 제각각이다 — `ANALYSIS_ITEMS`는
 * `Record`, `LEGAL_CHECK_ITEMS`는 배열, `EQUIPMENT_TEMPLATE`은 객체 리터럴 배열이다. 그렇게 센
 * 숫자는 상수가 아니라 그 정규식을 검사한다. vitest는 상수를 그대로 읽는다.
 */
const ITEMS_DOC = readFileSync('docs/specs/items.md', 'utf8').split('\r\n').join('\n');

/** §2.2 집합 요약이 선언한 개수. `4 — **시연값**`처럼 뒤에 말이 붙어 앞의 수만 읽는다 */
function declared(code: string): number {
  /* 알람 3종은 한 행에 `` `ALP` · `ALC` · `ALS` ``로 묶여 있어 첫 칸 전체를 봐야 한다 */
  const row = ITEMS_DOC.split('\n').find(
    (line) => line.startsWith('| `') && line.split('|')[1]!.includes(`\`${code}\``),
  );
  if (!row) throw new Error(`items.md §2.2에 ${code} 행이 없다`);
  const cells = row.split('|').map((c) => c.trim());
  /* 묶인 행은 개수도 `3 · 4 · 3`으로 묶인다 — 코드 위치와 개수 위치를 맞춘다 */
  const codes = [...cells[1].matchAll(/`([A-Z]{2,5})`/g)].map((m) => m[1]);
  const counts = cells[3].split('·').map((n) => Number.parseInt(n.trim(), 10));
  return counts[codes.indexOf(code)];
}

const SETS: Record<string, number> = {
  MEAS: Object.keys(MEASUREMENT_ITEMS).length,
  /* `EQUIPMENT_TEMPLATE`은 slice 밖으로 열려 있지 않다. 화면이 실제로 받는 것을 센다 */
  EQ: getEquipment(SITE_SCENARIOS[0]!.id).length,
  FCST: Object.keys(FORECAST_TARGETS).length + [FLOW_FORECAST].length,
  LV: PROVISIONAL_STATUS_LEVELS.length,
  BAND: PROVISIONAL_ANOMALY_BANDS.length,
  ALP: Object.keys(ALARM_PRIORITY_LABELS).length,
  ALC: Object.keys(ALARM_CONDITION_LABELS).length,
  ALS: Object.keys(ALARM_STATE_LABELS).length,
  PS: PROCESS_STAGES.length,
  ANA: Object.keys(ANALYSIS_ITEMS).length,
  LGL: LEGAL_CHECK_ITEMS.length,
  SITE: SITE_SCENARIOS.length,
};

describe('항목 사전과 코드 상수', () => {
  for (const [code, count] of Object.entries(SETS)) {
    it(`${code} — 상수 ${count}개`, () => {
      expect(declared(code)).toBe(count);
    });
  }

  /**
   * `EQM`(설비 지표)·`XAI`(기여 변수)는 배열 상수가 아니라 타입·fixture 생성 함수에서 나온다.
   * 세는 대상이 없어 여기서 대조하지 않는다 — 개수는 `items.md`가 선언하고 화면 문서가 쓴다.
   */
  it('상수로 셀 수 없는 집합은 대조 대상이 아님을 못박는다', () => {
    expect(Object.keys(SETS)).not.toContain('EQM');
    expect(Object.keys(SETS)).not.toContain('XAI');
  });
});
