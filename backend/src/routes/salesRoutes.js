const express = require('express');
const router = express.Router();
const db = require('../models/db');
const moment = require('moment');
const generateSalesStatementPDF = require('../utils/generateStatementPDF');

// ✅ Get all sold gemstones
router.get('/', async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM sales ORDER BY sold_at DESC');
    res.json(results);
  } catch (err) {
    console.error('Failed to fetch sales:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Delete a sale by ID
router.delete('/:id', async (req, res) => {
  const saleId = req.params.id;

  try {
    const [result] = await db.execute('DELETE FROM sales WHERE id = ?', [saleId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.status(200).json({ message: 'Sale deleted successfully' });
  } catch (err) {
    console.error('Failed to delete sale:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Download sales statement PDF by range
router.get('/download-statement/:range', async (req, res) => {
  const { range } = req.params;
  const now = moment();

  let startDate, endDate;

  switch (range) {
    case 'last-month':
      startDate = now.clone().subtract(1, 'months').startOf('month');
      endDate = now.clone().subtract(1, 'months').endOf('month');
      break;
    case 'last-6-months':
      startDate = now.clone().subtract(6, 'months').startOf('month');
      endDate = now.clone().endOf('month');
      break;
    case 'last-year':
      startDate = now.clone().subtract(1, 'years').startOf('year');
      endDate = now.clone().endOf('year');
      break;
    default:
      startDate = moment('2000-01-01');
      endDate = now;
  }

  try {
    const [sales] = await db.execute(
      'SELECT * FROM sales WHERE sold_at BETWEEN ? AND ? ORDER BY sold_at ASC',
      [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );

    generateSalesStatementPDF(res, sales, startDate, endDate, range);
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).send('Failed to generate statement');
  }
});

module.exports = router;
