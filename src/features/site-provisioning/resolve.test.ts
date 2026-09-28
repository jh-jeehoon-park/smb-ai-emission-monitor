import { describe, expect, it } from 'vitest';
import { WATER_QUALITY_CODES } from '@/shared/config/measurement';
import { resolveInstruments, resolveMetering } from './lib/resolve';
import { parseProvisioning, type ProvisioningBySite } from './lib/storage';

/**
 * 사업장이 **무엇을 달았는가** `[사용자 요청 2026-09-28]` `[TBD-61]`.
 *
 * 실증 현장조사가 1차 5개소의 수질 항목이 **7·8·9종으로 갈리는** 것을 보여 줬고, 다섯 곳 모두
 * 색도가 없었다. 우리가 어느 쪽인지 정할 수 없으므로 설정으로 받는다 — `[TBD-45]`(기준치)를
 * 같은 길로 우회한 선례가 있다.
 *
 * **이 파일이 지키는 것은 «빈 값을 없음으로 읽지 않는다»이다.** 거꾸로 읽으면 처음 들어온
 * 사업장의 계측 격자가 통째로 「미설치」가 된다.
 */
const SITE = 'S-02';

describe('계측기 구성 — 기본값', () => {
  it('설정이 없으면 전부 보유다', () => {
    const r = resolveInstruments(null, SITE);

    expect(r.held).toEqual([...WATER_QUALITY_CODES]);
    expect(r.absent).toEqual([]);
    expect(r.isUserSet).toBe(false);
  });

  it('다른 사업장의 설정이 이 사업장에 번지지 않는다', () => {
    const settings: ProvisioningBySite = {
      'S-09': { instruments: { absentCodes: ['chromaticity'] }, meteredEquipmentIds: [] },
    };

    expect(resolveInstruments(settings, SITE).absent).toEqual([]);
    expect(resolveInstruments(settings, 'S-09').absent).toEqual(['chromaticity']);
  });
});

describe('계측기 구성 — 끈 항목', () => {
  const settings: ProvisioningBySite = {
    [SITE]: { instruments: { absentCodes: ['chromaticity'] }, meteredEquipmentIds: [] },
  };

  /** **항목 수는 줄지 않는다** — 8종은 필수다 `[사용자 결정 2026-09-28]` */
  it('보유 + 미설치가 언제나 수질 8종이다', () => {
    const r = resolveInstruments(settings, SITE);

    expect(r.held.length + r.absent.length).toBe(WATER_QUALITY_CODES.length);
    expect([...r.held, ...r.absent].sort()).toEqual([...WATER_QUALITY_CODES].sort());
  });

  it('끈 항목만 미설치로 간다', () => {
    const r = resolveInstruments(settings, SITE);

    expect(r.absent).toEqual(['chromaticity']);
    expect(r.has('chromaticity')).toBe(false);
    expect(r.has('pH')).toBe(true);
  });

  /**
   * **사용자가 다시 전부 켠 것과 한 번도 설정하지 않은 것은 다르다.** 화면이 되돌리기 버튼을
   * 띄우는 근거가 이 구분이고, 합치면 사용자가 되돌릴 방법이 사라진다.
   */
  it('전부 켠 설정도 «사용자가 정했다»로 남는다', () => {
    const emptied: ProvisioningBySite = { [SITE]: { instruments: { absentCodes: [] }, meteredEquipmentIds: [] } };

    expect(resolveInstruments(emptied, SITE).isUserSet).toBe(true);
    expect(resolveInstruments(null, SITE).isUserSet).toBe(false);
  });
});

describe('계측기 구성 — 저장값을 믿지 않는다', () => {
  it('모르는 항목 코드를 버린다', () => {
    const parsed = parseProvisioning({
      [SITE]: { instruments: { absentCodes: ['chromaticity', 'nope', 42, null] } },
    });

    expect(parsed?.[SITE]?.instruments.absentCodes).toEqual(['chromaticity']);
  });

  it('모양이 망가진 값은 통째로 건너뛴다', () => {
    expect(parseProvisioning(null)).toBeNull();
    expect(parseProvisioning('문자열')).toBeNull();
    expect(parseProvisioning({ [SITE]: { instruments: '아님' } })).toEqual({});
  });

  /** 수질 8종 밖의 코드가 새어 들어와도 격자가 그것을 「미설치」로 그리지 않는다 */
  it('수질 8종 밖은 미설치로 세지 않는다', () => {
    const settings = { [SITE]: { instruments: { absentCodes: ['power'] }, meteredEquipmentIds: [] } } as unknown as ProvisioningBySite;
    const r = resolveInstruments(settings, SITE);

    expect(r.absent).toEqual([]);
    expect(r.held).toEqual([...WATER_QUALITY_CODES]);
  });
});

/**
 * **어느 설비의 전력을 재는가** `[사용자 요청 2026-09-21]` `[TBD-42]`.
 *
 * 현장조사가 이 결정을 **우리 몫으로 명시했다** — 다섯 곳 모두 기존 전력량계가 통신 불가이거나
 * 미확인이고, 고른 설비가 곧 **통신형 계기를 다는 대상**이라 설치 범위·비용이 된다.
 *
 * 그래서 **기본값이 계측 항목과 반대다**: 항목은 «전부 보유»에서 덜어내지만, 전력은
 * «아무것도 고르지 않았다»에서 더한다 — 기본으로 켜 두면 **이미 정해진 것처럼** 보인다(**X2**).
 */
describe('설비 전력 계측 대상', () => {
  it('설정이 없으면 아무것도 고르지 않은 상태다', () => {
    const r = resolveMetering(null, SITE);

    expect(r.ids).toEqual([]);
    expect(r.isUserSet).toBe(false);
    expect(r.isMetered('EQ-01')).toBe(false);
  });

  it('고른 설비만 계측 대상이다', () => {
    const settings: ProvisioningBySite = {
      [SITE]: { instruments: { absentCodes: [] }, meteredEquipmentIds: ['EQ-01', 'EQ-03'] },
    };
    const r = resolveMetering(settings, SITE);

    expect(r.isMetered('EQ-01')).toBe(true);
    expect(r.isMetered('EQ-02')).toBe(false);
    expect(r.ids).toEqual(['EQ-01', 'EQ-03']);
  });

  /** 전부 끈 것과 한 번도 고르지 않은 것은 다르다 — 되돌리기 버튼의 근거다 */
  it('전부 끈 설정도 «사용자가 정했다»로 남는다', () => {
    const emptied: ProvisioningBySite = {
      [SITE]: { instruments: { absentCodes: [] }, meteredEquipmentIds: [] },
    };

    expect(resolveMetering(emptied, SITE).isUserSet).toBe(true);
    expect(resolveMetering(null, SITE).isUserSet).toBe(false);
  });

  it('두 축이 서로를 덮지 않는다 — 한 키에 둘이 산다', () => {
    const parsed = parseProvisioning({
      [SITE]: { instruments: { absentCodes: ['chromaticity'] }, meteredEquipmentIds: ['EQ-02'] },
    });

    expect(resolveInstruments(parsed, SITE).absent).toEqual(['chromaticity']);
    expect(resolveMetering(parsed, SITE).ids).toEqual(['EQ-02']);
  });

  it('문자열이 아닌 id는 버린다', () => {
    const parsed = parseProvisioning({
      [SITE]: { instruments: { absentCodes: [] }, meteredEquipmentIds: ['EQ-01', 7, null] },
    });

    expect(parsed?.[SITE]?.meteredEquipmentIds).toEqual(['EQ-01']);
  });
});
