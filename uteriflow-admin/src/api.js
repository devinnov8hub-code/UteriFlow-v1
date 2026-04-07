import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

const client = axios.create({ baseURL: BASE })

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('uf_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  r => {
    // Backend wraps all responses as { status: 'success', data: {...}, error: null }
    // Unwrap to give pages the inner data directly
    const body = r.data
    if (body && body.status === 'success' && body.data !== undefined) {
      return body.data
    }
    return body
  },
  err => {
    const data   = err.response?.data
    const status = err.response?.status

    if (status === 401) {
      localStorage.removeItem('uf_token')
      localStorage.removeItem('uf_refresh_token')
      localStorage.removeItem('uf_expires_at')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }

    if (data && typeof data === 'object') {
      return Promise.reject({
        message: data.error?.message || data.error || data.message || JSON.stringify(data),
        code:    data.code,
        status,
      })
    }

    return Promise.reject({
      message: err.message === 'Network Error'
        ? 'Cannot reach the backend. Make sure it is running on port 3000.'
        : (err.message || 'Something went wrong'),
      status,
    })
  }
)

export const api = {
  // ── Auth ──────────────────────────────────────────────────────
  login:          (b)  => client.post('/auth/login', b),
  sendOTP:        (b)  => client.post('/auth/email/send-otp', b),
  verifyOTP:      (b)  => client.post('/auth/email/verify', b),
  createPassword: (b)  => client.post('/auth/password/create', b),
  forgotPassword: (b)  => client.post('/auth/password/forgot', b),
  verifyCode:     (b)  => client.post('/auth/password/verify-code', b),
  resetPassword:  (b)  => client.post('/auth/password/reset', b),
  refreshToken:   (rt) => client.post('/auth/token/refresh', { refreshToken: rt }),
  logout:         ()   => client.post('/auth/logout'),

  // ── Overview ──────────────────────────────────────────────────
  getStats:       ()        => client.get('/admin/stats'),
  getAnalytics:   (days=30) => client.get(`/admin/analytics?days=${days}`),

  // ── Users ─────────────────────────────────────────────────────
  getUsers:       (p={})  => client.get('/admin/users',            { params: p }),
  getUser:        (id)    => client.get(`/admin/users/${id}`),
  updateUser:     (id, b) => client.patch(`/admin/users/${id}`,   b),
  deleteUser:     (id)    => client.delete(`/admin/users/${id}`),
  grantAdmin:     (id)    => client.post(`/admin/users/${id}/grant-admin`),
  revokeAdmin:    (id)    => client.post(`/admin/users/${id}/revoke-admin`),
  banUser:        (id, b) => client.post(`/admin/users/${id}/ban`, b),
  unbanUser:      (id)    => client.delete(`/admin/users/${id}/ban`),

  // ── Period logs ───────────────────────────────────────────────
  getPeriodLogs:   (p={})  => client.get('/admin/period-logs',          { params: p }),
  deletePeriodLog: (id)    => client.delete(`/admin/period-logs/${id}`),

  // ── Posts (admin) ─────────────────────────────────────────────
  getPosts:       (p={})    => client.get('/admin/posts',          { params: p }),
  getPost:        (id)      => client.get(`/admin/posts/${id}`),
  createPost:     (b)       => client.post('/admin/posts',         b),
  updatePost:     (id, b)   => client.patch(`/admin/posts/${id}`,  b),
  deletePost:     (id)      => client.delete(`/admin/posts/${id}`),

  // ── Comments (admin) ──────────────────────────────────────────
  getComments:    (postId, p={}) => client.get(`/admin/posts/${postId}/comments`, { params: p }),
  deleteComment:  (id)      => client.delete(`/admin/comments/${id}`),
  flagComment:    (id)      => client.patch(`/admin/comments/${id}/flag`),
  unflagComment:  (id)      => client.patch(`/admin/comments/${id}/unflag`),

  // ── Notifications ─────────────────────────────────────────────
  broadcastNotification: (b) => client.post('/admin/notifications/broadcast', b),
}

export default api
