export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';

/** 宽高比 → 高/宽 比值（用于由宽度推算高度） */
export const ASPECT_RATIOS: Record<string, number> = {
  '1:1': 1,
  '4:3': 3 / 4,
  '3:4': 4 / 3,
  '16:9': 9 / 16,
  '9:16': 16 / 9,
};
