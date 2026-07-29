import axios from 'axios'

const API_KEY = (import.meta as ImportMeta & { env?: { VITE_API_KEY?: string } }).env?.VITE_API_KEY ?? 'shopmind_dev_api_key_2025'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
  timeout: 60000,
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.detail?.message ?? error.response?.data?.message ?? error.message
    return Promise.reject(new Error(message))
  }
)
