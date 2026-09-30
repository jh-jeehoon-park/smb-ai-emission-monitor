'use client';

import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { ACTION_BUTTON, ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import {
  CHANNEL_ITEM_OPTIONS,
  CHANNEL_ROW_STATUS_LABELS,
  CHANNEL_STATE_LABELS,
  CHANNEL_TARGET_LABELS,
} from '../config/constants';
import type { ChannelRow, ChannelTarget } from '../lib/edit';
import { channelStateOf } from '../lib/resolve';
import type { SiteStage } from '../lib/storage';
import styles from './channel-table.module.scss';

/** `<select>` 값 ↔ 갈 곳. 단계 id가 우리 예약어와 겹치지 않게 접두사를 붙인다 */
const STAGE_PREFIX = 'stage:';

function targetValue(target: ChannelTarget): string {
  if (target.kind === 'stage') return `${STAGE_PREFIX}${target.stageId}`;
  return target.kind;
}

/** 단계로 가려면 항목이 있어야 한다 — 없으면 `null`(사용자가 먼저 고른다) */
function targetOf(value: string, item: MeasurementItemCode | null): ChannelTarget | null {
  if (value.startsWith(STAGE_PREFIX)) {
    return item === null ? null : { kind: 'stage', stageId: value.slice(STAGE_PREFIX.length), item };
  }
  return value === 'unused' ? { kind: 'unused' } : { kind: 'unassigned' };
}

export interface ChannelTableProps {
  rows: readonly ChannelRow[];
  stages: readonly SiteStage[];
  /** 채널 목록을 어디서 얻었는가 — 서버 · 알려진 목록 */
  sourceLabel: string;
  onAssign: (key: string, target: ChannelTarget) => void;
  /** 목록에 없는 채널을 손으로 더한다. 성공하면 `null`, 막히면 그 이유 */
  onAddManual: (key: string, item: MeasurementItemCode, stageId: string) => string | null;
}

/**
 * **채널 연결 — 표 한 장** `[사용자 지적 2026-09-29: 공정 구성 UX가 너무 복잡함]`.
 *
 * ECP가 보내는 채널마다 한 줄이고 **조작은 «어느 단계» 선택 하나**다. 연결 · 다른 단계로 옮기기 ·
 * 사용 안 함 · 연결 해제가 전부 그 한 칸이다. 한 판 전에는 같은 일이 세 곳(단계 카드의 «계측 지점
 * 추가» · 어디에도 안 걸린 채널 모음 · 뺀 채널 목록)에 흩어져 있었다 — 관리자가 하는 일은 «이
 * 채널은 어느 단계 것인가»에 답하는 것 하나다 `[사용자 결정 2026-09-29: ECP 데이터와 공정 매핑]`.
 *
 * **아직 정하지 않은 채널을 세어 위에 적는다** — 조용히 두면 ECP가 보내는 값이 화면 어디에도
 * 나오지 않는데 그 사실을 아무도 모른다.
 */
export function ChannelTable({ rows, stages, sourceLabel, onAssign, onAddManual }: ChannelTableProps) {
  const unassigned = rows.filter((row) => row.target.kind === 'unassigned').length;
  const [adding, setAdding] = useState(false);

  return (
    <div className={styles.root}>
      <p className={styles.summary}>
        <span>
          ECP 채널 <span className={cn(styles.summaryCount, 'num')}>{rows.length}</span>
          <span className={styles.summarySource}>({sourceLabel})</span>
        </span>
        {unassigned > 0 && (
          <span className={styles.summaryPending}>
            아직 정하지 않은 채널 <span className="num">{unassigned}</span>
          </span>
        )}
      </p>

      <div className={styles.table}>
        {/* 넓은 화면에서만 열 머리 — 좁으면 줄마다 두 층으로 쌓여 머리가 뜻을 잃는다 */}
        <div className={styles.head}>
          <span>채널</span>
          <span>무엇을 재는가</span>
          <span>어느 단계의 값인가</span>
          <span>상태</span>
        </div>
        <ul className={styles.rows}>
          {rows.map((row) => (
            <ChannelRowItem key={row.key} row={row} stages={stages} onAssign={onAssign} />
          ))}
        </ul>
      </div>

      {adding ? (
        <ManualAdder
          stages={stages}
          onCancel={() => setAdding(false)}
          onAdd={(key, item, stageId) => {
            const error = onAddManual(key, item, stageId);
            if (error === null) setAdding(false);
            return error;
          }}
        />
      ) : (
        <button type="button" className={ACTION_BUTTON_QUIET} onClick={() => setAdding(true)}>
          <Plus aria-hidden className={styles.glyph} strokeWidth={2.2} />
          목록에 없는 채널 추가
        </button>
      )}
    </div>
  );
}

function ChannelRowItem({
  row,
  stages,
  onAssign,
}: {
  row: ChannelRow;
  stages: readonly SiteStage[];
  onAssign: ChannelTableProps['onAssign'];
}) {
  const selectId = useId();
  const itemId = useId();
  /* 모르는 채널은 무엇을 재는지 사용자가 먼저 고른다 — 고르기 전에는 단계에 걸 수 없다 */
  const [chosenItem, setChosenItem] = useState<MeasurementItemCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const item = row.itemFixed ? row.item : (chosenItem ?? row.item);

  const assign = (value: string) => {
    const target = targetOf(value, item);
    if (target === null) {
      setError('무엇을 재는 채널인지 먼저 고르세요');
      return;
    }
    setError(null);
    onAssign(row.key, target);
  };

  return (
    <li
      className={cn(styles.row, row.target.kind === 'unassigned' && styles.rowUnassigned)}
    >
      <div className={styles.channel}>
        <span className={cn(styles.channelKey, 'num')}>{row.key}</span>
        {/* 좁은 화면에서만 채널 옆에 항목을 붙인다 — 넓으면 항목 열이 따로 있다 */}
        {row.itemFixed && item && (
          <span className={styles.channelItem}>{MEASUREMENT_ITEMS[item].label}</span>
        )}
        {row.target.kind === 'unused' && row.reason && (
          <span className={styles.channelReason}>{row.reason}</span>
        )}
      </div>

      <span className={cn(styles.state, stateTone(row))}>
        {stateLabel(row)}
      </span>

      {!row.itemFixed ? (
        <label htmlFor={itemId} className={styles.cell}>
          <span className={styles.srOnly}>{row.key}이(가) 재는 항목</span>
          <select
            id={itemId}
            value={item ?? ''}
            onChange={(event) => {
              const next = event.target.value as MeasurementItemCode;
              setChosenItem(next);
              setError(null);
              /* 이미 단계에 걸린 채널이면 항목만 바꿔 다시 건다 */
              if (row.target.kind === 'stage') onAssign(row.key, { ...row.target, item: next });
            }}
            className={styles.select}
          >
            <option value="" disabled>
              항목 고르기
            </option>
            {CHANNEL_ITEM_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {MEASUREMENT_ITEMS[code].label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className={styles.itemFixed}>{item ? MEASUREMENT_ITEMS[item].label : '—'}</span>
      )}

      <label htmlFor={selectId} className={styles.cell}>
        <span className={styles.srOnly}>{row.key}을(를) 연결할 단계</span>
        <select
          id={selectId}
          value={targetValue(row.target)}
          onChange={(event) => assign(event.target.value)}
          className={styles.select}
        >
          <option value="unassigned">{CHANNEL_TARGET_LABELS.unassigned}</option>
          {stages.map((stage, index) => (
            <option key={stage.id} value={`${STAGE_PREFIX}${stage.id}`}>
              {index + 1}. {stage.name}
            </option>
          ))}
          <option value="unused">{CHANNEL_TARGET_LABELS.unused}</option>
        </select>
        {error && <span className={styles.rowError}>{error}</span>}
      </label>
    </li>
  );
}

function stateLabel(row: ChannelRow): string {
  if (row.target.kind === 'stage') {
    return CHANNEL_STATE_LABELS[channelStateOf({ key: row.key, item: row.target.item })];
  }
  return CHANNEL_ROW_STATUS_LABELS[row.target.kind];
}

function stateTone(row: ChannelRow): string {
  if (row.target.kind === 'unassigned') return styles.stateUnassigned;
  if (row.target.kind === 'unused') return styles.stateUnused;
  return styles.stateStage;
}

/** 서버에 닿지 않아 목록에 없는 채널을 손으로 적는다 — 이름 · 항목 · 단계를 한 번에 */
function ManualAdder({
  stages,
  onAdd,
  onCancel,
}: {
  stages: readonly SiteStage[];
  onAdd: (key: string, item: MeasurementItemCode, stageId: string) => string | null;
  onCancel: () => void;
}) {
  const keyId = useId();
  const itemId = useId();
  const stageId = useId();
  const [key, setKey] = useState('');
  const [item, setItem] = useState<MeasurementItemCode>(CHANNEL_ITEM_OPTIONS[0]!);
  const [target, setTarget] = useState(stages[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={styles.adder}>
      <div className={styles.adderFields}>
        <label htmlFor={keyId} className={styles.adderField}>
          <span className={styles.adderLabel}>ECP 채널 이름</span>
          <input
            id={keyId}
            value={key}
            onChange={(event) => {
              setKey(event.target.value);
              setError(null);
            }}
            placeholder="예: DO_aeration"
            className={cn(styles.select, 'num', styles.selectStacked)}
          />
        </label>
        <label htmlFor={itemId} className={styles.adderField}>
          <span className={styles.adderLabel}>무엇을 재는가</span>
          <select
            id={itemId}
            value={item}
            onChange={(event) => setItem(event.target.value as MeasurementItemCode)}
            className={cn(styles.select, styles.selectStacked)}
          >
            {CHANNEL_ITEM_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {MEASUREMENT_ITEMS[code].label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={stageId} className={styles.adderField}>
          <span className={styles.adderLabel}>어느 단계의 값인가</span>
          <select
            id={stageId}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={cn(styles.select, styles.selectStacked)}
          >
            {stages.map((stage, index) => (
              <option key={stage.id} value={stage.id}>
                {index + 1}. {stage.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className={styles.adderError}>{error}</p>}
      <div className={styles.adderActions}>
        <button type="button" className={ACTION_BUTTON_QUIET} onClick={onCancel}>
          취소
        </button>
        <button
          type="button"
          className={cn(ACTION_BUTTON, styles.addButton)}
          disabled={key.trim() === '' || target === ''}
          onClick={() => setError(onAdd(key.trim(), item, target))}
        >
          추가
        </button>
      </div>
    </div>
  );
}
