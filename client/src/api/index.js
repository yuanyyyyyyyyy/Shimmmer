import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
    }
    return Promise.reject(error)
  }
)

// 认证
export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (oldPassword, newPassword) => 
    api.post('/auth/change-password', { oldPassword, newPassword })
}

// 照片
export const photos = {
  list: (params) => api.get('/photos', { params }),
  get: (id) => api.get(`/photos/${id}`),
  getRandomDiary: () => api.get('/photos/random/diary'),
  getTimelineStats: () => api.get('/photos/stats/timeline'),
  getMapMarkers: () => api.get('/photos/map/markers'),
  getReview: (year) => api.get(`/review/${year}`),
  getReviewYears: () => api.get('/review/years'),
  create: (data) => api.post('/photos', data),
  update: (id, data) => api.put(`/photos/${id}`, data),
  delete: (id) => api.delete(`/photos/${id}`)
}

// 收藏
export const favorites = {
  list: (fingerprint) => api.get('/favorites', { params: { fingerprint } }),
  check: (photoId, fingerprint) => 
    api.get('/favorites/check', { params: { photo_id: photoId, fingerprint } }),
  add: (photoId, fingerprint) => 
    api.post('/favorites', { photo_id: photoId, fingerprint }),
  remove: (photoId, fingerprint) => 
    api.delete(`/favorites/${photoId}`, { params: { fingerprint } })
}

// 上传
export const upload = {
  single: (file) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  multiple: (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('photos', file))
    return api.post('/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// 标签
export const tags = {
  list: () => api.get('/tags'),
  getPopular: (limit) => api.get('/tags/popular', { params: { limit } }),
  create: (data) => api.post('/tags', data),
  delete: (id) => api.delete(`/tags/${id}`),
  getPhotoTags: (photoId) => api.get(`/tags/photo/${photoId}`),
  setPhotoTags: (photoId, tagIds) => api.post(`/tags/photo/${photoId}`, { tagIds })
}

export default api
