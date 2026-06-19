import axios, { AxiosError } from "axios";
import { getToken, removeToken } from "../services/token.service";
import type { ApiErrorResponse } from "../types/api.types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

axiosClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      removeToken();
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong.";

    return Promise.reject({
      status: error.response?.status,
      message,
      data: error.response?.data,
    });
  }
);

export default axiosClient;