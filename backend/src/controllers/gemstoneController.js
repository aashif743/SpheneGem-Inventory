const db = require('../models/db');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Utility: Generate PDF Invoice
const generateInvoicePDF = (sale, callback) => {
  const doc = new PDFDocument();
  const filename = `invoice_${sale.saleId || Date.now()}.pdf`;
  const filePath = path.join(__dirname, '../invoices', filename);

  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text('💎 Gemstone Sale Invoice', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Gemstone Code: ${sale.code}`);
  doc.text(`Name: ${sale.name}`);
  doc.text(`Shape: ${sale.shape}`);
  doc.text(`Quantity: ${sale.quantity}`);
  doc.text(`Weight (Carat): ${sale.carat_sold}`);
  doc.text(`Price/Carat: ${sale.selling_price}`);
  doc.text(`Total Amount: ${sale.total_amount}`);
  doc.text(`Sold Date: ${new Date().toLocaleDateString()}`);

  doc.end();

  doc.on('finish', () => callback(filename));
};

// Add Gemstone
const addGemstone = async (req, res) => {
  try {
    const { code, quantity, name, weight, price_per_carat, total_price, remark, shape } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!code || !weight || !price_per_carat || !total_price) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const query = `
      INSERT INTO gemstones (code, quantity, name, weight, price_per_carat, total_price, image_url, remark, shape)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [code, quantity, name, weight, price_per_carat, total_price, image, remark, shape]);
    res.status(201).json({ message: 'Gemstone added successfully' });

  } catch (err) {
    console.error("Error inserting gemstone:", err);
    res.status(500).json({ message: 'Database error' });
  }
};

// Get All Gemstones
const getAllGemstones = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM gemstones');
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching gemstones:", err);
    res.status(500).json({ message: 'Database error' });
  }
};

// Sell Gemstone
const sellGemstone = async (req, res) => {
  try {
    const {
      gemstone_id,
      quantity,
      carat_sold,
      selling_price,
      total_amount,
    } = req.body;

    const [gemResults] = await db.execute('SELECT * FROM gemstones WHERE id = ?', [gemstone_id]);

    if (gemResults.length === 0) {
      return res.status(404).json({ message: 'Gemstone not found' });
    }

    const gem = gemResults[0];
    const remainingCarat = parseFloat(gem.weight) - parseFloat(carat_sold);
    const remainingQuantity = parseInt(gem.quantity) - parseInt(quantity);

    const insertSaleQuery = `
      INSERT INTO sales (gemstone_id, code, quantity, name, shape, carat_sold, marking_price, selling_price, total_amount, image_url, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [saleResult] = await db.execute(insertSaleQuery, [
      gem.id ?? null,
      gem.code ?? null,
      quantity ?? null,
      gem.name ?? null,
      gem.shape ?? null,
      carat_sold ?? null,
      gem.price_per_carat ?? null,
      selling_price ?? null,
      total_amount ?? null,
      gem.image_url ?? null,
      gem.remark ?? null
    ]);

    const saleId = saleResult.insertId;

    generateInvoicePDF({
      saleId,
      code: gem.code,
      name: gem.name,
      shape: gem.shape,
      quantity,
      carat_sold,
      selling_price,
      total_amount
    }, (filename) => {
      console.log(`Invoice saved: ${filename}`);
    });

    // Update or delete gemstone stock
    if (remainingCarat <= 0 || remainingQuantity <= 0) {
      await db.execute('DELETE FROM gemstones WHERE id = ?', [gem.id]);
    } else {
      const newTotal = remainingCarat * gem.price_per_carat;
      await db.execute(
        'UPDATE gemstones SET weight = ?, quantity = ?, total_price = ? WHERE id = ?',
        [remainingCarat, remainingQuantity, newTotal.toFixed(2), gem.id]
      );
    }

    res.status(200).json({ message: 'Sale successful', invoice: `invoice_${saleId}.pdf` });

  } catch (err) {
    console.error("Error processing sale:", err);
    res.status(500).json({ message: 'Sale failed' });
  }
};

// Update Gemstone
const updateGemstone = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, quantity, weight, price_per_carat, total_price, remark, shape } = req.body;

    const query = `
      UPDATE gemstones
      SET code = ?, quantity = ?, weight = ?, price_per_carat = ?, total_price = ?, remark = ?, shape = ?
      WHERE id = ?
    `;

    await db.execute(query, [code, quantity, weight, price_per_carat, total_price, remark, shape, id]);
    res.status(200).json({ message: 'Gemstone updated successfully' });

  } catch (err) {
    console.error("Error updating gemstone:", err);
    res.status(500).json({ message: 'Database error' });
  }
};

// Delete Gemstone
const deleteGemstone = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM gemstones WHERE id = ?', [id]);
    res.status(200).json({ message: 'Gemstone deleted successfully' });
  } catch (err) {
    console.error("Error deleting gemstone:", err);
    res.status(500).json({ message: 'Database error' });
  }
};

// Search Gemstones
const searchGemstones = async (req, res) => {
  const { query } = req.query;

  try {
    const [rows] = await db.execute(
      `SELECT * FROM gemstones 
       WHERE weight LIKE ? 
       OR name LIKE ? 
       OR code LIKE ?
       OR shape LIKE ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    );

    res.json(rows);
  } catch (error) {
    console.error('🔍 Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

module.exports = {
  addGemstone,
  getAllGemstones,
  sellGemstone,
  updateGemstone,
  deleteGemstone,
  searchGemstones
};
