const db = require('../models/db');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const generateStockSummaryPDF = require('../utils/generateStockSummaryPDF');
const generateCombinedInvoicePDF = require('../utils/generateCombinedInvoicePDF');

// Every price and weight in this system is stored to 2 decimal places.
// Returns 0 for anything non-numeric so callers can validate the result.
const round2 = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? parseFloat(n.toFixed(2)) : 0;
};

// ─────────────────────────────────────────────────
//  Logo path (shared by all PDF generators)
// ─────────────────────────────────────────────────
const LOGO_PATH = path.join(__dirname, '../public/Sphene.png');

// Directory where generated invoice PDFs are stored. It is not committed to
// git (generated output), so it may not exist on a fresh deploy. Ensure it
// exists at startup to avoid ENOENT when createWriteStream runs.
const INVOICES_DIR = path.join(__dirname, '../invoices');
fs.mkdirSync(INVOICES_DIR, { recursive: true });

// ─────────────────────────────────────────────────
//  Brand colors (matched to Sphene.png logo)
//  Dark green header, copper accent, light-green rows
// ─────────────────────────────────────────────────
const BRAND = {
  DARK_GREEN : '#1B5E20',   // deep forest green (header/table-header bg)
  MID_GREEN  : '#2E7D32',   // medium green (section underlines, accents)
  COPPER     : '#BF7B30',   // copper/bronze — matches "SPHENE" text in logo
  LIGHT_GREEN: '#E8F5E9',   // very light green — alternating row bg
  GREEN_BDR  : '#A5D6A7',   // light green border
  TEXT       : '#1A1A1A',
  MUTED      : '#5F6B7A',
  WHITE      : '#FFFFFF',
};

