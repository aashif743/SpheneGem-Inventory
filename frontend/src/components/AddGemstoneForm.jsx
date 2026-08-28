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
import { limitDecimals, normaliseOnBlur } from '../utils/decimal';

// Fields that hold a price or a weight — always 2 decimal places
const DECIMAL_FIELDS = ['weight', 'price_per_carat'];

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
    const { name } = e.target;
    // Stop a third decimal from ever being typed into a price or weight
    const value = DECIMAL_FIELDS.includes(name)
      ? limitDecimals(e.target.value)
      : e.target.value;

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

  // `col` is the width in a 12-column grid — short fields sit two to a row so
  // the form reads as one compact card instead of a long stack.
  const inputFields = [
    { name: 'code', label: 'Code', required: true, col: 6 },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, col: 6 },
    { name: 'name', label: 'Name (optional)', col: 8 },
    { name: 'shape', label: 'Shape', col: 4 },
    { name: 'weight', label: 'Weight (Carat)', type: 'number', required: true, step: '0.01', col: 6 },
    { name: 'price_per_carat', label: 'Price per Carat', type: 'number', required: true, step: '0.01', col: 6 },
    { name: 'remark', label: 'Remark (optional)', multiline: true, col: 12 },
  ];

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3.5 }, maxWidth: 820, mx: 'auto', borderRadius: '16px' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="eyebrow" sx={{ display: 'block', color: 'secondary.main' }}>
          New Entry
        </Typography>
        <Typography variant="h5">Gemstone details</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Code, weight and price per carat are required. The total is worked out for you.
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2}>
          {inputFields.map((field, index) => (
            <Grid item xs={12} sm={field.col ?? 12} key={field.name}>
              <TextField
                label={field.label}
                type={field.type || 'text'}
                required={field.required}
                fullWidth
                value={form[field.name]}
                name={field.name}
                onChange={(e) => handleChange(e, index)}
                onBlur={
                  DECIMAL_FIELDS.includes(field.name)
                    ? (e) =>
                        handleChange(
                          { target: { name: field.name, value: normaliseOnBlur(e.target.value) } },
                          index
                        )
                    : undefined
                }
                inputRef={(el) => (fieldRefs.current[index] = el)}
                inputProps={field.step ? { step: field.step, min: 0 } : {}}
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
              helperText="Calculated automatically: weight × price per carat"
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
