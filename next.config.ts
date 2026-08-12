import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* 기본 위치(bottom-left)가 사이드바 하단의 시연 계정 표기를 가린다.
     심사는 dev 서버로 볼 수도 있으므로 겹치지 않는 쪽으로 옮긴다. */
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
