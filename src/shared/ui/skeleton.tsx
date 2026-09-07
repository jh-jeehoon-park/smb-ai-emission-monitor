import { cn } from '@/shared/lib/cn';

/**
 * 아직 모르는 자리 `[사용자 요청 2026-09-07]`.
 *
 * **값을 미리 보여주지 않기 위해 있다.** 계측 훅은 첫 응답이 오기 전까지 `pending`이고,
 * 그때 화면이 내장 데이터를 그려 두면 **답이 아닐 수 있는 값이 답의 자리에 앉는다** —
 * 응답이 오면 카드가 눈에 보이게 다시 그려졌고, 그 구조가 이상하다는 지적을 받았다.
 *
 * **`수신 없음`과 다르다.** 그쪽은 «받아 봤는데 없었다»는 **확인된 부재**이고 이것은
 * «아직 안 물어봤거나 답을 기다린다»다. 모름을 사실 주장으로 바꾸지 않는 것이
 * 이 저장소의 규약이다(**E4**).
 *
 * **깜빡임은 감속 설정을 따른다.** `motion-safe:`가 붙어 있어 설정을 켠 사용자에게는
 * 가만히 있는 면으로 보인다 — 배경 영상을 멈추는 것과 같은 이유다.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  /** 실제 부품이 상수에서 읽는 높이를 그대로 받기 위한 자리 — 임의 값이 아니다 */
  style?: React.CSSProperties;
}) {
  return (
    /**
     * **`<span>`이다 — `<div>`가 아니다** `[사용자 지적 2026-09-07]`.
     *
     * 스켈레톤은 **실제 값과 같은 요소 안에** 들어가야 단(`VALUE_MD`·`TILE_VALUE`)에서 높이를
     * 물려받는데, 그 요소가 대개 `<p>`다. `<div>`를 `<p>` 안에 두면 브라우저 파서가 `<p>`를
     * 먼저 닫아 **서버가 보낸 것과 다른 트리가 되고 하이드레이션이 깨진다** — 실제로 두 곳에서
     * 그렇게 만들었고 React가 *"In HTML, `<div>` cannot be a descendant of `<p>`"* 로 잡아냈다.
     *
     * `display: block`을 물려 `<div>`처럼 눕는다. 인라인으로 써야 하는 자리는 `inline-block`을
     * 넘기면 되고, `cn`이 `tailwind-merge`라 뒤에 온 것이 이긴다.
     */
    <span
      aria-hidden
      className={cn('block rounded-nested bg-surface-3 motion-safe:animate-pulse', className)}
      style={style}
    />
  );
}

/**
 * 표의 **값 칸 여러 개**를 한 번에 덮는다.
 *
 * 행 수가 데이터와 무관하게 정해지는 표에서 쓴다 — 항목 사전이나 필터가 행을 정하고
 * **통계 칸만** 계측에서 오는 경우다(시계열 `항목별 요약` · 리포트 `센서 값 기간 통계`).
 * 두 표가 같은 다섯 칸(최소·평균·최대·최신·결측)을 갖고 **같은 값을 내야 하므로**(**E1**)
 * 대기 표시도 한 부품에서 나와야 한다 — 각자 만들면 한쪽만 옛 모양으로 남는다.
 *
 * **`role="status"`를 두지 않는다.** `<td>` 사이에 `<div>`를 끼울 수 없어서다 —
 * 그 역할은 표의 `<caption>`이 맡는다(부르는 쪽이 문구를 넣는다).
 */
export function SkeletonCells({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <td key={i} className="px-3 py-3.5">
          <Skeleton className="mx-auto h-3 w-10" />
        </td>
      ))}
    </>
  );
}

/**
 * 스켈레톤이 놓인 영역이 **무엇을 기다리는지** 보조기술에 알린다.
 *
 * 모양만 두면 스크린리더에는 아무것도 없는 자리가 된다 — `Skeleton`은 `aria-hidden`이라
 * 더욱 그렇다. `role="status"`가 이 자리가 **무엇을 기다리는지**를 읽히게 한다.
 *
 * **도착을 알리지는 못한다.** 대기가 끝나면 이 노드가 통째로 실제 내용으로 교체되므로
 * 살아 있는 영역 자체가 사라진다 — `aria-live`가 견줄 «전»이 없다. 값이 왔다는 사실은
 * 셸 헤더의 원천 배지가 맡는다. 그것을 여기서 흉내 내려면 두 상태를 같은 노드 안에서
 * 갈아야 하고, 그러면 스켈레톤이 실제 짜임을 흉내 내는 구조가 무너진다.
 */
export function SkeletonRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    /* `aria-live`를 두지 않는다 — 위 주석대로 도착을 알릴 수 없어 선언만 남는다 */
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}
