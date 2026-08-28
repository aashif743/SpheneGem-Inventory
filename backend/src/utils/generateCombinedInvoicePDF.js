const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// ─────────────────────────────────────────────────
//  Combined (multi-gemstone) invoice PDF
//
//  Handles 1..N gemstones on a single invoice, with page breaks and a
//  repeated table header when the item list runs past one page.
//
//  This is a NEW generator used only by the multi-sell endpoint. The original
//  single-sale generator in gemstoneController.js is deliberately left alone
//  so existing invoices keep rendering exactly as they always have.
// ─────────────────────────────────────────────────

const LOGO_PATH    = path.join(__dirname, '../public/Sphene.png');
const INVOICES_DIR = path.join(__dirname, '../invoices');

// Generated output is gitignored, so the directory may not exist on a fresh deploy.
fs.mkdirSync(INVOICES_DIR, { recursive: true });

const BRAND = {
  DARK_GREEN : '#1B5E20',
  MID_GREEN  : '#2E7D32',
  COPPER     : '#BF7B30',
  LIGHT_GREEN: '#E8F5E9',
  GREEN_BDR  : '#A5D6A7',
  TEXT       : '#1A1A1A',
  MUTED      : '#5F6B7A',
  WHITE      : '#FFFFFF',
  PALE       : '#B2DFDB',
};

// Always 2 decimals, everywhere.
const n2 = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(2);

