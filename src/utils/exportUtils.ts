import { jsPDF } from 'jspdf';
import { TransformedPixel, IngredientStat } from '../types';
import { hexToRgb, luminance } from '../colorUtils';
import { COLOR_GROUPS } from '../data/palette';
import { useWorkspaceStore } from '../store/workspaceStore';
import { RenderAdapter, createCanvasAdapter, renderGrid, renderGridChunk } from './renderLayout';

function createPdfAdapter(pdf: jsPDF): RenderAdapter {
  type PdfTextBaseline = 'top' | 'middle' | 'alphabetic' | 'bottom';
  interface PdfState {
    offsetX: number;
    offsetY: number;
    textAlign: 'left' | 'center' | 'right';
    textBaseline: PdfTextBaseline;
  }

  let state: PdfState = { offsetX: 0, offsetY: 0, textAlign: 'left', textBaseline: 'alphabetic' };
  const stack: PdfState[] = [];
  const tx = (x: number) => x + state.offsetX;
  const ty = (y: number) => y + state.offsetY;
  const parseColor = (style: string) => {
    if (style.startsWith('#')) return hexToRgb(style);
    const match = style.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!match) return { r: 0, g: 0, b: 0 };
    const alpha = match[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(match[4])));
    return {
      r: Math.round(Number(match[1]) * alpha + 255 * (1 - alpha)),
      g: Math.round(Number(match[2]) * alpha + 255 * (1 - alpha)),
      b: Math.round(Number(match[3]) * alpha + 255 * (1 - alpha)),
    };
  };

  return {
    fillRect: (x, y, w, h) => pdf.rect(tx(x), ty(y), w, h, 'F'),
    strokeRect: (x, y, w, h) => pdf.rect(tx(x), ty(y), w, h, 'S'),
    fillRoundRect: (x, y, w, h, r) => pdf.roundedRect(tx(x), ty(y), w, h, r, r, 'F'),
    strokeRoundRect: (x, y, w, h, r) => pdf.roundedRect(tx(x), ty(y), w, h, r, r, 'S'),
    fillCircle: (cx, cy, r) => pdf.circle(tx(cx), ty(cy), r, 'F'),
    strokeCircle: (cx, cy, r) => pdf.circle(tx(cx), ty(cy), r, 'S'),
    line: (x1, y1, x2, y2) => pdf.line(tx(x1), ty(y1), tx(x2), ty(y2)),
    fillText: (text, x, y) => pdf.text(text, tx(x), ty(y), { align: state.textAlign, baseline: state.textBaseline }),
    setFillStyle: (s) => { const rgb = parseColor(s); pdf.setFillColor(rgb.r, rgb.g, rgb.b); },
    setStrokeStyle: (s) => { const rgb = parseColor(s); pdf.setDrawColor(rgb.r, rgb.g, rgb.b); },
    setLineWidth: (w) => pdf.setLineWidth(w),
    setLineDash: (dash) => pdf.setLineDashPattern(dash ?? [], 0),
    setFont: (font) => {
      const isBold = font.includes('bold');
      const sizeMatch = font.match(/(\d+(?:\.\d+)?)px/);
      const size = sizeMatch ? parseFloat(sizeMatch[1]) : 10;
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setFontSize(size * 0.75); // CSS px → pt
    },
    setTextAlign: (align) => { state.textAlign = align; },
    setTextBaseline: (baseline) => { state.textBaseline = baseline; },
    measureText: (text) => pdf.getTextWidth(text),
    luminanceOf: (hex) => luminance(hexToRgb(hex)),
    contrastColor: (hex, dark = '#0F172A', light = '#FFFFFF') => luminance(hexToRgb(hex)) > 140 ? dark : light,
    pushState: () => { stack.push({ ...state }); },
    popState: () => { const previous = stack.pop(); if (previous) state = previous; },
    translate: (x, y) => { state.offsetX += x; state.offsetY += y; },
  };
}

