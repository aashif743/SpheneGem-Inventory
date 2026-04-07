const db = require('../models/db');

const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard data...');

    // 1. Total Gemstones (SUM of quantity)
    const [gemstoneCountRows] = await db.execute('SELECT SUM(quantity) AS totalGemstones FROM gemstones');

    // 2. Total Carat in Stock (SUM of weight)
    const [caratSumRows] = await db.execute('SELECT SUM(weight) AS totalCarat FROM gemstones');

    // 3. Total Sales Count
    const [salesCountRows] = await db.execute('SELECT COUNT(*) AS totalSales FROM sales');

    // 4. Total Revenue
    const [revenueRows] = await db.execute('SELECT SUM(total_amount) AS totalRevenue FROM sales');

    // 5. Monthly Gemstones Added
    const [monthlyGemstonesRows] = await db.execute(`
      SELECT DATE_FORMAT(created_at, '%b %Y') AS month, COUNT(*) AS count
      FROM gemstones
      GROUP BY month
      ORDER BY STR_TO_DATE(CONCAT('01 ', month), '%d %b %Y')
    `);

    // 6. Revenue by Gemstone Name
    const [revenueByGemstoneRows] = await db.execute(`
      SELECT g.name, SUM(s.total_amount) AS total_revenue
      FROM sales s
      JOIN gemstones g ON s.gemstone_id = g.id
      GROUP BY g.name
    `);

    // Format and respond
    const data = {
      totalGemstones: gemstoneCountRows[0]?.totalGemstones || 0,
      totalCarat: Math.round(caratSumRows[0]?.totalCarat || 0),
      totalSales: salesCountRows[0]?.totalSales || 0,
      totalRevenue: Math.round(revenueRows[0]?.totalRevenue || 0),
      monthlyGemstones: monthlyGemstonesRows || [],
      revenueByGemstone: revenueByGemstoneRows || [],
    };

    console.log('✅ Dashboard data:', data);
    res.json(data);
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

module.exports = {
  getDashboardStats,
};
