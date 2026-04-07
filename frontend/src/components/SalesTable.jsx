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

// Module-level cache — persists across remounts
let _salesCache = [];
let _salesCacheTime = 0;
const SALES_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const SalesTable = () => {
  const [sales, setSales] = useState(_salesCache);
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

  const fetchSales = async (force = false) => {
    if (!force && _salesCache.length > 0 && Date.now() - _salesCacheTime < SALES_CACHE_TTL) {
      setSales(_salesCache);
      return;
    }
    try {
      const res = await getAllSales();
      _salesCache = res.data;
      _salesCacheTime = Date.now();
      setSales(res.data);
    } catch (err) {
      console.error('Failed to fetch sales', err);
    }
  };

  const handleDownload = (saleId) => {
    const url = `${process.env.REACT_APP_API_URL}/invoices/invoice_${saleId}.pdf`;
  
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
      _salesCacheTime = 0; // invalidate cache
      fetchSales(true);
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
    const url = `${process.env.REACT_APP_API_URL}/invoices/statement?range=${filterRange}`;
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
              backgroundColor: '#E8F5E9',
              color: '#1B5E20',
              borderColor: '#A5D6A7',
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
                  borderColor: '#2E7D32'
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
                          label={`$${parseFloat(sale.total_amount).toFixed(2)}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: '#E8F5E9',
                            color: '#1B5E20',
                            border: '1px solid #A5D6A7',
                          }}
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
                          label={`${parseFloat(sale.carat_sold).toFixed(2)} ct`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<Paid fontSize="small" />}
                          label={`$${parseFloat(sale.marking_price).toFixed(2)}/ct`}
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

                      <Box sx={{ display: 'flex', gap: 1, pt: 0.5 }}>
                        <Button
                          fullWidth
                          startIcon={<Download sx={{ fontSize: 16 }} />}
                          onClick={() => handleDownload(sale.id)}
                          sx={{
                            borderRadius: '8px',
                            py: '7px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            border: '1.5px solid #2E7D32',
                            color: '#2E7D32',
                            bgcolor: 'transparent',
                            transition: 'all 0.18s ease',
                            '&:hover': {
                              bgcolor: '#2E7D32',
                              color: '#fff',
                              boxShadow: '0 3px 10px rgba(46,125,50,0.28)',
                            },
                          }}
                        >
                          Invoice
                        </Button>
                        <Button
                          fullWidth
                          startIcon={<Delete sx={{ fontSize: 16 }} />}
                          onClick={() => handleDeleteClick(sale.id)}
                          sx={{
                            borderRadius: '8px',
                            py: '7px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            border: '1.5px solid #C62828',
                            color: '#C62828',
                            bgcolor: 'transparent',
                            transition: 'all 0.18s ease',
                            '&:hover': {
                              bgcolor: '#C62828',
                              color: '#fff',
                              boxShadow: '0 3px 10px rgba(198,40,40,0.28)',
                            },
                          }}
                        >
                          Delete
                        </Button>
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
                backgroundColor: '#1B5E20',
                '& .MuiTableCell-root': {
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  letterSpacing: '0.02em',
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
                      <TableCell align="right">${parseFloat(sale.marking_price).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ${parseFloat(sale.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{new Date(sale.sold_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Tooltip title="Download Invoice" arrow>
                            <Button
                              size="small"
                              startIcon={<Download sx={{ fontSize: 13 }} />}
                              onClick={() => handleDownload(sale.id)}
                              sx={{
                                borderRadius: '7px',
                                py: '4px',
                                px: '10px',
                                textTransform: 'none',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                border: '1.5px solid #2E7D32',
                                color: '#2E7D32',
                                bgcolor: 'transparent',
                                minWidth: 0,
                                transition: 'all 0.18s ease',
                                '&:hover': {
                                  bgcolor: '#2E7D32',
                                  color: '#fff',
                                  boxShadow: '0 2px 8px rgba(46,125,50,0.30)',
                                  transform: 'translateY(-1px)',
                                },
                                '&:active': { transform: 'translateY(0)' },
                              }}
                            >
                              Invoice
                            </Button>
                          </Tooltip>
                          <Tooltip title="Delete Record" arrow>
                            <Button
                              size="small"
                              startIcon={<Delete sx={{ fontSize: 13 }} />}
                              onClick={() => handleDeleteClick(sale.id)}
                              sx={{
                                borderRadius: '7px',
                                py: '4px',
                                px: '10px',
                                textTransform: 'none',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                border: '1.5px solid #C62828',
                                color: '#C62828',
                                bgcolor: 'transparent',
                                minWidth: 0,
                                transition: 'all 0.18s ease',
                                '&:hover': {
                                  bgcolor: '#C62828',
                                  color: '#fff',
                                  boxShadow: '0 2px 8px rgba(198,40,40,0.30)',
                                  transform: 'translateY(-1px)',
                                },
                                '&:active': { transform: 'translateY(0)' },
                              }}
                            >
                              Delete
                            </Button>
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
          fontWeight: 700,
          fontSize: '1rem',
          bgcolor: '#B71C1C',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
          px: 2.5,
        }}>
          <Delete sx={{ fontSize: 20 }} /> Confirm Deletion
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3, px: 2.5 }}>
          <Typography variant="body1" color="text.primary">
            Are you sure you want to delete this sale record?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            This action <strong>cannot be undone</strong>.
          </Typography>
          {selectedSaleId && (
            <Box sx={{
              mt: 2,
              p: 1.5,
              bgcolor: '#FFF8F8',
              borderRadius: 2,
              borderLeft: '4px solid #C62828',
            }}>
              <Typography variant="body2" fontWeight={600} color="#B71C1C">
                Sale ID: #{selectedSaleId}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              borderRadius: '8px',
              px: 3,
              textTransform: 'none',
              fontWeight: 600,
              border: '1.5px solid #ccc',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'grey.100', borderColor: '#999' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            startIcon={<Delete sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: '8px',
              px: 3,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#C62828',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(198,40,40,0.30)',
              transition: 'all 0.18s ease',
              '&:hover': {
                bgcolor: '#B71C1C',
                boxShadow: '0 4px 12px rgba(198,40,40,0.40)',
              },
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