import { UNRESOLVED_LIMIT_TEXT } from '@/shared/config/discharge-limits';
import { PROVISIONAL_MEASUREMENT_GRADE_LABELS } from '@/shared/config/provisional';
import { ACTUAL_HEX, MEASUREMENT_GRADE_HEX } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { TABLE_HEAD_CELL, TABLE_HEAD_ROW, TABLE_ROOT, TABLE_ROW, TABLE_SCROLL } from '@/shared/ui/table';
import { INLET_MARK_COLOR, WINDOW_HOURS } from '../config/constants';
import {
  verdictText,
  type InOutCompare,
  type PointReading,
  type TreatmentRow,
} from '../lib/point-readings';
import { SectionPanel } from './section-panel';

/**
 * 한 행 — **유입·유출 짝이 있는 것과 없는 것을 같은 표에 담는다.**
 *
 * 수질 8종은 두 지점이 짝을 이루고, 유량·설비·AI 추정은 한쪽뿐이다. 짝이 없는 행의 `유입`
 * 칸은 `—`다 — 빈 칸으로 두면 «못 받았다»로 읽힌다(**E4**).
 */
interface TableRow {
  key: string;
  label: string;
  symbol: string;
  inlet: PointReading | null;
  outlet: PointReading;
  changeText: string | null;
}

interface Group {
  title: string;
  rows: TableRow[];
}

/**
 * **읽기 위계를 세 값으로 낸다** `[사용자 요청 2026-09-10: 열 간격·행 높이·typography·정렬·
 * 숫자 강조를 개선 · 상단 센서 카드에서 본 내용을 하단 표에서 다시 확인할 수 있도록 정보의
 * 연결성을 높여라]`.
 *
 * **§8 `표`의 공용 상수는 손대지 않는다** — 그것을 고치면 저장소의 아홉 표가 함께 움직인다.
 * 여기서는 그 위에 이 표만의 값을 덧댄다.
 */

/**
 * 행 높이. 열이 열이라 촘촘하면 눈이 행을 잃는다.
 *
 * `[사용자 요청 2026-09-10: 행 간 간격을 조금 확보하여 가독성을 높인다]` — 48 → 52px.
 */
const ROW_H = 'h-13';

/** 숫자 칸 — 우측 정렬 + 굵게. 자릿수가 한 자리에서 만나 위아래로 견줄 수 있다 */
const NUM_CELL = 'num px-3 text-right text-[12px] font-semibold text-fg';

/**
 * **비교 세 열을 한 묶음으로 묶는 면.**
 *
 * `유입수 · 유출수 · 변화`가 이 표의 주인공인데 열 열 사이에 흩어져 있었다. 아주 옅은
 * 면을 깔아 **위 카드가 보여 준 그 비교가 표에서도 한 덩어리로** 보이게 한다 — 색이 아니라
 * 면이고, 값은 하나도 바뀌지 않는다.
 */
const COMPARE_COL = 'bg-surface-2/60';

/** 카드 범례와 같은 점 — 위아래가 같은 어휘를 쓴다 */
function Dot() {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: ACTUAL_HEX }}
    />
  );
}

function Ring() {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full bg-surface"
      style={{ border: `2px solid ${INLET_MARK_COLOR}` }}
    />
  );
}

/** 짝 없는 행 — 유량·설비·AI 추정 */
function single(reading: PointReading): TableRow {
  return {
    key: reading.code,
    label: reading.label,
    symbol: reading.symbol,
    inlet: null,
    outlet: reading,
    changeText: null,
  };
}

/** 짝 있는 행 — 수질 8종 */
function paired(row: TreatmentRow): TableRow {
  return {
    key: row.code,
    label: row.label,
    symbol: row.outlet.symbol,
    inlet: row.inlet,
    outlet: row.outlet,
    changeText: row.changeText,
  };
}

/**
 * 값 전체 — **그림이 유일한 표현이 되지 않게 하는 자리다**(§8 `차트 대체표`).
 *
 * 위 대조 줄이 수질 8종만 보이므로, 그 밖의 값(유량·전류·전력·수위·AI 추정)이 화면에서
 * 사라지지 않게 여기서 받는다.
 *
 * **기준·판정은 유출수의 것이다** — 규제 대상은 방류수이고 유입에는 배출허용기준이라는
 * 개념 자체가 없다. 열 이름이 그 사실을 적는다.
 *
 * 한때 세 번째 대조가 «지금 값 ↔ 24시간 평균»이었다. 유입 수질 채널이 없어 지점 대 지점
 * 대조가 불가능하다고 본 판본이었는데, 그것은 데이터 사정이지 설계 근거가 아니었다
 * `[사용자 지적 2026-09-10]` — 지금은 두 지점이 열로 마주 서고 평균은 옆 칸으로 남는다.
 */
