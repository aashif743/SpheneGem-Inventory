import React, { useEffect, useState } from 'react';
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
  InputAdornment
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  Sell, 
  Add, 
  Search,
  Image as ImageIcon,
  Inventory,
  AttachMoney,
  Scale,
  Description
} from '@mui/icons-material';
import {
  getAllGemstones,
  deleteGemstone,
  searchGemstones,
} from '../services/gemstoneService';
import SellGemstoneForm from './SellGemstoneForm';
import EditGemstoneForm from './EditGemstoneForm';
import AddGemstoneForm from './AddGemstoneForm';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DiamondIcon from '@mui/icons-material/Diamond';

const TransitionUp = (props) => <Slide {...props} direction="up" />;

const GemstoneTable = () => {
  const [gemstones, setGemstones] = useState([]);
  const [filteredGemstones, setFilteredGemstones] = useState([]);
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchGemstones = async () => {
    try {
      const res = await getAllGemstones();
      setGemstones(res.data);
      setFilteredGemstones(res.data);
    } catch (err) {
      console.error('Error fetching gemstones:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load gemstones',
        severity: 'error',
      });
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredGemstones(gemstones);
    } else {
      try {
        const res = await searchGemstones(query);
        setFilteredGemstones(res.data);
        setPage(0);
      } catch (err) {
        console.error('Error during search:', err);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteGemstone(deleteTarget.id);
      fetchGemstones();
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
    fetchGemstones();
    setShowAddForm(false);
    setSnackbar({
      open: true,
      message: 'Gemstone added successfully',
      severity: 'success',
    });
  };

  const handleSellSuccess = () => {
    setSelectedGem(null);
    fetchGemstones();
    setSnackbar({
      open: true,
      message: 'Gemstone sold successfully',
      severity: 'success',
    });
  };

  const paginatedData = filteredGemstones.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  useEffect(() => {
    fetchGemstones();
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

      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={8} md={9}>
          <TextField
            fullWidth
            placeholder="Search gemstones..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              sx: {
                backgroundColor: 'background.paper',
                borderRadius: 2
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3} textAlign={{ xs: 'center', sm: 'right' }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            startIcon={<Add />}
            onClick={() => setShowAddForm(true)}
            sx={{
              borderRadius: 2,
              py: 1,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none'
              }
            }}
          >
            Add Gemstone
          </Button>
        </Grid>
      </Grid>

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
                        src={`https://sphenegem-inventory.onrender.com/uploads/${gem.image_url}`}
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
                          label={`$${gem.total_price}`}
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
                          label={`${gem.weight} ct`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<AttachMoney fontSize="small" />}
                          label={`${gem.price_per_carat}/ct`}
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
                          src={`https://sphenegem-inventory.onrender.com/uploads/${gem.image_url}`}
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
              onUpdated={fetchGemstones}
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