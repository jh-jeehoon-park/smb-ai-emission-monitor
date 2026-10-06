import { compareEquipment, getEquipment, type Equipment } from '@/entities/equipment';
import type { Site } from '@/entities/site';

export interface RankedEquipment {
  siteId: string;
  siteName: string;
  region: string;
  online: boolean;
  equipment: Equipment;
}

/**
 * 유지관리 우선순위 자동 추천(FR-21)은 한 사업장 안에서 줄을 세워서는 답이 나오지 않는다.
 * 정비 인력은 사업장을 가로질러 배치되므로 여러 사업장을 한 줄로 놓고 봐야 한다.
 *
 * **범위는 부르는 쪽이 정한다** — 한때 `SITES`를 직접 읽어 늘 전 10개소였고, 그러면
 * 기초지자체가 관할 밖 사업장의 설비 순위를 보게 된다.
 */
export function rankAcrossSites(sites: readonly Site[], limit: number): RankedEquipment[] {
  const all: RankedEquipment[] = [];

  for (const site of sites) {
    // 통신이 끊긴 사업장은 현재 지표가 없다. 옛 값으로 순위를 매기면 정비 순서가 거짓이 된다.
    if (!site.online) continue;

    for (const equipment of getEquipment(site.id)) {
      all.push({
        siteId: site.id,
        siteName: site.name,
        region: site.region,
        online: site.online,
        equipment,
      });
    }
  }

  /* 이상이 나쁜 순으로 줄을 세운다. MPI가 사라졌으므로 등급이 그 자리를 받는다 `[INC-107]` */
  const bySeverity = compareEquipment('status');
  return all.sort((a, b) => bySeverity(a.equipment, b.equipment)).slice(0, limit);
}
