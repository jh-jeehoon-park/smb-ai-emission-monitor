/**
 * 백엔드가 없는 프로토타입이므로 화면의 모든 값은 시연용으로 생성한 것이다.
 * 기준 시각을 고정해 두어야 SSR/CSR 결과가 같고 스크린샷이 재현된다.
 * 아래 ISO 문자열의 시각은 KST 벽시계 값으로 읽는다(포맷터가 UTC 게터로 그대로 출력).
 */
export const DEMO_NOW_ISO = '2026-08-11T14:20:00Z';

export const DEMO_NOTICE = '시연용 생성 데이터 — 실제 계측값이 아닙니다';

/**
 * 시연 계정은 하나다. 계정으로 역할을 가릴 수 없으므로 역할 전환은 별도 장치로 둔다.
 * 서버가 없어 이 값을 검증하지 않는다 — 입력란을 채워 두는 용도다.
 */
export const DEMO_ACCOUNT = { id: 'admin', password: 'demo1234' } as const;

