'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  SEG_ITEM,
  SEG_ITEM_OFF,
  SEG_ITEM_ON,
  SEG_TRACK,
  SegPill,
} from '@/shared/ui/segmented-control';
import { TABLE_HEAD_ROW } from './table';

interface Column<T> {
  header: string;
  cell: (row: T) => string;
}

/**
 * 그래프가 놓이는 면 `[사용자 지시 2026-08-24]`.
 *
 * 카드 면(흰색)과 **거의 구분되지 않을 만큼** 옅다 — 흰 배경 대비 1.1:1이다.
 * 목적은 강조가 아니라 "여기부터 그래프"라는 경계를 주는 것이고, 더 진하게 하면
 * 그래프 안의 상태 색과 밴드가 이 면과 경쟁한다.
 */
export const CHART_SURFACE = 'rounded-nested bg-surface-2 p-3';

interface ChartFigureProps<T> {
  /** 차트가 무엇을 보여주는지 한 문장. 스크린리더는 이 문장을 먼저 읽는다 */
  label: string;
  children: ReactNode;
  /** 표로도 제공할 데이터. 생략하면 탭 없이 그래프만 둔다 */
  rows?: T[];
  columns?: Column<T>[];
  /** 시계열 전체를 표에 담지 않는다. 288행을 읽히면 아무도 끝까지 못 듣는다 */
  sampleEvery?: number;
  /**
   * 그래프 면을 이 컴포넌트가 깔지 않는다. 이미 옅은 면 위에 놓인 그래프에 쓴다 —
   * 같은 톤을 두 겹 깔면 경계가 두 줄로 보인다(계측 격자의 칸이 그렇다).
   */
  bare?: boolean;
}

/**
 * 차트를 그림으로 선언하고, 같은 데이터를 표로도 남긴다.
 * SVG 선 그래프는 스크린리더에 아무것도 전달하지 못하므로 표가 유일한 대체 경로다.
 *
 * **탭으로 가른다** `[사용자 지시 2026-08-24]`. 예전에는 `<details>`로 접어 두어
 * 펼치면 카드가 그만큼 길어졌다 — 탭은 두 패널이 **같은 자리**를 나눠 쓰므로 카드 높이가
 * 바뀌지 않는다. 표는 그래프와 같은 높이를 갖고 넘치면 그 안에서만 스크롤한다.
 *
 * 표가 없으면 탭도 그리지 않는다 — 고를 것이 하나뿐인 탭은 조작이 아니라 장식이다.
 */
/** 탭 사이를 옮기는 키. 칸이 둘뿐이라 좌우가 곧 앞뒤다 */
const TAB_MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

