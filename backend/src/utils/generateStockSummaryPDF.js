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
//  Dimension parsing — pulls a size like "10X7mm" out of free text.
//  The code field (and now the dedicated dimension field) is typed by
//  hand and messy: "8x6mm."  "10X7mm"  "5.5x7.5mm"  "8x8"  "5X3 CUSHION".
//  Numbers are kept in the order typed; formatting is canonicalised so
//  "8x6mm." and "8X6" group together. Returns null when there is no size.
// ─────────────────────────────────────────────────────────────
const DIM_RE = /(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)(?:\s*[xX*×]\s*(\d+(?:\.\d+)?))?/;

function parseDimension(text) {
  if (!text) return null;
  const m = String(text).match(DIM_RE);
  if (!m) return null;
  const nums = [m[1], m[2], m[3]]
    .filter((n) => n !== undefined)
    .map((n) => String(parseFloat(n)));
  return nums.join('x');
}

// The dimension for a stone: prefer the dedicated field, fall back to the
// code field (so the ~108 older stones still appear without re-entry).
// Returns { key, label } or null.
const NO_DIM = 'No dimension (SKU only)';
function stoneDimension(gem) {
  const field = (gem.dimension || '').trim();
  const parsed = parseDimension(field) || parseDimension(gem.code);
  if (parsed) return { key: parsed, label: parsed.replace(/x/g, ' x ') + ' mm' };
  if (field) return { key: field.toLowerCase(), label: field }; // free-text size
  return null;
}

// Carat buckets: 1-ct steps up to 10, then 5-ct steps, widening at the top.
const CARAT_BUCKETS = [
  { label: '0 – 1 ct',    min: 0,   max: 1,        first: true },
  { label: '1 – 2 ct',    min: 1,   max: 2   },
  { label: '2 – 3 ct',    min: 2,   max: 3   },
  { label: '3 – 4 ct',    min: 3,   max: 4   },
  { label: '4 – 5 ct',    min: 4,   max: 5   },
  { label: '5 – 6 ct',    min: 5,   max: 6   },
  { label: '6 – 7 ct',    min: 6,   max: 7   },
  { label: '7 – 8 ct',    min: 7,   max: 8   },
  { label: '8 – 9 ct',    min: 8,   max: 9   },
  { label: '9 – 10 ct',   min: 9,   max: 10  },
  { label: '10 – 15 ct',  min: 10,  max: 15  },
  { label: '15 – 20 ct',  min: 15,  max: 20  },
  { label: '20 – 25 ct',  min: 20,  max: 25  },
  { label: '25 – 30 ct',  min: 25,  max: 30  },
  { label: '30 – 40 ct',  min: 30,  max: 40  },
  { label: '40 – 50 ct',  min: 40,  max: 50  },
  { label: '50 – 100 ct', min: 50,  max: 100 },
  { label: '100 ct +',    min: 100, max: Infinity },
];

function caratBucketOf(weight) {
  const w = parseFloat(weight) || 0;
  for (const b of CARAT_BUCKETS) {
    if (b.first ? (w >= b.min && w <= b.max) : (w > b.min && w <= b.max)) return b.label;
  }
  return CARAT_BUCKETS[CARAT_BUCKETS.length - 1].label;
}

const SECTION_META = {
  category:  { title: 'Category-Wise',  firstCol: 'Category / Name' },
  shape:     { title: 'Shape / Cut',    firstCol: 'Shape / Cut'     },
  carat:     { title: 'Carat Weight',   firstCol: 'Carat Range'     },
  dimension: { title: 'Dimension',      firstCol: 'Dimension'       },
};
const ALL_SECTIONS = ['category', 'shape', 'carat', 'dimension'];

// The grouping label for a stone under a given section.
function groupLabelOf(gem, section) {
  if (section === 'category') return (gem.name  || 'Unknown').trim() || 'Unknown';
  if (section === 'shape')    return (gem.shape || 'Unknown').trim() || 'Unknown';
  if (section === 'carat')    return caratBucketOf(gem.weight);
  if (section === 'dimension') { const d = stoneDimension(gem); return d ? d.label : NO_DIM; }
  return 'Unknown';
}

