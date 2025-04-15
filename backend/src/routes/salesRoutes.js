const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Get all sold gemstones
router.get('/', async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM sales ORDER BY sold_at DESC');
    res.json(results);
  } catch (err) {
    console.error('Failed to fetch sales:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;

