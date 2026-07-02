import { jsPDF } from 'jspdf';
import { TransformedPixel, IngredientStat } from '../types';
import { hexToRgb, luminance } from '../colorUtils';

/**
 * Generate a crystal-clear, high-resolution PNG canvas displaying the grid canvas, annotations, grid lines, and references.
 */
export function generateHighResPng(
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  stats: IngredientStat[],
  options: { showRulers: boolean; showNumbers: boolean } = { showRulers: true, showNumbers: true }
): string {
  const { showRulers, showNumbers } = options;
  const scale = 40;
  const padding = 120;
  const rulerOffset = 40;
  
  // Stats table dimensions
  const statsHeaderH = 60;
  const statsRowH = 56;
  const statsAreaH = stats.length > 0 ? statsHeaderH + stats.length * statsRowH + 80 : 0;
  
  const totalWidth = Math.max(gridWidth * scale + padding * 2, padding * 2 + 860 + 280);
  const totalHeight = gridHeight * scale + padding * 2 + statsAreaH + 80;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // 1. Fill clean white paper canvas
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // 2. Draw aesthetic canvas title & layout details
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('像素拼豆制作图纸 (Pixel Bead Design Core Manual)', padding, 60);

  ctx.fillStyle = '#64748B';
  ctx.font = '16px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(
    `当前规格: ${gridWidth}x${gridHeight} 孔位(格) | 匹配色卡总计: ${stats.length} 色 | 耗材颗粒: ${pixels.filter(p => p.matchedBead.code !== 'EMPTY').length} 颗`,
    padding,
    95
  );

  // Translate coordinates to draw-plane
  ctx.save();
  ctx.translate(padding, padding + 20);

  // Draw 2D coordinates background ruler guides
  if (showRulers) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';

    // Columns indicators numbers (every single one for micro precision)
    for (let x = 1; x <= gridWidth; x++) {
      ctx.fillText(
        x.toString(),
        (x - 1) * scale + scale / 2,
        -10
      );
    }

    // Row indicators numbers (every single one)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 1; y <= gridHeight; y++) {
      ctx.fillText(
        y.toString(),
        -10,
        (y - 1) * scale + scale / 2
      );
    }
  }

  // 3. Render pixel blocks
  pixels.forEach(p => {
    if (p.matchedBead.code === 'EMPTY') {
      // Draw a translucent guide peg circle
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, scale / 8, 0, 2 * Math.PI);
      ctx.stroke();
      return;
    }

    // Fill genuine solid bead color
    ctx.fillStyle = p.matchedBead.hex;
    ctx.fillRect(p.x * scale, p.y * scale, scale, scale);

    // Render little 3D cylinder texture for realism
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, scale / 3.2, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, scale / 5, 0, 2 * Math.PI);
    ctx.stroke();

    // Fill custom contrast color lettering center text
    if (showNumbers) {
      const rgb = hexToRgb(p.matchedBead.hex);
      const luma = luminance(rgb);
      ctx.fillStyle = luma > 140 ? '#0F172A' : '#FFFFFF';
      
      ctx.font = `bold ${Math.floor(scale / 2.5)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        p.matchedBead.code,
        p.x * scale + scale / 2,
        p.y * scale + scale / 2 + 1
      );
    }
  });

  // 4. Draw crisp pixel delimiters (Grid lines)
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 0.5;
  for (let x = 1; x < gridWidth; x++) {
    ctx.beginPath();
    ctx.moveTo(x * scale, 0);
    ctx.lineTo(x * scale, gridHeight * scale);
    ctx.stroke();
  }
  for (let y = 1; y < gridHeight; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);
    ctx.lineTo(gridWidth * scale, y * scale);
    ctx.stroke();
  }

  // 5. Draw bold pegboard alignment red rulers
  for (let x = 1; x < gridWidth; x++) {
    if (x % 10 === 0) {
      ctx.strokeStyle = '#EF4444'; // solid boundary red-line
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, gridHeight * scale);
      ctx.stroke();
    } else if (x % 5 === 0) {
      ctx.strokeStyle = '#F87171'; // dashed divider red-line
      ctx.lineWidth = 1.0;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, gridHeight * scale);
      ctx.stroke();
      ctx.setLineDash([]); // clear
    }
  }

  for (let y = 1; y < gridHeight; y++) {
    if (y % 10 === 0) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(gridWidth * scale, y * scale);
      ctx.stroke();
    } else if (y % 5 === 0) {
      ctx.strokeStyle = '#F87171';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(gridWidth * scale, y * scale);
      ctx.stroke();
      ctx.setLineDash([]); // clear
    }
  }

  // Frame outermost boundary
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, gridWidth * scale, gridHeight * scale);

  ctx.restore();

  // 7. Draw material stats table below the grid
  if (stats.length > 0) {
    const tableY = padding + gridHeight * scale + 120;
    const colX = [padding, padding + 120, padding + 320, padding + 620, padding + 860];
    
    // Table header
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 24px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Material Checklist / 耗材清单', padding, tableY);
    
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('Code', colX[1], tableY + statsHeaderH);
    ctx.fillText('Name', colX[2], tableY + statsHeaderH);
    ctx.fillText('Count / 用量', colX[3], tableY + statsHeaderH);
    ctx.fillText('~Packs (1K/bag)', colX[4], tableY + statsHeaderH);
    
    // Separator line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, tableY + statsHeaderH + 36);
    ctx.lineTo(padding + colX[4] + 240, tableY + statsHeaderH + 36);
    ctx.stroke();
    
    stats.forEach((item, i) => {
      const y = tableY + statsHeaderH + 56 + i * statsRowH;
      
      // Color swatch
      ctx.fillStyle = item.bead.hex;
      ctx.fillRect(colX[1] - 60, y - 16, 44, 44);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(colX[1] - 60, y - 16, 44, 44);
      
      // Code
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.bead.code, colX[1], y);
      
      // Name (Chinese via system font)
      ctx.fillStyle = '#475569';
      ctx.font = '22px "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif';
      ctx.fillText(item.bead.name, colX[2], y);
      
      // Count
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`${item.count}`, colX[3], y);
      
      // Packs
      ctx.fillStyle = '#64748B';
      ctx.font = '22px "Helvetica Neue", Arial, sans-serif';
      const packs = (item.count / 1000).toFixed(1);
      ctx.fillText(`~${packs}`, colX[4], y);
    });
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate a beautifully formatted, multi-page PDF workbook in A4 size.
 * Uses a modular split mechanism for large boards, partitioning them into easy-to-read A4 quadrants matching 29x29 pegboard scale.
 */
export function generateMultiPagePdf(
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  stats: IngredientStat[],
  options: { showRulers: boolean; showNumbers: boolean } = { showRulers: true, showNumbers: true }
): void {
  const { showRulers, showNumbers } = options;
  // 1. Create a Letter landscape or standard Portrait A4 PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210; // A4 dimensions
  const pageHeight = 297;

  // --- PAGE 1: COVER DETAILS & INVENTORY TABLE ---
  // Large header
  pdf.setFillColor('#1E293B'); // Slate-800
  pdf.rect(0, 0, pageWidth, 55, 'F');
  
  pdf.setTextColor('#FFFFFF');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text('PIXEL BEAD PATTERN GUIDE', 20, 25);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor('#94A3B8');
  pdf.text('Pixel Bead Generator V1.0 - Professional Craft Manual', 20, 34);

  // Metadata Card
  pdf.setFillColor('#F8FAFC');
  pdf.rect(15, 65, pageWidth - 30, 32, 'F');
  pdf.setDrawColor('#E2E8F0');
  pdf.setLineWidth(0.4);
  pdf.rect(15, 65, pageWidth - 30, 32, 'S');

  pdf.setTextColor('#1E293B');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Grid specifications / Canvas details:', 22, 73);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor('#475569');
  pdf.text(`• Dimensions: ${gridWidth} x ${gridHeight} grids`, 25, 80);
  pdf.text(`• Target Beads: ${stats.reduce((acc, s) => acc + s.count, 0)} beads`, 25, 87);
  pdf.text(`• Colors Matched: ${stats.length} unique shades`, 110, 80);
  pdf.text(`• Standard Reference: MGB/Universal`, 110, 87);

  // Inventory Table Header
  pdf.setTextColor('#0F172A');
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Required Shopping & Work Checklist (Inventory):', 15, 110);

  // Table Columns
  pdf.setFillColor('#F1F5F9');
  pdf.rect(15, 115, pageWidth - 30, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor('#475569');
  pdf.text('Sample', 20, 120);
  pdf.text('Code', 42, 120);
  pdf.text('Code', 65, 120);
  pdf.text('Bead Count / Usage', 115, 120);
  pdf.text('Approx Bags (1000/bag)', 155, 120);

  // Render rows of inventory (approx 15 can fit, if more we add paging or squeeze size)
  let yOffset = 123;
  stats.forEach((item, idx) => {
    if (yOffset > pageHeight - 30) {
      // Create additional table page if list overflows
      pdf.addPage();
      pdf.setFillColor('#F1F5F9');
      pdf.rect(15, 15, pageWidth - 30, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor('#475569');
      pdf.text('Sample', 20, 20);
      pdf.text('Code', 42, 20);
      pdf.text('Code', 65, 20);
      pdf.text('Bead Count / Usage', 115, 20);
      pdf.text('Approx Bags (1000/bag)', 155, 20);
      
      yOffset = 23;
    }

    // Colored Preview Square
    const rgb = hexToRgb(item.bead.hex);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.rect(20, yOffset, 12, 5, 'F');
    pdf.setDrawColor('#CBD5E1');
    pdf.rect(20, yOffset, 12, 5, 'S');

    // Values text
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#1E293B');
    pdf.text(item.bead.code, 42, yOffset + 4);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#475569');
    // Use bead code as label (helvetica has no Chinese glyphs)
    pdf.text(item.bead.code, 65, yOffset + 4);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#0F172A');
    pdf.text(`${item.count} pcs`, 115, yOffset + 4);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#64748B');
    const packs = (item.count / 1000).toFixed(1);
    pdf.text(`~ ${packs} pack`, 155, yOffset + 4);

    yOffset += 7.5;
  });

  // Footer stamp page 1
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor('#94A3B8');
  pdf.text('Pixel Bead Pattern Generator — Client-side, offline, sandboxed.', pageWidth / 2, pageHeight - 12, { align: 'center' });


  // --- SEGMENTED DETAIL CHUNKS DRAWING ENGINE ---
  // We split the canvas into dedicated, easy-to-construct A4 pages of max 30x30 grids each
  const maxTileSize = 29;
  const tilesX = Math.ceil(gridWidth / maxTileSize);
  const tilesY = Math.ceil(gridHeight / maxTileSize);

  // Render each board chunk as its own page
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      pdf.addPage();
      
      const startGridX = tx * maxTileSize;
      const startGridY = ty * maxTileSize;
      
      const endGridX = Math.min(gridWidth, startGridX + maxTileSize);
      const endGridY = Math.min(gridHeight, startGridY + maxTileSize);
      
      const chunkWidth = endGridX - startGridX;
      const chunkHeight = endGridY - startGridY;

      // Draw top header
      pdf.setFillColor('#EEF2F6');
      pdf.rect(0, 0, pageWidth, 28, 'F');
      
      pdf.setTextColor('#1E293B');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text(`PEGBOARD GRID WORK SHEET (Chunk R:${ty + 1}, C:${tx + 1})`, 15, 12);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor('#64748B');
      pdf.text(
        `This section maps Columns ${startGridX + 1} to ${endGridX}, Rows ${startGridY + 1} to ${endGridY}. Align with actual pegs!`,
        15,
         19
      );

      // We fit the subgrid inside a clean bounding zone of size e.g. 150mm width centered
      const boxSize = 145; // mm in page width
      const cellSize = Math.min(boxSize / chunkWidth, boxSize / chunkHeight);
      
      const actualDrawingWidth = chunkWidth * cellSize;
      const actualDrawingHeight = chunkHeight * cellSize;
      
      // Center the grid drawn representation
      const offsetX = 15 + (boxSize - actualDrawingWidth) / 2;
      const offsetY = 45 + (185 - actualDrawingHeight) / 2;

      // Local grid numbers indexes (rulers) on top
      if (showRulers) {
        pdf.setFontSize(7);
        pdf.setTextColor('#94A3B8');
        pdf.setFont('helvetica', 'normal');
        for (let x = startGridX; x < endGridX; x++) {
          const localIdx = x - startGridX;
          pdf.text(
            (x + 1).toString(),
            offsetX + localIdx * cellSize + cellSize / 2,
            offsetY - 2,
            { align: 'center' }
          );
        }

        // Local grid numbers indexes (rulers) on left
        for (let y = startGridY; y < endGridY; y++) {
          const localIdx = y - startGridY;
          pdf.text(
            (y + 1).toString(),
            offsetX - 2,
            offsetY + localIdx * cellSize + cellSize / 2,
            { align: 'right' }
          );
        }
      }

      // Draw cells
      for (let y = startGridY; y < endGridY; y++) {
        for (let x = startGridX; x < endGridX; x++) {
          const pixelIdx = y * gridWidth + x;
          const pixel = pixels[pixelIdx];
          
          const rx = offsetX + (x - startGridX) * cellSize;
          const ry = offsetY + (y - startGridY) * cellSize;

          if (!pixel || pixel.matchedBead.code === 'EMPTY') {
            // Empty peg placeholder circle
            pdf.setDrawColor('#E2E8F0');
            pdf.setLineWidth(0.1);
            pdf.circle(rx + cellSize / 2, ry + cellSize / 2, cellSize / 9, 'S');
            continue;
          }

          // Matched bead color
          const rgb = hexToRgb(pixel.matchedBead.hex);
          pdf.setFillColor(rgb.r, rgb.g, rgb.b);
          pdf.rect(rx, ry, cellSize, cellSize, 'F');

          // Draw the textual character Code
          if (showNumbers) {
            const luma = luminance(rgb);
            pdf.setTextColor(luma > 140 ? '#0F172A' : '#FFFFFF');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(Math.max(4, cellSize * 1.5));
            pdf.text(
              pixel.matchedBead.code,
              rx + cellSize / 2,
              ry + cellSize / 2 + 0.4,
              { align: 'center', baseline: 'middle' }
            );
          }
        }
      }

      // Overlay subgrid borders line delimiters
      pdf.setDrawColor('#CBD5E1'); // light slate grid
      pdf.setLineWidth(0.1);
      for (let x = 0; x <= chunkWidth; x++) {
        pdf.line(offsetX + x * cellSize, offsetY, offsetX + x * cellSize, offsetY + actualDrawingHeight);
      }
      for (let y = 0; y <= chunkHeight; y++) {
        pdf.line(offsetX, offsetY + y * cellSize, offsetX + actualDrawingWidth, offsetY + y * cellSize);
      }

      // Draw locator anchor RED scale lines to keep user coordinates locked
      pdf.setLineWidth(0.4);
      for (let x = startGridX; x <= endGridX; x++) {
        if (x > startGridX && x % 10 === 0) {
          pdf.setDrawColor('#EF4444');
          pdf.line(
            offsetX + (x - startGridX) * cellSize,
            offsetY,
            offsetX + (x - startGridX) * cellSize,
            offsetY + actualDrawingHeight
          );
        } else if (x > startGridX && x % 5 === 0) {
          pdf.setDrawColor('#F87171');
          pdf.line(
            offsetX + (x - startGridX) * cellSize,
            offsetY,
            offsetX + (x - startGridX) * cellSize,
            offsetY + actualDrawingHeight
          );
        }
      }

      for (let y = startGridY; y <= endGridY; y++) {
        if (y > startGridY && y % 10 === 0) {
          pdf.setDrawColor('#EF4444');
          pdf.line(
            offsetX,
            offsetY + (y - startGridY) * cellSize,
            offsetX + actualDrawingWidth,
            offsetY + (y - startGridY) * cellSize
          );
        } else if (y > startGridY && y % 5 === 0) {
          pdf.setDrawColor('#F87171');
          pdf.line(
            offsetX,
            offsetY + (y - startGridY) * cellSize,
            offsetX + actualDrawingWidth,
            offsetY + (y - startGridY) * cellSize
          );
        }
      }

      // Outer border box framing the chunk board
      pdf.setDrawColor('#475569');
      pdf.setLineWidth(0.5);
      pdf.rect(offsetX, offsetY, actualDrawingWidth, actualDrawingHeight, 'S');

      // Mini board placement map guide in footer of chunk page
      pdf.setFillColor('#FFFBEB');
      pdf.rect(15, pageHeight - 34, pageWidth - 30, 20, 'F');
      pdf.setDrawColor('#FEF3C7');
      pdf.setLineWidth(0.3);
      pdf.rect(15, pageHeight - 34, pageWidth - 30, 20, 'S');

      pdf.setTextColor('#78350F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.text(`HOW TO USE THIS PAGE:`, 20, pageHeight - 29);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(
        `This printed worksheet represents Section [Row ${startGridY + 1}-${endGridY}, Col ${startGridX + 1}-${endGridX}] of your project.`,
        20,
        pageHeight - 24
      );
      pdf.text(
        `Simply place a 29x29 pegboard over a digital tablet, or print this on paper and place beads matching red axis cross intersections.`,
        20,
         pageHeight - 20
      );
    }
  }

  // Done! Trigger standard PDF file download dialog
  pdf.save(`Perler_Bead_Pattern_${gridWidth}x${gridHeight}.pdf`);
}
