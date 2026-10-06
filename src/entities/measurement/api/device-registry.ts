import {
  TB_DEVICE_PREFIX,
  TB_ENDPOINTS,
  TbError,
  tbGet,
  type TbDevicePage,
} from '@/shared/api/thingsboard';

const PAGE_SIZE = 50;
/** 페이징이 끝나지 않는 응답에 갇히지 않는다. 10개소짜리 테넌트에 이 이상은 오지 않는다 */
const MAX_PAGES = 10;

/**
 * 사업장 ID ↔ `deviceId`.
 *
 * 프론트는 `S-01`을 알고 ThingsBoard는 UUID로 말한다(명세 §4.2). 구간 조회에는 UUID가
 * 필요하므로 한 번 받아 두고 재사용한다 — 사업장을 바꿀 때마다 다시 받을 값이 아니다.
 */
let registry: Map<string, string> | null = null;
let pending: Promise<Map<string, string>> | null = null;

async function loadRegistry(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await tbGet<TbDevicePage>(TB_ENDPOINTS.devices, {
      pageSize: PAGE_SIZE,
      page,
      /* 접두사가 우리 장비를 가르는 유일한 표식이다. 빼면 남의 디바이스가 섞인다 */
      textSearch: TB_DEVICE_PREFIX,
    });

    for (const device of result.data) {
      if (device.name.startsWith(TB_DEVICE_PREFIX)) {
        map.set(device.name.slice(TB_DEVICE_PREFIX.length), device.id.id);
      }
    }

    if (!result.hasNext) break;
  }

  return map;
}

export function getDeviceRegistry(): Promise<Map<string, string>> {
  if (registry) return Promise.resolve(registry);

  pending ??= loadRegistry()
    .then((loaded) => {
      registry = loaded;
      return loaded;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/** 등록부에 없으면 **그 사업장만** 장비 미등록이다. 나머지는 그대로 그린다(명세 §8) */
export async function getDeviceId(siteId: string): Promise<string> {
  const deviceId = (await getDeviceRegistry()).get(siteId);
  if (!deviceId) throw new TbError('notFound', `${siteId} 장비가 등록되어 있지 않습니다`);

  return deviceId;
}
