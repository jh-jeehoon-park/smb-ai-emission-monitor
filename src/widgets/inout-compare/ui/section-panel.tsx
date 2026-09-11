import { cn } from '@/shared/lib/cn';

/**
 * **상세 구역의 껍데기 한 벌** — 머리 띠 + 몸통.
 *
 * `[사용자 요청 2026-09-10: 아래로 내려갈수록 상세 정보의 성격이 강해지도록 디자인한다 ·
 * 테이블을 과도하게 강조하지 말고 상단의 비교 화면을 확인한 후 필요할 때 상세 데이터를
 * 확인하는 구조로 만든다]`.
 *
 * **이 화면의 구역이 두 종류가 된다** — 주인공(현재 상태 상자 · 센서 카드 격자)은 머리 띠가
 * 없고, 그 아래 넷(물의 양 · 가동과 방류 · AI 추정 · 값 전체)은 **전부 이 띠를 쓴다.** 띠가
 * 있다는 것이 «여기부터는 상세»라는 표시다.
 *
 * 한때 넷의 머리글이 서로 달랐다 — 물의 양·AI 추정은 12px 작은 대문자였고 가동과 방류·값
 * 전체는 **15px 굵은 글자**라, 페이지를 훑으면 맨 아래 표의 제목이 그 위 구역들보다 크게
 * 읽혔다. 위계가 아래로 갈수록 **거꾸로** 올라가고 있었다.
 */
export function SectionPanel({
  title,
  aside,
  children,
  bodyClassName,
}: {
  title: string;
  /** 머리 띠 오른쪽 — 그 구역의 조건·고지 한 줄. 없으면 비운다 */
  aside?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-panel border border-card-border bg-surface shadow-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border bg-surface-2 px-5 py-2.5">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">
          {title}
        </h2>
        {aside}
      </div>
      <div className={cn(bodyClassName ?? 'p-5')}>{children}</div>
    </section>
  );
}
