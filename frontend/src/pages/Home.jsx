import React from 'react';
import AddGemstoneForm from '../components/AddGemstoneForm';
import GemstoneTable from '../components/GemstoneTable';
import SalesTable from '../components/SalesTable';
import Dashboard from '../components/Dashboard';

const Home = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Dashboard />
      <AddGemstoneForm />
      <hr />
      <GemstoneTable />
      <hr />
      <SalesTable />
    </div>
  );
};

export default Home;
