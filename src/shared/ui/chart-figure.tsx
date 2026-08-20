import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  cell: (row: T) => string;
}

interface ChartFigureProps<T> {
  /** 차트가 무엇을 보여주는지 한 문장. 스크린리더는 이 문장을 먼저 읽는다 */
  label: string;
  children: ReactNode;
  /** 표로도 제공할 데이터. 생략하면 그림 라벨만 붙는다 */
  rows?: T[];
  columns?: Column<T>[];
  /** 시계열 전체를 표에 담지 않는다. 288행을 읽히면 아무도 끝까지 못 듣는다 */
  sampleEvery?: number;
}

/**
 * 차트를 그림으로 선언하고, 큰 차트에는 같은 데이터를 표로도 남긴다.
 * SVG 선 그래프는 스크린리더에 아무것도 전달하지 못하므로 표가 유일한 대체 경로다.
 *
 * 표를 sr-only로 숨기지 않고 <details>로 두는 이유: sr-only 컨테이너는 1×1이지만
 * 안의 표는 제 크기대로 배치돼 다른 요소를 가린다. 접힌 <details>는 렌더 자체를 하지 않고,
 * 눈으로 보는 사용자도 값을 확인할 수 있다.
 */
export function ChartFigure<T>({
  label,
  children,
  rows,
  columns,
  sampleEvery = 1,
}: ChartFigureProps<T>) {
  const hasTable = Boolean(rows?.length && columns?.length);
  const sampled = rows?.filter((_, i) => i % sampleEvery === 0) ?? [];

  return (
    <figure className="m-0">
      {/*
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
       */}
      <div role="img" aria-label={label} onMouseDown={(e) => e.preventDefault()}>
        {children}
      </div>

      {hasTable && columns && (
        <details className="mt-2 group">
          <summary className="cursor-pointer list-none text-[11px] text-fg-subtle transition-colors duration-200 hover:text-fg-muted">
            표로 보기
          </summary>

          {/* 패널이 이미 면을 제공한다. 여기서 테두리를 또 두르면 카드 속 카드가 된다 */}
          <div className="mt-2 max-h-56 overflow-auto border-t border-border pt-2">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">{label}</caption>
              <thead className="sticky top-0 bg-surface">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.header}
                      scope="col"
                      className="whitespace-nowrap py-1.5 pr-4 text-[11px] font-medium text-fg-muted"
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampled.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.header} className="num whitespace-nowrap py-1 pr-4 text-[11px] text-fg">
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}
