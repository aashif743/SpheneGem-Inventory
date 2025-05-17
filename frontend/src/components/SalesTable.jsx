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
  Menu,
  MenuItem
} from '@mui/material';
import {
  Download,
  Delete,
  Search,
  Receipt,
  Paid,
  Scale,
  CalendarToday,
  Inventory,
  PictureAsPdf,
  FilterAlt
} from '@mui/icons-material';
import { getAllSales, deleteSale } from '../services/salesService';
import DiamondIcon from '@mui/icons-material/Diamond';

const SalesTable = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [filterRange, setFilterRange] = useState('all');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    applyDateFilter(filterRange);
  }, [sales, filterRange]);

  const fetchSales = async () => {
    try {
      const res = await getAllSales();
      setSales(res.data);
    } catch (err) {
      console.error('Failed to fetch sales', err);
    }
  };

  const handleDownload = (saleId) => {
    const url = `https://sphenegem-inventory.onrender.com/invoices/invoice_${saleId}.pdf`;
  
    // Trigger file download
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `invoice-${saleId}.pdf`;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  
    // Open in new tab
    window.open(url, '_blank');
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

  const handleFilterMenuOpen = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterSelect = (range) => {
    setFilterRange(range);
    handleFilterMenuClose();
  };

  const applyDateFilter = (range) => {
    if (range === 'all') {
      setFilteredSales(sales);
      return;
    }

    const now = new Date();
    let compareDate;

    switch (range) {
      case 'month':
        compareDate = new Date();
        compareDate.setMonth(compareDate.getMonth() - 1);
        break;
      case 'six_months':
        compareDate = new Date();
        compareDate.setMonth(compareDate.getMonth() - 6);
        break;
      case 'year':
        compareDate = new Date();
        compareDate.setFullYear(compareDate.getFullYear() - 1);
        break;
      default:
        compareDate = null;
    }

    const filtered = sales.filter((sale) => new Date(sale.sold_at) >= compareDate);
    setFilteredSales(filtered);
  };

  const handleStatementDownload = async () => {
    const url = `https://sphenegem-inventory.onrender.com/invoices/statement?range=${filterRange}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_statement_${filterRange}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const searchedSales = filteredSales.filter((sale) =>
    sale.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.carat_sold.toString().includes(searchTerm)
  );

  const paginatedSales = searchedSales.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const FilterControls = () => {
    if (isMobile) {
      return (
        <Box display="flex" gap={1} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterAlt />}
            endIcon={<CalendarToday />}
            onClick={handleFilterMenuOpen}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2,
              borderColor: 'divider',
              color: 'text.secondary'
            }}
          >
            {filterRange === 'all' && 'All Time'}
            {filterRange === 'month' && 'Last Month'}
            {filterRange === 'six_months' && '6 Months'}
            {filterRange === 'year' && '1 Year'}
          </Button>
          
          <Menu
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={handleFilterMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            MenuListProps={{
              'aria-labelledby': 'filter-menu',
              sx: { py: 0 },
            }}
            PaperProps={{
              sx: {
                borderRadius: 2,
                boxShadow: theme.shadows[3],
                mt: 1,
                minWidth: 200
              },
            }}
          >
            <MenuItem 
              onClick={() => handleFilterSelect('all')}
              selected={filterRange === 'all'}
              sx={{ minHeight: 'auto', py: 1 }}
            >
              All Time
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect('month')}
              selected={filterRange === 'month'}
              sx={{ minHeight: 'auto', py: 1 }}
            >
              Last Month
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect('six_months')}
              selected={filterRange === 'six_months'}
              sx={{ minHeight: 'auto', py: 1 }}
            >
              Last 6 Months
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect('year')}
              selected={filterRange === 'year'}
              sx={{ minHeight: 'auto', py: 1 }}
            >
              Last Year
            </MenuItem>
          </Menu>
        </Box>
      );
    }

    return (
      <Box display="flex" gap={1} alignItems="center">
        <Button
          variant="outlined"
          size="small"
          startIcon={<CalendarToday />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            px: 2,
            borderColor: 'divider',
            color: 'text.secondary',
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.light,
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.light
            }
          }}
          onClick={handleFilterMenuOpen}
        >
          {filterRange === 'all' && 'All Time'}
          {filterRange === 'month' && 'Last Month'}
          {filterRange === 'six_months' && 'Last 6 Months'}
          {filterRange === 'year' && 'Last Year'}
        </Button>
        
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={handleFilterMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          MenuListProps={{
            'aria-labelledby': 'filter-menu',
            sx: { py: 0 },
          }}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: theme.shadows[3],
              mt: 1,
              minWidth: 200
            },
          }}
        >
          <MenuItem 
            onClick={() => handleFilterSelect('all')}
            selected={filterRange === 'all'}
            sx={{ minHeight: 'auto', py: 1 }}
          >
            All Time
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('month')}
            selected={filterRange === 'month'}
            sx={{ minHeight: 'auto', py: 1 }}
          >
            Last Month
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('six_months')}
            selected={filterRange === 'six_months'}
            sx={{ minHeight: 'auto', py: 1 }}
          >
            Last 6 Months
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('year')}
            selected={filterRange === 'year'}
            sx={{ minHeight: 'auto', py: 1 }}
          >
            Last Year
          </MenuItem>
        </Menu>
      </Box>
    );
  };

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

      <Grid container spacing={2} sx={{ mb: 3 }}>
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
                borderRadius: 2,
                '&:hover': {
                  borderColor: theme.palette.primary.main
                }
              }
            }}
          />
        </Grid>

        <Grid item xs={12} sm={4} md={3} display="flex" gap={1} alignItems="center" justifyContent="flex-end">
          <FilterControls />
          <Tooltip title="Download PDF Statement">
            <Button
              variant="contained"
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={handleStatementDownload}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 2,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none'
                }
              }}
            >
              {isMobile ? '' : 'Export'}
            </Button>
          </Tooltip>
        </Grid>
      </Grid>

      {isMobile ? (
        <>
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
                          icon={<DiamondIcon fontSize="small" />}
                          label={`Shape: ${sale.shape}`}
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
                            sx={{ 
                              textTransform: 'none',
                              color: theme.palette.primary.main
                            }}
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
          
          <Box sx={{ 
            display: { xs: 'flex', sm: 'none' }, 
            justifyContent: 'center', 
            mt: 2,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            p: 1
          }}>
            <TablePagination
              component="div"
              count={searchedSales.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{
                '& .MuiTablePagination-toolbar': {
                  padding: 0,
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  marginBottom: 1,
                  fontSize: '0.75rem'
                }
              }}
            />
          </Box>
        </>
      ) : (
        <Paper sx={{ 
          borderRadius: 3, 
          overflow: 'hidden', 
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ 
                backgroundColor: theme.palette.primary.light,
                '& .MuiTableCell-root': {
                  color: theme.palette.primary.contrastText,
                  fontWeight: 600
                }
              }}>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell>Shape</TableCell>
                  <TableCell align="right">Weight</TableCell>
                  <TableCell align="right">Price/CT</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSales.length > 0 ? (
                  paginatedSales.map((sale) => (
                    <TableRow 
                      key={sale.id}
                      hover
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:nth-of-type(odd)': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <TableCell>{sale.code}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{sale.name}</TableCell>
                      <TableCell align="right">{sale.quantity}</TableCell>
                      <TableCell>{sale.shape}</TableCell>
                      <TableCell align="right">{parseFloat(sale.carat_sold).toFixed(2)} ct</TableCell>
                      <TableCell align="right">${sale.marking_price}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ${parseFloat(sale.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{new Date(sale.sold_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Tooltip title="Download Invoice">
                            <IconButton 
                              color="primary" 
                              size="small" 
                              onClick={() => handleDownload(sale.id)}
                              sx={{
                                backgroundColor: theme.palette.primary.light,
                                '&:hover': {
                                  backgroundColor: theme.palette.primary.main,
                                  color: 'white'
                                }
                              }}
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Record">
                            <IconButton 
                              color="error" 
                              size="small" 
                              onClick={() => handleDeleteClick(sale.id)}
                              sx={{
                                backgroundColor: theme.palette.error.light,
                                '&:hover': {
                                  backgroundColor: theme.palette.error.main,
                                  color: 'white'
                                }
                              }}
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
                    <TableCell colSpan={9}>
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
              count={searchedSales.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ 
                borderTop: '1px solid',
                borderColor: 'divider',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: '0.875rem'
                }
              }}
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
        <DialogTitle sx={{ 
          fontWeight: 600,
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.primary.contrastText
        }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          <Typography>
            Are you sure you want to delete this sale record? This action cannot be undone.
          </Typography>
          {selectedSaleId && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              backgroundColor: 'grey.100', 
              borderRadius: 2,
              borderLeft: `4px solid ${theme.palette.error.main}`
            }}>
              <Typography variant="body2" fontWeight={500}>
                Sale ID: {selectedSaleId}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleDeleteCancel} 
            sx={{ 
              borderRadius: 2, 
              px: 3, 
              textTransform: 'none',
              border: '1px solid',
              borderColor: 'divider'
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
              textTransform: 'none',
              boxShadow: 'none'
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