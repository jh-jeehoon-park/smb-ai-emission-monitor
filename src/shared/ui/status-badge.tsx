import { PROVISIONAL_STATUS_LABELS, type StatusLevel } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from './badge';

/**
 * 등급 뱃지.
 *
 * **색만으로 등급을 전달하지 않는다** — 그 몫은 `정상·주의·경고·위험` **라벨 글자**가 한다.
 * 예전에는 라벨 앞에 도형 마크(● ◆ ▲ ■)를 함께 뒀는데 라벨이 이미 같은 것을 말하고 있어
 * 뺐다 `[사용자 지시 2026-08-24]`. 라벨을 지우고 색만 남기는 변경은 하면 안 된다.
 */
export function StatusBadge({ level, className }: { level: StatusLevel; className?: string }) {
  const v = STATUS_VISUAL[level];
  return (
    <span className={cn(BADGE_BASE, 'font-medium', v.bg, v.text, className)}>
      {PROVISIONAL_STATUS_LABELS[level]}
    </span>
  );
}
