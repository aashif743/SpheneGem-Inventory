import axios from 'axios';
import axiosRetry from 'axios-retry';

const API_BASE_URL = "https://sphenegem-stock-production.up.railway.app/api/sales";

// Setup retry logic for axios
axiosRetry(axios, { 
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay 
});

// Default axios config
const axiosConfig = {
  timeout: 60000 // 60 seconds
};

export const deleteSale = async (id) => {
  return await axios.delete(`${API_BASE_URL}/${id}`, axiosConfig);
};

export const getAllSales = async () => {
  return await axios.get(API_BASE_URL, axiosConfig);
};
