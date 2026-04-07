const db = require('../models/db');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const generateStockSummaryPDF = require('../utils/generateStockSummaryPDF');

// ─────────────────────────────────────────────────
//  Logo path (shared by all PDF generators)
// ─────────────────────────────────────────────────
const LOGO_PATH = path.join(__dirname, '../public/Sphene.png');

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
    const filePath = path.join(__dirname, '../invoices', filename);
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

    const formattedWeight        = parseFloat(parseFloat(weight).toFixed(2));
    const formattedPricePerCarat = parseFloat(parseFloat(price_per_carat).toFixed(2));
    const formattedTotalPrice    = parseFloat(parseFloat(total_price).toFixed(2));

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
    const { gemstone_id, quantity, carat_sold, selling_price, total_amount } = req.body;

    const [gemResults] = await db.execute('SELECT * FROM gemstones WHERE id = ?', [gemstone_id]);
    if (gemResults.length === 0) {
      return res.status(404).json({ message: 'Gemstone not found' });
    }

    const gem = gemResults[0];
    const remainingCarat    = parseFloat(gem.weight) - parseFloat(carat_sold);
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

    // Generate invoice and wait for it to finish before responding
    const filename = await generateInvoicePDF({
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

    // Update or remove stock
    if (remainingCarat <= 0 || remainingQuantity <= 0) {
      await db.execute('DELETE FROM gemstones WHERE id = ?', [gem.id]);
    } else {
      const newTotal = (remainingCarat * gem.price_per_carat).toFixed(2);
      await db.execute(
        'UPDATE gemstones SET weight = ?, quantity = ?, total_price = ? WHERE id = ?',
        [remainingCarat.toFixed(2), remainingQuantity, newTotal, gem.id]
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

    const weight         = parseFloat(req.body.weight).toFixed(2);
    const price_per_carat = parseFloat(req.body.price_per_carat).toFixed(2);
    const total_price    = parseFloat(req.body.total_price).toFixed(2);

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
};
