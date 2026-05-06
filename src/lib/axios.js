import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : import.meta.env.MODE === "development"
    ? "http://192.168.1.16:5001/api"
    : "/api",
  withCredentials: true,
});
