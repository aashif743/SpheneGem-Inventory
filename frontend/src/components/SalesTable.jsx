import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Paper,
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
  Avatar,
  Tooltip,
  Divider,
  InputAdornment,
  Badge
} from '@mui/material';
import { 
  Download, 
  Delete, 
  Search,
  Receipt,
  Paid,
  Scale,
  CalendarToday,
  Inventory
} from '@mui/icons-material';
import { getAllSales, deleteSale } from '../services/salesService';

const SalesTable = () => {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await getAllSales();
      setSales(res.data);
    } catch (err) {
      console.error('Failed to fetch sales', err);
    }
  };

  const handleDownload = (saleId) => {
    const url = `http://localhost:5000/invoices/invoice_${saleId}.pdf`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${saleId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (saleId) => {
    setSelectedSaleId(saleId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteSale(selectedSaleId);
      fetchSales();
    } catch (err) {
      console.error('Failed to delete sale', err);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedSaleId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedSaleId(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredSales = sales.filter((sale) =>
    sale.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.carat_sold.toString().includes(searchTerm)
  );

  const paginatedSales = filteredSales.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Sales History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage all completed transactions
        </Typography>
      </Box>

      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={8} md={9}>
          <TextField
            fullWidth
            placeholder="Search sales..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      </Grid>

      {isMobile ? (
        <Grid container spacing={2}>
          {paginatedSales.length > 0 ? (
            paginatedSales.map((sale) => (
              <Grid item xs={12} key={sale.id}>
                <Card sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1
                    }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {sale.name}
                      </Typography>
                      <Chip 
                        label={`$${sale.total_amount}`}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Code: {sale.code}
                    </Typography>

                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1, 
                      mt: 1, 
                      flexWrap: 'wrap',
                      mb: 2
                    }}>
                      <Chip
                        icon={<Inventory fontSize="small" />}
                        label={`${sale.quantity} pcs`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Scale fontSize="small" />}
                        label={`${sale.carat_sold} ct`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Paid fontSize="small" />}
                        label={`$${sale.marking_price}/ct`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<CalendarToday fontSize="small" />}
                        label={new Date(sale.sold_at).toLocaleDateString()}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      pt: 1
                    }}>
                      <Tooltip title="Download Invoice">
                        <Button
                          startIcon={<Download />}
                          size="small"
                          onClick={() => handleDownload(sale.id)}
                          sx={{ textTransform: 'none' }}
                        >
                          Invoice
                        </Button>
                      </Tooltip>
                      <Tooltip title="Delete Record">
                        <Button
                          startIcon={<Delete />}
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(sale.id)}
                          sx={{ textTransform: 'none' }}
                        >
                          Delete
                        </Button>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ 
                p: 4, 
                textAlign: 'center',
                borderRadius: 3
              }}>
                <Receipt sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No sales records found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {searchTerm ? 'Try a different search term' : 'No sales have been recorded yet'}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 'none' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Sold Weight</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Marking Price/CT</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Sold Total</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSales.length > 0 ? (
                  paginatedSales.map((sale) => (
                    <TableRow 
                      key={sale.id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>{sale.code}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{sale.name}</TableCell>
                      <TableCell align="right">{sale.quantity}</TableCell>
                      <TableCell align="right">{sale.carat_sold} ct</TableCell>
                      <TableCell align="right">${sale.marking_price}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ${sale.total_amount}
                      </TableCell>
                      <TableCell>
                        {new Date(sale.sold_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Tooltip title="Download Invoice">
                            <IconButton 
                              color="primary" 
                              size="small" 
                              onClick={() => handleDownload(sale.id)}
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Record">
                            <IconButton 
                              color="error" 
                              size="small" 
                              onClick={() => handleDeleteClick(sale.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box sx={{ 
                        p: 4, 
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <Receipt sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          No sales records found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {searchTerm ? 'Try a different search term' : 'No sales have been recorded yet'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {paginatedSales.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredSales.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ borderTop: '1px solid', borderColor: 'divider' }}
            />
          )}
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Deletion</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete this sale record? This action cannot be undone.
          </Typography>
          {selectedSaleId && (
            <Box sx={{ 
              mt: 2,
              p: 2,
              backgroundColor: 'grey.100',
              borderRadius: 2
            }}>
              <Typography variant="body2" fontWeight={500}>
                Sale ID: {selectedSaleId}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel}
            sx={{ 
              borderRadius: 2,
              px: 3,
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
            sx={{ 
              borderRadius: 2,
              px: 3,
              textTransform: 'none'
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesTable;