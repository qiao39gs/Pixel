import { jsPDF } from 'jspdf';
import { TransformedPixel, IngredientStat } from '../types';
import { hexToRgb, luminance } from '../colorUtils';
import { COLOR_GROUPS } from '../data/palette';
import { RenderAdapter, createCanvasAdapter, renderGrid, renderGridChunk } from './renderLayout';

function createPdfAdapter(pdf: jsPDF): RenderAdapter {
  return {
    fillRect: (x, y, w, h) => pdf.rect(x, y, w, h, 'F'),
    strokeRect: (x, y, w, h) => pdf.rect(x, y, w, h, 'S'),
    fillCircle: (cx, cy, r) => pdf.circle(cx, cy, r, 'F'),
    strokeCircle: (cx, cy, r) => pdf.circle(cx, cy, r, 'S'),
    line: (x1, y1, x2, y2) => pdf.line(x1, y1, x2, y2),
    fillText: (text, x, y) => pdf.text(text, x, y),
    setFillStyle: (s) => { const rgb = hexToRgb(s.startsWith('#') ? s : '#000'); pdf.setFillColor(rgb.r, rgb.g, rgb.b); },
    setStrokeStyle: (s) => { const rgb = hexToRgb(s.startsWith('#') ? s : '#000'); pdf.setDrawColor(rgb.r, rgb.g, rgb.b); },
    setLineWidth: (w) => pdf.setLineWidth(w),
    setLineDash: (dash) => { const js: any = pdf; if (dash && dash.length > 0) js.setLineDash(dash, dash[0] * 2); else js.setLineDash([]); },
    setFont: (font) => {
      const isBold = font.includes('bold');
      const sizeMatch = font.match(/(\d+(?:\.\d+)?)px/);
      const size = sizeMatch ? parseFloat(sizeMatch[1]) : 10;
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setFontSize(size * 0.3528); // px → mm
    },
    setTextAlign: (align) => { (pdf as any).__textAlign = align; },
    setTextBaseline: () => {},
    measureText: (text) => pdf.getTextWidth(text),
    luminanceOf: (hex) => luminance(hexToRgb(hex)),
    contrastColor: (hex, dark = '#0F172A', light = '#FFFFFF') => luminance(hexToRgb(hex)) > 140 ? dark : light,
    pushState: () => {},
    popState: () => {},
    translate: () => {},
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
  const scale = 40;
  const padding = 100;

  const beadRadius = 25;
  const beadDiameter = beadRadius * 2;
  const countGap = 10;
  const beadPad = 28;
  const rowPad = 30;
  const groupLabelH = 48;
  const groupGap = 36;

  const usedSeries = COLOR_GROUPS.map(g => ({
    name: g.name, series: g.series,
    items: stats.filter(s => s.bead.series === g.series),
  })).filter(g => g.items.length > 0);

  const gridW = gridWidth * scale;
  const materialsAreaWidth = Math.max(gridW, 760);
  const slot = beadDiameter + countGap + 60 + beadPad;

  const seriesRows: { x: number; item: IngredientStat }[][][] = [];
  let materialsH = 0;
  if (usedSeries.length > 0) {
    materialsH += 64;
    usedSeries.forEach(g => {
      materialsH += groupLabelH;
      let row: { x: number; item: IngredientStat }[] = [];
      let rowX = 0;
      const rows: { x: number; item: IngredientStat }[][] = [];
      g.items.forEach(item => {
        if (rowX + slot > materialsAreaWidth && row.length > 0) {
          rows.push(row); materialsH += beadDiameter + rowPad; row = []; rowX = 0;
        }
        row.push({ x: rowX + beadRadius, item }); rowX += slot;
      });
      if (row.length > 0) { rows.push(row); materialsH += beadDiameter + rowPad; }
      seriesRows.push(rows); materialsH += groupGap;
    });
  }

  const totalWidth = Math.max(gridW + padding * 2, materialsAreaWidth + padding * 2);
  const totalHeight = gridHeight * scale + padding * 2 + materialsH - groupGap;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth; canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const a = createCanvasAdapter(ctx);

  a.setFillStyle('#FAF8F5');
  a.fillRect(0, 0, totalWidth, totalHeight);

  // Grid
  renderGrid(a, pixels, { scale, gridWidth, gridHeight, showRulers, showNumbers, offsetX: padding, offsetY: padding });

  // Materials section (PNG-specific editorial layout)
  if (usedSeries.length > 0) {
    const matX = padding;
    let matY = padding + gridHeight * scale + 64;

    usedSeries.forEach((g, gi) => {
      const rows = seriesRows[gi];
      const labelY = matY + groupLabelH / 2;

      a.setFillStyle('#1C1B1A');
      a.fillRect(matX, labelY - 11, 3, 22);
      a.setFont('600 17px "Helvetica Neue", Arial, sans-serif');
      a.setTextAlign('left'); a.setTextBaseline('middle');
      a.fillText(g.name, matX + 16, labelY);

      const labelW = a.measureText(g.name);
      a.setStrokeStyle('#E8E3DB'); a.setLineWidth(1);
      a.line(matX + 16 + labelW + 18, labelY, matX + materialsAreaWidth, labelY);

      a.setFillStyle('#B8B2A8');
      a.setFont('13px "Helvetica Neue", Arial, sans-serif');
      a.setTextAlign('right');
      a.fillText(`${g.items.length} 色`, matX + materialsAreaWidth, labelY);

      matY += groupLabelH;

      rows.forEach(row => {
        row.forEach(b => {
          const cx = matX + b.x;
          const cy = matY + beadRadius;
          a.setFillStyle(b.item.bead.hex);
          a.fillCircle(cx, cy, beadRadius);
          a.setStrokeStyle('rgba(0,0,0,0.12)'); a.setLineWidth(1.5);
          a.strokeCircle(cx, cy, beadRadius);
          a.setFillStyle(a.contrastColor(b.item.bead.hex));
          a.setFont('bold 16px "JetBrains Mono", monospace');
          a.setTextAlign('center'); a.setTextBaseline('middle');
          a.fillText(b.item.bead.code, cx, cy + 1);
          a.setFillStyle('#1C1B1A');
          a.setFont('bold 22px "JetBrains Mono", monospace');
          a.setTextAlign('left');
          a.fillText(`${b.item.count}`, cx + beadRadius + countGap, cy);
        });
        matY += beadDiameter + rowPad;
      });
      matY += groupGap - rowPad;
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
  pdf.text(`• Standard Reference: MGB/Universal`, 110, 87);

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
