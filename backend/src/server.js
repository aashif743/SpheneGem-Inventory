const express = require('express');
const cors = require('cors'); 
const path = require('path');
require('dotenv').config();
const db = require('./models/db');

const salesRoutes = require('./routes/salesRoutes');
const gemstoneRoutes = require('./routes/gemstoneRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// CORS — allow local dev + production frontend
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://lightcoral-otter-280862.hostingersite.com',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve invoices
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

// API Routes
app.use('/api/gemstones', gemstoneRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/invoices', invoiceRoutes);

// ✅ Add auth routes
app.use('/api/auth', authRoutes); // <-- ✅ This enables /api/auth/login

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
