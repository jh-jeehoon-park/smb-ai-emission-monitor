/**
 * 카드 안 **값**의 크기 두 단 `[사용자 지시 2026-08-24: 첨부 이미지의 폰트 크기·질서·굵기]`.
 *
 * 정리 전에는 같은 역할에 17·18·19·22·26·30·32px이 섞여 있었다 — 화면을 옮길 때마다
 * 큰 숫자의 크기가 달라져 어느 쪽이 더 중요한 값인지 크기로 읽을 수 없었다.
 *
 * 굵기는 둘 다 `font-bold`다. 이미지의 값이 전부 굵고, `semibold`와 섞여 있으면
 * 같은 단 안에서도 무게가 갈린다.
 *
 * 라벨(12px) 대비 비율은 이미지의 16:28 ≈ 1:1.75를 따른다.
 */

/** 카드·타일에 값이 하나일 때. 훑는 기준점이 되는 숫자다 */
export const VALUE_LG = 'text-[22px] font-bold leading-none tracking-tight';

/** 격자·행 안에 값이 여럿일 때. 하나만 키우면 나머지가 부속물로 읽힌다 */
export const VALUE_MD = 'text-[18px] font-bold leading-none tracking-tight';
