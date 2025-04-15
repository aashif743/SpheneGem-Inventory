import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Alert,
  Slide,
} from '@mui/material';
import { Edit, Delete, Sell } from '@mui/icons-material';
import {
  getAllGemstones,
  deleteGemstone,
  searchGemstones,
} from '../services/gemstoneService';
import SellGemstoneForm from './SellGemstoneForm';
import EditGemstoneForm from './EditGemstoneForm';
import AddGemstoneForm from './AddGemstoneForm';
import DeleteConfirmDialog from './DeleteConfirmDialog';


// Snackbar animation
const TransitionUp = (props) => <Slide {...props} direction="up" />;

const GemstoneTable = () => {
  const [gemstones, setGemstones] = useState([]);
  const [selectedGem, setSelectedGem] = useState(null);
  const [editingGemstone, setEditingGemstone] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // success | error | warning | info
  const [deleteTarget, setDeleteTarget] = useState(null); // stores gemstone to delete

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchGemstones = async () => {
    try {
      const res = await getAllGemstones();
      setGemstones(res.data);
    } catch (err) {
      console.error('Failed to fetch gemstones', err);
    }
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim() === '') {
      fetchGemstones();
    } else {
      try {
        const res = await searchGemstones(value);
        setGemstones(res.data);
      } catch (err) {
        console.error('Search error:', err);
      }
    }
  };

  const handleDeleteRequest = (gem) => {
    setDeleteTarget(gem);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await deleteGemstone(deleteTarget.id);
      fetchGemstones();
      setSnackbarMessage('🗑️ Gemstone deleted successfully!');
      setSnackbarSeverity('warning');
      setShowSnackbar(true);
    } catch (err) {
      setSnackbarMessage('❌ Failed to delete gemstone!');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    } finally {
      setDeleteTarget(null);
    }
  };
  

  const handleAddGemstoneSuccess = () => {
    fetchGemstones();
    setShowAddForm(false);
    setSnackbarMessage('Gemstone added successfully!');
    setSnackbarSeverity('success');
    setShowSnackbar(true);
  };

  useEffect(() => {
    fetchGemstones();
  }, []);

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            label="Search"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearch}
          />
        </Grid>
        <Grid item xs={12} sm={4} textAlign={{ xs: 'center', sm: 'right' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowAddForm(true)}
          >
            ➕ Add Gemstone
          </Button>
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>
        Gemstone Stock
      </Typography>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Price/Carat</TableCell>
              <TableCell>Total Price</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Remark</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gemstones.map((gem) => (
              <TableRow key={gem.id}>
                <TableCell>{gem.code}</TableCell>
                <TableCell>{gem.quantity}</TableCell>
                <TableCell>{gem.name}</TableCell>
                <TableCell>{gem.weight}</TableCell>
                <TableCell>{gem.price_per_carat}</TableCell>
                <TableCell>{gem.total_price}</TableCell>
                <TableCell>
                  {gem.image_url && (
                    <img
                      src={`http://localhost:5000/uploads/${gem.image_url}`}
                      alt={gem.name}
                      width="60"
                      style={{ borderRadius: '4px' }}
                    />
                  )}
                </TableCell>
                <TableCell>{gem.remark}</TableCell>
                <TableCell align="center">
                  <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
                    <IconButton color="primary" size="small" onClick={() => setEditingGemstone(gem)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDeleteRequest(gem)}>
                      <Delete />
                    </IconButton>
                    <IconButton color="success" size="small" onClick={() => setSelectedGem(gem)}>
                      <Sell />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Dialog */}
      <Dialog open={showAddForm} onClose={() => setShowAddForm(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Gemstone</DialogTitle>
        <DialogContent>
          <AddGemstoneForm
            onClose={() => setShowAddForm(false)}
            onAdded={handleAddGemstoneSuccess}
            setSnackbarMessage={setSnackbarMessage}
            setSnackbarSeverity={setSnackbarSeverity}
            setShowSnackbar={setShowSnackbar}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingGemstone)}
        onClose={() => setEditingGemstone(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Gemstone</DialogTitle>
        <DialogContent>
          {editingGemstone && (
            <EditGemstoneForm
              gemstone={editingGemstone}
              onClose={() => setEditingGemstone(null)}
              onUpdated={fetchGemstones}
              setSnackbarMessage={setSnackbarMessage}
              setSnackbarSeverity={setSnackbarSeverity}
              setShowSnackbar={setShowSnackbar}
            />
          
          )}
        </DialogContent>
      </Dialog>

      {/* Sell Dialog */}
      <Dialog
        open={Boolean(selectedGem)}
        onClose={() => setSelectedGem(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Sell Gemstone</DialogTitle>
        <DialogContent>
          {selectedGem && (
            <SellGemstoneForm
              gemstone={selectedGem}
              onClose={() => setSelectedGem(null)}
              onSold={() => {
                setSelectedGem(null);
                fetchGemstones();
              }}
              setSnackbarMessage={setSnackbarMessage}
              setSnackbarSeverity={setSnackbarSeverity}
              setShowSnackbar={setShowSnackbar}
            />
          )}
        </DialogContent>
      </Dialog>


      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemCode={deleteTarget?.code}
      />


      {/* Snackbar */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={TransitionUp}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            borderRadius: 2,
            boxShadow: 3,
            fontWeight: 500,
            letterSpacing: '0.3px',
            px: 2,
            backgroundColor:
              snackbarSeverity === 'error'
                ? '#e74c3c'
                : snackbarSeverity === 'warning'
                ? '#f39c12'
                : snackbarSeverity === 'success'
                ? '#2ecc71'
                : undefined,
            color: '#fff',
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GemstoneTable;