// Roll stones into ordered groups: [{ label, stones, qty, carat, value }].
function buildGroups(gemstones, section) {
  const map = {};
  for (const g of gemstones) {
    const label = groupLabelOf(g, section);
    if (!map[label]) map[label] = { label, stones: [], qty: 0, carat: 0, value: 0 };
    const grp = map[label];
    grp.stones.push(g);
    grp.qty   += parseInt(g.quantity, 10) || 0;
    grp.carat += parseFloat(g.weight)     || 0;
    grp.value += parseFloat(g.total_price) || 0;
  }
  let groups = Object.values(map);

  if (section === 'carat') {
    const order = CARAT_BUCKETS.map((b) => b.label);
    groups.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  } else if (section === 'category') {
    groups.sort((a, b) => a.label.localeCompare(b.label));
  } else if (section === 'dimension') {
    groups.sort((a, b) => {
      if (a.label === NO_DIM) return 1;
      if (b.label === NO_DIM) return -1;
      if (b.stones.length !== a.stones.length) return b.stones.length - a.stones.length;
      return a.label.localeCompare(b.label);
    });
  } else {
    groups.sort((a, b) => b.carat - a.carat); // shape
  }

  // Biggest stones first inside each group.
  groups.forEach((grp) => grp.stones.sort((x, y) => (parseFloat(y.weight) || 0) - (parseFloat(x.weight) || 0)));
  return groups;
}

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * @param res       Express response
 * @param gemstones rows from gemstones (may include the new `dimension` column)
 * @param options   { sections?: string[], mode?: 'summary'|'detail' }
 *                  - mode 'summary' (default for the full report): aggregate
 *                    tables of all sections.
 *                  - mode 'detail'  (used for a single grouping): every stone
 *                    listed under its group, with a per-group subtotal.
 */
