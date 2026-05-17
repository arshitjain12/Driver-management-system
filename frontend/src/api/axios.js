import axios from 'axios'

const api = axios.create({ baseURL: '/api' })


api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('dms_user')
  if (stored) {
    const { token } = JSON.parse(stored)
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})


api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dms_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
