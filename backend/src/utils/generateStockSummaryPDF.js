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

// ─────────────────────────────────────────────────────────────
//  Dimension parsing — pulls a size like "10X7mm" out of the code
//  field. The code field is entered by hand and is messy:
//    "8x6mm."  "10X7mm"  "5.5x7.5mm"  "8x8"  "6X6"  "5X3 CUSHION"
//  We accept x / X / * / × as the separator, an optional third
//  dimension, and an optional trailing mm / punctuation. Numbers
//  are kept in the ORDER they were typed (per client's choice) but
//  formatting is canonicalised so "8x6mm." and "8X6" group together.
//  Returns null when the code carries no dimension (e.g. "SG 00503").
// ─────────────────────────────────────────────────────────────
const DIM_RE = /(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)(?:\s*[xX*×]\s*(\d+(?:\.\d+)?))?/;

function parseDimension(code) {
  if (!code) return null;
  const m = String(code).match(DIM_RE);
  if (!m) return null;
  const nums = [m[1], m[2], m[3]]
    .filter((n) => n !== undefined)
    .map((n) => String(parseFloat(n)));   // "7.50" -> "7.5", "7.0" -> "7"
  return nums.join('x');                  // canonical key, e.g. "8x6"
}

// Roll a list of gemstones up by a key function into
// { label, entries, totalQty, totalCarat, totalValue } rows.
function groupBy(gemstones, keyFn, fallbackLabel) {
  const map = {};
  gemstones.forEach((g) => {
    const raw = keyFn(g);
    const key = (raw === null || raw === undefined || String(raw).trim() === '')
      ? fallbackLabel
      : String(raw).trim();
    if (!map[key]) {
      map[key] = { label: key, entries: 0, totalQty: 0, totalCarat: 0, totalValue: 0 };
    }
    map[key].entries    += 1;
    map[key].totalQty   += parseInt(g.quantity, 10) || 0;
    map[key].totalCarat += parseFloat(g.weight)     || 0;
    map[key].totalValue += parseFloat(g.total_price) || 0;
  });
  return map;
}

// Human-facing labels + filename slugs for each grouping.
const SECTION_META = {
  category:  { title: 'Category-Wise Summary',          firstCol: 'Category / Name' },
  shape:     { title: 'Shape / Cut-Wise Summary',        firstCol: 'Shape / Cut'     },
  carat:     { title: 'Carat Weight Range Summary',      firstCol: 'Carat Range'     },
  dimension: { title: 'Dimension-Wise Summary (from Code)', firstCol: 'Dimension'    },
};

const ALL_SECTIONS = ['category', 'shape', 'carat', 'dimension'];

/**
 * @param res       Express response to stream the PDF into
 * @param gemstones rows from the gemstones table
 * @param options   { sections?: string[], groupLabel?: string }
 *                  sections defaults to all four. groupLabel is the
 *                  header subtitle (e.g. "Dimension-Wise").
 */
