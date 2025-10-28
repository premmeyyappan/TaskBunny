import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@taskbunny/auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
