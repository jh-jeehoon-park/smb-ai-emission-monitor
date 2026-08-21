// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from '../config/storage';
import { readJson, readUpdatedIso, removeKey, writeJson } from './local-store';

const KEY = 'aquasense-test';
const NOW = '2026-08-20T09:00:00.000Z';

/** 숫자 배열만 받는 검증기. 저장값은 사용자가 고칠 수 있어 모양을 믿지 않는다 */
const numbers = (raw: unknown): number[] | null =>
  Array.isArray(raw) && raw.every((v) => typeof v === 'number') ? raw : null;

afterEach(() => {
  window.localStorage.clear();
});

describe('저장값 읽기 — 던지지 않는다', () => {
  it('쓴 것을 그대로 읽는다', () => {
    writeJson(KEY, [1, 2, 3], NOW);
    expect(readJson(KEY, numbers)).toEqual([1, 2, 3]);
    expect(readUpdatedIso(KEY)).toBe(NOW);
  });

  it('없는 키는 null이다', () => {
    expect(readJson(KEY, numbers)).toBeNull();
    expect(readUpdatedIso(KEY)).toBeNull();
  });

  /** 스키마가 바뀌면 옛 JSON이 새 코드에서 다른 뜻이 된다. 읽지 않고 버린다 */
  it('판이 다르면 읽지 않는다', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: STORAGE_SCHEMA_VERSION + 1, updatedIso: NOW, data: [1] }),
    );
    expect(readJson(KEY, numbers)).toBeNull();
    expect(readUpdatedIso(KEY)).toBeNull();
  });

  it('판이 없어도 읽지 않는다 — 판 도입 전에 쓰인 값이다', () => {
    window.localStorage.setItem(KEY, JSON.stringify([1, 2, 3]));
    expect(readJson(KEY, numbers)).toBeNull();
  });

  it('손상된 JSON은 기본값으로 떨어진다 — 크래시하지 않는다', () => {
    window.localStorage.setItem(KEY, '{ 이건 JSON이 아니다');
    expect(readJson(KEY, numbers)).toBeNull();
  });

  /**
   * **검증기를 통과하지 못한 값은 버린다.** 타입 단언으로 넘기면 사용자가 콘솔에서 고친
   * 거짓이 화면 끝까지 흘러간다 — 설정값은 신뢰 경계 밖이다.
   */
  it('모양이 다른 값은 검증기가 막는다', () => {
    writeJson(KEY, ['셋', '넷'], NOW);
    expect(readJson(KEY, numbers)).toBeNull();
  });

  it('지우면 없는 것과 같다', () => {
    writeJson(KEY, [1], NOW);
    removeKey(KEY);
    expect(readJson(KEY, numbers)).toBeNull();
  });
});

describe('키 레지스트리', () => {
  it('키가 서로 겹치지 않는다 — 한쪽이 다른 쪽을 덮어쓰면 조용히 설정이 사라진다', () => {
    const keys = Object.values(STORAGE_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('전부 같은 접두사를 쓴다 — 다른 앱과 섞이지 않게', () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key.startsWith('aquasense-'), key).toBe(true);
    }
  });
});