// Money with thousand separators, still always 2 decimals: "$44,025.00"
const m2 = (v) =>
  `$${(Number.isFinite(Number(v)) ? Number(v) : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * @param {object}   invoice
 * @param {string}   invoice.invoiceNumber  e.g. "INV-000042"
 * @param {Date}     [invoice.createdAt]
 * @param {Array}    invoice.items          [{ code, name, shape, quantity,
 *                                             carat_sold, selling_price,
 *                                             total_amount, marking_price, remark }]
 * @returns {Promise<string>} the generated filename
 */
const generateCombinedInvoicePDF = ({ invoiceNumber, items, createdAt }) => {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(items) || items.length === 0) {
      return reject(new Error('Cannot generate an invoice with no items'));
    }

    const doc = new PDFDocument({
      margin: 0,
      size: 'A4',
      bufferPages: true,
      info: {
        Title:   `Invoice ${invoiceNumber}`,
        Author:  'Sphene Gem & Jewelry',
        Creator: 'SpheneGem Inventory',
      },
    });

    const filename = `${invoiceNumber}.pdf`;
    const filePath = path.join(INVOICES_DIR, filename);
    const stream   = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const PAGE_W    = doc.page.width;
    const PAGE_H    = doc.page.height;
    const MARGIN    = 45;
    const CONTENT_W = PAGE_W - MARGIN * 2;         // 505
    const FOOTER_H  = 60;
    const { DARK_GREEN, MID_GREEN, COPPER, LIGHT_GREEN,
            GREEN_BDR, TEXT, MUTED, WHITE, PALE } = BRAND;

    const issued = createdAt ? new Date(createdAt) : new Date();
    const dateStr = issued.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // ── Totals ──
    const totals = items.reduce((acc, it) => ({
      quantity: acc.quantity + (parseInt(it.quantity, 10) || 0),
      carat:    acc.carat    + (parseFloat(it.carat_sold) || 0),
      amount:   acc.amount   + (parseFloat(it.total_amount) || 0),
    }), { quantity: 0, carat: 0, amount: 0 });

    // ── Column layout (sums to CONTENT_W = 505) ──
    const COLS = [
      { key: 'idx',   label: '#',           w: 26,  align: 'center' },
      { key: 'desc',  label: 'DESCRIPTION', w: 179, align: 'left'   },
      { key: 'qty',   label: 'QTY',         w: 48,  align: 'center' },
      { key: 'carat', label: 'CARAT',       w: 76,  align: 'center' },
      { key: 'price', label: 'PRICE / CT',  w: 86,  align: 'center' },
      { key: 'amt',   label: 'AMOUNT',      w: 90,  align: 'right'  },
    ];
    let runningX = MARGIN;
    COLS.forEach((c) => { c.x = runningX; runningX += c.w; });

    const HDR_H  = 120;   // page-1 branded header
    const COL_H  = 24;    // table header row
    const ROW_H  = 34;    // item row
    const SUMM_H = 104;   // summary block on the final page

    // ════════════════════════════════
    //  Page furniture
    // ════════════════════════════════
    const drawPageHeader = () => {
      doc.rect(0, 0, PAGE_W, HDR_H).fill(DARK_GREEN);

      doc.save();
      doc.fillOpacity(0.06);
      doc.circle(PAGE_W - 10, -20, 130).fill(WHITE);
      doc.circle(PAGE_W - 55, HDR_H + 10, 70).fill(WHITE);
      doc.restore();

      const LOGO = 72;
      doc.rect(MARGIN - 4, 14, LOGO + 8, LOGO + 8).fill(WHITE);
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, MARGIN, 18, { width: LOGO, height: LOGO });
      }

      const CX = MARGIN + LOGO + 18;
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(22).text('SPHENE', CX, 26);
      doc.fillColor(COPPER).font('Helvetica').fontSize(10).text('GEM & JEWELRY', CX, 54);
      doc.fillColor(PALE).font('Helvetica').fontSize(8).text('Fine Gemstone Inventory', CX, 70);

      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(30)
         .text('INVOICE', PAGE_W - MARGIN - 190, 22, { width: 190, align: 'right' });
      doc.fillColor(PALE).font('Helvetica').fontSize(9)
         .text(invoiceNumber, PAGE_W - MARGIN - 190, 62, { width: 190, align: 'right' });
      doc.fillColor(PALE).font('Helvetica').fontSize(9)
         .text(dateStr, PAGE_W - MARGIN - 190, 76, { width: 190, align: 'right' });
      doc.fillColor(PALE).font('Helvetica').fontSize(8.5)
         .text(`${items.length} item${items.length !== 1 ? 's' : ''}`,
               PAGE_W - MARGIN - 190, 92, { width: 190, align: 'right' });

      doc.rect(0, HDR_H, PAGE_W, 4).fill(COPPER);
    };

    const drawContinuationHeader = () => {
      doc.rect(0, 0, PAGE_W, 52).fill(DARK_GREEN);
      doc.rect(0, 52, PAGE_W, 3).fill(COPPER);
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(13)
         .text('SPHENE GEM & JEWELRY', MARGIN, 17);
      doc.fillColor(PALE).font('Helvetica').fontSize(9)
         .text(`${invoiceNumber} — continued`, PAGE_W - MARGIN - 200, 20,
               { width: 200, align: 'right' });
    };

    const drawFooter = () => {
      const FY = PAGE_H - FOOTER_H;
      doc.rect(0, FY, PAGE_W, FOOTER_H).fill(DARK_GREEN);
      doc.rect(0, FY, PAGE_W, 3).fill(COPPER);

      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
         .text('Thank you for your purchase!', MARGIN, FY + 12,
               { width: CONTENT_W, align: 'center' });
      doc.fillColor(PALE).font('Helvetica').fontSize(8)
         .text('Sphene Gem & Jewelry  |  Fine Gemstone Inventory  |  All rights reserved',
               MARGIN, FY + 29, { width: CONTENT_W, align: 'center' });
      doc.fillColor('#80CBC4').font('Helvetica').fontSize(7.5)
         .text(`${invoiceNumber}  |  Generated: ${new Date().toLocaleString()}`,
               MARGIN, FY + 44, { width: CONTENT_W, align: 'center' });
    };

    const drawTableHeader = (y) => {
      doc.rect(MARGIN, y, CONTENT_W, COL_H).fill(DARK_GREEN);
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8.5);
      COLS.forEach((c) => {
        const pad = c.align === 'left' ? 8 : 4;
        doc.text(c.label, c.x + pad, y + 7.5, { width: c.w - pad * 2, align: c.align });
      });
      return y + COL_H;
    };

    // ════════════════════════════════
    //  Page 1
    // ════════════════════════════════
    drawPageHeader();

    let y = HDR_H + 22;
    doc.fillColor(DARK_GREEN).font('Helvetica-Bold').fontSize(11)
       .text('ITEMS SOLD', MARGIN, y);
    doc.moveTo(MARGIN, y + 17).lineTo(MARGIN + 92, y + 17).lineWidth(2).stroke(COPPER);

    y = drawTableHeader(y + 28);

    // ════════════════════════════════
    //  Item rows
    // ════════════════════════════════
    const bottomLimit = () => PAGE_H - FOOTER_H - 14;

    items.forEach((it, i) => {
      // Reserve room for the summary block after the last row
      const needed = ROW_H + (i === items.length - 1 ? SUMM_H : 0);
      if (y + needed > bottomLimit()) {
        drawFooter();
        doc.addPage();
        drawContinuationHeader();
        y = drawTableHeader(72);
      }

      // Zebra striping
      if (i % 2 === 0) {
        doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(LIGHT_GREEN);
      }
      doc.rect(MARGIN, y, CONTENT_W, ROW_H).lineWidth(0.5).stroke(GREEN_BDR);

      const c = Object.fromEntries(COLS.map((col) => [col.key, col]));

      doc.fillColor(MUTED).font('Helvetica').fontSize(8.5)
         .text(String(i + 1), c.idx.x + 2, y + 12, { width: c.idx.w - 4, align: 'center' });

      doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(9.5)
         .text(String(it.name || '—'), c.desc.x + 8, y + 6,
               { width: c.desc.w - 12, lineBreak: false, ellipsis: true });
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
         .text(`Code: ${it.code || '—'}${it.shape ? `   ·   ${it.shape}` : ''}`,
               c.desc.x + 8, y + 19, { width: c.desc.w - 12, lineBreak: false, ellipsis: true });

      doc.fillColor(TEXT).font('Helvetica').fontSize(9.5)
         .text(String(it.quantity ?? '—'), c.qty.x + 4, y + 12,
               { width: c.qty.w - 8, align: 'center' })
         .text(`${n2(it.carat_sold)} ct`, c.carat.x + 4, y + 12,
               { width: c.carat.w - 8, align: 'center' })
         .text(m2(it.selling_price), c.price.x + 4, y + 12,
               { width: c.price.w - 8, align: 'center' });

      doc.fillColor(MID_GREEN).font('Helvetica-Bold').fontSize(10)
         .text(m2(it.total_amount), c.amt.x + 4, y + 12,
               { width: c.amt.w - 8, align: 'right' });

      y += ROW_H;
    });

    // ════════════════════════════════
    //  Summary
    // ════════════════════════════════
    y += 18;

    const BOX_W = 232;
    const BOX_X = MARGIN + CONTENT_W - BOX_W;
    const LEFT_W = BOX_X - MARGIN - 20;

    // Left: item/qty/carat tallies
    const tally = (label, value, ty) => {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8)
         .text(label.toUpperCase(), MARGIN, ty, { width: LEFT_W, characterSpacing: 0.3 });
      doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(11)
         .text(value, MARGIN, ty + 12, { width: LEFT_W });
    };
    tally('Total Items',    `${items.length}`,             y + 4);
    tally('Total Quantity', `${totals.quantity} pcs`,      y + 34);
    tally('Total Carat',    `${n2(totals.carat)} ct`,      y + 64);

    // Right: grand total
    doc.rect(BOX_X, y, BOX_W, 88).fill(DARK_GREEN);
    doc.rect(BOX_X, y, BOX_W, 4).fill(COPPER);

    doc.fillColor(PALE).font('Helvetica').fontSize(8.5)
       .text('TOTAL AMOUNT PAYABLE', BOX_X, y + 16, { width: BOX_W, align: 'center' });
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(26)
       .text(m2(totals.amount), BOX_X, y + 34, { width: BOX_W, align: 'center' });
    doc.fillColor(PALE).font('Helvetica').fontSize(7.5)
       .text(`across ${items.length} gemstone${items.length !== 1 ? 's' : ''}`,
             BOX_X, y + 68, { width: BOX_W, align: 'center' });

    drawFooter();

    // ── Page numbers (needs bufferPages) ──
    const range = doc.bufferedPageRange();
    if (range.count > 1) {
      for (let p = 0; p < range.count; p++) {
        doc.switchToPage(range.start + p);
        doc.fillColor('#80CBC4').font('Helvetica').fontSize(7.5)
           .text(`Page ${p + 1} of ${range.count}`,
                 MARGIN, PAGE_H - 16, { width: CONTENT_W, align: 'right' });
      }
    }

    doc.end();
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
};

module.exports = generateCombinedInvoicePDF;
