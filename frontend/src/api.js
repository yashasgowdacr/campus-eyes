import axios from 'axios';

// Automatically uses VITE_API_URL when set on Vercel, with fallback to local development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;
