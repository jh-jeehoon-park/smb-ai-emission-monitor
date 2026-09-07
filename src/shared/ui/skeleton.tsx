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
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('rounded-nested bg-surface-3 motion-safe:animate-pulse', className)}
    />
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