function generateStockSummaryPDF(res, gemstones, options = {}) {
  const sections = (Array.isArray(options.sections) && options.sections.length
    ? options.sections
    : ALL_SECTIONS
  ).filter((s) => SECTION_META[s]);

  const mode = options.mode === 'detail' ? 'detail' : 'summary';
  const isSingle = sections.length === 1;
  const subtitle = isSingle
    ? `${SECTION_META[sections[0]].title}-Wise${mode === 'detail' ? ' · Detailed' : ''}`
    : 'Current Stock Status';
  const fileSlug = isSingle ? sections[0] : 'summary';

  const doc = new PDFDocument({
    margin: 0, size: 'A4', bufferPages: true,
    info: {
      Title: isSingle ? `Stock Report — ${SECTION_META[sections[0]].title}` : 'Stock Inventory Summary Report',
      Author: 'Sphene Gem & Jewelry', Creator: 'SpheneGem Inventory',
    },
  });

  const filename = `stock_${fileSlug}_${moment().format('YYYYMMDD_HHmm')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const PAGE_W = doc.page.width;
  const PAGE_H = doc.page.height;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── HEADER ──
  const HEADER_H = 115;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.DARK_GREEN);
  doc.save();
  doc.fillOpacity(0.06);
  doc.circle(PAGE_W - 10, -20, 130).fill(C.WHITE);
  doc.circle(PAGE_W - 55, HEADER_H + 10, 65).fill(C.WHITE);
  doc.restore();

  const LOGO_SIZE = 70;
  doc.rect(MARGIN - 4, 13, LOGO_SIZE + 8, LOGO_SIZE + 8).fill(C.WHITE);
  if (fs.existsSync(LOGO_PATH)) doc.image(LOGO_PATH, MARGIN, 17, { width: LOGO_SIZE, height: LOGO_SIZE });

  const COMP_X = MARGIN + LOGO_SIZE + 16;
  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(20).text('SPHENE', COMP_X, 24);
  doc.fillColor(C.COPPER).font('Helvetica').fontSize(9).text('GEM & JEWELRY', COMP_X, 50);
  doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8).text('Fine Gemstone Inventory', COMP_X, 65);

  const RB_W = 200, RB_X = PAGE_W - MARGIN - RB_W;
  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(14).text('STOCK', RB_X, 20, { width: RB_W, align: 'right' });
  doc.fillColor(C.COPPER).font('Helvetica-Bold').fontSize(14).text('REPORT', RB_X, 38, { width: RB_W, align: 'right' });
  doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8.5)
     .text(`Generated: ${moment().format('MMM D, YYYY  HH:mm')}`, RB_X, 62, { width: RB_W, align: 'right' });
  doc.fillColor('#80CBC4').font('Helvetica').fontSize(8).text(subtitle, RB_X, 76, { width: RB_W, align: 'right' });
  doc.rect(0, HEADER_H, PAGE_W, 4).fill(C.COPPER);

  // ── GRAND TOTALS ──
  const grandQty   = gemstones.reduce((s, g) => s + (parseInt(g.quantity, 10) || 0), 0);
  const grandCarat = gemstones.reduce((s, g) => s + (parseFloat(g.weight)     || 0), 0);
  const grandValue = gemstones.reduce((s, g) => s + (parseFloat(g.total_price)|| 0), 0);
  const grandItems = gemstones.length;

  // ── STAT BOXES ──
  const STATS_TOP = HEADER_H + 18, STATS_H = 62, GAP = 8;
  const BOX_W = (CONTENT_W - GAP * 3) / 4;
  const drawStatBox = (label, value, idx) => {
    const bx = MARGIN + idx * (BOX_W + GAP);
    doc.rect(bx, STATS_TOP, BOX_W, STATS_H).fillAndStroke(C.LIGHT_GREEN, C.GREEN_BDR);
    doc.rect(bx, STATS_TOP, BOX_W, 4).fill(C.COPPER);
    doc.fillColor(C.DARK_GREEN).font('Helvetica-Bold').fontSize(17).text(value, bx + 6, STATS_TOP + 14, { width: BOX_W - 12, align: 'center' });
    doc.fillColor(C.MUTED).font('Helvetica').fontSize(7.5).text(label.toUpperCase(), bx + 6, STATS_TOP + 40, { width: BOX_W - 12, align: 'center' });
  };
  drawStatBox('Total Items',  grandItems.toString(),        0);
  drawStatBox('Total Pieces', grandQty.toLocaleString(),    1);
  drawStatBox('Total Carat',  grandCarat.toFixed(2) + ' ct',2);
  drawStatBox('Stock Value',  money(grandValue),            3);

  // ── LAYOUT STATE ──
  let curY = STATS_TOP + STATS_H + 18;
  const BOTTOM = PAGE_H - 60;
  const ensureSpace = (needed) => { if (curY + needed > BOTTOM) { doc.addPage(); curY = MARGIN + 10; } };

  const drawSectionTitle = (title) => {
    ensureSpace(36);
    doc.fillColor(C.DARK_GREEN).font('Helvetica-Bold').fontSize(12).text(title, MARGIN, curY);
    doc.moveTo(MARGIN, curY + 18).lineTo(MARGIN + Math.min(title.length * 7.5, 300), curY + 18).lineWidth(2.5).stroke(C.COPPER);
    curY += 30;
  };

  // ═══════════════════════════════════════════════════════════
  //  SUMMARY MODE  (aggregate tables — used by the full report)
  // ═══════════════════════════════════════════════════════════
  const SUMCOLS = (firstLabel) => ([
    { label: firstLabel, w: 165, align: 'left'  },
    { label: 'Entries',  w: 60,  align: 'right' },
    { label: 'Qty (pcs)',w: 80,  align: 'right' },
    { label: 'Total Carat', w: 100, align: 'right' },
    { label: 'Stock Value', w: 110, align: 'right' },
  ]);
  const COL_HDR_H = 26, ROW_H = 22;

  const drawHeaderRow = (cols, h = COL_HDR_H) => {
    ensureSpace(h + 5);
    doc.rect(MARGIN, curY, CONTENT_W, h).fill(C.DARK_GREEN);
    let x = MARGIN;
    cols.forEach((col) => {
      doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(8.5).text(col.label, x + 6, curY + (h - 10) / 2, { width: col.w - 10, align: col.align || 'left' });
      x += col.w;
    });
    curY += h;
  };
  const drawCellRow = (cols, values, bg, opts = {}) => {
    ensureSpace(ROW_H);
    doc.rect(MARGIN, curY, CONTENT_W, ROW_H).fillAndStroke(bg, C.GREEN_BDR);
    let x = MARGIN;
    cols.forEach((col, i) => {
      const color = opts.color || (i === 0 ? C.TEXT : C.MUTED);
      const font  = (opts.bold || i === 0) ? 'Helvetica-Bold' : 'Helvetica';
      doc.fillColor(color).font(font).fontSize(opts.fontSize || 9).text(String(values[i] ?? ''), x + 6, curY + 6, { width: col.w - 10, align: col.align || 'left' });
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
      doc.fillColor(i === 0 ? C.COPPER : C.WHITE).font('Helvetica-Bold').fontSize(9).text(String(values[i] ?? ''), x + 6, curY + 6, { width: col.w - 10, align: col.align || 'left' });
      x += col.w;
    });
    curY += ROW_H;
  };
  const GRAND5 = ['GRAND TOTAL', grandItems.toString(), grandQty.toLocaleString(), grandCarat.toFixed(2) + ' ct', money(grandValue)];

  const renderSummarySection = (key) => {
    const meta = SECTION_META[key];
    const groups = buildGroups(gemstones, key);
    const cols = SUMCOLS(meta.firstCol);
    drawSectionTitle(`${meta.title}-Wise Summary`);
    drawHeaderRow(cols);
    groups.forEach((g, i) => {
      drawCellRow(cols, [g.label, g.stones.length.toString(), g.qty.toLocaleString(), g.carat.toFixed(2) + ' ct', money(g.value)], i % 2 === 0 ? C.LIGHT_GREEN : C.WHITE);
    });
    drawTotalRow(cols, GRAND5);
    curY += 18;
  };

  // ═══════════════════════════════════════════════════════════
  //  DETAIL MODE  (every stone listed under its group)
  // ═══════════════════════════════════════════════════════════
  const DCOLS = [
    { key: 'code',  label: 'Code',        w: 74, align: 'left'  },
    { key: 'name',  label: 'Name',        w: 92, align: 'left'  },
    { key: 'shape', label: 'Shape',       w: 78, align: 'left'  },
    { key: 'qty',   label: 'Qty',         w: 36, align: 'right' },
    { key: 'wt',    label: 'Weight (ct)', w: 70, align: 'right' },
    { key: 'ppc',   label: '$/ct',        w: 67, align: 'right' },
    { key: 'total', label: 'Total',       w: 98, align: 'right' },
  ];
  const DROW_H = 18;

  const drawDetailColHeader = () => {
    doc.rect(MARGIN, curY, CONTENT_W, 20).fill(C.MID_GREEN);
    let x = MARGIN;
    DCOLS.forEach((col) => {
      doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(8).text(col.label, x + 5, curY + 6, { width: col.w - 8, align: col.align });
      x += col.w;
    });
    curY += 20;
  };

  const drawGroupHeader = (grp) => {
    ensureSpace(24 + 20 + DROW_H); // header + col header + at least one row
    doc.rect(MARGIN, curY, CONTENT_W, 24).fill(C.DARK_GREEN);
    doc.rect(MARGIN, curY, 4, 24).fill(C.COPPER);
    doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(10).text(grp.label, MARGIN + 10, curY + 7, { width: CONTENT_W * 0.5 });
    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8.5)
       .text(`${grp.stones.length} pcs  ·  ${grp.carat.toFixed(2)} ct  ·  ${money(grp.value)}`,
             MARGIN + CONTENT_W * 0.5, curY + 8, { width: CONTENT_W * 0.5 - 10, align: 'right' });
    curY += 24;
    drawDetailColHeader();
  };

  const drawDetailRow = (gem, alt) => {
    // If a group spills onto a new page, repeat the column header.
    if (curY + DROW_H > BOTTOM) { doc.addPage(); curY = MARGIN + 10; drawDetailColHeader(); }
    doc.rect(MARGIN, curY, CONTENT_W, DROW_H).fillAndStroke(alt ? C.LIGHT_GREEN : C.WHITE, C.GREEN_BDR);
    const vals = {
      code: gem.code || '—',
      name: gem.name || '—',
      shape: gem.shape || '—',
      qty: String(parseInt(gem.quantity, 10) || 0),
      wt: (parseFloat(gem.weight) || 0).toFixed(2),
      ppc: money(gem.price_per_carat),
      total: money(gem.total_price),
    };
    let x = MARGIN;
    DCOLS.forEach((col) => {
      doc.fillColor(col.key === 'total' ? C.DARK_GREEN : C.TEXT)
         .font(col.key === 'code' || col.key === 'total' ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(8).text(vals[col.key], x + 5, curY + 5, { width: col.w - 8, align: col.align, lineBreak: false });
      x += col.w;
    });
    curY += DROW_H;
  };

  const drawSubtotal = (grp) => {
    if (curY + DROW_H > BOTTOM) { doc.addPage(); curY = MARGIN + 10; }
    doc.rect(MARGIN, curY, CONTENT_W, DROW_H).fillAndStroke('#DCEFD9', C.GREEN_BDR);
    // subtotal spans first cols as a label, then qty/weight/total aligned to columns
    let x = MARGIN;
    const wCode = DCOLS[0].w + DCOLS[1].w + DCOLS[2].w;
    doc.fillColor(C.DARK_GREEN).font('Helvetica-Bold').fontSize(8).text('Subtotal', x + 5, curY + 5, { width: wCode - 8 });
    x += wCode;
    doc.text(String(grp.qty), x + 5, curY + 5, { width: DCOLS[3].w - 8, align: 'right' }); x += DCOLS[3].w;
    doc.text(grp.carat.toFixed(2), x + 5, curY + 5, { width: DCOLS[4].w - 8, align: 'right' }); x += DCOLS[4].w;
    x += DCOLS[5].w; // skip $/ct
    doc.text(money(grp.value), x + 5, curY + 5, { width: DCOLS[6].w - 8, align: 'right' });
    curY += DROW_H + 10;
  };

  const renderDetailSection = (key) => {
    const meta = SECTION_META[key];
    let groups = buildGroups(gemstones, key);
    if (key === 'carat') groups = groups.filter((g) => g.stones.length > 0); // skip empty ranges
    drawSectionTitle(`${meta.title}-Wise Detailed Report`);
    groups.forEach((grp) => {
      drawGroupHeader(grp);
      grp.stones.forEach((s, i) => drawDetailRow(s, i % 2 === 0));
      drawSubtotal(grp);
    });

    // Grand total bar, values aligned to the detail columns.
    ensureSpace(ROW_H + 4);
    doc.rect(MARGIN, curY, CONTENT_W, ROW_H).fill(C.DARK_GREEN);
    doc.rect(MARGIN, curY, 4, ROW_H).fill(C.COPPER);
    let x = MARGIN;
    const wLabel = DCOLS[0].w + DCOLS[1].w + DCOLS[2].w;
    doc.fillColor(C.COPPER).font('Helvetica-Bold').fontSize(9).text('GRAND TOTAL', x + 6, curY + 6, { width: wLabel - 8 });
    x += wLabel;
    doc.fillColor(C.WHITE).text(grandQty.toLocaleString(), x + 5, curY + 6, { width: DCOLS[3].w - 8, align: 'right' }); x += DCOLS[3].w;
    doc.text(grandCarat.toFixed(2), x + 5, curY + 6, { width: DCOLS[4].w - 8, align: 'right' }); x += DCOLS[4].w;
    x += DCOLS[5].w; // skip $/ct
    doc.text(money(grandValue), x + 5, curY + 6, { width: DCOLS[6].w - 8, align: 'right' });
    curY += ROW_H;
  };

  // ── RENDER ──
  sections.forEach((key) => (mode === 'detail' ? renderDetailSection(key) : renderSummarySection(key)));

  // ── FOOTER (every page) ──
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(i);
    const FY = PAGE_H - 48;
    doc.rect(0, FY, PAGE_W, 48).fill(C.DARK_GREEN);
    doc.rect(0, FY, PAGE_W, 3).fill(C.COPPER);
    doc.fillColor(C.WHITE).font('Helvetica').fontSize(8)
       .text('Sphene Gem & Jewelry  —  Stock Inventory Report  —  Confidential', MARGIN, FY + 12, { width: CONTENT_W, align: 'center' });
    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(7.5)
       .text(`Page ${i + 1} of ${pageRange.count}  |  Generated ${moment().format('YYYY-MM-DD HH:mm')}`, MARGIN, FY + 28, { width: CONTENT_W, align: 'center' });
  }

  doc.end();
}

module.exports = generateStockSummaryPDF;
module.exports.parseDimension = parseDimension;
module.exports.stoneDimension = stoneDimension;
module.exports.caratBucketOf = caratBucketOf;
module.exports.ALL_SECTIONS = ALL_SECTIONS;
