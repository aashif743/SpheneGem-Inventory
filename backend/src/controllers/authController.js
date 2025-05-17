const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Login
const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await db.execute('SELECT * FROM admin WHERE username = ?', [username]);

    if (users.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    const admin = users[0];
    const match = await bcrypt.compare(password, admin.password);

    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
};

// Change Password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.admin.id;

  try {
    const [users] = await db.execute('SELECT * FROM admin WHERE id = ?', [adminId]);
    const admin = users[0];
    const match = await bcrypt.compare(currentPassword, admin.password);

    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE admin SET password = ? WHERE id = ?', [hashed, adminId]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error changing password' });
  }
};

module.exports = { login, changePassword };
