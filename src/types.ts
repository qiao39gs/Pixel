export interface BeadPaletteItem {
  code: string;       // 拼豆编号，如 "G3", "H2"
  name: string;       // 中文名称，如 "浅肤色"
  hex: string;        // 16进制颜色值，如 "#FAD4B2"
  brand: 'MGB' | 'Universal'; 
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