export function CompareTable({ compare }: { compare: InOutCompare }) {
  const groups: Group[] = [
    { title: '수질 — 유입 ↔ 유출', rows: compare.treatment.map(paired) },
    { title: '물의 양', rows: [single(compare.inlet.flow), single(compare.outlet.flow)] },
    {
      title: '함께 읽는 값',
      rows: [...compare.inlet.aside, ...compare.outlet.aside].map(single),
    },
    { title: 'AI 추정 — 직접 재지 않습니다', rows: compare.estimates.map(single) },
  ];

  return (
    /*
     * **`Panel`을 쓰지 않는다** `[사용자 요청 2026-09-10]`. 다만 **표 자체는 §8 `표`의 상수
     * 한 벌을 그대로 쓴다** — 표만 다른 모양이면 같은 저장소의 아홉 표와 어긋나고, 그 규칙이
     * 막으려던 것이 정확히 그것이다. 달라지는 것은 껍데기이지 표가 아니다.
     *
     * **제목이 15px 굵은 글자였다** `[사용자 요청 2026-09-10: 테이블을 과도하게 강조하지 말고
     * 상단의 비교 화면을 확인한 후 필요할 때 상세 데이터를 확인하는 구조로 만든다]`. 페이지
     * 맨 아래 구역의 제목이 그 위 넷보다 크게 읽히고 있었다 — 지금은 넷이 같은 머리 띠를 쓴다.
     */
    <SectionPanel title="값 전체">
      <div className={TABLE_SCROLL}>
        <table className={TABLE_ROOT}>
          <caption className="sr-only">
            {`항목별 유입값과 유출값, 변화율, 유출수의 최근 ${WINDOW_HOURS}시간 평균과 단위·계측 등급·기준·판정`}
          </caption>
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th scope="col" className={TABLE_HEAD_CELL}>
                구분
              </th>
              <th scope="col" className={TABLE_HEAD_CELL}>
                항목
              </th>
              <th scope="col" className={cn(TABLE_HEAD_CELL, COMPARE_COL)}>
                <span className="inline-flex items-center gap-1.5">
                  <Ring />
                  유입수
                </span>
              </th>
              <th scope="col" className={cn(TABLE_HEAD_CELL, COMPARE_COL)}>
                <span className="inline-flex items-center gap-1.5">
                  <Dot />
                  유출수
                </span>
              </th>
              <th scope="col" className={cn(TABLE_HEAD_CELL, COMPARE_COL)}>
                변화
              </th>
              <th scope="col" className={TABLE_HEAD_CELL}>
                {`유출수 ${WINDOW_HOURS}시간 평균`}
              </th>
              <th scope="col" className={TABLE_HEAD_CELL}>
                단위
              </th>
              <th scope="col" className={TABLE_HEAD_CELL}>
                계측 등급
              </th>
              <th scope="col" className={TABLE_HEAD_CELL}>
                방류 기준
              </th>
              <th scope="col" className={TABLE_HEAD_CELL}>
                기준 판정
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) =>
              group.rows.map((row, i) => (
                <tr key={`${group.title}-${row.key}`} className={TABLE_ROW}>
                  <th
                    scope="row"
                    className={cn(
                      'px-3 text-left align-middle text-[12px] font-semibold text-fg',
                      ROW_H,
                    )}
                  >
                    {i === 0 ? group.title : ''}
                  </th>
                  <td className={cn('px-3 text-[12px] text-fg', ROW_H)}>
                    {row.label}
                    <span className="ml-1 text-fg-subtle">{row.symbol}</span>
                  </td>
                  {/* 짝이 없는 행의 유입 칸은 `—`다 — 비우면 «못 받았다»로 읽힌다 */}
                  <td className={cn(NUM_CELL, COMPARE_COL, ROW_H)}>
                    {row.inlet === null
                      ? '—'
                      : cellValue(row.inlet.unreceived, row.inlet.value, row.inlet.valueText)}
                    {/* 서버가 준 값과 우리가 만든 값을 한 표에 두되, 칸마다 어느 쪽인지 적는다 */}
                    {row.inlet?.demo && row.inlet.value !== null && (
                      <span className="ml-1.5 rounded-chip bg-surface-3 px-1.5 py-0.5 text-[12px] font-normal text-fg-subtle">
                        시연값
                      </span>
                    )}
                  </td>
                  <td className={cn(NUM_CELL, COMPARE_COL, ROW_H)}>
                    {cellValue(row.outlet.unreceived, row.outlet.value, row.outlet.valueText)}
                  </td>
                  <td className={cn(NUM_CELL, COMPARE_COL, ROW_H, 'font-normal text-fg-muted')}>
                    {row.changeText ?? '—'}
                  </td>
                  <td className={cn(NUM_CELL, ROW_H, 'font-normal text-fg-muted')}>
                    {cellValue(row.outlet.unreceived, row.outlet.average, row.outlet.averageText)}
                  </td>
                  <td className={cn('px-3 text-[12px] text-fg-subtle', ROW_H)}>
                    {row.outlet.unitKo}
                  </td>
                  <td
                    className={cn('px-3 text-center text-[12px]', ROW_H)}
                    style={{ color: MEASUREMENT_GRADE_HEX[row.outlet.grade] }}
                  >
                    {PROVISIONAL_MEASUREMENT_GRADE_LABELS[row.outlet.grade]}
                  </td>
                  {/*
                   * **기준이 걸리지 않는 항목은 두 칸이 `—`다.** 유량·전류에 «기준값 미확정»을
                   * 적으면 없는 기준이 정해질 예정인 것처럼 읽힌다.
                   */}
                  <td className={cn('px-3 text-center text-[12px] text-fg-subtle', ROW_H)}>
                    {!row.outlet.regulated ? '—' : (row.outlet.limitText ?? UNRESOLVED_LIMIT_TEXT)}
                  </td>
                  <td className={cn('px-3 text-center text-[12px] text-fg-subtle', ROW_H)}>
                    {verdictText(row.outlet) ?? '—'}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </SectionPanel>
  );
}

/** 채널이 아예 안 오는 것과 그 시각에 못 받은 것을 가른다(E4) */
function cellValue(unreceived: boolean, value: number | null, text: string): string {
  if (unreceived) return '미수신';
  return value === null ? '수신 없음' : text;
}
