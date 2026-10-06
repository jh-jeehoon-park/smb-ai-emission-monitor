/** 상류 경로. `app/api/tb`의 허용 목록과 **같은 모양이어야 한다** — 어긋나면 403이 된다 */
export const TB_ENDPOINTS = {
  devices: 'tenant/devices',
  entitiesFind: 'entitiesQuery/find',
  timeseries: (deviceId: string) => `plugins/telemetry/DEVICE/${deviceId}/values/timeseries`,
  serverAttributes: (deviceId: string) =>
    `plugins/telemetry/DEVICE/${deviceId}/values/attributes/SERVER_SCOPE`,
  timeseriesKeys: (deviceId: string) => `plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`,
} as const;

/**
 * 우리 장비만 고르는 표식. 같은 테넌트에 다른 사용자의 디바이스가 생길 수 있고
 * 접두사가 우리 것을 가르는 유일한 표식이다(명세 §4.2·§4.7).
 */
export const TB_DEVICE_PREFIX = 'AQS-';
