import axios from 'axios';
import axiosRetry from 'axios-retry';

const API_URL = `${process.env.REACT_APP_API_URL}/api/gemstones`;

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
  return await axios.put(`${API_URL}/${id}`, data, {
    ...axiosConfig,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Top up an existing gemstone's stock. Sends JSON (not FormData) so no image
// is ever included in the request — the backend leaves image_url untouched.
//
// Retries are explicitly disabled: this call is NOT idempotent. If a response
// were lost after the server had already committed, a retry would add the
// stock a second time. axios-retry does not retry PATCH by default, but we
// pin it here so the guarantee does not depend on that default.
export const addStock = async (id, { quantity_added, carat_added }) => {
  return await axios.patch(
    `${API_URL}/${id}/add-stock`,
    { quantity_added, carat_added },
    { ...axiosConfig, 'axios-retry': { retries: 0 } }
  );
};

/**
 * Sell several gemstones together on ONE invoice.
 *
 * @param {Array} items [{ gemstone_id, quantity, carat_sold, selling_price, total_amount }]
 *
 * Retries are disabled: this is not idempotent — a retry after a lost response
 * would record the entire sale twice and deduct the stock twice.
 */
export const sellMultipleGemstones = async (items) => {
  return await axios.post(
    `${API_URL}/sell-multiple`,
    { items },
    { ...axiosConfig, 'axios-retry': { retries: 0 } }
  );
};

export const getStockHistory = async (id) => {
  return await axios.get(`${API_URL}/${id}/stock-history`, axiosConfig);
};

export const searchGemstones = async (query) => {
  return await axios.get(`${API_URL}/search?query=${encodeURIComponent(query)}`, axiosConfig);
};

// group: 'all' | 'category' | 'shape' | 'carat' | 'dimension'.
// Omitting it (or passing 'all') returns the full multi-section report.
export const downloadStockSummary = async (group = 'all') => {
  const qs = group && group !== 'all' ? `?group=${encodeURIComponent(group)}` : '';
  return await axios.get(`${API_URL}/summary-report${qs}`, { ...axiosConfig, responseType: 'blob' });
};