export function generateHighResPng(
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  stats: IngredientStat[],
  options: { showRulers: boolean; showNumbers: boolean } = { showRulers: true, showNumbers: true }
): string {
  const { showRulers, showNumbers } = options;
  const title = useWorkspaceStore.getState().currentProjectName?.trim() || '拼豆图纸';
  const scale = 40;
  const pagePadding = 96;
  const headerH = 210;
  const rulerGutter = showRulers ? 60 : 20;
  const gridSectionGap = 80;
  const materialsPadding = 44;
  const groupLabelH = 52;
  const cardH = 76;
  const cardGap = 16;
  const groupGap = 36;

  const usedSeries = COLOR_GROUPS.map(g => ({
    name: g.name, series: g.series,
    items: stats.filter(s => s.bead.series === g.series),
  })).filter(g => g.items.length > 0);

  const gridW = gridWidth * scale;
  const contentW = Math.max(gridW + rulerGutter * 2, 920);
  const totalWidth = contentW + pagePadding * 2;
  const gridOffsetX = Math.round((totalWidth - gridW) / 2);
  const gridOffsetY = pagePadding + headerH + rulerGutter;
  const materialsX = pagePadding;
  const materialsW = contentW;
  const materialsInnerW = materialsW - materialsPadding * 2;
  const columns = Math.max(2, Math.min(6, Math.floor((materialsInnerW + cardGap) / 260)));
  const cardW = (materialsInnerW - cardGap * (columns - 1)) / columns;
  const materialsHeaderH = usedSeries.length > 0 ? 92 : 0;
  const materialsContentH = usedSeries.reduce((height, group) => {
    const rows = Math.ceil(group.items.length / columns);
    return height + groupLabelH + rows * cardH + Math.max(0, rows - 1) * cardGap + groupGap;
  }, 0);
  const materialsH = usedSeries.length > 0 ? materialsPadding * 2 + materialsHeaderH + materialsContentH - groupGap : 0;
  const materialsY = gridOffsetY + gridHeight * scale + rulerGutter + gridSectionGap;
  const totalHeight = usedSeries.length > 0
    ? materialsY + materialsH + pagePadding
    : gridOffsetY + gridHeight * scale + rulerGutter + pagePadding;
  const totalBeads = stats.reduce((sum, item) => sum + item.count, 0);

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth; canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const a = createCanvasAdapter(ctx);

  a.setFillStyle('#FAF8F5');
  a.fillRect(0, 0, totalWidth, totalHeight);

  // Header
  a.setFillStyle('#E8570A');
  a.fillRect(pagePadding, pagePadding, 6, 64);
  a.setFillStyle('#1C1B1A');
  a.setFont('bold 46px "Helvetica Neue", Arial, sans-serif');
  a.setTextAlign('left'); a.setTextBaseline('top');
  a.fillText(title, pagePadding + 28, pagePadding - 2);
  a.setFillStyle('#827C73');
  a.setFont('16px "JetBrains Mono", monospace');
  a.fillText('PIXEL BEAD PATTERN', pagePadding + 30, pagePadding + 58);

  const summaryY = pagePadding + 116;
  const summaryItems = [
    { label: '图纸规格', value: `${gridWidth} × ${gridHeight}` },
    { label: '拼豆总数', value: `${totalBeads} 颗` },
    { label: '使用颜色', value: `${stats.length} 色` },
  ];
  const summaryW = Math.min(720, contentW * 0.62);
  const summaryItemW = summaryW / summaryItems.length;
  summaryItems.forEach((item, index) => {
    const x = pagePadding + index * summaryItemW;
    if (index > 0) {
      a.setStrokeStyle('#DED8CF'); a.setLineWidth(1);
      a.line(x, summaryY + 4, x, summaryY + 56);
    }
    a.setFillStyle('#9B958C');
    a.setFont('14px "Helvetica Neue", Arial, sans-serif');
    a.fillText(item.label, x + (index > 0 ? 24 : 0), summaryY);
    a.setFillStyle('#1C1B1A');
    a.setFont('bold 24px "JetBrains Mono", monospace');
    a.fillText(item.value, x + (index > 0 ? 24 : 0), summaryY + 26);
  });

  a.setFillStyle('#827C73');
  a.setFont('14px "Helvetica Neue", Arial, sans-serif');
  a.setTextAlign('right'); a.setTextBaseline('middle');
  a.fillText('粗橙线：每 10 格  ·  虚线：每 5 格', totalWidth - pagePadding, summaryY + 32);

  // Grid
  renderGrid(a, pixels, { scale, gridWidth, gridHeight, showRulers, showNumbers, offsetX: gridOffsetX, offsetY: gridOffsetY });

  // Materials section (PNG-specific editorial layout)
  if (usedSeries.length > 0) {
    a.setFillStyle('#F2EFEA');
    a.fillRect(materialsX, materialsY, materialsW, materialsH);

    let matY = materialsY + materialsPadding;
    a.setFillStyle('#1C1B1A');
    a.setFont('bold 28px "Helvetica Neue", Arial, sans-serif');
    a.setTextAlign('left'); a.setTextBaseline('top');
    a.fillText('耗材清单', materialsX + materialsPadding, matY);
    a.setFillStyle('#827C73');
    a.setFont('15px "Helvetica Neue", Arial, sans-serif');
    a.setTextAlign('right');
    a.fillText(`共 ${stats.length} 色 · ${totalBeads} 颗`, materialsX + materialsW - materialsPadding, matY + 8);
    matY += materialsHeaderH;

    usedSeries.forEach(g => {
      const labelY = matY + groupLabelH / 2;
      const seriesTotal = g.items.reduce((sum, item) => sum + item.count, 0);

      a.setFillStyle('#1C1B1A');
      a.fillRect(materialsX + materialsPadding, labelY - 11, 3, 22);
      a.setFont('600 17px "Helvetica Neue", Arial, sans-serif');
      a.setTextAlign('left'); a.setTextBaseline('middle');
      a.fillText(g.name, materialsX + materialsPadding + 16, labelY);

      const labelW = a.measureText(g.name);
      a.setStrokeStyle('#D8D2C8'); a.setLineWidth(1);
      a.line(materialsX + materialsPadding + 16 + labelW + 18, labelY, materialsX + materialsW - materialsPadding - 120, labelY);

      a.setFillStyle('#827C73');
      a.setFont('13px "Helvetica Neue", Arial, sans-serif');
      a.setTextAlign('right');
      a.fillText(`${g.items.length} 色 · ${seriesTotal} 颗`, materialsX + materialsW - materialsPadding, labelY);

      matY += groupLabelH;

      g.items.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = materialsX + materialsPadding + column * (cardW + cardGap);
        const y = matY + row * (cardH + cardGap);
        const swatchR = 22;
        const swatchCx = x + 18 + swatchR;
        const swatchCy = y + cardH / 2;
        const countZoneX = x + cardW - 92;

        // 圆角卡片底
        a.setFillStyle('#FFFEFC');
        a.fillRoundRect(x, y, cardW, cardH, 12);
        a.setStrokeStyle('#E4DED4'); a.setLineWidth(1);
        a.strokeRoundRect(x, y, cardW, cardH, 12);

        // 拼豆色样：圆形珠体 + 环纹
        a.setFillStyle(item.bead.hex);
        a.fillCircle(swatchCx, swatchCy, swatchR);
        a.setStrokeStyle('rgba(255,255,255,0.22)'); a.setLineWidth(2);
        a.strokeCircle(swatchCx, swatchCy, swatchR * 0.62);
        a.setStrokeStyle('rgba(0,0,0,0.14)'); a.setLineWidth(1.5);
        a.strokeCircle(swatchCx, swatchCy, swatchR);
        a.setFillStyle(a.contrastColor(item.bead.hex));
        a.setFont('bold 13px "JetBrains Mono", monospace');
        a.setTextAlign('center'); a.setTextBaseline('middle');
        a.fillText(item.bead.code, swatchCx, swatchCy + 1);

        // 色号与名称
        a.setFillStyle('#1C1B1A');
        a.setFont('bold 16px "JetBrains Mono", monospace');
        a.setTextAlign('left');
        a.fillText(item.bead.code, x + 88, swatchCy - 12);
        a.setFillStyle('#9B958C');
        a.setFont('12px "Helvetica Neue", Arial, sans-serif');
        a.fillText(item.bead.name, x + 88, swatchCy + 13);

        // 用量分区
        a.setStrokeStyle('#EFE9E1'); a.setLineWidth(1);
        a.line(countZoneX, y + 16, countZoneX, y + cardH - 16);
        a.setFillStyle('#C84708');
        a.setFont('bold 19px "JetBrains Mono", monospace');
        a.setTextAlign('center');
        a.fillText(`×${item.count}`, countZoneX + 37, swatchCy);
      });
      matY += Math.ceil(g.items.length / columns) * cardH + Math.max(0, Math.ceil(g.items.length / columns) - 1) * cardGap + groupGap;
    });
  }

  return canvas.toDataURL('image/png');
}

