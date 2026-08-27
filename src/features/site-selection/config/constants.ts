/**
 * 키의 실체는 `shared/config/scope.ts`가 갖는다 — 범위를 URL에 박는 자리가 셋이고
 * 그중 `entities/user`는 이 feature를 읽을 수 없다(FSD). 이 재export는 기존 소비처를
 * 위해 남긴다.
 */
export { SITE_QUERY_KEY } from '@/shared/config/scope';
