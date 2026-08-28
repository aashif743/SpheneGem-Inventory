import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { addStock } from '../services/gemstoneService';
import { limitDecimals, normaliseOnBlur, money2, carat2 } from '../utils/decimal';

// Brand colours, matched to the rest of the app
const DARK_GREEN  = '#1B5E20';
const MID_GREEN   = '#2E7D32';
const LIGHT_GREEN = '#E8F5E9';
const COPPER      = '#BF7B30';

const money = money2;
const ct    = carat2;

/**
 * Add More Stock.
 *
 * The client re-buys the same gemstone at the same price per carat. He enters
 * only what he is adding; every total is worked out for him. The price per
 * carat is shown but locked — it is never sent to the server and never changes.
 */
const AddStockForm = ({ gemstone, onClose, onAdded, onError }) => {
  const [quantityAdded, setQuantityAdded] = useState('');
  const [caratAdded, setCaratAdded]       = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState('');

  // Current values straight off the row
  const currentQty    = parseInt(gemstone.quantity, 10);
  const currentWeight = parseFloat(gemstone.weight);
  const pricePerCarat = parseFloat(gemstone.price_per_carat);
  const currentTotal  = parseFloat(gemstone.total_price);

  const preview = useMemo(() => {
    const qtyRaw   = quantityAdded.trim();
    const caratRaw = caratAdded.trim();

    const qty     = qtyRaw   === '' ? 0 : Number(qtyRaw);
    const caratIn = caratRaw === '' ? 0 : Number(caratRaw);

    const qtyValid   = Number.isInteger(qty)     && qty     >= 0;
    const caratValid = Number.isFinite(caratIn)  && caratIn >= 0;

    // Round to 2 decimals exactly as the server does, so the preview below is
    // always the value that actually gets saved.
    const carat = caratValid ? parseFloat(caratIn.toFixed(2)) : 0;
    const hasSomething = qty > 0 || carat > 0;

    // Mirror the server's arithmetic exactly, so what he sees is what is saved
    const newQty    = currentQty + qty;
    const newWeight = parseFloat((currentWeight + carat).toFixed(2));
    const newTotal  = parseFloat((newWeight * pricePerCarat).toFixed(2));
    const cost      = parseFloat((carat * pricePerCarat).toFixed(2));

    return {
      qty, carat, qtyValid, caratValid, hasSomething,
      newQty, newWeight, newTotal, cost,
      canSubmit: qtyValid && caratValid && hasSomething,
    };
  }, [quantityAdded, caratAdded, currentQty, currentWeight, pricePerCarat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !preview.canSubmit) return;

    setSubmitting(true);
    setError('');
    try {
      await addStock(gemstone.id, {
        quantity_added: preview.qty,
        carat_added:    preview.carat,
      });
      onAdded?.();
      onClose?.();
    } catch (err) {
      console.error('Failed to add stock:', err);
      setError(err?.response?.data?.message || 'Failed to add stock. Nothing was changed.');
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Add More Stock — {gemstone.code}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {gemstone.name}
      </Typography>

      {/* ── Current stock (read-only) ── */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: LIGHT_GREEN, borderColor: '#A5D6A7' }}
      >
        <Typography variant="overline" sx={{ color: MID_GREEN, fontWeight: 700, letterSpacing: 0.6 }}>
          Current Stock
        </Typography>
        <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Quantity</Typography>
            <Typography fontWeight={600}>{currentQty} pcs</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Weight</Typography>
            <Typography fontWeight={600}>{ct(currentWeight)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Price / Carat</Typography>
            <Typography fontWeight={600}>{money(pricePerCarat)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Total</Typography>
            <Typography fontWeight={600}>{money(currentTotal)}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* ── What he is adding ── */}
      <Typography variant="overline" sx={{ color: COPPER, fontWeight: 700, letterSpacing: 0.6 }}>
        Add to this stone
      </Typography>
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Quantity to Add (pcs)"
            type="number"
            fullWidth
            autoFocus
            value={quantityAdded}
            onChange={(e) => setQuantityAdded(e.target.value)}
            error={quantityAdded.trim() !== '' && !preview.qtyValid}
            helperText={
              quantityAdded.trim() !== '' && !preview.qtyValid
                ? 'Whole number, 0 or more'
                : ' '
            }
            inputProps={{ min: 0, step: 1 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Carat to Add (ct)"
            type="number"
            fullWidth
            value={caratAdded}
            onChange={(e) => setCaratAdded(limitDecimals(e.target.value))}
            onBlur={(e) => setCaratAdded(normaliseOnBlur(e.target.value))}
            error={caratAdded.trim() !== '' && !preview.caratValid}
            helperText={
              caratAdded.trim() !== '' && !preview.caratValid
                ? '0 or more'
                : ' '
            }
            inputProps={{ min: 0, step: '0.01' }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Price per Carat"
            fullWidth
            value={money(pricePerCarat)}
            InputProps={{ readOnly: true }}
            helperText="The price never changes when adding stock."
          />
        </Grid>
      </Grid>

      {/* ── Result preview ── */}
      {preview.hasSomething && preview.canSubmit && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mt: 2.5, borderRadius: 2, borderColor: '#A5D6A7', borderWidth: 1.5 }}
        >
          <Typography variant="overline" sx={{ color: DARK_GREEN, fontWeight: 700, letterSpacing: 0.6 }}>
            After Adding
          </Typography>

          <Grid container spacing={1.5} sx={{ mt: 0.25 }} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Quantity</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography color="text.secondary">{currentQty}</Typography>
                <ArrowForward sx={{ fontSize: 15, color: COPPER }} />
                <Typography fontWeight={700} sx={{ color: DARK_GREEN }}>
                  {preview.newQty} pcs
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Weight</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography color="text.secondary">{ct(currentWeight)}</Typography>
                <ArrowForward sx={{ fontSize: 15, color: COPPER }} />
                <Typography fontWeight={700} sx={{ color: DARK_GREEN }}>
                  {ct(preview.newWeight)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Total Price</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography color="text.secondary">{money(currentTotal)}</Typography>
                <ArrowForward sx={{ fontSize: 15, color: COPPER }} />
                <Typography fontWeight={700} sx={{ color: DARK_GREEN }}>
                  {money(preview.newTotal)}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="body2" color="text.secondary">
            Cost of this addition:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: MID_GREEN }}>
              {money(preview.cost)}
            </Box>
            {preview.carat > 0 && (
              <> ({ct(preview.carat)} × {money(pricePerCarat)})</>
            )}
          </Typography>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ mr: 2 }}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || !preview.canSubmit}
          startIcon={submitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '10px',
            px: 3,
            background: `linear-gradient(135deg, #43A047 0%, ${DARK_GREEN} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, #4CAF50 0%, ${MID_GREEN} 100%)` },
          }}
        >
          {submitting ? 'Adding…' : 'Add Stock'}
        </Button>
      </Box>
    </Box>
  );
};

export default AddStockForm;
