/** feature Public API — 바깥에서는 이 파일만 import 한다 */
export { ProcessSettingsProvider, useProcessSettingsStore } from './model/process-settings-context';
export { useProcess } from './model/use-process';
export { CHANNEL_STATE_LABELS, NO_STAGE_CODES_REASON } from './config/constants';
export { channelStateOf, resolveProcess } from './lib/resolve';
export { PROCESS_STAGE_ITEMS_NOTE, ProcessStageForm } from './ui/process-stage-form';
export type { ChannelState, ResolvedProcess, ResolvedStage } from './lib/resolve';
export type { SiteProcess, SiteProcessBySite, SiteStage, StageChannel } from './lib/storage';