function generateStockSummaryPDF(res, gemstones, options = {}) {
  const sections = (Array.isArray(options.sections) && options.sections.length
    ? options.sections
    : ALL_SECTIONS
  ).filter((s) => SECTION_META[s]);

  const isSingle   = sections.length === 1;
  const groupLabel = options.groupLabel
    || (isSingle ? SECTION_META[sections[0]].title.replace(/ Summary.*/, '') : 'Current Stock Status');
  const fileSlug   = isSingle ? sections[0] : 'summary';

  const doc = new PDFDocument({
    margin: 0,
    size: 'A4',
    bufferPages: true,
    info: {
      Title: isSingle ? `Stock Report — ${SECTION_META[sections[0]].title}` : 'Stock Inventory Summary Report',
      Author: 'Sphene Gem & Jewelry',
      Creator: 'SpheneGem Inventory'
    }
  });

  const filename = `stock_${fileSlug}_${moment().format('YYYYMMDD_HHmm')}.pdf`;
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

  doc.save();
  doc.fillOpacity(0.06);
  doc.circle(PAGE_W - 10, -20, 130).fill(C.WHITE);
  doc.circle(PAGE_W - 55, HEADER_H + 10, 65).fill(C.WHITE);
  doc.restore();

  const LOGO_SIZE = 70;
  doc.rect(MARGIN - 4, 13, LOGO_SIZE + 8, LOGO_SIZE + 8).fill(C.WHITE);
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN, 17, { width: LOGO_SIZE, height: LOGO_SIZE });
  }

  const COMP_X = MARGIN + LOGO_SIZE + 16;
  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(20).text('SPHENE', COMP_X, 24);
  doc.fillColor(C.COPPER).font('Helvetica').fontSize(9).text('GEM & JEWELRY', COMP_X, 50);
  doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8).text('Fine Gemstone Inventory', COMP_X, 65);

  const RIGHT_BLOCK_W = 190;
  const RIGHT_BLOCK_X = PAGE_W - MARGIN - RIGHT_BLOCK_W;

  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(14)
     .text('STOCK', RIGHT_BLOCK_X, 20, { width: RIGHT_BLOCK_W, align: 'right' });
  doc.fillColor(C.COPPER).font('Helvetica-Bold').fontSize(14)
     .text('REPORT', RIGHT_BLOCK_X, 38, { width: RIGHT_BLOCK_W, align: 'right' });
  doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8.5)
     .text(`Generated: ${moment().format('MMM D, YYYY  HH:mm')}`,
           RIGHT_BLOCK_X, 62, { width: RIGHT_BLOCK_W, align: 'right' });
  doc.fillColor('#80CBC4').font('Helvetica').fontSize(8)
     .text(groupLabel, RIGHT_BLOCK_X, 76, { width: RIGHT_BLOCK_W, align: 'right' });

  doc.rect(0, HEADER_H, PAGE_W, 4).fill(C.COPPER);

  // ════════════════════════════════════════════════
  //  AGGREGATE DATA
  // ════════════════════════════════════════════════
  const grandQty   = gemstones.reduce((s, g) => s + (parseInt(g.quantity, 10) || 0), 0);
  const grandCarat = gemstones.reduce((s, g) => s + (parseFloat(g.weight)     || 0), 0);
  const grandValue = gemstones.reduce((s, g) => s + (parseFloat(g.total_price)|| 0), 0);
  const grandItems = gemstones.length;

  // Build only the datasets we will actually render.
  const datasets = {};

  if (sections.includes('category')) {
    datasets.category = Object.values(groupBy(gemstones, (g) => g.name, 'Unknown'))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  if (sections.includes('shape')) {
    datasets.shape = Object.values(groupBy(gemstones, (g) => g.shape, 'Unknown'))
      .sort((a, b) => b.totalCarat - a.totalCarat);
  }

  if (sections.includes('dimension')) {
    const NO_DIM = 'No dimension (SKU only)';
    const rows = Object.values(groupBy(gemstones, (g) => parseDimension(g.code), NO_DIM));
    // Display "8x6" as "8 x 6 mm"; keep the No-dimension bucket pinned last.
    rows.forEach((r) => {
      if (r.label !== NO_DIM) r.label = r.label.replace(/x/g, ' x ') + ' mm';
    });
    rows.sort((a, b) => {
      if (a.label === NO_DIM) return 1;
      if (b.label === NO_DIM) return -1;
      if (b.entries !== a.entries) return b.entries - a.entries;
      return a.label.localeCompare(b.label);
    });
    datasets.dimension = rows;
  }

  if (sections.includes('carat')) {
    const caratRanges = [
      { label: '0.00 – 1.00 ct',   min: 0,     max: 1        },
      { label: '1.01 – 5.00 ct',   min: 1.01,  max: 5        },
      { label: '5.01 – 10.00 ct',  min: 5.01,  max: 10       },
      { label: '10.01 – 20.00 ct', min: 10.01, max: 20       },
      { label: '20.01 ct +',       min: 20.01, max: Infinity },
    ];
    datasets.carat = caratRanges.map((range) => {
      const sub = gemstones.filter((g) => { const w = parseFloat(g.weight) || 0; return w >= range.min && w <= range.max; });
      return {
        label: range.label,
        entries: sub.length,
        totalQty: sub.reduce((s, g) => s + (parseInt(g.quantity, 10) || 0), 0),
        totalCarat: sub.reduce((s, g) => s + (parseFloat(g.weight)     || 0), 0),
        totalValue: sub.reduce((s, g) => s + (parseFloat(g.total_price)|| 0), 0),
      };
    });
  }

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
       .lineTo(MARGIN + Math.min(title.length * 7.5, 260), curY + 18)
       .lineWidth(2.5).stroke(C.COPPER);
    curY += 30;
  };

  const COL_HDR_H = 26;
  const ROW_H     = 22;

  const drawTableHeader = (cols) => {
    ensureSpace(COL_HDR_H + 5);
    doc.rect(MARGIN, curY, CONTENT_W, COL_HDR_H).fill(C.DARK_GREEN);
    let x = MARGIN;
    cols.forEach((col) => {
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
    doc.rect(MARGIN, curY, 4, ROW_H).fill(C.COPPER);
    let x = MARGIN;
    cols.forEach((col, i) => {
      doc.fillColor(i === 0 ? C.COPPER : C.WHITE).font('Helvetica-Bold').fontSize(9)
         .text(values[i], x + 6, curY + 6, { width: col.w - 10, align: col.align || 'left' });
      x += col.w;
    });
    curY += ROW_H;
  };

  // Shared 5-column layout; first column label varies per section.
  const columnsFor = (firstColLabel) => ([
    { label: firstColLabel, w: 165, align: 'left'  },
    { label: 'Entries',     w: 60,  align: 'right' },
    { label: 'Qty (pcs)',   w: 80,  align: 'right' },
    { label: 'Total Carat', w: 100, align: 'right' },
    { label: 'Stock Value', w: 110, align: 'right' },
  ]);
  const TOTAL_ROW5 = ['GRAND TOTAL', grandItems.toString(), grandQty.toLocaleString(),
                      grandCarat.toFixed(2) + ' ct', '$' + grandValue.toFixed(2)];

  const renderSection = (key) => {
    const meta = SECTION_META[key];
    const rows = datasets[key] || [];
    const cols = columnsFor(meta.firstCol);
    drawSectionTitle(meta.title);
    drawTableHeader(cols);
    rows.forEach((r, i) => {
      drawRow(cols, [
        r.label,
        r.entries.toString(),
        r.totalQty.toLocaleString(),
        r.totalCarat.toFixed(2) + ' ct',
        '$' + r.totalValue.toFixed(2),
      ], i % 2 === 0);
    });
    drawTotalRow(cols, TOTAL_ROW5);
    curY += 18;
  };

  // ════════════════════════════════════════════════
  //  SECTIONS  (in the requested order)
  // ════════════════════════════════════════════════
  sections.forEach(renderSection);

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
module.exports.parseDimension = parseDimension;
module.exports.ALL_SECTIONS = ALL_SECTIONS;
