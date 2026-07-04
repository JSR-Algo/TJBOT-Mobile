/**
 * Device-surface tokens — bridged onto the TeeBot companion design-system.
 *
 * RE-SKIN: the key names are unchanged so every DeviceShell/DeviceRow/DeviceBigBtn
 * consumer keeps compiling, but the VALUES now produce the companion identity:
 * cream background, coral primary actions, plum-ink text (was gray bg + system blue).
 * Single source of truth for base colors is `@/design-system/referenceTheme`.
 */
import { referenceColors } from '@/design-system/referenceTheme';

export const DV = {
  bg: referenceColors.bg,
  card: referenceColors.card,
  ink: referenceColors.ink,
  ink2: referenceColors.inkSoft,
  ink3: referenceColors.inkMuted,
  hair: referenceColors.line,
  accent: referenceColors.primary,
  good: referenceColors.success,
  warn: referenceColors.gold,
} as const;
