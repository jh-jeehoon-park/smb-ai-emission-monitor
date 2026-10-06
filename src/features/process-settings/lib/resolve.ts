import type { MeasurementGrade } from '@/shared/config/provisional';
import { PROCESS_STAGES, type ProcessStage } from '@/entities/process';
import { readableSeriesOf, type SeriesCode } from '@/entities/measurement';
import type { CHANNEL_STATE_LABELS } from '../config/constants';
import { standardProcess } from './seed';
import type { SiteProcess, SiteProcessBySite, SiteStage, StageChannel } from './storage';

/** 그 사업장에서 살아 있는 단계 하나 */
export interface ResolvedStage {
  /** 공정 화면이 그리는 모양 — 표준 단계의 설명·등급을 이어받고, 새 단계는 계측 지점에서 만든다 */
  stage: ProcessStage;
  /** 이 단계에서 **지금 값을 읽을 수 있는** 계열. 비어 있으면 화면에 값이 없다 */
  codes: SeriesCode[];
  /** 계측 지점 전부 — 채널 미지정·수신 연결 전 지점까지 */
  channels: StageChannel[];
  /** 여기서 재이용으로 갈라지는가(표시만) */
  reuseBranch: boolean;
}

export interface ResolvedProcess {
  /** 사업장의 공정 — 순서대로 */
  stages: ResolvedStage[];
  /** 원본(편집 화면이 고친다) */
  process: SiteProcess;
  /** 사용자가 한 번이라도 설정했는가. 화면이 출처를 다르게 적는 데 쓴다 */
  isUserSet: boolean;
}

export type ChannelState = keyof typeof CHANNEL_STATE_LABELS;

/** 계측 지점 하나가 지금 값을 받는가 — 설정 카드와 공정 화면이 같은 말을 쓰게 한 곳에 둔다 */
export function channelStateOf(channel: StageChannel): ChannelState {
  if (channel.key === null) return 'noChannel';
  return readableSeriesOf(channel.key) ? 'reading' : 'notWired';
}

const STANDARD_BY_ID = new Map(PROCESS_STAGES.map((s) => [s.id, s]));

/**
 * 계측 등급 — **계측 지점에서 나온다.**
 *
 * 읽을 수 있는 채널이 하나라도 있으면 `실측`. 없으면 표준 단계는 원래 등급을 잇되 `실측`이던
 * 단계는 `계측 없음`으로 내린다(채널을 다 빼면 더는 실측이 아니다). 새 단계는 `계측 없음`이다 —
 * `AI 추정`은 우리가 모델을 붙인 자리에만 쓰는 말이라 사용자가 만든 단계에 줄 수 없다.
 */
function gradeOf(site: SiteStage, readable: SeriesCode[]): MeasurementGrade {
  if (readable.length > 0) return 'actual';
  const standard = site.origin === 'standard' ? STANDARD_BY_ID.get(site.id) : undefined;
  if (!standard || standard.grade === 'actual') return 'none';
  return standard.grade;
}

function noteOf(site: SiteStage, readable: SeriesCode[]): string {
  const standard = site.origin === 'standard' ? STANDARD_BY_ID.get(site.id) : undefined;
  if (standard) return standard.measurementNote;

  const pending = site.channels.length - readable.length;
  if (site.channels.length === 0) return '계측 지점이 없다 — 사업장 설정에서 ECP 채널을 걸면 값을 표시한다';
  return pending > 0
    ? `계측 지점 ${site.channels.length}곳 중 ${pending}곳은 채널 미지정이거나 아직 수신을 연결하지 않았다`
    : `계측 지점 ${site.channels.length}곳 — ECP 채널로 받는다`;
}

function toResolved(site: SiteStage, index: number): ResolvedStage {
  const readable = site.channels
    .map((c) => (c.key ? readableSeriesOf(c.key) : null))
    .filter((code): code is SeriesCode => code !== null);

  return {
    stage: {
      id: site.id,
      order: index + 1,
      name: site.name,
      type: site.type,
      units: site.units,
      grade: gradeOf(site, readable),
      measurementNote: noteOf(site, readable),
      equipmentIds: site.equipmentIds,
      optional: site.origin !== 'standard',
      defaultCodes: [],
    },
    codes: readable,
    channels: site.channels,
    reuseBranch: site.reuseBranch,
  };
}

/**
 * 그 사업장의 공정.
 *
 * **설정이 없으면 표준 5단계 + 씨앗 매핑이다** — 비어 있음을 «공정이 없다»로 읽지 않는다.
 * 순수 함수다. localStorage도 React도 모른다.
 */
export function resolveProcess(settings: SiteProcessBySite | null, siteId: string): ResolvedProcess {
  const own = settings?.[siteId];
  const process = own ?? standardProcess();
  return {
    stages: process.stages.map(toResolved),
    process,
    isUserSet: Boolean(own),
  };
}
