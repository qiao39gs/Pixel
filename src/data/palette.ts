import { BeadPaletteItem } from '../types';

export const BEAD_PALETTE: BeadPaletteItem[] = [
  // --- RED & PINK ---
  { code: "R01", name: "大红", hex: "#D32F2F", brand: "MGB" },
  { code: "R02", name: "西瓜红", hex: "#E64E59", brand: "MGB" },
  { code: "R03", name: "桃红", hex: "#E91E63", brand: "MGB" },
  { code: "R04", name: "深红", hex: "#880E4F", brand: "MGB" },
  { code: "R05", name: "珊瑚红", hex: "#FF5252", brand: "MGB" },
  { code: "R06", name: "猪肝红", hex: "#5C1D24", brand: "Universal" },
  { code: "P01", name: "粉红", hex: "#FF80AB", brand: "MGB" },
  { code: "P02", name: "浅粉", hex: "#FF8A80", brand: "MGB" },
  { code: "P03", name: "樱花粉", hex: "#FFCDD2", brand: "MGB" },
  { code: "P04", name: "芭比粉", hex: "#EC407A", brand: "Universal" },
  { code: "P05", name: "肉粉", hex: "#F8BBD0", brand: "Universal" },

  // --- ORANGE & YELLOW ---
  { code: "O01", name: "橙色", hex: "#E65100", brand: "MGB" },
  { code: "O02", name: "橘黄", hex: "#FF9800", brand: "MGB" },
  { code: "O03", name: "浅橘", hex: "#FFB74D", brand: "MGB" },
  { code: "Y01", name: "柠檬黄", hex: "#FFEE58", brand: "MGB" },
  { code: "Y02", name: "中黄", hex: "#FFEB3B", brand: "MGB" },
  { code: "Y03", name: "淡黄", hex: "#FFF59D", brand: "MGB" },
  { code: "Y04", name: "黄金色", hex: "#FBC02D", brand: "MGB" },
  { code: "Y05", name: "荧光黄", hex: "#EEFF41", brand: "Universal" },
  { code: "Y06", name: "土黄", hex: "#C0CA33", brand: "Universal" },

  // --- GREEN ---
  { code: "G01", name: "深绿", hex: "#1B5E20", brand: "MGB" },
  { code: "G02", name: "中绿", hex: "#2E7D32", brand: "MGB" },
  { code: "G03", name: "浅绿", hex: "#4CAF50", brand: "MGB" },
  { code: "G04", name: "草绿", hex: "#81C784", brand: "MGB" },
  { code: "G05", name: "薄荷绿", hex: "#A9DFBF", brand: "MGB" },
  { code: "G06", name: "军绿", hex: "#33691E", brand: "MGB" },
  { code: "G07", name: "抹茶绿", hex: "#9CCC65", brand: "MGB" },
  { code: "G08", name: "墨绿", hex: "#004D40", brand: "Universal" },
  { code: "G09", name: "荧光绿", hex: "#69F0AE", brand: "Universal" },
  { code: "G10", name: "青雀绿", hex: "#00897B", brand: "Universal" },

  // --- BLUE ---
  { code: "B01", name: "深蓝", hex: "#0D47A1", brand: "MGB" },
  { code: "B02", name: "海蓝", hex: "#1565C0", brand: "MGB" },
  { code: "B03", name: "天蓝", hex: "#2196F3", brand: "MGB" },
  { code: "B04", name: "湖蓝", hex: "#00BCD4", brand: "MGB" },
  { code: "B05", name: "粉蓝", hex: "#90CAF9", brand: "MGB" },
  { code: "B06", name: "冰蓝", hex: "#E0F7FA", brand: "MGB" },
  { code: "B07", name: "藏青", hex: "#1A237E", brand: "MGB" },
  { code: "B08", name: "孔雀蓝", hex: "#00838F", brand: "Universal" },
  { code: "B09", name: "绿松石", hex: "#4DB6AC", brand: "Universal" },
  { code: "B10", name: "莹蓝", hex: "#80DEEA", brand: "Universal" },

  // --- PURPLE ---
  { code: "V01", name: "深紫", hex: "#4A148C", brand: "MGB" },
  { code: "V02", name: "浅紫", hex: "#9C27B0", brand: "MGB" },
  { code: "V03", name: "薰衣草紫", hex: "#BA68C8", brand: "MGB" },
  { code: "V04", name: "紫罗兰", hex: "#8E24AA", brand: "MGB" },
  { code: "V05", name: "丁香紫", hex: "#E1BEE7", brand: "Universal" },
  { code: "V06", name: "浅香芋紫", hex: "#D1C4E9", brand: "Universal" },

  // --- SKIN TONES & LIGHT COFFEE ---
  { code: "H01", name: "正肤色", hex: "#FAD4B2", brand: "MGB" },
  { code: "H02", name: "浅肤色", hex: "#FCEAE0", brand: "MGB" },
  { code: "H03", name: "粉肤色", hex: "#FCE4D6", brand: "MGB" },
  { code: "H04", name: "杏色", hex: "#FFE0B2", brand: "MGB" },
  { code: "H05", name: "米黄色", hex: "#FFF9C4", brand: "Universal" },
  { code: "H06", name: "奶茶色", hex: "#D7CCC8", brand: "Universal" },

  // --- BROWN ---
  { code: "BR01", name: "巧克力", hex: "#3E2723", brand: "MGB" },
  { code: "BR02", name: "红棕", hex: "#5D4037", brand: "MGB" },
  { code: "BR03", name: "咖啡色", hex: "#8D6E63", brand: "MGB" },
  { code: "BR04", name: "卡其色", hex: "#A1887F", brand: "MGB" },
  { code: "BR05", name: "焦糖色", hex: "#A16645", brand: "Universal" },
  { code: "BR06", name: "泥土褐", hex: "#795548", brand: "Universal" },

  // --- NEUTRALS / GRAYSCALE ---
  { code: "W01", name: "纯白", hex: "#FFFFFF", brand: "MGB" },
  { code: "W02", name: "象牙白", hex: "#F5F5F5", brand: "MGB" },
  { code: "W03", name: "极浅灰", hex: "#EEEEEE", brand: "MGB" },
  { code: "W04", name: "浅灰", hex: "#E0E0E0", brand: "MGB" },
  { code: "W05", name: "中灰", hex: "#9E9E9E", brand: "MGB" },
  { code: "W06", name: "深灰", hex: "#616161", brand: "MGB" },
  { code: "W07", name: "碳黑", hex: "#000000", brand: "MGB" },
  { code: "W08", name: "煤灰", hex: "#212121", brand: "Universal" },
  { code: "W09", name: "冷灰", hex: "#757575", brand: "Universal" },
];

export const COLOR_GROUPS = [
  { name: "红粉系 (Reds & Pinks)", range: ["R", "P"] },
  { name: "黄橙系 (Oranges & Yellows)", range: ["O", "Y"] },
  { name: "绿野系 (Greens)", range: ["G"] },
  { name: "蓝色系 (Blues)", range: ["B"] },
  { name: "紫色系 (Purples)", range: ["V"] },
  { name: "肤色系 (Skin Tones)", range: ["H"] },
  { name: "棕褐系 (Browns)", range: ["BR"] },
  { name: "黑白灰 (Neutrals & Grays)", range: ["W"] },
];