// ─────────────────────────────────────────────────
//  Professional Invoice PDF (Promise-based)
// ─────────────────────────────────────────────────
const generateInvoicePDF = (sale) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 0,
      size: 'A4',
      bufferPages: true,
      info: {
        Title: `Invoice INV-${String(sale.saleId).padStart(6, '0')}`,
        Author: 'Sphene Gem & Jewelry',
        Creator: 'SpheneGem Inventory'
      }
    });

    const filename = `invoice_${sale.saleId}.pdf`;
    const filePath = path.join(INVOICES_DIR, filename);
    const stream   = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const PAGE_W    = doc.page.width;    // 595.28
    const PAGE_H    = doc.page.height;   // 841.89
    const MARGIN    = 45;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const { DARK_GREEN, MID_GREEN, COPPER, LIGHT_GREEN, GREEN_BDR, TEXT, MUTED, WHITE } = BRAND;

    // ════════════════════════════════
    //  HEADER  (full-width dark green)
    // ════════════════════════════════
    const HEADER_H = 120;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(DARK_GREEN);

    // Subtle circle decorations (top-right)
    doc.save();
    doc.fillOpacity(0.06);
    doc.circle(PAGE_W - 10, -20, 130).fill(WHITE);
    doc.circle(PAGE_W - 55, HEADER_H + 10, 70).fill(WHITE);
    doc.restore();

    // Logo (white bg box so logo is crisp on dark header)
    const LOGO_SIZE = 72;
    doc.rect(MARGIN - 4, 14, LOGO_SIZE + 8, LOGO_SIZE + 8).fill(WHITE);
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, MARGIN, 18, { width: LOGO_SIZE, height: LOGO_SIZE });
    }

    // Company name — to the right of the logo
    const COMP_X = MARGIN + LOGO_SIZE + 18;
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(22)
       .text('SPHENE', COMP_X, 26);
    doc.fillColor(COPPER).font('Helvetica').fontSize(10)
       .text('GEM & JEWELRY', COMP_X, 54);
    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8)
       .text('Fine Gemstone Inventory', COMP_X, 70);

    // "INVOICE" — far right
    const invNum  = `INV-${String(sale.saleId).padStart(6, '0')}`;
    const saleDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(30)
       .text('INVOICE', PAGE_W - MARGIN - 180, 22, { width: 180, align: 'right' });
    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(9)
       .text(invNum, PAGE_W - MARGIN - 180, 62, { width: 180, align: 'right' });
    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(9)
       .text(saleDate, PAGE_W - MARGIN - 180, 76, { width: 180, align: 'right' });

    // Copper accent bar
    doc.rect(0, HEADER_H, PAGE_W, 4).fill(COPPER);

    // ════════════════════════════════
    //  GEMSTONE DETAILS
    // ════════════════════════════════
    const detailsTop = HEADER_H + 22;

    doc.fillColor(DARK_GREEN).font('Helvetica-Bold').fontSize(11)
       .text('GEMSTONE DETAILS', MARGIN, detailsTop);
    doc.moveTo(MARGIN, detailsTop + 17).lineTo(MARGIN + 170, detailsTop + 17)
       .lineWidth(2).stroke(COPPER);

    const drawField = (label, value, x, y) => {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8)
         .text(label.toUpperCase(), x, y, { characterSpacing: 0.3 });
      doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(11)
         .text(String(value || '—'), x, y + 13);
    };

    const C1 = MARGIN;
    const C2 = MARGIN + CONTENT_W * 0.37;
    const C3 = MARGIN + CONTENT_W * 0.68;
    const R1 = detailsTop + 28;
    const R2 = R1 + 50;

    drawField('Gemstone Code', sale.code,          C1, R1);
    drawField('Gemstone Name', sale.name,          C2, R1);
    drawField('Shape / Cut',   sale.shape || '—',  C3, R1);
    drawField('Quantity Sold', `${sale.quantity} pcs`,                            C1, R2);
    drawField('Carat Sold',    `${parseFloat(sale.carat_sold).toFixed(2)} ct`,    C2, R2);
    drawField('Sale Date',     saleDate,                                           C3, R2);

    const divY = R2 + 44;
    doc.moveTo(MARGIN, divY).lineTo(MARGIN + CONTENT_W, divY)
       .lineWidth(0.5).strokeColor(GREEN_BDR).stroke();

    // ════════════════════════════════
    //  PRICING TABLE
    // ════════════════════════════════
    const tableLabelY = divY + 18;
    doc.fillColor(DARK_GREEN).font('Helvetica-Bold').fontSize(11)
       .text('SALE DETAILS', MARGIN, tableLabelY);
    doc.moveTo(MARGIN, tableLabelY + 17).lineTo(MARGIN + 115, tableLabelY + 17)
       .lineWidth(2).stroke(COPPER);

    const TABLE_Y      = tableLabelY + 28;
    const COL_HDR_H    = 26;
    const DATA_ROW_H   = 36;

    // Column positions (total 505 = CONTENT_W)
    const COLS = [
      { label: 'DESCRIPTION', x: MARGIN,       w: 195, align: 'left'   },
      { label: 'QTY',         x: MARGIN + 195, w: 60,  align: 'center' },
      { label: 'CARAT',       x: MARGIN + 255, w: 90,  align: 'center' },
      { label: 'PRICE / CT',  x: MARGIN + 345, w: 90,  align: 'center' },
      { label: 'AMOUNT',      x: MARGIN + 435, w: 70,  align: 'right'  },
    ];

    // Table header row
    doc.rect(MARGIN, TABLE_Y, CONTENT_W, COL_HDR_H).fill(DARK_GREEN);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9);
    COLS.forEach(col => {
      const xPad = col.align === 'left' ? col.x + 8 : col.x + 4;
      doc.text(col.label, xPad, TABLE_Y + 8, { width: col.w - 10, align: col.align });
    });

    // Data row — draw border properly with fillAndStroke
    const DATA_Y = TABLE_Y + COL_HDR_H;
    doc.rect(MARGIN, DATA_Y, CONTENT_W, DATA_ROW_H).fillAndStroke(LIGHT_GREEN, GREEN_BDR);

    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(10)
       .text(sale.name, COLS[0].x + 8, DATA_Y + 6, { width: COLS[0].w - 10 });
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
       .text(`Code: ${sale.code}`, COLS[0].x + 8, DATA_Y + 20, { width: COLS[0].w - 10 });

    doc.fillColor(TEXT).font('Helvetica').fontSize(10)
       .text(`${sale.quantity}`,
             COLS[1].x + 4, DATA_Y + 13, { width: COLS[1].w - 8, align: 'center' })
       .text(`${parseFloat(sale.carat_sold).toFixed(2)} ct`,
             COLS[2].x + 4, DATA_Y + 13, { width: COLS[2].w - 8, align: 'center' })
       .text(`$${parseFloat(sale.selling_price).toFixed(2)}`,
             COLS[3].x + 4, DATA_Y + 13, { width: COLS[3].w - 8, align: 'center' });

    doc.fillColor(MID_GREEN).font('Helvetica-Bold').fontSize(11)
       .text(`$${parseFloat(sale.total_amount).toFixed(2)}`,
             COLS[4].x + 4, DATA_Y + 13, { width: COLS[4].w - 8, align: 'right' });

    // ════════════════════════════════
    //  TOTAL SECTION  (no-overlap layout)
    //  Left panel: original price + remark
    //  Right panel: total amount box
    // ════════════════════════════════
    const TOTAL_AREA_Y  = DATA_Y + DATA_ROW_H + 18;
    const TOTAL_BOX_W   = 205;
    const TOTAL_BOX_H   = 76;
    const TOTAL_BOX_X   = MARGIN + CONTENT_W - TOTAL_BOX_W;  // = 350
    const LEFT_PANEL_W  = TOTAL_BOX_X - MARGIN - 20;          // = 285

    // Right: total box
    doc.rect(TOTAL_BOX_X, TOTAL_AREA_Y, TOTAL_BOX_W, TOTAL_BOX_H).fill(DARK_GREEN);
    doc.rect(TOTAL_BOX_X, TOTAL_AREA_Y, TOTAL_BOX_W, 4).fill(COPPER);

    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8.5)
       .text('TOTAL AMOUNT PAYABLE',
             TOTAL_BOX_X, TOTAL_AREA_Y + 14,
             { width: TOTAL_BOX_W, align: 'center' });
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(22)
       .text(`$${parseFloat(sale.total_amount).toFixed(2)}`,
             TOTAL_BOX_X, TOTAL_AREA_Y + 32,
             { width: TOTAL_BOX_W, align: 'center' });

    // Left: original price/CT and remark — constrained strictly to left panel
    let leftY = TOTAL_AREA_Y + 6;
    if (sale.marking_price) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8)
         .text('ORIGINAL PRICE / CT',
               MARGIN, leftY,
               { width: LEFT_PANEL_W, characterSpacing: 0.3 });
      doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(11)
         .text(`$${parseFloat(sale.marking_price).toFixed(2)}`,
               MARGIN, leftY + 13,
               { width: LEFT_PANEL_W });
      leftY += 38;
    }
    if (sale.remark) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8)
         .text('REMARK',
               MARGIN, leftY,
               { width: LEFT_PANEL_W, characterSpacing: 0.3 });
      doc.fillColor(TEXT).font('Helvetica-Oblique').fontSize(9)
         .text(sale.remark,
               MARGIN, leftY + 13,
               { width: LEFT_PANEL_W });
    }

    // ════════════════════════════════
    //  FOOTER
    // ════════════════════════════════
    const FOOTER_Y = PAGE_H - 60;
    doc.rect(0, FOOTER_Y, PAGE_W, 60).fill(DARK_GREEN);
    doc.rect(0, FOOTER_Y, PAGE_W, 3).fill(COPPER);

    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
       .text('Thank you for your purchase!',
             MARGIN, FOOTER_Y + 12, { width: CONTENT_W, align: 'center' });
    doc.fillColor('#B2DFDB').font('Helvetica').fontSize(8)
       .text('Sphene Gem & Jewelry  |  Fine Gemstone Inventory  |  All rights reserved',
             MARGIN, FOOTER_Y + 29, { width: CONTENT_W, align: 'center' });
    doc.fillColor('#80CBC4').font('Helvetica').fontSize(7.5)
       .text(`${invNum}  |  Generated: ${new Date().toLocaleString()}`,
             MARGIN, FOOTER_Y + 44, { width: CONTENT_W, align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
};

// ─────────────────────────────────────────────────
//  Add Gemstone
// ─────────────────────────────────────────────────
const addGemstone = async (req, res) => {
  try {
    const { code, quantity, name, weight, price_per_carat, total_price, remark, shape } = req.body;
    const image = req.file ? req.file.path : null;

    if (!code || !weight || !price_per_carat || !total_price) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const formattedWeight        = round2(weight);
    const formattedPricePerCarat = round2(price_per_carat);
    const formattedTotalPrice    = round2(total_price);

    const query = `
      INSERT INTO gemstones (code, quantity, name, weight, price_per_carat, total_price, image_url, remark, shape)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [
      code, quantity, name,
      formattedWeight, formattedPricePerCarat, formattedTotalPrice,
      image, remark, shape,
    ]);

    res.status(201).json({ message: 'Gemstone added successfully' });
  } catch (err) {
    console.error('Error inserting gemstone:', err);
    res.status(500).json({ message: 'Database error' });
  }
};

// ─────────────────────────────────────────────────
//  Get All Gemstones
// ─────────────────────────────────────────────────
const getAllGemstones = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM gemstones');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching gemstones:', err);
    res.status(500).json({ message: 'Database error' });
  }
};

// ─────────────────────────────────────────────────
//  Sell Gemstone
// ─────────────────────────────────────────────────
const sellGemstone = async (req, res) => {
  try {
    const { gemstone_id, quantity } = req.body;

    // Prices and weights are always stored to 2 decimals
    const carat_sold    = round2(req.body.carat_sold);
    const selling_price = round2(req.body.selling_price);
    const total_amount  = round2(req.body.total_amount);

    const [gemResults] = await db.execute('SELECT * FROM gemstones WHERE id = ?', [gemstone_id]);
    if (gemResults.length === 0) {
      return res.status(404).json({ message: 'Gemstone not found' });
    }

    const gem = gemResults[0];
    const remainingCarat    = round2(parseFloat(gem.weight) - carat_sold);
    const remainingQuantity = parseInt(gem.quantity) - parseInt(quantity);

    const [saleResult] = await db.execute(
      `INSERT INTO sales (gemstone_id, code, quantity, name, shape, carat_sold, marking_price, selling_price, total_amount, image_url, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gem.id, gem.code, quantity, gem.name, gem.shape,
        carat_sold, gem.price_per_carat, selling_price, total_amount,
        gem.image_url, gem.remark
      ]
    );

    const saleId = saleResult.insertId;

    // Generate invoice. A PDF failure must not roll back the sale or block
    // the stock update, so it is handled separately from the core sale logic.
    let filename = null;
    try {
      filename = await generateInvoicePDF({
        saleId,
        code:          gem.code,
        name:          gem.name,
        shape:         gem.shape,
        quantity,
        carat_sold,
        selling_price,
        total_amount,
        marking_price: gem.price_per_carat,
        remark:        gem.remark,
      });
    } catch (invoiceErr) {
      console.error('Invoice generation failed (sale still recorded):', invoiceErr);
    }

    // Update or remove stock
    if (remainingCarat <= 0 || remainingQuantity <= 0) {
      await db.execute('DELETE FROM gemstones WHERE id = ?', [gem.id]);
    } else {
      const newTotal = round2(remainingCarat * parseFloat(gem.price_per_carat));
      await db.execute(
        'UPDATE gemstones SET weight = ?, quantity = ?, total_price = ? WHERE id = ?',
        [remainingCarat, remainingQuantity, newTotal, gem.id]
      );
    }

    res.status(200).json({ message: 'Sale successful', invoice: filename });
  } catch (err) {
    console.error('Error processing sale:', err);
    res.status(500).json({ message: 'Sale failed' });
  }
};

