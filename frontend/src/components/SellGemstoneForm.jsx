import React, { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';

const SellGemstoneForm = ({
  gemstone,
  onClose,
  onSold,
  setSnackbarMessage,
  setSnackbarSeverity,
  setShowSnackbar,
}) => {
  const [caratSold, setCaratSold] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'caratSold') setCaratSold(value);
    else if (name === 'sellingPrice') setSellingPrice(value);
    else if (name === 'quantity') setQuantity(value);

    const weight = parseFloat(name === 'caratSold' ? value : caratSold);
    const price = parseFloat(name === 'sellingPrice' ? value : sellingPrice);

    if (!isNaN(weight) && !isNaN(price)) {
      setTotalAmount((weight * price).toFixed(2));
    }
  };

  const handleSell = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:5000/api/gemstones/sell', {
        gemstone_id: gemstone.id,
        code: gemstone.code,
        name: gemstone.name,
        carat_sold: caratSold,
        price_per_carat: gemstone.price_per_carat,
        marking_price: gemstone.total_price,
        selling_price: sellingPrice,
        total_price: totalAmount,
        quantity: quantity,
        remark: gemstone.remark,
        sold_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });

      setSnackbarMessage?.('💰 Gemstone sold successfully!');
      setSnackbarSeverity?.('success');
      setShowSnackbar?.(true);

      // Optional: Auto-download invoice
      if (response.data.invoice) {
        const invoiceFile = response.data.invoice;
        const link = document.createElement('a');
        link.href = `http://localhost:5000/invoices/${invoiceFile}`;
        link.download = invoiceFile;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      onSold?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setSnackbarMessage?.('Failed to sell gemstone!');
      setSnackbarSeverity?.('error');
      setShowSnackbar?.(true);
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="h6" gutterBottom>
        💎 Sell Gemstone: {gemstone.code}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Available: <strong>{gemstone.weight}</strong> carat
      </Typography>

      <Box component="form" onSubmit={handleSell}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              name="quantity"
              label="Quantity"
              type="number"
              fullWidth
              required
              value={quantity}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="caratSold"
              label="Carat Sold"
              type="number"
              fullWidth
              required
              value={caratSold}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="sellingPrice"
              label="Selling Price per Carat"
              type="number"
              fullWidth
              required
              value={sellingPrice}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="totalAmount"
              label="Total Amount"
              type="text"
              fullWidth
              value={totalAmount}
              InputProps={{ readOnly: true }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="success">
            Sell
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SellGemstoneForm;
