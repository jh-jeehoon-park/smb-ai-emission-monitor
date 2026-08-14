/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export {
  ADMIN_ACCOUNTS,
  DEFAULT_ADMIN_ACCOUNT,
  adminSiteId,
  normalizeAdminAccount,
} from './config/accounts';
export { ROLES, ROLE_PROFILES, SCREEN_ROLES, canRoleSee } from './config/constants';
export {
  ADMIN_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  DEFAULT_ROLE,
  LOGIN_PATH,
  ROLE_STORAGE_KEY,
  SESSION_INIT_SCRIPT,
  normalizeRole,
} from './config/session';
export { RoleProvider, useRole } from './ui/role-context';
export { RoleSwitch } from './ui/role-switch';
export type { AdminAccount, AdminAccountKey } from './config/accounts';
export type { Role, RoleScope, RoleProfile } from './model/types';
