import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { WALL_META, WALL_TITLE } from '../config/constants';
import styles from './wall-panel.module.scss';

/**
 * 현황판의 패널 한 장 — **레퍼런스의 머리 띠를 그대로 가져온다.**
 *
 * `[사용자 요청 2026-09-11: 톤앤매너는 유지하되 최대한 레퍼런스와 유사한 UI]`.
 *
 * 레퍼런스 셋이 공통으로 쓰는 표식이 **제목 왼쪽의 짧은 강조 틱**이다. 그것 하나로 패널이
 * «구역»으로 읽히고, 제목을 굵게만 하는 것보다 훨씬 멀리서 잡힌다.
 *
 * **`Panel`·`WALL_CARD`를 쓰지 않는다** `[사용자 요청 2026-09-11: 기존의 컴포넌트를 활용하지
 * 않고 새로 구축]`. 모서리·테두리·그림자 토큰은 §8을 그대로 따르므로 톤은 유지된다 —
 * 달라지는 것은 **머리 띠와 여백**이다.
 *
 * ## 강조 틱에 포인트색을 쓴다 — 이 화면에서만
 *
 * §8 `포인트색`은 *"쓰는 자리는 조작과 선택이다"* 로 자리를 못박았고 이 틱은 둘 다 아니다.
 * 그래도 여기서 쓰는 이유는 **이 화면에 조작이 하나도 없기 때문**이다 — 누를 수 있는 것이
 * 없으므로 «이 색은 누를 수 있다는 뜻»이라는 약속이 깨질 대상 자체가 없다. 다른 화면에
 * 옮기면 그 순간 규칙 위반이 되므로 **이 파일 밖으로 나가지 않는다.**
 */
export function WallPanel({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  /** 머리 띠 오른쪽 — 그 구역의 조건·단위·시각 한 줄 */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(styles.root, className)}>
      <div className={cn('wall-head-pad', styles.head)}>
        <span aria-hidden className={styles.tick} />
        <h2 className={cn(styles.title, WALL_TITLE)}>{title}</h2>
        {aside !== undefined && (
          <span className={cn(styles.aside, WALL_META)}>{aside}</span>
        )}
      </div>

      <div className={cn('wall-pad-md', styles.body, bodyClassName)}>{children}</div>
    </section>
  );
}
