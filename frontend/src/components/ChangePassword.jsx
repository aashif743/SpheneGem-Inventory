import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Alert
} from '@mui/material';
import axios from 'axios';

const ChangePassword = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('https://sphenegem-stock-production.up.railway.app/api/auth/change-password', form, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage({ text: res.data.message, severity: 'success' });
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Error', severity: 'error' });
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 400, mx: 'auto', mt: 10, p: 4 }}>
      <Typography variant="h6" mb={2}>Change Password</Typography>
      {message.text && <Alert severity={message.severity}>{message.text}</Alert>}
      <Box component="form" onSubmit={handleSubmit}>
        <TextField fullWidth label="Current Password" name="currentPassword" type="password" value={form.currentPassword} onChange={handleChange} sx={{ mb: 2 }} />
        <TextField fullWidth label="New Password" name="newPassword" type="password" value={form.newPassword} onChange={handleChange} sx={{ mb: 2 }} />
        <Button type="submit" variant="contained" fullWidth>Change Password</Button>
      </Box>
    </Paper>
  );
};

export default ChangePassword;
