const PDFDocument = require('pdfkit');
const moment      = require('moment');
const fs          = require('fs');
const path        = require('path');

const LOGO_PATH = path.join(__dirname, '../public/Sphene.png');

// Brand colors — matched to Sphene.png logo
const C = {
  DARK_GREEN : '#1B5E20',
  MID_GREEN  : '#2E7D32',
  COPPER     : '#BF7B30',
  LIGHT_GREEN: '#E8F5E9',
  GREEN_BDR  : '#A5D6A7',
  TEXT       : '#1A1A1A',
  MUTED      : '#5F6B7A',
  WHITE      : '#FFFFFF',
};

function generateStockSummaryPDF(res, gemstones) {
  const doc = new PDFDocument({
    margin: 0,
    size: 'A4',
    bufferPages: true,
    info: {
      Title: 'Stock Inventory Summary Report',
      Author: 'Sphene Gem & Jewelry',
      Creator: 'SpheneGem Inventory'
    }
  });

  const filename = `stock_summary_${moment().format('YYYYMMDD_HHmm')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const PAGE_W    = doc.page.width;
  const PAGE_H    = doc.page.height;
  const MARGIN    = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ════════════════════════════════════════════════
  //  HEADER
  // ════════════════════════════════════════════════
  const HEADER_H = 115;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.DARK_GREEN);

  // Subtle decorative circles
  doc.save();
  doc.fillOpacity(0.06);
  doc.circle(PAGE_W - 10, -20, 130).fill(C.WHITE);
  doc.circle(PAGE_W - 55, HEADER_H + 10, 65).fill(C.WHITE);
  doc.restore();

  // Logo with white background box
  const LOGO_SIZE = 70;
  doc.rect(MARGIN - 4, 13, LOGO_SIZE + 8, LOGO_SIZE + 8).fill(C.WHITE);
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN, 17, { width: LOGO_SIZE, height: LOGO_SIZE });
  }

  // Company name — right of logo
  const COMP_X = MARGIN + LOGO_SIZE + 16;
  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(20).text('SPHENE', COMP_X, 24);
  doc.fillColor(C.COPPER).font('Helvetica').fontSize(9).text('GEM & JEWELRY', COMP_X, 50);
  doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8).text('Fine Gemstone Inventory', COMP_X, 65);

  // Report title + meta — right side (strictly within page)
  const RIGHT_BLOCK_W = 190;
  const RIGHT_BLOCK_X = PAGE_W - MARGIN - RIGHT_BLOCK_W;

  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(14)
     .text('STOCK SUMMARY', RIGHT_BLOCK_X, 20, { width: RIGHT_BLOCK_W, align: 'right' });
  doc.fillColor(C.COPPER).font('Helvetica-Bold').fontSize(14)
     .text('REPORT', RIGHT_BLOCK_X, 38, { width: RIGHT_BLOCK_W, align: 'right' });
  doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8.5)
     .text(`Generated: ${moment().format('MMM D, YYYY  HH:mm')}`,
           RIGHT_BLOCK_X, 62, { width: RIGHT_BLOCK_W, align: 'right' });
  doc.fillColor('#80CBC4').font('Helvetica').fontSize(8)
     .text('Current Stock Status',
           RIGHT_BLOCK_X, 76, { width: RIGHT_BLOCK_W, align: 'right' });

  // Copper accent bar
  doc.rect(0, HEADER_H, PAGE_W, 4).fill(C.COPPER);

  // ════════════════════════════════════════════════
  //  AGGREGATE DATA
  // ════════════════════════════════════════════════
  const categoryMap = {};
  gemstones.forEach(g => {
    const key = (g.name || 'Unknown').trim();
    if (!categoryMap[key]) {
      categoryMap[key] = { name: key, entries: 0, totalQty: 0, totalCarat: 0, totalValue: 0 };
    }
    categoryMap[key].entries    += 1;
    categoryMap[key].totalQty   += parseInt(g.quantity)    || 0;
    categoryMap[key].totalCarat += parseFloat(g.weight)    || 0;
    categoryMap[key].totalValue += parseFloat(g.total_price) || 0;
  });
  const categories = Object.values(categoryMap).sort((a, b) => a.name.localeCompare(b.name));

  const shapeMap = {};
  gemstones.forEach(g => {
    const key = (g.shape || 'Unknown').trim();
    if (!shapeMap[key]) {
      shapeMap[key] = { shape: key, entries: 0, totalQty: 0, totalCarat: 0, totalValue: 0 };
    }
    shapeMap[key].entries    += 1;
    shapeMap[key].totalQty   += parseInt(g.quantity)    || 0;
    shapeMap[key].totalCarat += parseFloat(g.weight)    || 0;
    shapeMap[key].totalValue += parseFloat(g.total_price) || 0;
  });
  const shapes = Object.values(shapeMap).sort((a, b) => b.totalCarat - a.totalCarat);

  const grandQty   = gemstones.reduce((s, g) => s + (parseInt(g.quantity)     || 0), 0);
  const grandCarat = gemstones.reduce((s, g) => s + (parseFloat(g.weight)     || 0), 0);
  const grandValue = gemstones.reduce((s, g) => s + (parseFloat(g.total_price)|| 0), 0);
  const grandItems = gemstones.length;

  // ════════════════════════════════════════════════
  //  SUMMARY STAT BOXES  (4 boxes in a row)
  // ════════════════════════════════════════════════
  const STATS_TOP = HEADER_H + 18;
  const STATS_H   = 62;
  const GAP       = 8;
  const BOX_W     = (CONTENT_W - GAP * 3) / 4;

  const drawStatBox = (label, value, idx) => {
    const bx = MARGIN + idx * (BOX_W + GAP);
    doc.rect(bx, STATS_TOP, BOX_W, STATS_H).fillAndStroke(C.LIGHT_GREEN, C.GREEN_BDR);
    // top accent stripe
    doc.rect(bx, STATS_TOP, BOX_W, 4).fill(C.COPPER);
    doc.fillColor(C.DARK_GREEN).font('Helvetica-Bold').fontSize(17)
       .text(value, bx + 6, STATS_TOP + 14, { width: BOX_W - 12, align: 'center' });
    doc.fillColor(C.MUTED).font('Helvetica').fontSize(7.5)
       .text(label.toUpperCase(), bx + 6, STATS_TOP + 40, { width: BOX_W - 12, align: 'center' });
  };

  drawStatBox('Total Items',   grandItems.toString(),         0);
  drawStatBox('Total Pieces',  grandQty.toLocaleString(),     1);
  drawStatBox('Total Carat',   grandCarat.toFixed(2) + ' ct', 2);
  drawStatBox('Stock Value',   '$' + grandValue.toFixed(2),   3);

  // ════════════════════════════════════════════════
  //  TABLE DRAWING HELPERS
  // ════════════════════════════════════════════════
  let curY = STATS_TOP + STATS_H + 18;

  const ensureSpace = (needed) => {
    if (curY + needed > PAGE_H - 60) {
      doc.addPage();
      curY = MARGIN + 10;
    }
  };

  const drawSectionTitle = (title) => {
    ensureSpace(36);
    doc.fillColor(C.DARK_GREEN).font('Helvetica-Bold').fontSize(12).text(title, MARGIN, curY);
    doc.moveTo(MARGIN, curY + 18)
       .lineTo(MARGIN + Math.min(title.length * 7.5, 200), curY + 18)
       .lineWidth(2.5).stroke(C.COPPER);
    curY += 30;
  };

  const COL_HDR_H = 26;
  const ROW_H     = 22;

  const drawTableHeader = (cols) => {
    ensureSpace(COL_HDR_H + 5);
    doc.rect(MARGIN, curY, CONTENT_W, COL_HDR_H).fill(C.DARK_GREEN);
    let x = MARGIN;
    cols.forEach(col => {
      doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(8.5)
         .text(col.label, x + 6, curY + 8, { width: col.w - 10, align: col.align || 'left' });
      x += col.w;
    });
    curY += COL_HDR_H;
  };

  const drawRow = (cols, values, isAlt, isBold = false) => {
    ensureSpace(ROW_H);
    const bg = isAlt ? C.LIGHT_GREEN : C.WHITE;
    doc.rect(MARGIN, curY, CONTENT_W, ROW_H).fillAndStroke(bg, C.GREEN_BDR);
    let x = MARGIN;
    cols.forEach((col, i) => {
      const color = isBold ? C.DARK_GREEN : (i === 0 ? C.TEXT : C.MUTED);
      const font  = (isBold || i === 0) ? 'Helvetica-Bold' : 'Helvetica';
      doc.fillColor(color).font(font).fontSize(9)
         .text(values[i], x + 6, curY + 6, { width: col.w - 10, align: col.align || 'left' });
      x += col.w;
    });
    curY += ROW_H;
  };

  const drawTotalRow = (cols, values) => {
    ensureSpace(ROW_H + 4);
    doc.rect(MARGIN, curY, CONTENT_W, ROW_H).fill(C.DARK_GREEN);
    // copper left accent
    doc.rect(MARGIN, curY, 4, ROW_H).fill(C.COPPER);
    let x = MARGIN;
    cols.forEach((col, i) => {
      doc.fillColor(i === 0 ? C.COPPER : C.WHITE).font('Helvetica-Bold').fontSize(9)
         .text(values[i], x + 6, curY + 6, { width: col.w - 10, align: col.align || 'left' });
      x += col.w;
    });
    curY += ROW_H;
  };

  // Standard 5-column layout used by all three tables
  const COLS5 = [
    { label: 'Category / Name', w: 165, align: 'left'  },
    { label: 'Entries',         w: 60,  align: 'right' },
    { label: 'Qty (pcs)',       w: 80,  align: 'right' },
    { label: 'Total Carat',     w: 100, align: 'right' },
    { label: 'Stock Value',     w: 110, align: 'right' },
  ];
  const TOTAL_ROW5 = ['GRAND TOTAL', grandItems.toString(), grandQty.toLocaleString(),
                      grandCarat.toFixed(2) + ' ct', '$' + grandValue.toFixed(2)];

  // ════════════════════════════════════════════════
  //  SECTION 1 — CATEGORY-WISE
  // ════════════════════════════════════════════════
  drawSectionTitle('Category-Wise Summary');
  const catCols = [
    { label: 'Category / Name', w: 165, align: 'left'  },
    { label: 'Entries',         w: 60,  align: 'right' },
    { label: 'Qty (pcs)',       w: 80,  align: 'right' },
    { label: 'Total Carat',     w: 100, align: 'right' },
    { label: 'Stock Value',     w: 110, align: 'right' },
  ];
  drawTableHeader(catCols);
  categories.forEach((cat, i) => {
    drawRow(catCols, [
      cat.name,
      cat.entries.toString(),
      cat.totalQty.toLocaleString(),
      cat.totalCarat.toFixed(2) + ' ct',
      '$' + cat.totalValue.toFixed(2)
    ], i % 2 === 0);
  });
  drawTotalRow(catCols, TOTAL_ROW5);
  curY += 18;

  // ════════════════════════════════════════════════
  //  SECTION 2 — SHAPE-WISE
  // ════════════════════════════════════════════════
  drawSectionTitle('Shape / Cut-Wise Summary');
  const shapeCols = [
    { label: 'Shape / Cut',  w: 165, align: 'left'  },
    { label: 'Entries',      w: 60,  align: 'right' },
    { label: 'Qty (pcs)',    w: 80,  align: 'right' },
    { label: 'Total Carat',  w: 100, align: 'right' },
    { label: 'Stock Value',  w: 110, align: 'right' },
  ];
  drawTableHeader(shapeCols);
  shapes.forEach((sh, i) => {
    drawRow(shapeCols, [
      sh.shape,
      sh.entries.toString(),
      sh.totalQty.toLocaleString(),
      sh.totalCarat.toFixed(2) + ' ct',
      '$' + sh.totalValue.toFixed(2)
    ], i % 2 === 0);
  });
  drawTotalRow(shapeCols, TOTAL_ROW5);
  curY += 18;

  // ════════════════════════════════════════════════
  //  SECTION 3 — CARAT RANGE BREAKDOWN
  // ════════════════════════════════════════════════
  drawSectionTitle('Carat Weight Range Summary');
  const caratCols = [
    { label: 'Carat Range',  w: 165, align: 'left'  },
    { label: 'Entries',      w: 60,  align: 'right' },
    { label: 'Qty (pcs)',    w: 80,  align: 'right' },
    { label: 'Total Carat',  w: 100, align: 'right' },
    { label: 'Stock Value',  w: 110, align: 'right' },
  ];
  const caratRanges = [
    { label: '0.00 – 1.00 ct',   min: 0,     max: 1    },
    { label: '1.01 – 5.00 ct',   min: 1.01,  max: 5    },
    { label: '5.01 – 10.00 ct',  min: 5.01,  max: 10   },
    { label: '10.01 – 20.00 ct', min: 10.01, max: 20   },
    { label: '20.01 ct +',       min: 20.01, max: Infinity },
  ];
  drawTableHeader(caratCols);
  caratRanges.forEach((range, i) => {
    const sub    = gemstones.filter(g => { const w = parseFloat(g.weight)||0; return w >= range.min && w <= range.max; });
    const rQty   = sub.reduce((s, g) => s + (parseInt(g.quantity)    ||0), 0);
    const rCarat = sub.reduce((s, g) => s + (parseFloat(g.weight)    ||0), 0);
    const rValue = sub.reduce((s, g) => s + (parseFloat(g.total_price)||0), 0);
    drawRow(caratCols, [
      range.label,
      sub.length.toString(),
      rQty.toLocaleString(),
      rCarat.toFixed(2) + ' ct',
      '$' + rValue.toFixed(2)
    ], i % 2 === 0);
  });
  drawTotalRow(caratCols, TOTAL_ROW5);

  // ════════════════════════════════════════════════
  //  FOOTER — every page
  // ════════════════════════════════════════════════
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(i);
    const FY = PAGE_H - 48;
    doc.rect(0, FY, PAGE_W, 48).fill(C.DARK_GREEN);
    doc.rect(0, FY, PAGE_W, 3).fill(C.COPPER);
    doc.fillColor(C.WHITE).font('Helvetica').fontSize(8)
       .text('Sphene Gem & Jewelry  —  Stock Inventory Report  —  Confidential',
             MARGIN, FY + 12, { width: CONTENT_W, align: 'center' });
    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(7.5)
       .text(`Page ${i + 1} of ${pageRange.count}  |  Generated ${moment().format('YYYY-MM-DD HH:mm')}`,
             MARGIN, FY + 28, { width: CONTENT_W, align: 'center' });
  }

  doc.end();
}

module.exports = generateStockSummaryPDF;
