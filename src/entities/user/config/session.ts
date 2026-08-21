import { STORAGE_KEYS } from '@/shared/config/storage';
import { DEFAULT_ADMIN_ACCOUNT, ADMIN_ACCOUNTS } from './accounts';
import { ROLES } from './constants';
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

/**
 * 키는 **레지스트리 한 곳**에 있다(`shared/config/storage.ts`) — 흩어 두면 새 키를 만들 때
 * 겹치는지 확인할 데가 없다. 여기서는 이름만 다시 붙인다.
 *
 * 역할 키에 판(`-v2`)이 붙은 이유는 2026-08-20 회의가 역할 값을 통째로 교체했기 때문이다.
 * 판을 안 올리면 예전 브라우저에 남은 `'admin'`이 정규화를 거쳐 조용히 **기본 역할**이 되어,
 * 사업장 사용자로 보고 있던 사람이 다음 방문에 시스템 관리자 화면을 만난다.
 */
export const ROLE_STORAGE_KEY = STORAGE_KEYS.role;
export const AUTH_STORAGE_KEY = STORAGE_KEYS.signedIn;

/** 사업장 계정이 여럿일 때 어느 계정인가 — 역할과 별개 축이라 키를 따로 둔다 */
export const ADMIN_STORAGE_KEY = STORAGE_KEYS.siteAccount;

/** 구현된 화면 대부분이 전 사업장 관제라 진입 즉시 볼 것이 있다. 사업장으로 시작하면 좁은 화면을 만난다 */
export const DEFAULT_ROLE: Role = 'system';

export const LOGIN_PATH = '/login';

export function normalizeRole(value: string | undefined | null): Role {
  return ROLES.includes(value as Role) ? (value as Role) : DEFAULT_ROLE;
}

/**
 * 스크립트 안에 값을 손으로 적으면 상수와 갈린다. 배열에서 만든다.
 *
 * 역할 목록도 그렇게 만든다 — 예전에는 `r!=='admin'&&r!=='operator'&&r!=='guest'`가
 * 문자열 안에 박혀 있었다. 역할 이름을 바꿀 때 **여기를 놓치면 컴파일은 통과하고
 * 역할 전환만 조용히 안 먹는다.**
 */
const quoted = (values: readonly string[]) => values.map((v) => `'${v}'`).join(',');

/**
 * 첫 페인트 전에 세 가지를 끝낸다.
 *
 * 1. `data-role`을 붙인다 — 테마와 같은 이유다. 서버는 localStorage를 모르므로
 *    렌더 중에 읽으면 하이드레이션이 깨진다. 속성으로 박아 두고 CSS가 가른다.
 * 2. `data-admin`을 붙인다 — 사업장 계정별로 숫자가 달라지는 자리(사이드바 배지)를
 *    같은 방식으로 가른다. 역할과 별개 축이라 속성도 따로 둔다.
 * 3. 미로그인이면 로그인 화면으로 보낸다 — 본문이 그려지기 전이라 깜빡임이 없다.
 *    시연 동선이지 인가가 아니다. 서버가 없어 실제로 막을 수 있는 것도 없다.
 */
export const SESSION_INIT_SCRIPT = `(function(){try{
var r=localStorage.getItem('${ROLE_STORAGE_KEY}');
if([${quoted(ROLES)}].indexOf(r)<0){r='${DEFAULT_ROLE}';}
document.documentElement.setAttribute('data-role',r);
var a=localStorage.getItem('${ADMIN_STORAGE_KEY}');
if([${quoted(ADMIN_ACCOUNTS.map((account) => account.key))}].indexOf(a)<0){a='${DEFAULT_ADMIN_ACCOUNT}';}
document.documentElement.setAttribute('data-admin',a);
if(localStorage.getItem('${AUTH_STORAGE_KEY}')!=='1'&&location.pathname!=='${LOGIN_PATH}'){location.replace('${LOGIN_PATH}');}
}catch(e){document.documentElement.setAttribute('data-role','${DEFAULT_ROLE}');document.documentElement.setAttribute('data-admin','${DEFAULT_ADMIN_ACCOUNT}');}})();`;
