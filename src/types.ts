export interface BeadPaletteItem {
  code: string;        // 拼豆编号，如 "R01", "B03"
  name: string;        // 中文名称，如 "大红", "天蓝"
  hex: string;         // 16进制颜色值，如 "#FAD4B2"
  brand: 'MGB' | 'Universal';
  series: string;      // MARD 系列，如 "A系列", "B系列"
}

export interface TransformedPixel {
  x: number;          // 矩阵 X 坐标
  y: number;          // 矩阵 Y 坐标
  matchedBead: BeadPaletteItem; // 匹配到的拼豆数据
}

export interface IngredientStat {
  bead: BeadPaletteItem;
  count: number;      // 当前作品总消耗颗粒数
}
