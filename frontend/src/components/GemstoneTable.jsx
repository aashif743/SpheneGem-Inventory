import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
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
  Divider,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Edit,
  Delete,
  Sell,
  Add,
  Search,
  Close,
  Image as ImageIcon,
  Inventory,
  AttachMoney,
  Scale,
  Description,
  Assessment,
} from '@mui/icons-material';
import {
  getAllGemstones,
  deleteGemstone,
  downloadStockSummary,
} from '../services/gemstoneService';
import SellGemstoneForm from './SellGemstoneForm';
import EditGemstoneForm from './EditGemstoneForm';
import AddGemstoneForm from './AddGemstoneForm';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DiamondIcon from '@mui/icons-material/Diamond';

const TransitionUp = (props) => <Slide {...props} direction="up" />;

// Module-level cache — persists across remounts (navigation back and forth)
let _gemstonesCache = [];
let _gemstonesCacheTime = 0;
const GEMSTONES_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const GemstoneTable = () => {
  const [gemstones, setGemstones] = useState(_gemstonesCache);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [selectedGem, setSelectedGem] = useState(null);
  const [editingGemstone, setEditingGemstone] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [downloading, setDownloading] = useState(false);

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
    setShowAddForm(false);
    setSnackbar({
      open: true,
      message: 'Gemstone added successfully',
      severity: 'success',
    });
  };

  const handleSellSuccess = () => {
    setSelectedGem(null);
    _gemstonesCacheTime = 0;
    fetchGemstones(true);
    setSnackbar({
      open: true,
      message: 'Gemstone sold successfully',
      severity: 'success',
    });
  };

  const handleDownloadSummary = async () => {
    setDownloading(true);
    try {
      const res = await downloadStockSummary();
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock_summary_${new Date().toISOString().slice(0,10)}.pdf`;
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

  useEffect(() => {
    fetchGemstones(); // will use cache if fresh
  }, []);

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Gemstone Inventory
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your gemstone stock and transactions
        </Typography>
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
          {/* Stock Report */}
          <Tooltip title="Download Stock Summary Report" arrow>
            <Button
              onClick={handleDownloadSummary}
              disabled={downloading}
              startIcon={
                downloading
                  ? <CircularProgress size={15} sx={{ color: '#2E7D32' }} />
                  : <Assessment sx={{ fontSize: 18 }} />
              }
              sx={{
                flex: { xs: 1, sm: 'none' },
                borderRadius: '10px',
                py: '9px',
                px: { xs: 1.5, sm: 2 },
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
                border: '1.5px solid #2E7D32',
                color: '#2E7D32',
                bgcolor: 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(46,125,50,0.07)',
                  border: '1.5px solid #1B5E20',
                  color: '#1B5E20',
                  boxShadow: '0 3px 10px rgba(27,94,32,0.18)',
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'translateY(0)' },
                '&.Mui-disabled': { border: '1.5px solid #A5D6A7', color: '#81C784' },
              }}
            >
              {downloading
                ? (isMobile ? 'Wait…' : 'Generating…')
                : (isMobile ? 'Report' : 'Stock Report')}
            </Button>
          </Tooltip>

          {/* Add Gemstone */}
          <Button
            onClick={() => setShowAddForm(true)}
            startIcon={<Add sx={{ fontSize: 19 }} />}
            sx={{
              flex: { xs: 1, sm: 'none' },
              borderRadius: '10px',
              py: '9px',
              px: { xs: 1.5, sm: 2.5 },
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #43A047 0%, #1B5E20 100%)',
              color: '#fff',
              boxShadow: '0 3px 10px rgba(27,94,32,0.30)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                boxShadow: '0 5px 16px rgba(27,94,32,0.40)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 2px 6px rgba(27,94,32,0.30)',
              },
            }}
          >
            {isMobile ? 'Add' : 'Add Gemstone'}
          </Button>
        </Box>
      </Box>

      {isMobile ? (
        <>
          <Grid container spacing={2}>
            {paginatedData.map((gem) => (
              <Grid item xs={12} key={gem.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
                    {gem.image_url ? (
                      <Avatar
                        src={gem.image_url}
                        alt={gem.name}
                        sx={{ width: 80, height: 80, borderRadius: 2 }}
                        variant="rounded"
                      />
                    ) : (
                      <Avatar
                        sx={{ width: 80, height: 80, borderRadius: 2, bgcolor: 'grey.200' }}
                        variant="rounded"
                      >
                        <ImageIcon sx={{ color: 'grey.500' }} />
                      </Avatar>
                    )}

                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {gem.name}
                        </Typography>
                        <Chip
                          label={`$${parseFloat(gem.total_price).toFixed(2)}`}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Code: {gem.code}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<Inventory fontSize="small" />}
                          label={`${gem.quantity} pcs`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<DiamondIcon fontSize="small" />}
                          label={`Shape: ${gem.shape}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<Scale fontSize="small" />}
                          label={`${parseFloat(gem.weight).toFixed(2)} ct`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<AttachMoney fontSize="small" />}
                          label={`$${parseFloat(gem.price_per_carat).toFixed(2)}/ct`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      {gem.remark && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 1,
                            fontStyle: 'italic',
                            color: 'text.secondary',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          <Description fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                          {gem.remark}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Divider />

                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-around',
                    p: 1,
                    bgcolor: 'action.hover'
                  }}>
                    <Tooltip title="Edit">
                      <IconButton 
                        color="primary" 
                        onClick={() => setEditingGemstone(gem)}
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        color="error" 
                        onClick={() => setDeleteTarget(gem)}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sell">
                      <IconButton 
                        color="success" 
                        onClick={() => setSelectedGem(gem)}
                        size="small"
                      >
                        <Sell />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {/* Mobile Pagination */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', mt: 2 }}>
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
                '& .MuiTablePagination-toolbar': {
                  padding: 0,
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  marginBottom: 1
                }
              }}
            />
          </Box>
        </>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 'none' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
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
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
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

                    <TableCell>{gem.code}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{gem.name}</TableCell>
                    <TableCell align="right">{gem.quantity}</TableCell>
                    <TableCell>{gem.shape}</TableCell>
                    <TableCell align="right">{parseFloat(gem.weight).toFixed(2)} ct</TableCell>
                    <TableCell align="right">${parseFloat(gem.price_per_carat).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ${parseFloat(gem.total_price).toFixed(2)}
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

      {/* Dialogs */}
      <Dialog 
        open={showAddForm} 
        onClose={() => setShowAddForm(false)} 
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Add New Gemstone</DialogTitle>
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
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Edit Gemstone</DialogTitle>
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
        open={Boolean(selectedGem)} 
        onClose={() => setSelectedGem(null)} 
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Sell Gemstone</DialogTitle>
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