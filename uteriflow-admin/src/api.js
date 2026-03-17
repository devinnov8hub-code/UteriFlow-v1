import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

const client = axios.create({ baseURL: BASE })

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('uf_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  r => r.data,
  err => {
    const data = err.response?.data
    // Normalise so callers always get a .message property
    if (data && typeof data === 'object') {
      return Promise.reject({
        message: data.error || data.message || JSON.stringify(data),
        code: data.code,
        status: err.response?.status,
      })
    }
    return Promise.reject({ message: err.message || 'Network error. Is the backend running?' })
  }
)

export const api = {
  // Auth
  login:          (b) => client.post('/auth/login', b),
  sendOTP:        (b) => client.post('/auth/email/send-otp', b),
  verifyOTP:      (b) => client.post('/auth/email/verify', b),
  createPassword: (b) => client.post('/auth/password/create', b),
  forgotPassword: (b) => client.post('/auth/password/forgot', b),
  verifyCode:     (b) => client.post('/auth/password/verify-code', b),
  resetPassword:  (b) => client.post('/auth/password/reset', b),
  logout:         ()  => client.post('/auth/logout'),

  // Admin — stats & analytics
  getStats:       ()         => client.get('/admin/stats'),
  getAnalytics:   (days=30)  => client.get(`/admin/analytics?days=${days}`),

  // Admin — users
  getUsers:       (p={})     => client.get('/admin/users', { params: p }),
  getUser:        (id)       => client.get(`/admin/users/${id}`),
  updateUser:     (id, b)    => client.patch(`/admin/users/${id}`, b),
  deleteUser:     (id)       => client.delete(`/admin/users/${id}`),
  grantAdmin:     (id)       => client.post(`/admin/users/${id}/grant-admin`),
  revokeAdmin:    (id)       => client.post(`/admin/users/${id}/revoke-admin`),
  banUser:        (id, b)    => client.post(`/admin/users/${id}/ban`, b),
  unbanUser:      (id)       => client.delete(`/admin/users/${id}/ban`),

  // Admin — posts
  getPosts:       (p={})     => client.get('/admin/posts', { params: p }),
  getPost:        (id)       => client.get(`/admin/posts/${id}`),
  createPost:     (b)        => client.post('/admin/posts', b),
  updatePost:     (id, b)    => client.patch(`/admin/posts/${id}`, b),
  deletePost:     (id)       => client.delete(`/admin/posts/${id}`),

  // Admin — comments
  getComments:    (postId, p={}) => client.get(`/admin/posts/${postId}/comments`, { params: p }),
  deleteComment:  (id)       => client.delete(`/admin/comments/${id}`),
  flagComment:    (id)       => client.patch(`/admin/comments/${id}/flag`),
}

export default api
