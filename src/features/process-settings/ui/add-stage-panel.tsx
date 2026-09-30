'use client';

import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { ACTION_BUTTON, ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import {
  TREATMENT_TYPE_LABELS,
  TREATMENT_TYPES,
  UNIT_PROCESS_CATALOG,
  type TreatmentType,
} from '@/entities/process';
import styles from './add-stage-panel.module.scss';

export interface NewStageDraft {
  origin: 'catalog' | 'custom';
  name: string;
  type: TreatmentType;
}

const MODES = [
  { value: 'catalog', label: '목록에서 고르기' },
  { value: 'custom', label: '직접 입력' },
] as const;

/**
 * 단계를 더하는 **한 곳** `[사용자 지적 2026-09-29: 공정 구성 UX가 너무 복잡함]`.
 *
 * 한 판 전에는 카드 사이마다 「여기에 단계 넣기」가 있어 단계 다섯에 넣는 단추가 다섯이었다.
 * 지금은 목록 끝의 단추 하나이고, **어디에 넣을지는 이 패널의 «위치» 한 칸**이 정한다(기본은 맨 끝).
 *
 * **목록은 현장조사 5개소에 실제로 나온 공정만이다** — 이름 옆에 어느 사업장에서 나왔는지를
 * 적는다. 목록 밖은 **직접 입력**한다 `[사용자 결정 2026-09-29: ECP로 들어오는 데이터와 공정을
 * 매핑해야 하므로 직접 입력이 필요]`. 직접 입력에는 **처리 유형이 필수**다 — 유형이 공정도의
 * 아이콘과 «이 단계가 무엇을 바꾸는 곳인가»를 정한다.
 */
export function AddStagePanel({
  stageNames,
  onAdd,
  onCancel,
}: {
  /** 지금 단계 이름들 — «위치» 선택지를 만든다 */
  stageNames: readonly string[];
  onAdd: (draft: NewStageDraft, index: number) => void;
  onCancel: () => void;
}) {
  const nameId = useId();
  const positionId = useId();
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [name, setName] = useState('');
  const [type, setType] = useState<TreatmentType>('physical');
  const [position, setPosition] = useState(stageNames.length);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <label htmlFor={positionId} className={styles.position}>
          <span className={styles.fieldLabel}>넣을 위치</span>
          <select
            id={positionId}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            className={styles.field}
          >
            <option value={0}>맨 앞</option>
            {stageNames.map((stageName, index) => (
              <option key={`${stageName}-${index}`} value={index + 1}>
                {index === stageNames.length - 1 ? `맨 끝 (${stageName} 뒤)` : `${index + 1}. ${stageName} 뒤`}
              </option>
            ))}
          </select>
        </label>
        <SegmentedControl ariaLabel="단계를 더하는 방법" value={mode} onChange={setMode} options={[...MODES]} />
      </div>

      {mode === 'catalog' ? (
        <ul className={styles.catalog}>
          {UNIT_PROCESS_CATALOG.map((unit) => (
            <li key={unit.id}>
              <button
                type="button"
                onClick={() => onAdd({ origin: 'catalog', name: unit.name, type: unit.type }, position)}
                className={styles.catalogItem}
              >
                <span className={styles.catalogText}>
                  <span className={styles.catalogName}>{unit.name}</span>
                  <span className={styles.catalogMeta}>
                    {TREATMENT_TYPE_LABELS[unit.type]} · {unit.seenAt.join(', ')}
                  </span>
                </span>
                <Plus aria-hidden className={styles.catalogPlus} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.custom}>
          <label htmlFor={nameId} className={styles.nameField}>
            <span className={styles.fieldLabel}>단계 이름</span>
            <input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 가압부상조"
              className={styles.field}
            />
          </label>
          <div>
            <p className={styles.typeLabel}>처리 유형</p>
            <SegmentedControl
              ariaLabel="처리 유형"
              value={type}
              onChange={(next) => setType(next as TreatmentType)}
              options={TREATMENT_TYPES.map((t) => ({ value: t, label: TREATMENT_TYPE_LABELS[t] }))}
            />
          </div>
          <button
            type="button"
            className={cn(ACTION_BUTTON, styles.addButton)}
            disabled={name.trim() === ''}
            onClick={() => onAdd({ origin: 'custom', name: name.trim(), type }, position)}
          >
            <Plus aria-hidden className={styles.glyph} strokeWidth={2.2} />
            이 단계 추가
          </button>
        </div>
      )}

      <div className={styles.foot}>
        <button type="button" className={ACTION_BUTTON_QUIET} onClick={onCancel}>
          닫기
        </button>
      </div>
    </div>
  );
}
