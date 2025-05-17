import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Alert
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value.trimStart() });
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`,
        form
      );
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard'); // protected route
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid username or password');
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 400, mx: 'auto', mt: 10, p: 4 }}>
      <Typography variant="h6" mb={2} align="center">Admin Login</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth label="Username" name="username"
          value={form.username} onChange={handleChange}
          sx={{ mb: 2 }} required autoComplete="username"
        />
        <TextField
          fullWidth label="Password" name="password" type="password"
          value={form.password} onChange={handleChange}
          sx={{ mb: 2 }} required autoComplete="current-password"
        />
        <Button type="submit" variant="contained" fullWidth>
          Login
        </Button>
      </Box>
    </Paper>
  );
};

export default Login;
