import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Alert,
  Slide,
  Avatar,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Edit,
  Delete,
  Sell,
  Add,
  Search,
  Close,
  Image as ImageIcon,
  Assessment,
  AddCircleOutline,
  Check,
  KeyboardArrowDown,
  Category as CategoryIcon,
  Interests as ShapeIcon,
  Scale as ScaleIcon,
  Straighten as DimensionIcon,
  Summarize as SummarizeIcon,
} from '@mui/icons-material';
import {
  getAllGemstones,
  deleteGemstone,
  downloadStockSummary,
} from '../services/gemstoneService';
import SellGemstoneForm from './SellGemstoneForm';
import EditGemstoneForm from './EditGemstoneForm';
import AddGemstoneForm from './AddGemstoneForm';
import AddStockForm from './AddStockForm';
import SellMultipleForm from './SellMultipleForm';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DialogHeader from './DialogHeader';
import DiamondIcon from '@mui/icons-material/Diamond';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { DATA, notifyDataChanged } from '../services/dataRefresh';
import { money2, carat2 } from '../utils/decimal';

const TransitionUp = (props) => <Slide {...props} direction="up" />;

// Module-level cache — persists across remounts (navigation back and forth)
let _gemstonesCache = [];
let _gemstonesCacheTime = 0;
const GEMSTONES_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const GemstoneTable = ({ active = true }) => {
  const [gemstones, setGemstones] = useState(_gemstonesCache);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [selectedGem, setSelectedGem] = useState(null);
  const [editingGemstone, setEditingGemstone] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [addStockTarget, setAddStockTarget] = useState(null);

  // Ids ticked for a combined multi-gemstone sale
  const [selectedIds, setSelectedIds] = useState([]);
  const [showSellMultiple, setShowSellMultiple] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [downloading, setDownloading] = useState(false);
  const [reportMenuAnchor, setReportMenuAnchor] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Client-side instant search — no API call, no debounce needed, no race conditions
  const filteredGemstones = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return gemstones;
    return gemstones.filter(gem =>
      (gem.code   ?? '').toLowerCase().includes(q) ||
      (gem.name   ?? '').toLowerCase().includes(q) ||
      (gem.shape  ?? '').toLowerCase().includes(q) ||
      String(gem.weight        ?? '').includes(q)  ||
      String(gem.price_per_carat ?? '').includes(q) ||
      (gem.remark ?? '').toLowerCase().includes(q)
    );
  }, [gemstones, searchQuery]);

  // Totals for the strip above the toolbar. Derived from the rows already
  // loaded — no extra request, and it follows the active search.
  const summary = useMemo(() => filteredGemstones.reduce(
    (acc, gem) => ({
      count: acc.count + 1,
      carat: acc.carat + (parseFloat(gem.weight) || 0),
      value: acc.value + (parseFloat(gem.total_price) || 0),
    }),
    { count: 0, carat: 0, value: 0 }
  ), [filteredGemstones]);

  const fetchGemstones = async (force = false) => {
    if (!force && _gemstonesCache.length > 0 && Date.now() - _gemstonesCacheTime < GEMSTONES_CACHE_TTL) {
      setGemstones(_gemstonesCache);
      return;
    }
    try {
      const res = await getAllGemstones();
      _gemstonesCache = res.data;
      _gemstonesCacheTime = Date.now();
      setGemstones(res.data);
    } catch (err) {
      console.error('Error fetching gemstones:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load gemstones',
        severity: 'error',
      });
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(0);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteGemstone(deleteTarget.id);
      _gemstonesCacheTime = 0; // invalidate cache
      fetchGemstones(true);
      notifyDataChanged([DATA.GEMSTONES, DATA.DASHBOARD]);
      setSnackbar({
        open: true,
        message: 'Gemstone deleted successfully',
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to delete gemstone',
        severity: 'error',
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleAddSuccess = () => {
    _gemstonesCacheTime = 0;
    fetchGemstones(true);
    notifyDataChanged([DATA.GEMSTONES, DATA.DASHBOARD]);
    setShowAddForm(false);
    setSnackbar({
      open: true,
      message: 'Gemstone added successfully',
      severity: 'success',
    });
  };

  const handleAddStockSuccess = () => {
    setAddStockTarget(null);
    _gemstonesCacheTime = 0;
    fetchGemstones(true);
    notifyDataChanged([DATA.GEMSTONES, DATA.DASHBOARD]);
    setSnackbar({
      open: true,
      message: 'Stock added successfully',
      severity: 'success',
    });
  };

  // ── Multi-gemstone sale ──
  const selectedGemstones = useMemo(
    () => gemstones.filter((g) => selectedIds.includes(g.id)),
    [gemstones, selectedIds]
  );

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedData.map((g) => g.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])]
    );
  };

  const handleSellMultipleSuccess = (result) => {
    setShowSellMultiple(false);
    setSelectedIds([]);
    _gemstonesCacheTime = 0;
    fetchGemstones(true);
    notifyDataChanged([DATA.GEMSTONES, DATA.SALES, DATA.DASHBOARD]);

    setSnackbar({
      open: true,
      message: `Sold ${result?.item_count ?? ''} items on invoice ${result?.invoice_number ?? ''}`.replace(/\s+/g, ' ').trim(),
      severity: 'success',
    });

    // Open + download the combined invoice, same behaviour as a single sale
    if (result?.invoice) {
      const url = `${process.env.REACT_APP_API_URL}/invoices/${result.invoice}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = result.invoice;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSellSuccess = () => {
    setSelectedGem(null);
    _gemstonesCacheTime = 0;
    fetchGemstones(true);
    notifyDataChanged([DATA.GEMSTONES, DATA.SALES, DATA.DASHBOARD]);
    setSnackbar({
      open: true,
      message: 'Gemstone sold successfully',
      severity: 'success',
    });
  };

  const handleDownloadSummary = async (group = 'all') => {
    setReportMenuAnchor(null);
    setDownloading(true);
    try {
      const res = await downloadStockSummary(group);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock_${group}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      setSnackbar({ open: true, message: 'Stock report downloaded!', severity: 'success' });
    } catch (err) {
      console.error('Failed to download stock summary:', err);
      setSnackbar({ open: true, message: 'Failed to generate report', severity: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  const paginatedData = filteredGemstones.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Auto-refresh: on becoming the visible screen, on tab focus, and whenever
  // any other screen reports that gemstone data changed. Replaces the old
  // mount-only fetch, which never re-ran because App.js keeps every screen
  // permanently mounted behind `display: none`.
  useAutoRefresh({
    active,
    watch: [DATA.GEMSTONES],
    onRefresh: () => fetchGemstones(true),
  });

  // Drop selections for stones that no longer exist (e.g. sold out elsewhere)
  useEffect(() => {
    setSelectedIds((prev) => {
      const live = new Set(gemstones.map((g) => g.id));
      const next = prev.filter((id) => live.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [gemstones]);

  return (
    <Box>
      {/* ── Stock at a glance. The screen title lives in the app header, so
             this strip carries the numbers instead of repeating the name. ── */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: { xs: 2, sm: 3.5 },
          mb: 2.5,
          px: { xs: 0.5, sm: 0 },
        }}
      >
        {[
          { label: 'Stones',      value: summary.count.toLocaleString('en-US') },
          { label: 'Total Carat', value: carat2(summary.carat) },
          { label: 'Stock Value', value: money2(summary.value) },
        ].map((s) => (
          <Box key={s.label}>
            <Typography variant="eyebrow" sx={{ display: 'block' }}>{s.label}</Typography>
            <Typography
              variant="data"
              sx={{ fontSize: '1.02rem', fontWeight: 600, color: 'text.primary' }}
            >
              {s.value}
            </Typography>
          </Box>
        ))}

        {selectedIds.length > 0 && (
          <Chip
            label={`${selectedIds.length} selected`}
            size="small"
            onDelete={() => setSelectedIds([])}
            sx={{ ml: 'auto', bgcolor: '#FBF1E4', color: '#8F5A1E' }}
          />
        )}
      </Box>

      {/* ── Toolbar: search + action buttons ── */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: 1.5,
          alignItems: 'center',
          mb: 3,
        }}
      >
        {/* Search field — stretches to fill available space */}
        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 0 } }}>
          <TextField
            fullWidth
            placeholder="Search by name, code, shape, weight, remark…"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search
                    sx={{
                      fontSize: 20,
                      color: searchQuery ? '#2E7D32' : 'text.disabled',
                      transition: 'color 0.2s',
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <Tooltip title="Clear search" arrow>
                    <IconButton
                      size="small"
                      onClick={handleClearSearch}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { color: '#C62828', bgcolor: 'rgba(198,40,40,0.06)' },
                      }}
                    >
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : null,
              sx: {
                borderRadius: '10px',
                bgcolor: 'background.paper',
                fontSize: '0.875rem',
                '& fieldset': { borderColor: '#C8E6C9', borderWidth: '1.5px' },
                '&:hover fieldset': { borderColor: '#2E7D32 !important' },
                '&.Mui-focused fieldset': { borderColor: '#1B5E20 !important', borderWidth: '2px !important' },
                transition: 'box-shadow 0.2s',
                '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(46,125,50,0.12)' },
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
          {/* Live result count */}
          {searchQuery.trim() && (
            <Typography
              variant="caption"
              sx={{ ml: 1.5, mt: 0.5, display: 'block', color: '#2E7D32', fontWeight: 500 }}
            >
              {filteredGemstones.length === 0
                ? 'No results found'
                : `${filteredGemstones.length} result${filteredGemstones.length !== 1 ? 's' : ''} found`}
            </Typography>
          )}
        </Box>

        {/* Action buttons — never shrink, never wrap individually */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {/* Sell Selected — only appears once something is ticked */}
          {selectedIds.length > 0 && !isMobile && (
            <Tooltip title="Sell all selected gemstones on one invoice">
              <Button
                onClick={() => setShowSellMultiple(true)}
                variant="contained"
                color="secondary"
                startIcon={<Sell sx={{ fontSize: 18 }} />}
                sx={{ flex: { xs: 1, sm: 'none' }, whiteSpace: 'nowrap' }}
              >
                {isMobile ? `Sell (${selectedIds.length})` : `Sell Selected (${selectedIds.length})`}
              </Button>
            </Tooltip>
          )}

          {/* Stock Report — a menu so the client can pull the full report or
              any single grouping (category / shape / carat / dimension) as its
              own PDF. */}
          <Tooltip title="Download a stock report">
            <Button
              onClick={(e) => setReportMenuAnchor(e.currentTarget)}
              disabled={downloading}
              variant="outlined"
              color="primary"
              startIcon={
                downloading
                  ? <CircularProgress size={15} color="inherit" />
                  : <Assessment sx={{ fontSize: 18 }} />
              }
              endIcon={downloading ? null : <KeyboardArrowDown sx={{ fontSize: 18 }} />}
              sx={{ flex: { xs: 1, sm: 'none' }, whiteSpace: 'nowrap' }}
            >
              {downloading
                ? (isMobile ? 'Wait' : 'Generating')
                : (isMobile ? 'Report' : 'Stock Report')}
            </Button>
          </Tooltip>
          <Menu
            anchorEl={reportMenuAnchor}
            open={Boolean(reportMenuAnchor)}
            onClose={() => setReportMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { minWidth: 236, borderRadius: '12px', mt: 0.5 } } }}
          >
            <MenuItem onClick={() => handleDownloadSummary('all')}>
              <ListItemIcon><SummarizeIcon fontSize="small" sx={{ color: '#BF7B30' }} /></ListItemIcon>
              <ListItemText
                primary="Full report"
                secondary="All sections in one PDF"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={() => handleDownloadSummary('category')}>
              <ListItemIcon><CategoryIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Category-wise" />
            </MenuItem>
            <MenuItem onClick={() => handleDownloadSummary('shape')}>
              <ListItemIcon><ShapeIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Shape-wise" />
            </MenuItem>
            <MenuItem onClick={() => handleDownloadSummary('carat')}>
              <ListItemIcon><ScaleIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Carat-range-wise" />
            </MenuItem>
            <MenuItem onClick={() => handleDownloadSummary('dimension')}>
              <ListItemIcon><DimensionIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Dimension-wise" secondary="From the code field, e.g. 10x7mm" />
            </MenuItem>
          </Menu>

          {/* Add Gemstone — on mobile the floating + button does this job */}
          {!isMobile && (
            <Button
              onClick={() => setShowAddForm(true)}
              variant="contained"
              color="primary"
              startIcon={<Add sx={{ fontSize: 19 }} />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Add Gemstone
            </Button>
          )}
        </Box>
      </Box>

      {isMobile ? (
        <>
          {paginatedData.length === 0 ? (
            <Box sx={{ py: 7, textAlign: 'center', color: 'text.disabled' }}>
              <DiamondIcon sx={{ fontSize: 34, opacity: 0.4, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {searchQuery ? 'No stones match that search' : 'No stones in stock yet'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {searchQuery ? 'Try a different code, name or shape.' : 'Tap + to add your first gemstone.'}
              </Typography>
            </Box>
          ) : (
            <Box className="sg-stagger" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {paginatedData.map((gem) => {
                const picked = selectedIds.includes(gem.id);
                return (
                  <Card
                    key={gem.id}
                    sx={{
                      overflow: 'hidden',
                      borderColor: picked ? '#BF7B30' : 'divider',
                      bgcolor: picked ? '#FDF7EF' : 'background.paper',
                      transition: 'border-color .18s ease, background-color .18s ease, transform .12s ease',
                      '&:active': { transform: 'scale(0.995)' },
                    }}
                  >
                    {/* Tapping the body toggles selection — a 44px icon is a
                        small target on a phone, the whole card is not. */}
                    <ButtonBase
                      onClick={() => toggleSelected(gem.id)}
                      sx={{ width: '100%', display: 'block', textAlign: 'left', p: 1.75 }}
                    >
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          {gem.image_url ? (
                            <Avatar
                              src={gem.image_url}
                              alt=""
                              variant="rounded"
                              sx={{ width: 60, height: 60, borderRadius: '12px' }}
                            />
                          ) : (
                            <Avatar
                              variant="rounded"
                              sx={{ width: 60, height: 60, borderRadius: '12px', bgcolor: '#EFEEE8' }}
                            >
                              <ImageIcon sx={{ color: 'text.disabled', fontSize: 22 }} />
                            </Avatar>
                          )}
                          {picked && (
                            <Box
                              sx={{
                                position: 'absolute', inset: 0,
                                borderRadius: '12px',
                                bgcolor: 'rgba(191,123,48,0.55)',
                              }}
                            />
                          )}
                          {/* Always visible, so it is obvious the card can be
                              picked for a combined sale — an empty ring when
                              it is not, a filled copper tick when it is. */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -5, left: -5,
                              width: 22, height: 22,
                              borderRadius: '50%',
                              display: 'grid', placeItems: 'center',
                              bgcolor: picked ? '#BF7B30' : 'rgba(255,255,255,0.96)',
                              border: '1.5px solid',
                              borderColor: picked ? '#BF7B30' : 'divider',
                              boxShadow: '0 1px 4px rgba(12,23,17,0.16)',
                              transition: 'background-color .16s ease, border-color .16s ease',
                            }}
                          >
                            {picked && <Check sx={{ color: '#fff', fontSize: 15 }} />}
                          </Box>
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }} noWrap>
                            {gem.name || 'Unnamed stone'}
                          </Typography>
                          <Typography
                            variant="data"
                            sx={{ display: 'block', fontSize: '0.74rem', color: 'text.secondary', mt: 0.15 }}
                          >
                            {gem.code}{gem.shape ? `  ·  ${gem.shape}` : ''}
                          </Typography>

                          {/* Figures read as a row on a scale docket */}
                          <Box sx={{ display: 'flex', gap: 2, mt: 1.1 }}>
                            {[
                              { label: 'Qty',    value: `${gem.quantity}` },
                              { label: 'Weight', value: carat2(gem.weight) },
                              { label: '$/ct',   value: money2(gem.price_per_carat) },
                            ].map((f) => (
                              <Box key={f.label} sx={{ minWidth: 0 }}>
                                <Typography variant="eyebrow" sx={{ display: 'block', fontSize: '0.58rem' }}>
                                  {f.label}
                                </Typography>
                                <Typography variant="data" sx={{ fontSize: '0.79rem', fontWeight: 600 }} noWrap>
                                  {f.value}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>

                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography variant="eyebrow" sx={{ display: 'block', fontSize: '0.58rem' }}>
                            Total
                          </Typography>
                          <Typography
                            variant="data"
                            sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#1B5E20' }}
                          >
                            {money2(gem.total_price)}
                          </Typography>
                        </Box>
                      </Box>

                      {gem.remark && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1.25, pt: 1.25,
                            borderTop: '1px solid', borderColor: 'divider',
                            color: 'text.secondary', fontSize: '0.79rem',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}
                        >
                          {gem.remark}
                        </Typography>
                      )}
                    </ButtonBase>

                    {/* Actions: labelled and full height so they are easy to hit */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        borderTop: '1px solid', borderColor: 'divider',
                        bgcolor: '#FAFAF7',
                      }}
                    >
                      {[
                        { label: 'Add',    icon: <AddCircleOutline sx={{ fontSize: 19 }} />, color: '#BF7B30', onClick: () => setAddStockTarget(gem) },
                        { label: 'Edit',   icon: <Edit sx={{ fontSize: 19 }} />,             color: '#1F5F8B', onClick: () => setEditingGemstone(gem) },
                        { label: 'Sell',   icon: <Sell sx={{ fontSize: 19 }} />,             color: '#2E7D32', onClick: () => setSelectedGem(gem) },
                        { label: 'Delete', icon: <Delete sx={{ fontSize: 19 }} />,           color: '#B3261E', onClick: () => setDeleteTarget(gem) },
                      ].map((a, i) => (
                        <ButtonBase
                          key={a.label}
                          onClick={a.onClick}
                          aria-label={`${a.label} ${gem.code}`}
                          sx={{
                            minHeight: 48,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '2px',
                            color: a.color,
                            borderLeft: i === 0 ? 'none' : '1px solid',
                            borderColor: 'divider',
                            '&:active': { bgcolor: 'rgba(0,0,0,0.04)' },
                          }}
                        >
                          {a.icon}
                          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                            {a.label}
                          </Typography>
                        </ButtonBase>
                      ))}
                    </Box>
                  </Card>
                );
              })}
            </Box>
          )}

          {/* Mobile Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <TablePagination
              component="div"
              count={filteredGemstones.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{
                borderTop: 'none',
                '& .MuiTablePagination-toolbar': { padding: 0, minHeight: 44 },
              }}
            />
          </Box>
        </>
      ) : (
        <Paper
          variant="outlined"
          sx={{ borderRadius: '14px', overflow: 'hidden', boxShadow: 'none' }}
        >
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Tooltip title="Select all on this page" arrow>
                      <Checkbox
                        size="small"
                        sx={{ color: '#BF7B30', '&.Mui-checked': { color: '#BF7B30' } }}
                        checked={
                          paginatedData.length > 0 &&
                          paginatedData.every((g) => selectedIds.includes(g.id))
                        }
                        indeterminate={
                          paginatedData.some((g) => selectedIds.includes(g.id)) &&
                          !paginatedData.every((g) => selectedIds.includes(g.id))
                        }
                        onChange={toggleSelectAllOnPage}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Shape</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Weight</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Price/Carat</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Remark</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((gem) => (
                  <TableRow
                    key={gem.id}
                    hover
                    selected={selectedIds.includes(gem.id)}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        sx={{ color: '#BF7B30', '&.Mui-checked': { color: '#BF7B30' } }}
                        checked={selectedIds.includes(gem.id)}
                        onChange={() => toggleSelected(gem.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {gem.image_url ? (
                        <Avatar
                          src={gem.image_url}
                          alt={gem.name}
                          sx={{ width: 50, height: 50 }}
                        />
                      ) : (
                        <Avatar sx={{ bgcolor: 'grey.200' }}>
                          <ImageIcon color="disabled" />
                        </Avatar>
                      )}
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{gem.code}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{gem.name}</TableCell>
                    <TableCell align="right">{gem.quantity}</TableCell>
                    <TableCell>{gem.shape}</TableCell>
                    <TableCell align="right">{carat2(gem.weight)}</TableCell>
                    <TableCell align="right">{money2(gem.price_per_carat)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {money2(gem.total_price)}
                    </TableCell>
                    
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {gem.remark}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={1}>
                        <Tooltip title="Add More Stock">
                          <IconButton
                            size="small"
                            onClick={() => setAddStockTarget(gem)}
                            sx={{ color: '#BF7B30', '&:hover': { bgcolor: 'rgba(191,123,48,0.10)' } }}
                          >
                            <AddCircleOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => setEditingGemstone(gem)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            color="error" 
                            size="small" 
                            onClick={() => setDeleteTarget(gem)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sell">
                          <IconButton 
                            color="success" 
                            size="small" 
                            onClick={() => setSelectedGem(gem)}
                          >
                            <Sell fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredGemstones.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </Paper>
      )}

      {/* Selection bar — sits above the tab bar so the action is always in
          reach no matter how far the list has been scrolled. */}
      {isMobile && selectedIds.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            left: 'calc(12px + var(--safe-left))',
            right: 'calc(12px + var(--safe-right))',
            bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 12px)',
            zIndex: (t) => t.zIndex.appBar + 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            pl: 1.75,
            borderRadius: '16px',
            bgcolor: 'rgba(12,23,17,0.97)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: '0 10px 30px rgba(12,23,17,0.35)',
            animation: 'sg-sheet-up .26s cubic-bezier(.2,.7,.3,1) both',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem', lineHeight: 1.2 }}>
              {selectedIds.length} selected
            </Typography>
            <Typography variant="data" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>
              {carat2(selectedGemstones.reduce((n, g) => n + (parseFloat(g.weight) || 0), 0))}
            </Typography>
          </Box>

          <ButtonBase
            onClick={() => setSelectedIds([])}
            sx={{
              px: 1.75, minHeight: 40, borderRadius: '11px',
              color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.82rem',
              '&:active': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Clear
          </ButtonBase>

          <Button
            onClick={() => setShowSellMultiple(true)}
            variant="contained"
            color="secondary"
            startIcon={<Sell sx={{ fontSize: 17 }} />}
            sx={{ minHeight: 40, borderRadius: '11px', whiteSpace: 'nowrap' }}
          >
            Sell
          </Button>
        </Box>
      )}

      {/* Dialogs */}
      <Dialog 
        open={showAddForm} 
        onClose={() => setShowAddForm(false)} 
        fullScreen={isMobile}
        scroll="paper"
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogHeader eyebrow="Inventory" title="Add New Gemstone" onClose={() => setShowAddForm(false)} />
        <DialogContent dividers>
          <AddGemstoneForm
            onClose={() => setShowAddForm(false)}
            onAdded={handleAddSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog 
        open={Boolean(editingGemstone)} 
        onClose={() => setEditingGemstone(null)} 
        fullScreen={isMobile}
        scroll="paper"
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogHeader eyebrow="Inventory" title="Edit Gemstone" onClose={() => setEditingGemstone(null)} />
        <DialogContent dividers>
          {editingGemstone && (
            <EditGemstoneForm
              gemstone={editingGemstone}
              onClose={() => setEditingGemstone(null)}
              onUpdated={() => { _gemstonesCacheTime = 0; fetchGemstones(true); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSellMultiple}
        onClose={() => setShowSellMultiple(false)}
        fullScreen={isMobile}
        scroll="paper"
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogHeader eyebrow="Sale" title="Sell Multiple Gemstones" onClose={() => setShowSellMultiple(false)} />
        <DialogContent dividers>
          {showSellMultiple && (
            <SellMultipleForm
              gemstones={selectedGemstones}
              onClose={() => setShowSellMultiple(false)}
              onSold={handleSellMultipleSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(addStockTarget)}
        onClose={() => setAddStockTarget(null)}
        fullScreen={isMobile}
        scroll="paper"
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogHeader eyebrow="Inventory" title="Add More Stock" onClose={() => setAddStockTarget(null)} />
        <DialogContent dividers>
          {addStockTarget && (
            <AddStockForm
              gemstone={addStockTarget}
              onClose={() => setAddStockTarget(null)}
              onAdded={handleAddStockSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedGem)}
        onClose={() => setSelectedGem(null)}
        fullScreen={isMobile}
        scroll="paper"
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogHeader eyebrow="Sale" title="Sell Gemstone" onClose={() => setSelectedGem(null)} />
        <DialogContent dividers>
          {selectedGem && (
            <SellGemstoneForm
              gemstone={selectedGem}
              onClose={() => setSelectedGem(null)}
              onSold={handleSellSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name}
        itemCode={deleteTarget?.code}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={TransitionUp}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            borderRadius: 2,
            boxShadow: 3,
            fontWeight: 500,
            minWidth: 300,
            alignItems: 'center'
          }}
          iconMapping={{
            success: <span style={{ fontSize: '1.5rem' }}>✓</span>,
            error: <span style={{ fontSize: '1.5rem' }}>✕</span>,
            warning: <span style={{ fontSize: '1.5rem' }}>⚠</span>,
            info: <span style={{ fontSize: '1.5rem' }}>i</span>
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GemstoneTable;