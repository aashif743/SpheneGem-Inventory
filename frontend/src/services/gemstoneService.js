import axios from 'axios';
import axiosRetry from 'axios-retry';

const API_URL = "https://sphenegem-stock-production.up.railway.app/api/gemstones";

// Setup retry logic for axios
axiosRetry(axios, { 
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay 
});

// Default axios config
const axiosConfig = {
  timeout: 60000 // 60 seconds
};

export const addGemstone = async (formData) => {
  return await axios.post(`${API_URL}/add`, formData, {
    ...axiosConfig,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getAllGemstones = async () => {
  return await axios.get(`${API_URL}/all`, axiosConfig);
};

export const deleteGemstone = async (id) => {
  return await axios.delete(`${API_URL}/${id}`, axiosConfig);
};

export const updateGemstone = async (id, data) => {
  return await axios.put(`${API_URL}/${id}`, data, axiosConfig);
};

export const searchGemstones = async (query) => {
  return await axios.get(`${API_URL}/search?query=${encodeURIComponent(query)}`, axiosConfig);
};
