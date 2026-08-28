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
  addStock,
  getStockHistory,
  sellMultipleGemstones,
} = require('../controllers/gemstoneController');
const upload = require('../multerCloudinary'); // this uploads to Cloudinary

// Route: Add Gemstone
router.post('/add', upload.single('image'), addGemstone);

// Route: Get All Gemstones
router.get('/all', getAllGemstones);

// Route: Sell Gemstone (single — kept unchanged for backward compatibility
// with any already-installed mobile build still calling it)
router.post('/sell', sellGemstone);

// Route: Sell several gemstones together on ONE invoice
router.post('/sell-multiple', sellMultipleGemstones);

// ✅ Route: Update Gemstone (with image upload support)
router.put('/:id', upload.single('image'), updateGemstone);

// Route: Add More Stock to an existing gemstone (JSON body, no file upload —
// deliberately NOT behind multer so this route can never alter the image)
router.patch('/:id/add-stock', addStock);

// Route: Stock addition history for one gemstone
router.get('/:id/stock-history', getStockHistory);

// Route: Delete Gemstone
router.delete('/:id', deleteGemstone);

// Route: Search Gemstones
router.get('/search', searchGemstones);

// Route: Download Stock Summary Report
router.get('/summary-report', downloadStockSummary);

module.exports = router;