export function ChartFigure<T>({
  label,
  children,
  rows,
  columns,
  sampleEvery = 1,
  bare = false,
}: ChartFigureProps<T>) {
  const hasTable = Boolean(rows?.length && columns?.length);
  const sampled = rows?.filter((_, i) => i % sampleEvery === 0) ?? [];
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const id = useId();

  /*
   * `onMouseDown`의 `preventDefault`는 버그 회피다.
   *
   * 차트 안에서 마우스를 누르면 Recharts가 키보드 접근용으로 붙여 둔 SVG `<g>`
   * (`tabindex=-1`)에 포커스가 잡힌다. 그 상태로 밖으로 끌면 툴팁이 화면에 얼어붙는다 —
   * Recharts의 `mouseleave` 처리는 hover 플래그만 지우고 포커스로 열린 툴팁은 그대로
   * 두기 때문이다(blur 하면 즉시 사라지는 것으로 확인했다).
   *
   * 기본 동작을 막으면 **마우스로는** 포커스가 잡히지 않는다. 다만 이것만으로는 부족했다 —
   * **Tab 키는 mousedown을 거치지 않아** 차트에 포커스가 닿고 툴팁이 고정됐다. 그래서 차트
   * 쪽에서 `accessibilityLayer={false}`로 `tabindex`를 아예 없앴다(근거는
   * `widgets/water-quality-grid/ui/water-quality-grid.tsx`). 이 핸들러는 포커스 가능한
   * 다른 자손이 생겨도 같은 증상이 돌아오지 않게 남겨 둔다.
   */
  const chart = (
    <div
      role="img"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      className={bare ? undefined : CHART_SURFACE}
    >
      {children}
    </div>
  );

  if (!hasTable || !columns) return <figure className="m-0">{chart}</figure>;

  return (
    <figure className="m-0">
      {/*
       * 껍데기는 `SegmentedControl`과 **같은 것을 쓴다** `[사용자 지시 2026-08-24]` —
       * 값은 `segmented-control.tsx` 한 곳에 있다. 컴포넌트를 그대로 쓰지 못하는 이유는
       * 여기가 `role="tablist"` + `aria-controls`로 패널을 가리켜야 하기 때문이다
       * (`SegmentedControl`은 `role="group"` + `aria-pressed`인 필터다).
       */}
      {/*
       * **화살표로도 옮긴다.** `role="tab"`을 붙인 이상 보조기술 사용자는 좌우 화살표를
       * 기대한다(WAI-ARIA 탭 패턴). Tab 키 이동은 그대로 두므로 더해지기만 한다.
       */}
      <div role="tablist" aria-label={`${label} 보기 방식`} className={cn(SEG_TRACK, 'mb-2')}>
        {(['chart', 'table'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={view === mode}
            aria-controls={`${id}-${mode}`}
            onClick={() => setView(mode)}
            onKeyDown={(event) => {
              if (!TAB_MOVE_KEYS.includes(event.key)) return;
              event.preventDefault();
              if (event.key === 'Home') setView('chart');
              else if (event.key === 'End') setView('table');
              else setView(view === 'chart' ? 'table' : 'chart');
            }}
            className={cn(SEG_ITEM, view === mode ? SEG_ITEM_ON : SEG_ITEM_OFF)}
          >
            {view === mode && <SegPill layoutId={`${id}-tab`} />}
            <span className="relative">{mode === 'chart' ? '그래프로 보기' : '표로 보기'}</span>
          </button>
        ))}
      </div>

      {/*
       * **높이는 그래프가 정한다.** 그래프는 흐름에 두고 표를 그 위에 절대 배치한다 —
       * 칸의 높이가 그래프 하나로 결정되고 표는 그 안에서만 스크롤한다.
       * 격자에 겹쳐 두었을 때는 칸이 둘 중 **큰 쪽**을 따라가 288행 표가 카드를 늘렸다.
       *
       * 감출 때 `hidden`이 아니라 `invisible`인 이유: `display:none`이면 Recharts의
       * `ResponsiveContainer`가 폭 0을 읽어 다시 보일 때 차트를 못 그린다.
       */}
      <div className="relative">
        <div
          id={`${id}-chart`}
          role="tabpanel"
          className={cn(
            'transition-opacity duration-200',
            view === 'chart' ? 'opacity-100' : 'pointer-events-none invisible opacity-0',
          )}
        >
          {chart}
        </div>

        <div
          id={`${id}-table`}
          role="tabpanel"
          className={cn(
            'absolute inset-0 transition-opacity duration-200',
            view === 'table' ? 'opacity-100' : 'pointer-events-none invisible opacity-0',
          )}
        >
          <div className="h-full overflow-auto rounded-nested bg-surface-2 p-3">
            <table className="w-full border-separate border-spacing-0 text-[12px] text-center">
              <caption className="sr-only">{label}</caption>
              <thead className="sticky top-0">
                <tr className={TABLE_HEAD_ROW}>
                  {columns.map((c) => (
                    <th
                      key={c.header}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2.5 text-center"
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampled.map((row, i) => (
                  <tr key={i} className="[&>*]:border-b [&>*]:border-border">
                    {columns.map((c) => (
                      <td key={c.header} className="num whitespace-nowrap px-3 py-2.5 text-fg">
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </figure>
  );
}
