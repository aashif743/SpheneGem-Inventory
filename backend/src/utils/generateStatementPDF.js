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

function generateSalesStatementPDF(res, sales, startDate, endDate, rangeLabel = 'All') {
  const doc = new PDFDocument({
    margin: 0,
    size: 'A4',
    bufferPages: true,
    info: {
      Title: `Sales Statement — ${rangeLabel}`,
      Author: 'Sphene Gem & Jewelry',
      Creator: 'SpheneGem Inventory'
    }
  });

  const filename = `sales_statement_${rangeLabel}_${moment().format('YYYYMMDD_HHmm')}.pdf`;
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

  // Logo with white background
  const LOGO_SIZE = 70;
  doc.rect(MARGIN - 4, 13, LOGO_SIZE + 8, LOGO_SIZE + 8).fill(C.WHITE);
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN, 17, { width: LOGO_SIZE, height: LOGO_SIZE });
  }

  // Company name
  const COMP_X = MARGIN + LOGO_SIZE + 16;
  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(20).text('SPHENE', COMP_X, 24);
  doc.fillColor(C.COPPER).font('Helvetica').fontSize(9).text('GEM & JEWELRY', COMP_X, 50);
  doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8).text('Fine Gemstone Inventory', COMP_X, 65);

  // Report title — right side
  const RIGHT_W = 190;
  const RIGHT_X = PAGE_W - MARGIN - RIGHT_W;
  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(14)
     .text('SALES', RIGHT_X, 20, { width: RIGHT_W, align: 'right' });
  doc.fillColor(C.COPPER).font('Helvetica-Bold').fontSize(14)
     .text('STATEMENT', RIGHT_X, 38, { width: RIGHT_W, align: 'right' });
  doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8.5)
     .text(`Generated: ${moment().format('MMM D, YYYY  HH:mm')}`,
           RIGHT_X, 62, { width: RIGHT_W, align: 'right' });
  doc.fillColor('#80CBC4').font('Helvetica').fontSize(8)
     .text(`Period: ${startDate.format('MMM D, YYYY')} – ${endDate.format('MMM D, YYYY')}`,
           RIGHT_X, 76, { width: RIGHT_W, align: 'right' });

  // Copper accent bar
  doc.rect(0, HEADER_H, PAGE_W, 4).fill(C.COPPER);

  // ════════════════════════════════════════════════
  //  SUMMARY STAT BOXES
  // ════════════════════════════════════════════════
  const totalSales  = sales.length;
  const totalCarat  = sales.reduce((s, sale) => s + (parseFloat(sale.carat_sold) || 0), 0);
  const grandTotal  = sales.reduce((s, sale) => s + (parseFloat(sale.total_amount) || 0), 0);
  const avgPerSale  = totalSales > 0 ? grandTotal / totalSales : 0;

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

  drawStatBox('Transactions',  totalSales.toString(),          0);
  drawStatBox('Carat Sold',    totalCarat.toFixed(2) + ' ct',  1);
  drawStatBox('Grand Total',   '$' + grandTotal.toFixed(2),    2);
  drawStatBox('Avg Per Sale',  '$' + avgPerSale.toFixed(2),    3);

  // ════════════════════════════════════════════════
  //  SALES TABLE
  // ════════════════════════════════════════════════
  let curY = STATS_TOP + STATS_H + 18;

  const ensureSpace = (needed) => {
    if (curY + needed > PAGE_H - 58) {
      doc.addPage();
      curY = MARGIN + 10;
    }
  };

  const COL_HDR_H = 26;
  const ROW_H     = 20;

  const COLS = [
    { label: '#',        w: 28,  align: 'center' },
    { label: 'Date',     w: 72,  align: 'left'   },
    { label: 'Code',     w: 60,  align: 'left'   },
    { label: 'Name',     w: 95,  align: 'left'   },
    { label: 'Shape',    w: 58,  align: 'left'   },
    { label: 'Carat',    w: 55,  align: 'right'  },
    { label: 'Price/CT', w: 62,  align: 'right'  },
    { label: 'Total',    w: 85,  align: 'right'  },
  ];
  // Total width = 28+72+60+95+58+55+62+85 = 515 = CONTENT_W

  const drawTableHeader = () => {
    ensureSpace(COL_HDR_H + 5);
    doc.rect(MARGIN, curY, CONTENT_W, COL_HDR_H).fill(C.DARK_GREEN);
    let x = MARGIN;
    COLS.forEach(col => {
      doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(8.5)
         .text(col.label, x + 5, curY + 9, { width: col.w - 8, align: col.align });
      x += col.w;
    });
    curY += COL_HDR_H;
  };

  drawTableHeader();

  sales.forEach((sale, i) => {
    ensureSpace(ROW_H);

    // Redraw header on new page
    if (i > 0 && curY <= MARGIN + 15) {
      drawTableHeader();
    }

    const isAlt = i % 2 === 0;
    doc.rect(MARGIN, curY, CONTENT_W, ROW_H)
       .fillAndStroke(isAlt ? C.LIGHT_GREEN : C.WHITE, C.GREEN_BDR);

    const values = [
      (i + 1).toString(),
      moment(sale.sold_at).format('DD MMM YYYY'),
      sale.code,
      sale.name,
      sale.shape || '—',
      parseFloat(sale.carat_sold).toFixed(2),
      '$' + parseFloat(sale.marking_price).toFixed(2),
      '$' + parseFloat(sale.total_amount).toFixed(2),
    ];

    let x = MARGIN;
    COLS.forEach((col, ci) => {
      const isLast = ci === COLS.length - 1;
      doc.fillColor(isLast ? C.MID_GREEN : C.TEXT)
         .font(isLast ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(8.5)
         .text(values[ci], x + 5, curY + 5, { width: col.w - 8, align: col.align });
      x += col.w;
    });

    curY += ROW_H;
  });

  // Grand total row
  ensureSpace(ROW_H + 4);
  doc.rect(MARGIN, curY, CONTENT_W, ROW_H).fill(C.DARK_GREEN);
  doc.rect(MARGIN, curY, 4, ROW_H).fill(C.COPPER);

  doc.fillColor(C.COPPER).font('Helvetica-Bold').fontSize(9)
     .text('GRAND TOTAL', MARGIN + 6, curY + 5, { width: 310 });
  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(9)
     .text(totalCarat.toFixed(2) + ' ct',
           MARGIN + 6 + 310 + 55, curY + 5, { width: 55, align: 'right' });
  doc.fillColor(C.WHITE).font('Helvetica-Bold').fontSize(9)
     .text('$' + grandTotal.toFixed(2),
           MARGIN + CONTENT_W - 85, curY + 5, { width: 83, align: 'right' });

  curY += ROW_H;

  // No-sales placeholder
  if (sales.length === 0) {
    doc.fillColor(C.MUTED).font('Helvetica').fontSize(10)
       .text('No sales records found for this period.',
             MARGIN, curY + 20, { width: CONTENT_W, align: 'center' });
  }

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
       .text('Sphene Gem & Jewelry  —  Sales Statement  —  Confidential',
             MARGIN, FY + 12, { width: CONTENT_W, align: 'center' });
    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(7.5)
       .text(`Page ${i + 1} of ${pageRange.count}  |  Generated ${moment().format('YYYY-MM-DD HH:mm')}`,
             MARGIN, FY + 28, { width: CONTENT_W, align: 'center' });
  }

  doc.end();
}

module.exports = generateSalesStatementPDF;
