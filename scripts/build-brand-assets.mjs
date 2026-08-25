/**
 * 브랜드 자산(파비콘·앱 아이콘·공유 카드) 생성기.
 *
 * 로고가 초록 PNG 두 벌에서 **물방울 듀오톤 인라인 SVG**로 바뀌었는데(`shared/ui/brand-mark.tsx`)
 * 탭 아이콘과 공유 카드는 옛 초록 PNG로 남아 있었다 `[사용자 지시 2026-08-24]`.
 * 같은 도형·같은 포인트색으로 다시 굽는다.
 *
 * **왜 스크립트인가**: Next의 `icon.tsx`·`opengraph-image.tsx`(ImageResponse)로 만들면 빌드마다
 * 그리는데, 한글 글리프를 위해 폰트 파일을 넣어 주어야 한다(Satori 기본 폰트에 한글이 없다).
 * CDN에서 받아 쓰면 네트워크 없는 빌드가 깨진다. 결과물이 바뀌지 않는 정적 자산이므로
 * **한 번 구워 커밋**하는 편이 안전하다 — 이 스크립트가 그 한 번을 재현 가능하게 만든다.
 *
 *   node scripts/build-brand-assets.mjs
 *
 * 글자는 시스템 폰트(Malgun Gothic)로 렌더된다. 다른 OS에서 다시 구우면 자형이 달라질 수 있으니
 * **결과 PNG를 커밋**하고, 문구를 바꿀 때만 다시 돌린다.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const APP = join(process.cwd(), 'src/app');

/** 포인트색과 그 한 단 밝은 쪽. `globals.css`의 `--accent`(Material Blue 900)와 같은 값 */
const ACCENT = '#0d47a1';
const ACCENT_LIGHT = '#1565c0';

/** 로고 도형 — `shared/ui/brand-mark.tsx`와 같은 경로 데이터(뷰박스 32×32) */
const DROP =
  'M16 2.5c5.4 6.1 9.2 10.7 9.2 15.2A9.2 9.2 0 0 1 16 27a9.2 9.2 0 0 1-9.2-9.3C6.8 13.2 10.6 8.6 16 2.5Z';
const WAVE_TOP = 'M10.6 18.4c1.4-1.5 2.7-1.5 4.1 0 1.4 1.5 2.7 1.5 4.1 0 1-1.1 2-1.4 2.9-.9';
const WAVE_BOTTOM = 'M12.3 22.6c1.2-1.2 2.3-1.2 3.5 0 1.2 1.2 2.3 1.2 3.5 0';

const FONT = 'Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif';

/**
 * 아이콘은 **파란 면 위 흰 물방울**이다.
 *
 * 화면 안의 마크는 흰 카드 위에 놓여 파란 선으로 그리지만, 탭 아이콘은 배경이 브라우저 것이라
 * 무엇 위에 놓일지 알 수 없다 — 16px에서 투명 배경 + 진한 파란 선은 다크 탭바에서 사라진다.
 * 면을 깔면 어디서든 같은 모양으로 읽힌다.
 */
function iconSvg(size) {
  const radius = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ACCENT_LIGHT}"/>
      <stop offset="100%" stop-color="${ACCENT}"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="${(radius / size) * 32}" fill="url(#bg)"/>
  <g transform="translate(16 16.5) scale(0.82) translate(-16 -16)">
    <path d="${DROP}" fill="#ffffff" fill-opacity="0.24" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="${WAVE_TOP}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    <path d="${WAVE_BOTTOM}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>
  </g>
</svg>`;
}

/** 공유 카드 — 옅은 블루 면에 마크·이름·한 줄 설명·시연 고지 */
function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e6eef8"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ACCENT_LIGHT}"/>
      <stop offset="100%" stop-color="${ACCENT}"/>
    </linearGradient>
    <linearGradient id="drop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0.1"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#page)"/>

  <!-- 오른쪽으로 흘러나가는 큰 물방울. 왼쪽에 몰린 글자와 무게를 맞춘다 -->
  <g transform="translate(1055 372) scale(16) translate(-16 -16)" opacity="0.055">
    <path d="${DROP}" fill="${ACCENT}"/>
  </g>

  <rect y="622" width="1200" height="8" fill="url(#mark)"/>

  <g transform="translate(96 118) scale(3.2)">
    <path d="${DROP}" fill="url(#drop)" stroke="${ACCENT}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${WAVE_TOP}" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round"/>
    <path d="${WAVE_BOTTOM}" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
  </g>

  <text x="216" y="196" font-family="${FONT}" font-size="60" font-weight="700" fill="#0f1620">AI 기반 지능형 배출관리 플랫폼</text>
  <text x="216" y="252" font-family="${FONT}" font-size="32" fill="#48566a">비TMS 소규모 사업장 수질·설비 통합 관제</text>

  <rect x="96" y="330" width="1008" height="1" fill="${ACCENT}" opacity="0.16"/>

  <g font-family="${FONT}" font-size="30" fill="${ACCENT}">
    <text x="96" y="404">이상 탐지</text>
    <text x="282" y="404">수질 예측</text>
    <text x="468" y="404">오염도 추정</text>
    <text x="692" y="404">설비 상태</text>
  </g>
  <g fill="${ACCENT}" opacity="0.32">
    <circle cx="252" cy="394" r="5"/>
    <circle cx="438" cy="394" r="5"/>
    <circle cx="662" cy="394" r="5"/>
  </g>

  <text x="96" y="492" font-family="${FONT}" font-size="26" fill="#59677a">화면의 값은 시연용 생성 데이터입니다.</text>
</svg>`;
}

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * ICO는 PNG를 그대로 담을 수 있다(Vista 이후). 컨테이너만 손으로 짜면 되므로
 * .ico를 쓰지 못하는 sharp로도 파비콘을 만들 수 있다.
 */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = 아이콘
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, data } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // 팔레트 없음
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    dir.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...dir, ...entries.map((e) => e.data)]);
}

const icon512 = await png(iconSvg(512), 512);
writeFileSync(join(APP, 'icon.png'), icon512);
writeFileSync(join(APP, 'apple-icon.png'), await png(iconSvg(180), 180));
writeFileSync(
  join(APP, 'favicon.ico'),
  ico([
    { size: 16, data: await png(iconSvg(16), 16) },
    { size: 32, data: await png(iconSvg(32), 32) },
    { size: 48, data: await png(iconSvg(48), 48) },
  ]),
);
writeFileSync(
  join(APP, 'opengraph-image.png'),
  await sharp(Buffer.from(ogSvg())).png({ compressionLevel: 9 }).toBuffer(),
);

console.log('생성 완료 — icon.png · apple-icon.png · favicon.ico · opengraph-image.png');
