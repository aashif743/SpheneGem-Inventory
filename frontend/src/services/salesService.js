import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/sales';

export const getAllSales = async () => {
  return await axios.get(API_BASE);
};
