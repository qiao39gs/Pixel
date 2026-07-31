export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';

/** 画布缩放范围（格子像素尺寸），滚轮/捏合、适应画布和缩放控件统一使用 */
export const MIN_SCALE = 4;
export const MAX_SCALE = 32;

/** 宽高比 → 高/宽 比值（用于由宽度推算高度） */
export const ASPECT_RATIOS: Record<string, number> = {
  '1:1': 1,
  '4:3': 3 / 4,
  '3:4': 4 / 3,
  '16:9': 9 / 16,
  '9:16': 16 / 9,
};
