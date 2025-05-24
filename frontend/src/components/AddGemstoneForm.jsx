import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import { addGemstone } from '../services/gemstoneService';
import imageCompression from 'browser-image-compression';

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
    shape: '',
    remark: '',
    image: null,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const fieldRefs = useRef([]);

  const handleChange = (e, index) => {
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

    // If Enter is pressed, move to next input
    const handleEnter = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (index + 1 < fieldRefs.current.length) {
          fieldRefs.current[index + 1]?.focus();
        } else {
          fileInputRef.current?.click();
        }
      }
    };
    e.target.onkeydown = handleEnter;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });
        setForm({ ...form, image: compressed });
        setImagePreview(URL.createObjectURL(compressed));
      } catch (err) {
        console.error('Image compression failed', err);
      }
    }
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
        shape: '',
        remark: '',
        image: null,
      });
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      setSnackbarMessage?.('Failed to add gemstone');
      setSnackbarSeverity?.('error');
      setShowSnackbar?.(true);
    }
  };

  const inputFields = [
    { name: 'code', label: 'Code', required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    { name: 'name', label: 'Name (optional)' },
    { name: 'weight', label: 'Weight (Carat)', type: 'number', required: true, step: '0.01' },
    { name: 'price_per_carat', label: 'Price per Carat', type: 'number', required: true, step: '0.01' },
    { name: 'shape', label: 'Shape' },
    { name: 'remark', label: 'Remark (optional)', multiline: true },
  ];

  return (
    <Paper sx={{ p: { xs: 2, sm: 4 }, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        ➕ Add New Gemstone
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2}>
          {inputFields.map((field, index) => (
            <Grid item xs={12} sm={field.fullWidth === false ? 6 : 12} key={field.name}>
              <TextField
                {...field}
                fullWidth
                value={form[field.name]}
                name={field.name}
                onChange={(e) => handleChange(e, index)}
                inputRef={(el) => (fieldRefs.current[index] = el)}
                type={field.type || 'text'}
                inputProps={field.step ? { step: field.step } : {}}
                multiline={field.multiline}
                minRows={field.multiline ? 2 : undefined}
              />
            </Grid>
          ))}

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
            <Button
              variant="outlined"
              component="label"
              color="secondary"
              fullWidth
            >
              Upload Image
              <input
                name="image"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            {imagePreview && (
              <Box mt={1}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: 200, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </Box>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button
              onClick={onClose}
              variant="outlined"
              color="primary"
              fullWidth
            >
              Cancel
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
            >
              Add Gemstone
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default AddGemstoneForm;
