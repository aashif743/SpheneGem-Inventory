import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/sales';

export const deleteSale = (id) => {
  return axios.delete(`${API_BASE_URL}/${id}`);
};

export const getAllSales = async () => {
  return await axios.get(API_BASE_URL);
};
