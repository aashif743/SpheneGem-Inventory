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

    let updatedCarat = caratSold;
    let updatedPrice = sellingPrice;
    let updatedTotal = totalAmount;

    if (name === 'caratSold') {
      setCaratSold(value);
      updatedCarat = value;
    } else if (name === 'sellingPrice') {
      setSellingPrice(value);
      updatedPrice = value;
    } else if (name === 'totalAmount') {
      setTotalAmount(value);
      updatedTotal = value;
    } else if (name === 'quantity') {
      setQuantity(value);
    }

    const weight = parseFloat(updatedCarat);
    const price = parseFloat(updatedPrice);
    const total = parseFloat(updatedTotal);

    // Auto-calculate total if carat and price per carat are filled
    if (name === 'caratSold' || name === 'sellingPrice') {
      if (!isNaN(weight) && !isNaN(price)) {
        setTotalAmount((weight * price).toFixed(2));
      }
    }

    // Auto-calculate selling price if carat and total amount are filled
    if (name === 'caratSold' || name === 'totalAmount') {
      if (!isNaN(weight) && !isNaN(total) && weight > 0) {
        setSellingPrice((total / weight).toFixed(2));
      }
    }
  };

  const handleSell = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('https://sphenegem-inventory.onrender.com/api/gemstones/sell', {
        gemstone_id: gemstone.id,
        code: gemstone.code,
        name: gemstone.name,
        carat_sold: caratSold,
        price_per_carat: gemstone.price_per_carat,
        marking_price: gemstone.total_price,
        selling_price: sellingPrice,
        total_amount: totalAmount,
        quantity: quantity,
        remark: gemstone.remark,
        sold_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });

      setSnackbarMessage?.('💰 Gemstone sold successfully!');
      setSnackbarSeverity?.('success');
      setShowSnackbar?.(true);

      // Open invoice in a new browser tab
      if (response.data.invoice) {
        const invoiceFile = response.data.invoice;
        const invoiceUrl = `https://sphenegem-inventory.onrender.com/invoices/${invoiceFile}`;
        window.open(invoiceUrl, '_blank');
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
        Available: <strong>{parseFloat(gemstone.weight).toFixed(2)}</strong> carat
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
              type="number"
              fullWidth
              required
              value={totalAmount}
              onChange={handleChange}
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
