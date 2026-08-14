import { DEFAULT_ADMIN_ACCOUNT, ADMIN_ACCOUNTS } from './accounts';
import type { Role } from '../model/types';

/**
 * 시연용 세션 — 로그인 여부와 역할.
 *
 * **인가가 아니다.** 서버가 없어 클라이언트가 값을 들고 있을 뿐이며, 원문이 규정한
 * OAuth 2.0 + JWT(사업계획서 p.69)는 구현하지 않았다. 백엔드 착수 시 서버 응답
 * 권한으로 교체한다(frontend.rule.md E6 예외).
 *
 * 이 파일에 `'use client'`를 붙이지 않는다 — 서버 컴포넌트인 layout이 INIT_SCRIPT를 읽는다.
 */
export const ROLE_STORAGE_KEY = 'aquasense-role';
export const AUTH_STORAGE_KEY = 'aquasense-signed-in';

/** 관리자일 때 어느 계정인가 — 역할과 별개 축이라 키를 따로 둔다 */
export const ADMIN_STORAGE_KEY = 'aquasense-admin';

/** 구현된 8개가 운영자 화면이라 진입 즉시 볼 것이 있다. 관리자로 시작하면 빈 화면을 만난다 */
export const DEFAULT_ROLE: Role = 'operator';

export const LOGIN_PATH = '/login';

export function normalizeRole(value: string | undefined | null): Role {
  return value === 'admin' || value === 'operator' || value === 'guest' ? value : DEFAULT_ROLE;
}

/** 스크립트 안에 키를 손으로 적으면 accounts.ts와 갈린다. 배열에서 만든다 */
const ADMIN_KEY_LIST = ADMIN_ACCOUNTS.map((a) => `'${a.key}'`).join(',');

/**
 * 첫 페인트 전에 세 가지를 끝낸다.
 *
 * 1. `data-role`을 붙인다 — 테마와 같은 이유다. 서버는 localStorage를 모르므로
 *    렌더 중에 읽으면 하이드레이션이 깨진다. 속성으로 박아 두고 CSS가 가른다.
 * 2. `data-admin`을 붙인다 — 관리자 계정별로 숫자가 달라지는 자리(사이드바 배지)를
 *    같은 방식으로 가른다. 역할과 별개 축이라 속성도 따로 둔다.
 * 3. 미로그인이면 로그인 화면으로 보낸다 — 본문이 그려지기 전이라 깜빡임이 없다.
 *    시연 동선이지 인가가 아니다. 서버가 없어 실제로 막을 수 있는 것도 없다.
 */
export const SESSION_INIT_SCRIPT = `(function(){try{
var r=localStorage.getItem('${ROLE_STORAGE_KEY}');
if(r!=='admin'&&r!=='operator'&&r!=='guest'){r='${DEFAULT_ROLE}';}
document.documentElement.setAttribute('data-role',r);
var a=localStorage.getItem('${ADMIN_STORAGE_KEY}');
if([${ADMIN_KEY_LIST}].indexOf(a)<0){a='${DEFAULT_ADMIN_ACCOUNT}';}
document.documentElement.setAttribute('data-admin',a);
if(localStorage.getItem('${AUTH_STORAGE_KEY}')!=='1'&&location.pathname!=='${LOGIN_PATH}'){location.replace('${LOGIN_PATH}');}
}catch(e){document.documentElement.setAttribute('data-role','${DEFAULT_ROLE}');document.documentElement.setAttribute('data-admin','${DEFAULT_ADMIN_ACCOUNT}');}})();`;
