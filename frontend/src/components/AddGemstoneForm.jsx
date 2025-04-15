import React, { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import { addGemstone } from '../services/gemstoneService';

const AddGemstoneForm = ({
  onClose,
  onAdded,
  setSnackbarMessage,
  setSnackbarSeverity,
  setShowSnackbar,
}) => {
  const [form, setForm] = useState({
    code: '',
    quantity: '',
    name: '',
    weight: '',
    price_per_carat: '',
    total_price: '',
    remark: '',
    image: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newForm = { ...form, [name]: value };

    if (name === 'weight' || name === 'price_per_carat') {
      const weight = parseFloat(name === 'weight' ? value : form.weight);
      const price = parseFloat(name === 'price_per_carat' ? value : form.price_per_carat);
      if (!isNaN(weight) && !isNaN(price)) {
        newForm.total_price = (weight * price).toFixed(2);
      }
    }

    setForm(newForm);
  };

  const handleFileChange = (e) => {
    setForm({ ...form, image: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      await addGemstone(formData);
      onAdded?.();
      onClose?.();

      setSnackbarMessage?.('Gemstone added successfully!');
      setSnackbarSeverity?.('success');
      setShowSnackbar?.(true);

      setForm({
        code: '',
        quantity: '',
        name: '',
        weight: '',
        price_per_carat: '',
        total_price: '',
        remark: '',
        image: null,
      });
    } catch (err) {
      console.error(err);
      setSnackbarMessage?.('Failed to add gemstone');
      setSnackbarSeverity?.('error');
      setShowSnackbar?.(true);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 4 }, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        ➕ Add New Gemstone
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="code"
              label="Code"
              fullWidth
              required
              value={form.code}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="quantity"
              label="Quantity"
              type="number"
              fullWidth
              required
              value={form.quantity}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Name (optional)"
              fullWidth
              value={form.name}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="weight"
              label="Weight (Carat)"
              type="number"
              inputProps={{ step: '0.01' }}
              fullWidth
              required
              value={form.weight}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="price_per_carat"
              label="Price per Carat"
              type="number"
              inputProps={{ step: '0.01' }}
              fullWidth
              required
              value={form.price_per_carat}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="total_price"
              label="Total Price"
              type="number"
              fullWidth
              value={form.total_price}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="remark"
              label="Remark (optional)"
              fullWidth
              multiline
              minRows={2}
              value={form.remark}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" component="label">
              Upload Image
              <input type="file" accept="image/*" hidden onChange={handleFileChange} />
            </Button>
            {form.image && (
              <Typography variant="caption" sx={{ ml: 2 }}>
                {form.image.name}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Add Gemstone
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default AddGemstoneForm;
