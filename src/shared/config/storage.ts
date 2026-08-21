/**
 * localStorage 키 레지스트리.
 *
 * **한 곳에 모으는 이유는 충돌 감시다.** 예전에는 키가 네 곳에 흩어져 있어(테마·역할·계정·
 * 로그인) 새 키를 만들 때 겹치는지 확인할 데가 없었다. 여기 없는 키를 쓰지 않는다.
 *
 * 서버가 생기면 이 파일이 **제거 대상**이 된다 — 설정은 서버가 갖는다(`frontend.rule.md` A1).
 *
 * 판(`-v2`)은 **값의 도메인이 바뀔 때** 올린다. 예전 값이 남아 조용히 기본값으로 정규화되면
 * 사용자가 저장한 것이 사라진 것처럼 보인다 — 역할 키에서 실제로 그럴 뻔했다.
 */
export const STORAGE_KEYS = {
  theme: 'aquasense-theme',
  /** 역할. 2026-08-20 회의가 값 도메인을 통째로 교체해 판을 올렸다 */
  role: 'aquasense-role-v2',
  signedIn: 'aquasense-signed-in',
  /** 사업장 계정. 이름의 `admin`은 역사다(`entities/user/config/accounts.ts` 참조) */
  siteAccount: 'aquasense-admin',
  /** 지역·규모별 방류 기준치 — 사용자가 입력한다 `[회의 2026-08-20]` */
  dischargeLimits: 'aquasense-discharge-limits',
  /** 사업장의 지역구분·배출량 규모. 이 둘이 없으면 기준치표를 고를 수 없다 `[TBD-45]` */
  siteClassification: 'aquasense-site-classification',
  /** 사업장별 활성 공정 단계 */
  processStages: 'aquasense-process-stages',
} as const;

/**
 * 저장 형태의 판. **파싱 실패 대신 기본값으로 떨어지게 하는 장치다.**
 *
 * 스키마가 바뀌면 옛 JSON이 새 코드에서 다른 뜻이 된다. 판이 안 맞으면 읽지 않고 버린다 —
 * 크래시보다 낫고, 조용히 잘못 읽는 것보다 훨씬 낫다.
 */
export const STORAGE_SCHEMA_VERSION = 1;
