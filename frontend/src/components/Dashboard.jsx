import React, { useEffect, useState } from 'react';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Grid,
  Skeleton
} from '@mui/material';
import {
  Diamond as DiamondIcon,
  Scale as ScaleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingIcon,
  CalendarMonth as CalendarIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28FDB', '#FF6384'];

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [stats, setStats] = useState({
    totalGemstones: 0,
    totalCarat: 0,
    totalSales: 0,
    totalRevenue: 0,
  });

  const [chartData, setChartData] = useState({
    monthlyGemstones: [],
    revenueByGemstone: [],
    salesData: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Wake up the Render server before fetching
    axios.get("https://sphenegem-inventory.onrender.com")
      .catch(err => console.log("Warming up server..."))
      .finally(() => fetchDashboardStats());
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(
        'https://sphenegem-inventory.onrender.com/api/dashboard/stats',
        { timeout: 60000 }
      );

      setStats({
        totalGemstones: response.data.totalGemstones,
        totalCarat: response.data.totalCarat,
        totalSales: response.data.totalSales,
        totalRevenue: response.data.totalRevenue,
      });

      setChartData({
        monthlyGemstones: response.data.monthlyGemstones,
        revenueByGemstone: response.data.revenueByGemstone,
        salesData: response.data.monthlyGemstones.map(item => ({
          day: item.month,
          value: item.count
        }))
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);

      if (err.code === 'ECONNABORTED') {
        alert("The request timed out. Server might be sleeping. Please try again in a moment.");
      } else if (err.response) {
        alert(`Server responded with error: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.request) {
        alert("No response from server. Please check your internet or server status.");
      } else {
        alert("An unexpected error occurred while loading the dashboard.");
      }

      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon }) => (
    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          {icon}
          <Typography variant="subtitle2" color="text.secondary" ml={1}>
            {title}
          </Typography>
        </Box>
        {loading ? (
          <Skeleton variant="text" width="60%" height={40} />
        ) : (
          <Typography variant="h5" fontWeight={600}>
            {value}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Dashboard Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Key metrics and analytics at a glance
      </Typography>

      {error && (
        <Typography variant="body2" color="error" mb={2}>
          Failed to load dashboard data. Please try again later.
        </Typography>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Gemstones" value={stats.totalGemstones} icon={<DiamondIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Carat" value={stats.totalCarat} icon={<ScaleIcon color="secondary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Sales" value={stats.totalSales} icon={<TrendingIcon color="success" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} icon={<MoneyIcon color="warning" />} />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CalendarIcon color="action" />
                <Typography variant="h6" ml={1}>
                  Monthly Gemstones Added
                </Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData.monthlyGemstones}>
                    <Area type="monotone" dataKey="count" stroke="#3498db" fill="#3498db33" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingIcon color="action" />
                <Typography variant="h6" ml={1}>
                  Sales Trend
                </Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData.salesData}>
                    <Line type="monotone" dataKey="value" stroke="#2ecc71" strokeWidth={2} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BarChartIcon color="action" />
                <Typography variant="h6" ml={1}>
                  Sales Analytics
                </Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PieChartIcon color="action" />
                <Typography variant="h6" ml={1}>
                  Revenue Distribution
                </Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.revenueByGemstone}
                      dataKey="total_revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {chartData.revenueByGemstone.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