// ─────────────────────────────────────────────────
//  Update Gemstone
// ─────────────────────────────────────────────────
const updateGemstone = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code, quantity, name, remark, shape
    } = req.body;

    const weight          = round2(req.body.weight);
    const price_per_carat = round2(req.body.price_per_carat);
    const total_price     = round2(req.body.total_price);

    const newImage = req.file ? req.file.path : null;
    const fields = [code, quantity, name, weight, price_per_carat, total_price, remark, shape];

    let query = `
      UPDATE gemstones
      SET code = ?, quantity = ?, name = ?, weight = ?, price_per_carat = ?, total_price = ?, remark = ?, shape = ?
    `;

    if (newImage) {
      query += `, image_url = ?`;
      fields.push(newImage);
    }

    query += ` WHERE id = ?`;
    fields.push(id);

    await db.execute(query, fields);
    res.status(200).json({ message: 'Gemstone updated successfully' });
  } catch (err) {
    console.error('Error updating gemstone:', err);
    res.status(500).json({ message: 'Database error' });
  }
};

// ─────────────────────────────────────────────────
//  Delete Gemstone
// ─────────────────────────────────────────────────
const deleteGemstone = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM gemstones WHERE id = ?', [id]);
    res.status(200).json({ message: 'Gemstone deleted successfully' });
  } catch (err) {
    console.error('Error deleting gemstone:', err);
    res.status(500).json({ message: 'Database error' });
  }
};

