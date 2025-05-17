const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise'); // adjust if you're using a different client

const seedAdmin = async () => {
  const db = await mysql.createConnection({
    host: 'srv1749.hstgr.io',
    user: 'u139665588_sphenegem',
    password: 'Sphenegem@007',
    database: 'u139665588_gem_inventory',
    connectTimeout: 20000,
  });

  const hashedPassword = await bcrypt.hash('admin123', 10); // replace 'admin123' with your desired password

  await db.execute(
    'INSERT INTO admin (username, password) VALUES (?, ?)',
    ['admin', hashedPassword]
  );

  console.log('Admin user seeded');
};

seedAdmin();
