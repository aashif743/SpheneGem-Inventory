import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28FDB', '#FF6384'];

const Dashboard = () => {
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

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/dashboard/stats');
        setStats({
          totalGemstones: response.data.totalGemstones,
          totalCarat: response.data.totalCarats,
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
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>📊 Dashboard</h2>

      {/* Stat Cards */}
      <div style={statCardGrid}>
        <StatCard title="Total Gemstones" value={stats.totalGemstones} />
        <StatCard title="Total Carat in Stock" value={stats.totalCarat} />
        <StatCard title="Total Sales" value={stats.totalSales} />
        <StatCard title="Total Revenue" value={`Rs. ${stats.totalRevenue.toLocaleString()}`} />
      </div>

      {/* Market & Sales Overview */}
      <div style={twoColumnGrid}>
        <div style={cardStyle}>
          <h3>🪙 Gemstones Added Monthly</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData.monthlyGemstones}>
              <Area type="monotone" dataKey="count" stroke="#3498db" fill="#3498db33" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <h3>📈 Sales Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.salesData}>
              <Line type="monotone" dataKey="value" stroke="#2ecc71" strokeWidth={2} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Charts */}
      <div style={bottomGrid}>
        <div style={cardStyle}>
          <h3>💹 Sales Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <h3>💰 Revenue by Gemstone</h3>
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
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div style={statCardStyle}>
    <h4 style={{ margin: '0 0 10px 0', color: '#7f8c8d' }}>{title}</h4>
    <p style={{ margin: '0', fontSize: '22px', fontWeight: 'bold', color: '#2c3e50' }}>{value}</p>
  </div>
);

// Styles
const statCardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '20px',
  marginBottom: '30px'
};

const statCardStyle = {
  background: '#fff',
  borderRadius: '10px',
  padding: '20px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

const twoColumnGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
  marginBottom: '30px'
};

const bottomGrid = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: '20px'
};

const cardStyle = {
  background: 'white',
  borderRadius: '10px',
  padding: '20px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

export default Dashboard;
