/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { SITES, DEFAULT_SITE_ID, getSite } from './api/fixtures';
export { firstSiteIn, scopeLabelOf, siteIdsInScope, sitesIn, withinScope } from './lib/municipality';
export type { Site, Industry } from './model/types';
