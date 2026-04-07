// routes/invoices.js

const express = require('express');
const router = express.Router();
const moment = require('moment');
const db = require('../models/db');
const generateStatementPDF = require('../utils/generateStatementPDF'); // Adjust path if needed

// GET /invoices/statement?range=month|six_months|year
router.get('/statement', async (req, res) => {
  const { range } = req.query;

  let startDate;
  const endDate = moment();

  switch (range) {
    case 'month':
      startDate = moment().subtract(1, 'months');
      break;
    case 'six_months':
      startDate = moment().subtract(6, 'months');
      break;
    case 'year':
      startDate = moment().subtract(1, 'years');
      break;
    default:
      startDate = moment('1970-01-01');
  }

  try {
    const [sales] = await db.query(
      `SELECT * FROM sales WHERE sold_at BETWEEN ? AND ? ORDER BY sold_at DESC`,
      [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );

    // Use your custom PDF generator
    generateStatementPDF(res, sales, startDate, endDate, range);
  } catch (err) {
    console.error('Error generating sales statement PDF:', err);
    res.status(500).send('Error generating PDF');
  }
});

module.exports = router;
