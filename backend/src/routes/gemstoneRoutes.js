const express = require('express');
const router = express.Router();
const {
  addGemstone,
  getAllGemstones,
  sellGemstone,
  updateGemstone,
  deleteGemstone,
  searchGemstones,
  downloadStockSummary,
} = require('../controllers/gemstoneController');
const upload = require('../multerCloudinary'); // this uploads to Cloudinary

// Route: Add Gemstone
router.post('/add', upload.single('image'), addGemstone);

// Route: Get All Gemstones
router.get('/all', getAllGemstones);

// Route: Sell Gemstone
router.post('/sell', sellGemstone);

// ✅ Route: Update Gemstone (with image upload support)
router.put('/:id', upload.single('image'), updateGemstone);

// Route: Delete Gemstone
router.delete('/:id', deleteGemstone);

// Route: Search Gemstones
router.get('/search', searchGemstones);

// Route: Download Stock Summary Report
router.get('/summary-report', downloadStockSummary);

module.exports = router;
