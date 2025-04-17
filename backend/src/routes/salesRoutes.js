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

// Delete a sale by ID
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

module.exports = router;


