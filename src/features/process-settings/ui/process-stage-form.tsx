'use client';

import { useState } from 'react';
import { Plus, RotateCcw, Undo2 } from 'lucide-react';
import { ACTION_BUTTON, ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { isMetaChannel, useSiteChannelKeys } from '@/entities/measurement';
import { CHANNEL_SOURCE_LABELS } from '../config/constants';
import { useProcessSettingsStore } from '../model/process-settings-context';
import { useProcess } from '../model/use-process';
import {
  addChannel,
  assignChannel,
  channelRows,
  insertStage,
  moveStage,
  removeChannel,
  removeStage,
  unassignedCount,
  updateStage,
} from '../lib/edit';
import type { SiteProcess, SiteStage } from '../lib/storage';
import { AddStagePanel, type NewStageDraft } from './add-stage-panel';
import { ChannelTable } from './channel-table';
import { StageList } from './stage-list';
import styles from './process-stage-form.module.scss';

/** 이 폼을 담는 패널의 제목 옆 툴팁에 쓴다 */
export const PROCESS_STAGE_ITEMS_NOTE =
  '「공정 단계」에서 이 사업장의 단계와 순서를 정하고, 「채널 연결」에서 ECP가 보내는 채널이 어느 단계의 값인지 고릅니다. 단계 목록은 실증 현장조사 5개소에 실제로 나온 공정이고, 목록 밖은 직접 입력합니다.';

type View = 'stages' | 'channels';

/**
 * 새 단계의 id. **이벤트 안에서만 만든다** — 렌더 중에 만들면 서버와 클라이언트의 값이 달라
 * 하이드레이션이 깨진다. 이름을 바꿔도 유지되는 값이라 공정 화면 주소(`?stage=`)가 이것을 쓴다.
 */
function newStageId(): string {
  return `st-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * 사업장의 **공정 구성** (SCR-OP-010) — 두 보기로 나눈다 `[사용자 지적 2026-09-29: 공정 구성 UX가
 * 너무 복잡함 — 관리자가 사용하기에도 복잡해 단순화 필요]`.
 *
 * 한 판 전(같은 날)은 단계 순서 · 채널 연결 · 안 쓰는 채널 정리를 **한 화면에 동시에** 펼쳤다 —
 * 기본 화면에 조작 단추가 50개를 넘었고 세로가 1,900px이었다(1440px 실측). 관리자가 하는 일은 둘이고
 * 순서도 있다: **단계를 정한다 → 채널이 어느 단계 것인지 고른다.** 그 둘을 보기 하나씩에 둔다.
 *
 * - 「공정 단계」 — 한 줄씩. 누르면 그 단계만 펼쳐 고친다(이름 · 유형 · 재이용 · 위로/아래로 · 삭제)
 * - 「채널 연결」 — 표 한 장. 채널마다 «어느 단계의 값인가» 한 칸
 *
 * 아직 정하지 않은 채널이 있으면 **보기 이름에 수를 적는다** — 다른 보기에 있어도 놓치지 않게.
 * 삭제는 확인창 대신 되돌리기 줄로 받는다.
 */
export function ProcessStageForm({ siteId }: { siteId: string }) {
  const { setProcess, reset } = useProcessSettingsStore();
  const { process, isUserSet } = useProcess();
  const channels = useSiteChannelKeys(siteId);

  const [view, setView] = useState<View>('stages');
  const [adding, setAdding] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<{ stage: SiteStage; index: number } | null>(null);

  const save = (next: SiteProcess) => setProcess(siteId, next);
  const rows = channelRows(process, channels.keys, isMetaChannel);
  const pending = unassignedCount(rows);

  const addStage = (draft: NewStageDraft, index: number) => {
    save(
      insertStage(
        process,
        {
          id: newStageId(),
          origin: draft.origin,
          name: draft.name,
          type: draft.type,
          units: [],
          channels: [],
          equipmentIds: [],
          reuseBranch: false,
        },
        index,
      ),
    );
    setAdding(false);
  };

  const views = [
    { value: 'stages' as const, label: `공정 단계 ${process.stages.length}` },
    { value: 'channels' as const, label: pending > 0 ? `채널 연결 · 정하기 전 ${pending}` : '채널 연결' },
  ];

  return (
    <div className={styles.root}>
      <SegmentedControl ariaLabel="공정 구성 보기" value={view} onChange={setView} options={views} />

      {view === 'stages' ? (
        <div className={styles.stages}>
          {lastRemoved && (
            <div
              role="status"
              className={styles.undo}
            >
              <span>
                「{lastRemoved.stage.name}」을(를) 삭제했습니다
                {lastRemoved.stage.channels.some((c) => c.key) && ' — 연결돼 있던 채널은 «정하지 않음»으로 돌아갔습니다'}
              </span>
              <button
                type="button"
                className={ACTION_BUTTON_QUIET}
                onClick={() => {
                  save(insertStage(process, lastRemoved.stage, lastRemoved.index));
                  setLastRemoved(null);
                }}
              >
                <Undo2 aria-hidden className={styles.glyph} strokeWidth={2} />
                되돌리기
              </button>
            </div>
          )}

          {process.stages.length > 0 ? (
            <StageList
              stages={process.stages}
              onMove={(stageId, delta) => save(moveStage(process, stageId, delta))}
              onRemove={(stageId) => {
                const { process: next, removed } = removeStage(process, stageId);
                save(next);
                setLastRemoved(removed);
              }}
              onUpdate={(stageId, patch) => save(updateStage(process, stageId, patch))}
              onRemovePoint={(stageId, index) => save(removeChannel(process, stageId, index))}
              onGoToChannels={() => setView('channels')}
            />
          ) : (
            <p className={styles.empty}>
              단계가 없습니다 — 「단계 추가」로 이 사업장의 공정을 만드세요
            </p>
          )}

          {adding ? (
            <AddStagePanel
              stageNames={process.stages.map((s) => s.name)}
              onAdd={addStage}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <div className={styles.actions}>
              <button type="button" className={ACTION_BUTTON} onClick={() => setAdding(true)}>
                <Plus aria-hidden className={styles.glyph} strokeWidth={2.2} />
                단계 추가
              </button>
              {/* 되돌릴 것이 없으면 그리지 않는다 */}
              {isUserSet && (
                <button
                  type="button"
                  onClick={() => {
                    reset(siteId);
                    setLastRemoved(null);
                  }}
                  className={ACTION_BUTTON_QUIET}
                >
                  <RotateCcw aria-hidden className={styles.glyph} strokeWidth={2} />
                  표준 공정으로 되돌리기
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <ChannelTable
          rows={rows}
          stages={process.stages}
          sourceLabel={CHANNEL_SOURCE_LABELS[channels.source]}
          onAssign={(key, target) => save(assignChannel(process, key, target))}
          onAddManual={(key, item, stageId) => {
            if (rows.some((row) => row.key === key)) return `「${key}」은(는) 이미 표에 있습니다`;
            const result = addChannel(process, stageId, { key, item });
            if (!result.ok) return result.reason;
            save(result.process);
            return null;
          }}
        />
      )}
    </div>
  );
}
