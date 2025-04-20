import axios from 'axios';

const API_URL = "https://sphenegem-inventory.onrender.com/api/gemstones";

export const addGemstone = async (formData) => {
  return await axios.post(`${API_URL}/add`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getAllGemstones = async () => {
  return await axios.get(`${API_URL}/all`);
};

export const deleteGemstone = (id) => {
  return axios.delete(`${API_URL}/${id}`);
};

export const updateGemstone = (id, data) => {
  return axios.put(`${API_URL}/${id}`, data);
};

export const searchGemstones = (query) => {
  return axios.get(`${API_URL}/search?query=${encodeURIComponent(query)}`);
};
