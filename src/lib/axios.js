import axios from "axios";

// export const axiosInstance = axios.create({
//   baseURL: "http://localhost:5001/api",
//   withCredentials: true,
// });

export const axiosInstance = axios.create({
  baseURL: "http://192.168.1.16:5001/api",
  withCredentials: true,
});
