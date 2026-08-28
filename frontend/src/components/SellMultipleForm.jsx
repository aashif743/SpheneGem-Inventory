import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, Sell as SellIcon } from '@mui/icons-material';
import { sellMultipleGemstones } from '../services/gemstoneService';
import { limitDecimals, normaliseOnBlur, round2, money2, carat2, format2 } from '../utils/decimal';

const DARK_GREEN  = '#1B5E20';
const MID_GREEN   = '#2E7D32';
const LIGHT_GREEN = '#E8F5E9';

/**
 * Sell several gemstones in one transaction, producing a single invoice.
 *
 * Each line calculates itself the same way the single-sale form does:
 *   carat x price/ct -> total, and editing the total back-solves price/ct.
 * Nothing is submitted until every line is valid and within available stock.
 */
const SellMultipleForm = ({ gemstones, onClose, onSold }) => {
  const [lines, setLines] = useState(() =>
    gemstones.map((gem) => ({
      gem,
      quantity: '',
      carat:    '',
      price:    format2(gem.price_per_carat),  // sensible starting point
      total:    '',
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateLine = (index, field, rawValue) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index] };

      const value = field === 'quantity' ? rawValue : limitDecimals(rawValue);
      line[field] = value;

      const carat = parseFloat(field === 'carat' ? value : line.carat);
      const price = parseFloat(field === 'price' ? value : line.price);
      const total = parseFloat(field === 'total' ? value : line.total);

      // carat or price changed -> recompute the total
      if (field === 'carat' || field === 'price') {
        if (Number.isFinite(carat) && Number.isFinite(price)) {
          line.total = (carat * price).toFixed(2);
        }
      }

      // total edited directly -> back-solve the price per carat, so the client
      // can agree a round figure and still get a correct per-carat rate
      if (field === 'total') {
        if (Number.isFinite(carat) && Number.isFinite(total) && carat > 0) {
          line.price = (total / carat).toFixed(2);
        }
      }

      next[index] = line;
      return next;
    });
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Per-line validation + grand totals ──
  const validation = useMemo(() => {
    const perLine = lines.map(({ gem, quantity, carat, price, total }) => {
      const availQty   = parseInt(gem.quantity, 10);
      const availCarat = parseFloat(gem.weight);

      const q = quantity === '' ? NaN : Number(quantity);
      const c = carat === ''    ? NaN : Number(carat);
      const p = price === ''    ? NaN : Number(price);
      const t = total === ''    ? NaN : Number(total);

      const errors = {};
      if (!Number.isInteger(q) || q <= 0)      errors.quantity = 'Enter a whole number above 0';
      else if (q > availQty)                   errors.quantity = `Only ${availQty} pcs in stock`;

      if (!Number.isFinite(c) || c <= 0)       errors.carat = 'Enter a carat above 0';
      else if (c > availCarat + 1e-9)          errors.carat = `Only ${availCarat.toFixed(2)} ct in stock`;

      if (!Number.isFinite(p) || p < 0)        errors.price = 'Enter a price';
      if (!Number.isFinite(t) || t < 0)        errors.total = 'Enter a total';

      // A line nobody has touched yet is not "wrong" — it just isn't filled in.
      // Only flag a line once the user has actually entered something.
      const pristine = quantity === '' && carat === '' && total === '';

      return { errors, pristine, ok: Object.keys(errors).length === 0,
               amount: Number.isFinite(t) ? t : 0,
               qty: Number.isInteger(q) ? q : 0, ct: Number.isFinite(c) ? c : 0 };
    });

    const allOk = lines.length > 0 && perLine.every((l) => l.ok);
    const totals = perLine.reduce((acc, l) => ({
      amount: acc.amount + (l.ok ? l.amount : 0),
      qty:    acc.qty    + (l.ok ? l.qty : 0),
      ct:     acc.ct     + (l.ok ? l.ct : 0),
    }), { amount: 0, qty: 0, ct: 0 });

    return { perLine, allOk, totals };
  }, [lines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !validation.allOk) return;

    setSubmitting(true);
    setError('');
    try {
      const payload = lines.map(({ gem, quantity, carat, price, total }) => ({
        gemstone_id:   gem.id,
        quantity:      parseInt(quantity, 10),
        carat_sold:    round2(carat),
        selling_price: round2(price),
        total_amount:  round2(total),
      }));

      const res = await sellMultipleGemstones(payload);
      onSold?.(res.data);
      onClose?.();
    } catch (err) {
      console.error('Multi-sale failed:', err);
      setError(err?.response?.data?.message || 'Sale failed. Nothing was changed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No gemstones selected.</Typography>
        <Button onClick={onClose} sx={{ mt: 2 }}>Close</Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600}>
          Sell {lines.length} Gemstone{lines.length !== 1 ? 's' : ''}
        </Typography>
        <Chip
          label="One invoice"
          size="small"
          sx={{ bgcolor: LIGHT_GREEN, color: DARK_GREEN, fontWeight: 700, border: '1px solid #A5D6A7' }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        All items below will be recorded together and printed on a single invoice.
      </Typography>

      {lines.map((line, i) => {
        const { gem } = line;
        const lineState = validation.perLine[i];
        return (
          <Paper
            key={gem.id}
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              borderColor: lineState.pristine ? 'divider' : lineState.ok ? '#A5D6A7' : '#EF9A9A',
              transition: 'border-color .2s ease, background-color .2s ease',
              bgcolor: lineState.ok ? 'rgba(232,245,233,0.35)' : 'transparent',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography fontWeight={700}>
                  {i + 1}. {gem.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {gem.code}{gem.shape ? ` · ${gem.shape}` : ''} — in stock:{' '}
                  <strong>{gem.quantity} pcs</strong> · <strong>{carat2(gem.weight)}</strong> @{' '}
                  <strong>{money2(gem.price_per_carat)}/ct</strong>
                </Typography>
              </Box>
              {lines.length > 1 && (
                <Tooltip title="Remove from this invoice">
                  <IconButton size="small" onClick={() => removeLine(i)}>
                    <Close fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Quantity"
                  type="number"
                  size="small"
                  fullWidth
                  value={line.quantity}
                  onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                  error={Boolean(line.quantity !== '' && lineState.errors.quantity)}
                  helperText={line.quantity !== '' ? lineState.errors.quantity || ' ' : ' '}
                  inputProps={{ min: 1, step: 1 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Carat Sold"
                  type="number"
                  size="small"
                  fullWidth
                  value={line.carat}
                  onChange={(e) => updateLine(i, 'carat', e.target.value)}
                  onBlur={(e) => updateLine(i, 'carat', normaliseOnBlur(e.target.value))}
                  error={Boolean(line.carat !== '' && lineState.errors.carat)}
                  helperText={line.carat !== '' ? lineState.errors.carat || ' ' : ' '}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Price / Carat"
                  type="number"
                  size="small"
                  fullWidth
                  value={line.price}
                  onChange={(e) => updateLine(i, 'price', e.target.value)}
                  onBlur={(e) => updateLine(i, 'price', normaliseOnBlur(e.target.value))}
                  error={Boolean(line.price !== '' && lineState.errors.price)}
                  helperText={line.price !== '' ? lineState.errors.price || ' ' : ' '}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Total"
                  type="number"
                  size="small"
                  fullWidth
                  value={line.total}
                  onChange={(e) => updateLine(i, 'total', e.target.value)}
                  onBlur={(e) => updateLine(i, 'total', normaliseOnBlur(e.target.value))}
                  error={Boolean(line.total !== '' && lineState.errors.total)}
                  helperText={line.total !== '' ? lineState.errors.total || ' ' : ' '}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
            </Grid>
          </Paper>
        );
      })}

      {/* ── Grand total ── */}
      <Paper
        sx={{
          p: 2, mt: 1, borderRadius: 2,
          background: `linear-gradient(135deg, ${MID_GREEN} 0%, ${DARK_GREEN} 100%)`,
          color: '#fff',
        }}
      >
        <Grid container alignItems="center" spacing={1}>
          <Grid item xs={12} sm={7}>
            <Typography variant="caption" sx={{ color: '#B2DFDB', letterSpacing: 0.4 }}>
              {lines.length} ITEM{lines.length !== 1 ? 'S' : ''} · {validation.totals.qty} PCS ·{' '}
              {format2(validation.totals.ct)} CT
            </Typography>
            <Typography variant="body2" sx={{ color: '#B2DFDB' }}>
              Invoice total
            </Typography>
          </Grid>
          <Grid item xs={12} sm={5}>
            <Typography variant="h5" fontWeight={700} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              {money2(validation.totals.amount)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onClose} disabled={submitting} sx={{ mr: 2 }}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || !validation.allOk}
          startIcon={submitting
            ? <CircularProgress size={16} sx={{ color: '#fff' }} />
            : <SellIcon sx={{ fontSize: 18 }} />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '10px',
            px: 3,
            background: `linear-gradient(135deg, #43A047 0%, ${DARK_GREEN} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, #4CAF50 0%, ${MID_GREEN} 100%)` },
          }}
        >
          {submitting
            ? 'Processing…'
            : `Sell ${lines.length} item${lines.length !== 1 ? 's' : ''} — ${money2(validation.totals.amount)}`}
        </Button>
      </Box>
    </Box>
  );
};

export default SellMultipleForm;
