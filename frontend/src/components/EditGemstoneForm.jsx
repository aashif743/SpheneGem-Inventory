import React, { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  MenuItem
} from '@mui/material';
import axios from 'axios';
import imageCompression from 'browser-image-compression';

const EditGemstoneForm = ({
  gemstone,
  onClose,
  onUpdated,
  setSnackbarMessage,
  setSnackbarSeverity,
  setShowSnackbar,
}) => {
  const [form, setForm] = useState({ ...gemstone });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(gemstone.image_url || null);

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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };

      try {
        const compressedFile = await imageCompression(file, options);
        setImageFile(compressedFile);
        setImagePreview(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Image compression error:", error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (imageFile) {
        formData.append('image', imageFile);
      }

      await axios.put(`https://sphenegem-inventory.onrender.com/api/gemstones/${form.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

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
            <TextField name="code" label="Code" fullWidth required value={form.code} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField name="quantity" label="Quantity" type="number" fullWidth required value={form.quantity} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="weight"
              label="Weight (Carat)"
              type="number"
              fullWidth
              required
              value={form.weight ? parseFloat(form.weight).toFixed(2) : ''}
              onChange={handleChange}
              inputProps={{ step: '0.01' }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField name="price_per_carat" label="Price per Carat" type="number" fullWidth required value={Number(form.price_per_carat).toFixed(2)} onChange={handleChange} inputProps={{ step: '0.01' }} />
          </Grid>
          <Grid item xs={12}>
            <TextField name="total_price" label="Total Price" type="number" fullWidth value={Number(form.total_price).toFixed(2)} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField name="shape" label="Shape" fullWidth required value={form.shape} onChange={handleChange}>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button variant="outlined" component="label" fullWidth>
              Upload Image
              <input type="file" accept="image/*" name="image" hidden onChange={handleImageChange} />
            </Button>
          </Grid>
          {imagePreview && (
            <Grid item xs={12}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4, border: '1px solid #ccc' }}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField name="remark" label="Remark" fullWidth multiline minRows={2} value={form.remark} onChange={handleChange} />
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
