'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * **화면 1px이 뷰박스 몇 단위인가.**
 *
 * 뷰박스 단위로 적은 크기는 상자가 같아도 뷰박스가 달라지면 화면에서 달라진다. 관할 모드는
 * 뷰박스 세로를 잘라내므로(`singleProvinceView`) 그 안의 것이 전부 함께 커지는데 —
 * 도형·핀·라벨은 **커져야 맞고**(확대해서 보는 중이다) **툴팁은 아니다.** 툴팁은 지도 위에
 * 얹힌 판이라 어느 축척에서 보든 같은 크기여야 읽힌다. 실측 1.23배였다 `[사용자 지적 2026-08-28]`.
 *
 * **뷰박스를 건드려 맞추지 않는다.** 화면 상수를 되돌리는 배율(`focus.scale`)이 뷰박스 가로를
 * 기준으로 계산되어, 폭을 손대면 되돌리는 자리마다 배율을 다시 맞춰야 한다 — 그렇게 했다가 두
 * 곳을 놓쳐 지도가 사라지고 툴팁이 6배가 된 적이 있다(`map-view.ts` §`singleProvinceView`).
 * 여기서는 툴팁 하나만 되돌린다.
 *
 * **상수로는 못 구한다.** 배율이 뷰박스만으로 정해지지 않는다 — `preserveAspectRatio` 기본값이
 * 상자와 뷰박스 중 좁은 쪽에 맞추므로 그려지는 상자 크기가 함께 정한다. 관할 지도는 위치 인셋이
 * 세로를 나눠 가져 상자가 낮고(실측 573 → 486px), 그래서 뷰박스만으로 센 값(1.27)과 실제
 * 값(1.226)이 다르다. 뷰포트가 바뀌면 또 달라진다. **재야 한다.**
 *
 * 서버는 잴 수 없어 처음 값은 `1`이다. 툴팁은 hover에서만 그려져 서버 HTML에 없으므로
 * 그 값으로 그려지는 프레임이 없다.
 */
export function useScreenUnit(ref: RefObject<SVGSVGElement | null>, viewBox: string): number {
  const [unit, setUnit] = useState(1);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;

    /* jsdom에는 이 메서드가 없다 — 테스트에서 부르면 던진다. 없으면 되돌리지 않는다(1) */
    if (typeof svg.getScreenCTM !== 'function') return;

    const measure = () => {
      /* 숨겨졌거나 떼어진 순간에는 null·0이 온다. 그때는 마지막 값을 지킨다 */
      const perUnit = svg.getScreenCTM()?.a;
      if (!perUnit) return;
      setUnit(1 / perUnit);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
    /* 뷰박스가 바뀌면 상자가 그대로여도 배율이 달라진다 — 관찰자는 그때 울지 않는다 */
  }, [ref, viewBox]);

  return unit;
}
