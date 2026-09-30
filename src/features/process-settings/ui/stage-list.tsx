'use client';

import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Trash2, X } from 'lucide-react';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { BADGE_BASE } from '@/shared/ui/badge';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { Switch } from '@/shared/ui/switch';
import { TREATMENT_TYPE_LABELS, TREATMENT_TYPES, type TreatmentType } from '@/entities/process';
import type { SiteStage } from '../lib/storage';
import styles from './stage-list.module.scss';

/** 한 줄 요약 — 채널이 몇 개 걸렸는가. 채널 없이 정한 지점은 따로 센다(할 일이 다르다) */
function pointsSummary(stage: SiteStage): string {
  const withChannel = stage.channels.filter((c) => c.key !== null).length;
  const withoutChannel = stage.channels.length - withChannel;
  const parts = [
    withChannel > 0 ? `채널 ${withChannel}` : '',
    withoutChannel > 0 ? `채널 없는 지점 ${withoutChannel}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '채널 없음';
}

export interface StageListProps {
  stages: readonly SiteStage[];
  onMove: (stageId: string, delta: -1 | 1) => void;
  onRemove: (stageId: string) => void;
  onUpdate: (stageId: string, patch: Partial<Omit<SiteStage, 'id' | 'origin'>>) => void;
  onRemovePoint: (stageId: string, index: number) => void;
  /** 「채널 연결」 보기로 옮긴다 — 채널은 거기서만 정한다 */
  onGoToChannels: () => void;
}

/**
 * **공정 단계 — 한 줄씩.** 누르면 그 단계만 펼쳐 고친다 `[사용자 지적 2026-09-29: 공정 구성 UX가
 * 너무 복잡함 — 관리자가 사용하기에도 복잡해 단순화 필요]`.
 *
 * 한 판 전에는 단계마다 아이콘 단추 넷과 계측 지점 줄이 늘 펼쳐져 있어 기본 화면의 조작이 50개를
 * 넘었다. 여기서는 **단계의 순서와 이름만** 보이고, 순서 바꾸기·삭제는 펼친 편집 안에 있다. 채널은
 * 이 목록에서 정하지 않는다 — 「채널 연결」 표 한 곳이 맡는다.
 */
export function StageList({ stages, onMove, onRemove, onUpdate, onRemovePoint, onGoToChannels }: StageListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ol className={styles.list}>
      {stages.map((stage, index) => {
        const open = openId === stage.id;
        return (
          <li key={stage.id} className={cn(open && styles.stageOpen)}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : stage.id)}
              className={cn(styles.row, open ? styles.rowOpen : styles.rowClosed)}
            >
              <span className={cn(styles.order, 'num')}>
                {index + 1}
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowName}>{stage.name}</span>
                <span className={styles.rowMeta}>
                  {TREATMENT_TYPE_LABELS[stage.type]} · {pointsSummary(stage)}
                </span>
              </span>
              {stage.reuseBranch && <span className={cn(BADGE_BASE, styles.reuseBadge)}>↻ 재이용</span>}
              <ChevronDown
                aria-hidden
                className={cn(styles.chevron, open && styles.chevronOpen)}
                strokeWidth={2}
              />
            </button>

            {open && (
              <StageEditor
                stage={stage}
                order={index + 1}
                isFirst={index === 0}
                isLast={index === stages.length - 1}
                onMove={(delta) => onMove(stage.id, delta)}
                onRemove={() => {
                  setOpenId(null);
                  onRemove(stage.id);
                }}
                onUpdate={(patch) => onUpdate(stage.id, patch)}
                onRemovePoint={(pointIndex) => onRemovePoint(stage.id, pointIndex)}
                onGoToChannels={onGoToChannels}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** 펼친 한 단계 — 누르는 순간 저장한다(설정 화면 규약) */
function StageEditor({
  stage,
  order,
  isFirst,
  isLast,
  onMove,
  onRemove,
  onUpdate,
  onRemovePoint,
  onGoToChannels,
}: {
  stage: SiteStage;
  order: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<Omit<SiteStage, 'id' | 'origin'>>) => void;
  onRemovePoint: (index: number) => void;
  onGoToChannels: () => void;
}) {
  const nameId = useId();
  const unitsId = useId();
  const reuseId = useId();
  const channelCount = stage.channels.filter((c) => c.key !== null).length;

  return (
    <div className={styles.editor}>
      <div className={styles.fields}>
        <label htmlFor={nameId} className={styles.field}>
          <span className={styles.fieldLabel}>단계 이름</span>
          <input
            id={nameId}
            defaultValue={stage.name}
            /* 빈 이름은 받지 않는다 — 공정도와 목차에 이름 없는 칸이 생긴다 */
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next !== '' && next !== stage.name) onUpdate({ name: next });
              else event.target.value = stage.name;
            }}
            className={styles.input}
          />
        </label>
        <label htmlFor={unitsId} className={styles.field}>
          <span className={styles.fieldLabel}>조(槽) — 쉼표로 구분, 비워도 된다</span>
          <input
            id={unitsId}
            defaultValue={stage.units.join(', ')}
            onBlur={(event) =>
              onUpdate({
                units: event.target.value
                  .split(',')
                  .map((unit) => unit.trim())
                  .filter(Boolean),
              })
            }
            className={styles.input}
          />
        </label>
      </div>

      <div className={styles.typeRow}>
        <SegmentedControl
          ariaLabel={`${order}단계 처리 유형`}
          value={stage.type}
          onChange={(next) => onUpdate({ type: next as TreatmentType })}
          options={TREATMENT_TYPES.map((type) => ({ value: type, label: TREATMENT_TYPE_LABELS[type] }))}
        />
        {/* `[사용자 결정 2026-09-29: 재이용 (가)]` 처리수 일부가 여기서 제조공정으로 돌아간다 — 표시만 한다 */}
        <label htmlFor={reuseId} className={styles.reuseSwitch}>
          처리수 일부를 여기서 재이용
          <Switch
            id={reuseId}
            checked={stage.reuseBranch}
            onChange={(event) => onUpdate({ reuseBranch: event.target.checked })}
          />
        </label>
      </div>

      {/* 채널은 여기서 걸지 않는다 — 한 곳(채널 연결 표)에서만 정해야 두 곳에서 어긋나지 않는다 */}
      <p className={styles.channels}>
        계측 채널 <span className={cn(styles.channelCount, 'num')}>{channelCount}</span>
        <button
          type="button"
          onClick={onGoToChannels}
          className={styles.channelLink}
        >
          채널 연결에서 정하기
        </button>
      </p>

      {/*
       * **채널 없이 정한 지점** — 회의가 계측을 요구했지만 그 자리 채널이 없는 곳(1차 침전 TOC).
       * 채널 표에는 줄이 없으므로 여기서만 보이고 여기서만 뺀다.
       */}
      {stage.channels.some((c) => c.key === null) && (
        <ul className={styles.points}>
          {stage.channels.map((channel, index) =>
            channel.key === null ? (
              <li
                key={`none-${channel.item}-${index}`}
                className={styles.point}
              >
                {MEASUREMENT_ITEMS[channel.item].symbol} · 채널 미지정
                <button
                  type="button"
                  aria-label={`${MEASUREMENT_ITEMS[channel.item].label} 지점 빼기`}
                  onClick={() => onRemovePoint(index)}
                  className={styles.pointRemove}
                >
                  <X aria-hidden className={styles.pointGlyph} strokeWidth={2.2} />
                </button>
              </li>
            ) : null,
          )}
        </ul>
      )}

      <div className={styles.foot}>
        <div className={styles.move}>
          <button type="button" className={cn(ACTION_BUTTON_QUIET, styles.moveButton)} disabled={isFirst} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden className={styles.glyph} strokeWidth={2} />
            위로
          </button>
          <button type="button" className={cn(ACTION_BUTTON_QUIET, styles.moveButton)} disabled={isLast} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden className={styles.glyph} strokeWidth={2} />
            아래로
          </button>
        </div>
        <button
          type="button"
          className={cn(ACTION_BUTTON_QUIET, styles.removeButton)}
          onClick={onRemove}
        >
          <Trash2 aria-hidden className={styles.glyph} strokeWidth={2} />이 단계 삭제
        </button>
      </div>
    </div>
  );
}
