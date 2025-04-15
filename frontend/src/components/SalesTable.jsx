import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { getAllSales } from '../services/salesService';

const SalesTable = () => {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await getAllSales();
        setSales(res.data);
      } catch (err) {
        console.error('Failed to fetch sales', err);
      }
    };

    fetchSales();
  }, []);

  const handleDownload = (saleId) => {
    const url = `http://localhost:5000/invoices/invoice_${saleId}.pdf`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${saleId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSales = sales.filter((sale) =>
    sale.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.carat_sold.toString().includes(searchTerm)
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            label="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>
        💰 Sales History
      </Typography>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Sold Weight</TableCell>
              <TableCell>Marking Price/CT</TableCell>
              <TableCell>Selling Price/CT</TableCell>
              <TableCell>Sold Date</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{sale.code}</TableCell>
                  <TableCell>{sale.quantity}</TableCell>
                  <TableCell>{sale.name}</TableCell>
                  <TableCell>{sale.carat_sold}</TableCell>
                  <TableCell>{sale.marking_price}</TableCell>
                  <TableCell>{sale.selling_price}</TableCell>
                  <TableCell>{new Date(sale.sold_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleDownload(sale.id)}
                    >
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No matching results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SalesTable;
