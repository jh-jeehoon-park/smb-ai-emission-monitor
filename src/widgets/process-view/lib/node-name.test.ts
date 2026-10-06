import { describe, expect, it } from 'vitest';
import { PROCESS_STAGES } from '@/entities/process';
import { NODE_NAME_MAX_WIDTH, estimateTextWidth, nodeNameLines } from './node-name';

const fits = (lines: string[]) =>
  lines.every((line) => estimateTextWidth(line) <= NODE_NAME_MAX_WIDTH);

describe('공정도 노드 이름', () => {
  it('짧은 이름은 한 줄 그대로다', () => {
    expect(nodeNameLines('1차 침전')).toEqual(['1차 침전']);
  });

  /** 한 줄로 자르면 «방류»가 잘렸다 — 낱말 경계에서 나누고 이어 주는 «·»은 떼어 낸다 */
  it('표준 방류 단계는 두 줄로 나뉘고 핵심어를 잃지 않는다', () => {
    expect(nodeNameLines('고도 처리 및 소독 · 방류')).toEqual(['고도 처리 및 소독', '방류']);
  });

  it('두 줄로도 넘치면 둘째 줄만 줄인다', () => {
    const lines = nodeNameLines('아주 길게 지은 가압부상 처리조 제2계열');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('아주 길게 지은');
    expect(lines[1]!.endsWith('…')).toBe(true);
    expect(fits(lines)).toBe(true);
  });

  it('띄어쓰기가 없어도 글자 단위로 나눈다', () => {
    const lines = nodeNameLines('가압부상식응집침전일체형처리조제이계열');
    expect(lines).toHaveLength(2);
    expect(fits(lines)).toBe(true);
  });

  it('표준 단계 이름은 전부 폭 안에 들어간다', () => {
    for (const stage of PROCESS_STAGES) {
      expect(fits(nodeNameLines(stage.name)), stage.name).toBe(true);
    }
  });
});
