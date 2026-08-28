import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
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
  Tooltip,
  InputAdornment,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Download,
  Delete,
  Search,
  Receipt,
  CalendarToday,
  PictureAsPdf,
  FilterAlt
} from '@mui/icons-material';
import { getAllSales, deleteSale } from '../services/salesService';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { DATA, notifyDataChanged } from '../services/dataRefresh';
import { money2, carat2 } from '../utils/decimal';

/**
 * Where a sale's invoice PDF lives.
 *
 * Sales made before multi-invoice support have invoice_id = NULL and keep
 * their original per-sale file (`invoice_<saleId>.pdf`). Sales that are part
 * of a combined invoice share one file named after the invoice number.
 */
const invoiceUrlFor = (sale) => {
  const base = `${process.env.REACT_APP_API_URL}/invoices`;
  return sale.invoice_id
    ? `${base}/INV-${String(sale.invoice_id).padStart(6, '0')}.pdf`
    : `${base}/invoice_${sale.id}.pdf`;
};

const invoiceLabelFor = (sale) =>
  sale.invoice_id ? `INV-${String(sale.invoice_id).padStart(6, '0')}` : `#${sale.id}`;

// Module-level cache — persists across remounts
let _salesCache = [];
let _salesCacheTime = 0;
const SALES_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const SalesTable = ({ active = true }) => {
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

  // Refresh when this screen is shown, when the tab regains focus, and
  // whenever a sale is recorded anywhere in the app.
  useAutoRefresh({
    active,
    watch: [DATA.SALES],
    onRefresh: () => fetchSales(true),
  });

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

  const handleDownload = (sale) => {
    const url = invoiceUrlFor(sale);

    // Trigger file download
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${invoiceLabelFor(sale)}.pdf`;
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
      notifyDataChanged([DATA.SALES, DATA.DASHBOARD]);
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

  // Null-safe: a sale row with a missing code or name must not crash the page
  const searchedSales = filteredSales.filter((sale) => {
    const q = searchTerm.toLowerCase();
    return (
      (sale.code ?? '').toLowerCase().includes(q) ||
      (sale.name ?? '').toLowerCase().includes(q) ||
      String(sale.carat_sold ?? '').includes(searchTerm) ||
      invoiceLabelFor(sale).toLowerCase().includes(q)
    );
  });

  // Totals for the strip above the toolbar — derived from the rows already
  // loaded, so they follow the active search and date filter.
  const summary = useMemo(() => searchedSales.reduce(
    (acc, sale) => ({
      count:  acc.count + 1,
      carat:  acc.carat + (parseFloat(sale.carat_sold) || 0),
      amount: acc.amount + (parseFloat(sale.total_amount) || 0),
    }),
    { count: 0, carat: 0, amount: 0 }
  ), [searchedSales]);

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
    <Box>
      {/* Figures for whatever is currently filtered — the screen title lives
          in the app header, so this strip carries the numbers instead. */}
      <Box
        sx={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: { xs: 2, sm: 3.5 }, mb: 2.5, px: { xs: 0.5, sm: 0 },
        }}
      >
        {[
          { label: 'Sales',       value: summary.count.toLocaleString('en-US') },
          { label: 'Carat Sold',  value: carat2(summary.carat) },
          { label: 'Revenue',     value: money2(summary.amount) },
        ].map((s) => (
          <Box key={s.label}>
            <Typography variant="eyebrow" sx={{ display: 'block' }}>{s.label}</Typography>
            <Typography variant="data" sx={{ fontSize: '1.02rem', fontWeight: 600, color: 'text.primary' }}>
              {s.value}
            </Typography>
          </Box>
        ))}
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
          {paginatedSales.length === 0 ? (
            <Box sx={{ py: 7, textAlign: 'center', color: 'text.disabled' }}>
              <Receipt sx={{ fontSize: 34, opacity: 0.4, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {searchTerm ? 'No sales match that search' : 'No sales recorded yet'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {searchTerm ? 'Try a different code, name or invoice number.' : 'Sales appear here once you sell a stone.'}
              </Typography>
            </Box>
          ) : (
            <Box className="sg-stagger" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {paginatedSales.map((sale) => (
                <Card key={sale.id} sx={{ overflow: 'hidden' }}>
                  <Box sx={{ p: 1.75 }}>
                    {/* Invoice number leads: it is how the client refers to a
                        sale, and it groups the rows sold together. */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
                      <Chip
                        label={invoiceLabelFor(sale)}
                        size="small"
                        sx={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.68rem',
                          ...(sale.invoice_id
                            ? { bgcolor: '#E9F2EA', color: '#1B5E20', border: '1px solid #CBE2CF' }
                            : { bgcolor: '#F2F1EC', color: 'text.secondary' }),
                        }}
                      />
                      <Typography variant="data" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                        {new Date(sale.sold_at).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }} noWrap>
                          {sale.name || 'Unnamed stone'}
                        </Typography>
                        <Typography
                          variant="data"
                          sx={{ display: 'block', fontSize: '0.74rem', color: 'text.secondary', mt: 0.15 }}
                        >
                          {sale.code}{sale.shape ? `  ·  ${sale.shape}` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography variant="eyebrow" sx={{ display: 'block', fontSize: '0.58rem' }}>
                          Amount
                        </Typography>
                        <Typography variant="data" sx={{ fontSize: '1rem', fontWeight: 700, color: '#1B5E20' }}>
                          {money2(sale.total_amount)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2.5, mt: 1.25 }}>
                      {[
                        { label: 'Qty',    value: `${sale.quantity}` },
                        { label: 'Carat',  value: carat2(sale.carat_sold) },
                        { label: 'Cost/ct',value: money2(sale.marking_price) },
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

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      borderTop: '1px solid', borderColor: 'divider',
                      bgcolor: '#FAFAF7',
                    }}
                  >
                    <ButtonBase
                      onClick={() => handleDownload(sale)}
                      aria-label={`Download invoice ${invoiceLabelFor(sale)}`}
                      sx={{
                        minHeight: 48, gap: 0.75, color: '#2E7D32', fontWeight: 700, fontSize: '0.8rem',
                        '&:active': { bgcolor: 'rgba(46,125,50,0.08)' },
                      }}
                    >
                      <Download sx={{ fontSize: 18 }} /> Invoice
                    </ButtonBase>
                    <ButtonBase
                      onClick={() => handleDeleteClick(sale.id)}
                      aria-label={`Delete sale ${sale.code}`}
                      sx={{
                        minHeight: 48, gap: 0.75, color: '#B3261E', fontWeight: 700, fontSize: '0.8rem',
                        borderLeft: '1px solid', borderColor: 'divider',
                        '&:active': { bgcolor: 'rgba(179,38,30,0.08)' },
                      }}
                    >
                      <Delete sx={{ fontSize: 18 }} /> Delete
                    </ButtonBase>
                  </Box>
                </Card>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <TablePagination
              component="div"
              count={searchedSales.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{ borderTop: 'none', '& .MuiTablePagination-toolbar': { padding: 0, minHeight: 44 } }}
            />
          </Box>
        </>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '14px', overflow: 'hidden', boxShadow: 'none' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
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
                      <TableCell>
                        <Chip
                          label={invoiceLabelFor(sale)}
                          size="small"
                          variant={sale.invoice_id ? 'filled' : 'outlined'}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            ...(sale.invoice_id
                              ? { bgcolor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7' }
                              : { color: 'text.secondary' }),
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{sale.code}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{sale.name}</TableCell>
                      <TableCell align="right">{sale.quantity}</TableCell>
                      <TableCell>{sale.shape}</TableCell>
                      <TableCell align="right">{carat2(sale.carat_sold)}</TableCell>
                      <TableCell align="right">{money2(sale.marking_price)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {money2(sale.total_amount)}
                      </TableCell>
                      <TableCell>{new Date(sale.sold_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Tooltip title="Download Invoice" arrow>
                            <Button
                              size="small"
                              startIcon={<Download sx={{ fontSize: 13 }} />}
                              onClick={() => handleDownload(sale)}
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
                    <TableCell colSpan={10}>
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