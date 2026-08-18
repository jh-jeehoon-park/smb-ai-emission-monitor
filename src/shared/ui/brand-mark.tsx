import Image from 'next/image';
import { BRAND_MARK_VARIANTS, BRAND_NAME } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

/**
 * 브랜드 마크.
 *
 * **테마마다 파일이 다르다.** 로고 초록이 한 벌뿐이면 한쪽 테마에서 묻힌다 —
 * 진한 초록(`#0b813f`)은 어두운 배경에서 대비 3.9, 밝은 초록(`#57b67e`)은 흰 배경에서
 * 2.5까지 떨어진다. 각 테마에 맞는 쪽을 쓰면 4.97 / 7.69가 된다.
 *
 * **두 벌을 모두 렌더하고 CSS가 고른다.** 서버는 테마를 모르므로(첫 페인트 전 `data-theme`로만
 * 들어온다) 렌더 중에 테마로 분기하면 hydration이 깨진다 — 테마 토글이 아이콘 두 개를
 * 모두 그리는 것과 같은 이유다(`globals.css`의 `.theme-when-*`).
 */
export function BrandMark({ size, className }: { size: number; className?: string }) {
  return (
    <span
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {/**
       * **한 벌만 보인다.** 숨은 쪽은 `display:none`이라 접근성 트리에서도 빠지므로
       * 같은 대체 텍스트를 둘 다 줘도 중복해 읽히지 않는다. 한쪽만 적으면 그 테마에서만
       * 읽혀 다크에서 로고가 이름 없는 그림이 된다.
       *
       * `loading="eager"` — 기본값 `lazy`는 뷰포트 교차로 로드를 판단하는데 숨은 쪽은
       * 영영 교차하지 않는다. 테마를 바꾸는 순간에야 내려받기 시작해 **로고 자리가 잠깐
       * 빈다.** 둘 다 미리 받아 둔다 — 32px WebP로 각 1KB다.
       */}
      {BRAND_MARK_VARIANTS.map((variant) => (
        <Image
          key={variant.theme}
          src={variant.src}
          alt={BRAND_NAME}
          width={size}
          height={size}
          className={variant.themeClass}
          loading="eager"
        />
      ))}
    </span>
  );
}