// ─────────────────────────────────────────────────
//  Search Gemstones
// ─────────────────────────────────────────────────
const searchGemstones = async (req, res) => {
  const { query } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT * FROM gemstones
       WHERE weight LIKE ? OR name LIKE ? OR code LIKE ? OR shape LIKE ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    );
    res.json(rows);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

// ─────────────────────────────────────────────────
//  Sell MULTIPLE gemstones on one invoice
//
//  The client often sells several stones to the same buyer at once and wants a
//  single invoice listing all of them, instead of one PDF per stone.
//
//  DATA MODEL
//    `sales` still gets ONE ROW PER GEMSTONE — unchanged. The rows are tied
//    together by the new `sales.invoice_id` pointing at a row in `invoices`.
//    Every existing query over `sales` (history table, statement PDF,
//    dashboard revenue) therefore keeps working with no modification.
//
//  SAFETY
//    * The WHOLE sale is one transaction: all stones locked, all sales rows
//      inserted, all stock updated — or nothing at all. A failure halfway
//      through can never leave stock deducted without a sale recorded.
//    * Stones are locked in ascending id order so two concurrent multi-sales
//      cannot deadlock against each other.
//    * Stock is validated before anything is written, so the client cannot
//      oversell a stone.
//    * The PDF is generated AFTER commit and is non-fatal — a PDF failure
//      never rolls back a completed sale, matching the single-sale behaviour.
// ─────────────────────────────────────────────────
const sellMultipleGemstones = async (req, res) => {
  const { items } = req.body;

  // ── Validate the payload before touching the database ──
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Select at least one gemstone to sell' });
  }
  if (items.length > 100) {
    return res.status(400).json({ message: 'Too many items in one invoice (max 100)' });
  }

  const cleaned = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const gemstoneId   = Number(it.gemstone_id);
    const quantity     = Number(it.quantity);
    const caratSold    = round2(it.carat_sold);
    const sellingPrice = round2(it.selling_price);
    const totalAmount  = round2(it.total_amount);

    if (!Number.isInteger(gemstoneId) || gemstoneId <= 0) {
      return res.status(400).json({ message: `Item ${i + 1}: invalid gemstone` });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: `Item ${i + 1}: quantity must be a whole number above 0` });
    }
    if (!(caratSold > 0)) {
      return res.status(400).json({ message: `Item ${i + 1}: carat sold must be above 0` });
    }
    if (!(sellingPrice >= 0) || !(totalAmount >= 0)) {
      return res.status(400).json({ message: `Item ${i + 1}: price and total must be 0 or more` });
    }
    cleaned.push({ gemstoneId, quantity, caratSold, sellingPrice, totalAmount });
  }

  // The same stone twice in one invoice would double-deduct in a confusing
  // way. Reject it rather than silently merging the lines.
  const ids = cleaned.map((c) => c.gemstoneId);
  if (new Set(ids).size !== ids.length) {
    return res.status(400).json({ message: 'The same gemstone appears more than once — combine it into a single line' });
  }

  let conn;
  let committed = false;
  let invoiceId;
  let invoiceNumber;
  let pdfItems = [];

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Lock every stone up front, in ascending id order to avoid deadlocks
    const orderedIds = [...ids].sort((a, b) => a - b);
    const placeholders = orderedIds.map(() => '?').join(',');
    const [gemRows] = await conn.query(
      `SELECT * FROM gemstones WHERE id IN (${placeholders}) ORDER BY id ASC FOR UPDATE`,
      orderedIds
    );

    const gemById = new Map(gemRows.map((g) => [Number(g.id), g]));

    // ── Validate availability before writing anything ──
    for (const line of cleaned) {
      const gem = gemById.get(line.gemstoneId);
      if (!gem) {
        await conn.rollback();
        return res.status(404).json({ message: `Gemstone #${line.gemstoneId} no longer exists — refresh and try again` });
      }
      const availQty   = parseInt(gem.quantity, 10);
      const availCarat = parseFloat(gem.weight);

      if (line.quantity > availQty) {
        await conn.rollback();
        return res.status(409).json({
          message: `${gem.code} (${gem.name}): only ${availQty} pcs in stock, tried to sell ${line.quantity}`,
        });
      }
      if (line.caratSold > availCarat + 1e-9) {
        await conn.rollback();
        return res.status(409).json({
          message: `${gem.code} (${gem.name}): only ${availCarat.toFixed(2)} ct in stock, tried to sell ${line.caratSold.toFixed(2)} ct`,
        });
      }
    }

    // ── Invoice header ──
    const totals = cleaned.reduce((acc, l) => ({
      quantity: acc.quantity + l.quantity,
      carat:    acc.carat    + l.caratSold,
      amount:   acc.amount   + l.totalAmount,
    }), { quantity: 0, carat: 0, amount: 0 });

    // invoice_number is derived from the auto-increment id, so insert with a
    // short unique placeholder first and set the real number immediately after.
    const tempNumber = `TMP-${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [invRes] = await conn.execute(
      `INSERT INTO invoices (invoice_number, item_count, total_quantity, total_carat, total_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [tempNumber, cleaned.length, totals.quantity,
       parseFloat(totals.carat.toFixed(2)), parseFloat(totals.amount.toFixed(2))]
    );

    invoiceId     = invRes.insertId;
    invoiceNumber = `INV-${String(invoiceId).padStart(6, '0')}`;
    await conn.execute('UPDATE invoices SET invoice_number = ? WHERE id = ?', [invoiceNumber, invoiceId]);

    // ── Sales rows + stock updates ──
    for (const line of cleaned) {
      const gem = gemById.get(line.gemstoneId);

      await conn.execute(
        `INSERT INTO sales
           (gemstone_id, invoice_id, code, quantity, name, shape, carat_sold,
            marking_price, selling_price, total_amount, image_url, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gem.id, invoiceId, gem.code, line.quantity, gem.name, gem.shape,
          line.caratSold, gem.price_per_carat, line.sellingPrice, line.totalAmount,
          gem.image_url, gem.remark,
        ]
      );

      const remainingCarat = parseFloat((parseFloat(gem.weight) - line.caratSold).toFixed(2));
      const remainingQty   = parseInt(gem.quantity, 10) - line.quantity;

      if (remainingCarat <= 0 || remainingQty <= 0) {
        await conn.execute('DELETE FROM gemstones WHERE id = ?', [gem.id]);
      } else {
        const newTotal = parseFloat((remainingCarat * parseFloat(gem.price_per_carat)).toFixed(2));
        await conn.execute(
          'UPDATE gemstones SET weight = ?, quantity = ?, total_price = ? WHERE id = ?',
          [remainingCarat, remainingQty, newTotal, gem.id]
        );
      }

      pdfItems.push({
        code:          gem.code,
        name:          gem.name,
        shape:         gem.shape,
        quantity:      line.quantity,
        carat_sold:    line.caratSold,
        selling_price: line.sellingPrice,
        total_amount:  line.totalAmount,
        marking_price: gem.price_per_carat,
        remark:        gem.remark,
      });
    }

    await conn.commit();
    committed = true;
  } catch (err) {
    if (conn && !committed) {
      try { await conn.rollback(); } catch (rbErr) {
        console.error('Rollback failed after multi-sale error:', rbErr);
      }
    }
    console.error('Error processing multi-gemstone sale:', err);

    if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR')) {
      return res.status(500).json({
        message: 'Invoice tables are missing — run migration 002_create_invoices.sql',
      });
    }
    return res.status(500).json({ message: 'Sale failed — nothing was changed' });
  } finally {
    if (conn) conn.release();
  }

  // ── PDF: after commit, and never fatal ──
  let filename = null;
  try {
    filename = await generateCombinedInvoicePDF({
      invoiceNumber,
      items: pdfItems,
      createdAt: new Date(),
    });
    await db.execute('UPDATE invoices SET pdf_filename = ? WHERE id = ?', [filename, invoiceId]);
  } catch (pdfErr) {
    console.error('Combined invoice PDF failed (sale still recorded):', pdfErr);
  }

  res.status(200).json({
    message: 'Sale successful',
    invoice_id:     invoiceId,
    invoice_number: invoiceNumber,
    invoice:        filename,
    item_count:     pdfItems.length,
  });
};

// ─────────────────────────────────────────────────
//  Add More Stock to an existing gemstone
//
//  The client buys the same gemstone again at the SAME price per carat and
//  just needs the quantity/carat topped up. Doing this through Edit forced
//  him to work out the new totals by hand, so this endpoint does the
//  arithmetic instead.
//
//  Data-safety rules enforced here:
//    * price_per_carat is NEVER changed — it is read from the existing row
//      and used only to recompute total_price.
//    * The UPDATE lists exactly three columns. image_url, code, name, shape
//      and remark cannot be modified by this route, so a top-up can never
//      wipe an uploaded image or rename a stone.
//    * The read and the write happen inside one transaction with
//      SELECT ... FOR UPDATE, so two concurrent top-ups (or a top-up racing
//      a sale) cannot lose an addition.
//    * A before/after snapshot is written to stock_additions in the same
//      transaction — either both land or neither does.
// ─────────────────────────────────────────────────
const addStock = async (req, res) => {
  const { id } = req.params;
  const { quantity_added, carat_added } = req.body;

  // ── Validate input before opening a connection ──
  const qtyAdd  = Number(quantity_added);
  const caratIn = Number(carat_added);

  if (!Number.isInteger(qtyAdd) || qtyAdd < 0) {
    return res.status(400).json({ message: 'Quantity to add must be a whole number of 0 or more' });
  }
  if (!Number.isFinite(caratIn) || caratIn < 0) {
    return res.status(400).json({ message: 'Carat to add must be 0 or more' });
  }

  // Carat is stored to 2 decimals everywhere in this app. Normalise the input
  // to 2 decimals up front so the amount written to the history row is exactly
  // the amount added to the stone's weight — they can never disagree.
  const caratAdd = parseFloat(caratIn.toFixed(2));

  if (qtyAdd === 0 && caratAdd === 0) {
    return res.status(400).json({ message: 'Nothing to add — enter a quantity or a carat weight' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Lock the row for the duration of the transaction
    const [rows] = await conn.execute('SELECT * FROM gemstones WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Gemstone not found' });
    }

    const gem = rows[0];

    // Existing values — the price is carried over untouched
    const pricePerCarat = parseFloat(gem.price_per_carat);
    const qtyBefore     = parseInt(gem.quantity, 10);
    const weightBefore  = parseFloat(gem.weight);
    const totalBefore   = parseFloat(gem.total_price);

    if (!Number.isFinite(pricePerCarat) || !Number.isFinite(weightBefore) || !Number.isInteger(qtyBefore)) {
      await conn.rollback();
      return res.status(409).json({ message: 'Gemstone record has invalid stock values — fix it via Edit first' });
    }

    // New values. total_price is kept consistent with the invariant used
    // everywhere else in the app: total_price = weight * price_per_carat.
    const qtyAfter    = qtyBefore + qtyAdd;
    const weightAfter = parseFloat((weightBefore + caratAdd).toFixed(2));
    const totalAfter  = parseFloat((weightAfter * pricePerCarat).toFixed(2));
    const cost        = parseFloat((caratAdd * pricePerCarat).toFixed(2));

    await conn.execute(
      'UPDATE gemstones SET quantity = ?, weight = ?, total_price = ? WHERE id = ?',
      [qtyAfter, weightAfter, totalAfter, gem.id]
    );

    await conn.execute(
      `INSERT INTO stock_additions
         (gemstone_id, code, name, quantity_added, carat_added, price_per_carat, cost,
          quantity_before, weight_before, total_price_before,
          quantity_after,  weight_after,  total_price_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gem.id, gem.code, gem.name, qtyAdd, caratAdd, pricePerCarat, cost,
        qtyBefore, weightBefore, totalBefore,
        qtyAfter,  weightAfter,  totalAfter,
      ]
    );

    await conn.commit();

    res.status(200).json({
      message: 'Stock added successfully',
      gemstone: {
        id:              gem.id,
        code:            gem.code,
        name:            gem.name,
        quantity:        qtyAfter,
        weight:          weightAfter,
        price_per_carat: pricePerCarat,
        total_price:     totalAfter,
      },
      added: { quantity_added: qtyAdd, carat_added: caratAdd, cost },
    });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (rollbackErr) {
        console.error('Rollback failed after add-stock error:', rollbackErr);
      }
    }
    console.error('Error adding stock:', err);

    // Most likely cause on a fresh deploy: migration 001 has not been run.
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message: 'Stock history table is missing — run migration 001_create_stock_additions.sql',
      });
    }
    res.status(500).json({ message: 'Failed to add stock' });
  } finally {
    if (conn) conn.release();
  }
};

// ─────────────────────────────────────────────────
//  Stock addition history for one gemstone (read-only)
// ─────────────────────────────────────────────────
const getStockHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      'SELECT * FROM stock_additions WHERE gemstone_id = ? ORDER BY added_at DESC, id DESC',
      [id]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching stock history:', err);
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message: 'Stock history table is missing — run migration 001_create_stock_additions.sql',
      });
    }
    res.status(500).json({ message: 'Database error' });
  }
};

// ─────────────────────────────────────────────────
//  Download Stock Summary Report
// ─────────────────────────────────────────────────
const downloadStockSummary = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM gemstones ORDER BY name ASC');
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No gemstones in stock' });
    }
    generateStockSummaryPDF(res, rows);
  } catch (err) {
    console.error('Error generating stock summary:', err);
    res.status(500).json({ message: 'Failed to generate report' });
  }
};

module.exports = {
  addGemstone,
  getAllGemstones,
  sellGemstone,
  updateGemstone,
  deleteGemstone,
  searchGemstones,
  downloadStockSummary,
  addStock,
  getStockHistory,
  sellMultipleGemstones,
};
