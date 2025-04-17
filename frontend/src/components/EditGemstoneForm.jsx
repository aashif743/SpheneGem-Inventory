import React, { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';

const EditGemstoneForm = ({
  gemstone,
  onClose,
  onUpdated,
  setSnackbarMessage,
  setSnackbarSeverity,
  setShowSnackbar,
}) => {
  const [form, setForm] = useState({ ...gemstone });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`https://sphenegem-inventory.onrender.com/api/gemstones/${form.id}`, form);
      onUpdated();
      onClose();

      setSnackbarMessage?.('Gemstone updated successfully!');
      setSnackbarSeverity?.('success');
      setShowSnackbar?.(true);
    } catch (err) {
      console.error(err);
      setSnackbarMessage?.('Failed to update gemstone!');
      setSnackbarSeverity?.('error');
      setShowSnackbar?.(true);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        ✏️ Edit Gemstone: {gemstone.code}
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
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
          <Grid item xs={12} sm={6}>
            <TextField
              name="weight"
              label="Weight (Carat)"
              type="number"
              fullWidth
              required
              value={form.weight}
              onChange={handleChange}
              inputProps={{ step: '0.01' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="price_per_carat"
              label="Price per Carat"
              type="number"
              fullWidth
              required
              value={form.price_per_carat}
              onChange={handleChange}
              inputProps={{ step: '0.01' }}
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
              label="Remark"
              fullWidth
              multiline
              minRows={2}
              value={form.remark}
              onChange={handleChange}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button onClick={onClose} sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Update
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default EditGemstoneForm;