export function generateMultiPagePdf(
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  stats: IngredientStat[],
  options: { showRulers: boolean; showNumbers: boolean } = { showRulers: true, showNumbers: true }
): void {
  const { showRulers, showNumbers } = options;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210, pageHeight = 297;
  const a = createPdfAdapter(pdf);

  // --- PAGE 1: COVER & INVENTORY ---
  pdf.setFillColor('#1E293B'); pdf.rect(0, 0, pageWidth, 55, 'F');
  pdf.setTextColor('#FFFFFF'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22);
  pdf.text('PIXEL BEAD PATTERN GUIDE', 20, 25);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor('#94A3B8');
  pdf.text('Pixel Bead Generator V1.0 - Professional Craft Manual', 20, 34);

  pdf.setFillColor('#F8FAFC'); pdf.rect(15, 65, pageWidth - 30, 32, 'F');
  pdf.setDrawColor('#E2E8F0'); pdf.setLineWidth(0.4); pdf.rect(15, 65, pageWidth - 30, 32, 'S');
  pdf.setTextColor('#1E293B'); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
  pdf.text('Grid specifications / Canvas details:', 22, 73);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor('#475569');
  pdf.text(`• Dimensions: ${gridWidth} x ${gridHeight} grids`, 25, 80);
  pdf.text(`• Target Beads: ${stats.reduce((acc, s) => acc + s.count, 0)} beads`, 25, 87);
  pdf.text(`• Colors Matched: ${stats.length} unique shades`, 110, 80);
  pdf.text(`• Standard Reference: MGB 221 Colors`, 110, 87);

  pdf.setTextColor('#0F172A'); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
  pdf.text('Required Shopping & Work Checklist (Inventory):', 15, 110);
  pdf.setFillColor('#F1F5F9'); pdf.rect(15, 115, pageWidth - 30, 8, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor('#475569');
  pdf.text('Sample', 20, 120); pdf.text('Code', 42, 120); pdf.text('Code', 65, 120); pdf.text('Bead Count / Usage', 115, 120);

  let yOffset = 123;
  stats.forEach(item => {
    if (yOffset > pageHeight - 30) {
      pdf.addPage();
      pdf.setFillColor('#F1F5F9'); pdf.rect(15, 15, pageWidth - 30, 8, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor('#475569');
      pdf.text('Sample', 20, 20); pdf.text('Code', 42, 20); pdf.text('Code', 65, 20); pdf.text('Bead Count / Usage', 115, 20);
      yOffset = 23;
    }
    const rgb = hexToRgb(item.bead.hex);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b); pdf.rect(20, yOffset, 12, 5, 'F');
    pdf.setDrawColor('#CBD5E1'); pdf.rect(20, yOffset, 12, 5, 'S');
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor('#1E293B'); pdf.text(item.bead.code, 42, yOffset + 4);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor('#475569'); pdf.text(item.bead.code, 65, yOffset + 4);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor('#0F172A'); pdf.text(`${item.count} pcs`, 115, yOffset + 4);
    yOffset += 7.5;
  });

  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(8); pdf.setTextColor('#94A3B8');
  pdf.text('Pixel Bead Pattern Generator — Client-side, offline, sandboxed.', pageWidth / 2, pageHeight - 12, { align: 'center' });

  // --- CHUNK PAGES ---
  const maxTileSize = 29;
  const tilesX = Math.ceil(gridWidth / maxTileSize);
  const tilesY = Math.ceil(gridHeight / maxTileSize);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      pdf.addPage();
      const startGridX = tx * maxTileSize;
      const startGridY = ty * maxTileSize;
      const endGridX = Math.min(gridWidth, startGridX + maxTileSize);
      const endGridY = Math.min(gridHeight, startGridY + maxTileSize);
      const chunkWidth = endGridX - startGridX;
      const chunkHeight = endGridY - startGridY;

      pdf.setFillColor('#EEF2F6'); pdf.rect(0, 0, pageWidth, 28, 'F');
      pdf.setTextColor('#1E293B'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13);
      pdf.text(`PEGBOARD GRID WORK SHEET (Chunk R:${ty + 1}, C:${tx + 1})`, 15, 12);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor('#64748B');
      pdf.text(`This section maps Columns ${startGridX + 1} to ${endGridX}, Rows ${startGridY + 1} to ${endGridY}. Align with actual pegs!`, 15, 19);

      const boxSize = 145;
      const cellSize = Math.min(boxSize / chunkWidth, boxSize / chunkHeight);
      const drawW = chunkWidth * cellSize, drawH = chunkHeight * cellSize;
      const offsetX = 15 + (boxSize - drawW) / 2;
      const offsetY = 45 + (185 - drawH) / 2;

      renderGridChunk(a, pixels, {
        cellSize, chunkWidth, chunkHeight,
        startGridX, startGridY, endGridX, endGridY,
        offsetX, offsetY, gridWidth, showRulers, showNumbers,
      });

      // Footer guide
      pdf.setFillColor('#FFFBEB'); pdf.rect(15, pageHeight - 34, pageWidth - 30, 20, 'F');
      pdf.setDrawColor('#FEF3C7'); pdf.setLineWidth(0.3); pdf.rect(15, pageHeight - 34, pageWidth - 30, 20, 'S');
      pdf.setTextColor('#78350F'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5);
      pdf.text('HOW TO USE THIS PAGE:', 20, pageHeight - 29);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
      pdf.text(`This printed worksheet represents Section [Row ${startGridY + 1}-${endGridY}, Col ${startGridX + 1}-${endGridX}] of your project.`, 20, pageHeight - 24);
      pdf.text('Simply place a 29x29 pegboard over a digital tablet, or print this on paper and place beads matching red axis cross intersections.', 20, pageHeight - 20);
    }
  }

  pdf.save(`Perler_Bead_Pattern_${gridWidth}x${gridHeight}.pdf`);
}
