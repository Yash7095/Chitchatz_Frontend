import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : import.meta.env.MODE === "development"
    ? "http://10.238.229.243:5001/api"
    : "/api",
  withCredentials: true,
});
