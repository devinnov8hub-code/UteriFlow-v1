import axios from 'axios'

/**
 * Resolve the API base URL.
 *
 * In production VITE_API_URL is set in Vercel (or .env.production). All admin
 * routes are under /api/v1/... on the backend. To make this resilient to common
 * misconfiguration, we accept either form:
 *
 *   VITE_API_URL=https://uteri-flow-v1.vercel.app          ← we'll append /api/v1
 *   VITE_API_URL=https://uteri-flow-v1.vercel.app/api/v1   ← used as-is
 *   VITE_API_URL=http://localhost:3000                     ← we'll append /api/v1
 *
 * Without this, a base URL missing the version prefix produces 404s like
 * `POST /auth/email/send-otp not found` because the request hits the bare
 * domain instead of /api/v1/auth/email/send-otp.
 */
function resolveBase(envValue) {
  const raw = (envValue || 'http://localhost:3000').replace(/\/+$/, '')
  return /\/api\/v\d+$/.test(raw) ? raw : `${raw}/api/v1`
}

const BASE = resolveBase(import.meta.env.VITE_API_URL)

const client = axios.create({ baseURL: BASE })

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('uf_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  r => {
   
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
      // Only kick the user back to the admin login if they were already inside
      // the admin section. A stray 401 should NOT bounce a landing-page visitor
      // (e.g. someone reading /articles) onto an admin login screen.
      const onAdmin = window.location.pathname.startsWith('/admin')
      const onLogin = window.location.pathname === '/admin/login'
      if (onAdmin && !onLogin) window.location.href = '/admin/login'
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
  
  login:          (b)  => client.post('/auth/login', b),
  sendOTP:        (b)  => client.post('/auth/email/send-otp', b),
  verifyOTP:      (b)  => client.post('/auth/email/verify', b),
  createPassword: (b)  => client.post('/auth/password/create', b),
  forgotPassword: (b)  => client.post('/auth/password/forgot', b),
  verifyCode:     (b)  => client.post('/auth/password/verify-code', b),
  resetPassword:  (b)  => client.post('/auth/password/reset', b),
  refreshToken:   (rt) => client.post('/auth/token/refresh', { refreshToken: rt }),
  logout:         ()   => client.post('/auth/logout'),

  
  getStats:       ()        => client.get('/admin/stats'),
  // Community analytics is mounted at /admin/community/analytics (NOT /admin/analytics).
  // Pass `days` via params instead of a hand-built query string so axios encodes it correctly.
  getAnalytics:   (days=30) => client.get('/admin/community/analytics', { params: { days } }),

  
  getUsers:       (p={})  => client.get('/admin/users',            { params: p }),
  getUser:        (id)    => client.get(`/admin/users/${id}`),
  updateUser:     (id, b) => client.patch(`/admin/users/${id}`,   b),
  deleteUser:     (id)    => client.delete(`/admin/users/${id}`),
  grantAdmin:     (id)    => client.post(`/admin/users/${id}/grant-admin`),
  revokeAdmin:    (id)    => client.post(`/admin/users/${id}/revoke-admin`),
  banUser:        (id, b) => client.post(`/admin/users/${id}/ban`, b),
  unbanUser:      (id)    => client.delete(`/admin/users/${id}/ban`),

  
  getPeriodLogs:   (p={})  => client.get('/admin/period-logs',          { params: p }),
  deletePeriodLog: (id)    => client.delete(`/admin/period-logs/${id}`),

  // Posts and comments live under /admin/community in the backend
  // (Backend/src/routes/community.js mounted at /api/v1/admin/community).
  // Earlier these were calling /admin/posts and /admin/comments which
  // 404, breaking ContentPage and AnalyticsPage entirely. Fixed below.
  getPosts:       (p={})    => client.get('/admin/community/posts',          { params: p }),
  getPost:        (id)      => client.get(`/admin/community/posts/${id}`),
  createPost:     (b)       => client.post('/admin/community/posts',         b),
  updatePost:     (id, b)   => client.patch(`/admin/community/posts/${id}`,  b),
  deletePost:     (id)      => client.delete(`/admin/community/posts/${id}`),

  getComments:    (postId, p={}) => client.get(`/admin/community/posts/${postId}/comments`, { params: p }),
  deleteComment:  (id)      => client.delete(`/admin/community/comments/${id}`),
  flagComment:    (id)      => client.patch(`/admin/community/comments/${id}/flag`),
  unflagComment:  (id)      => client.patch(`/admin/community/comments/${id}/unflag`),
  broadcastNotification: (b) => client.post('/admin/notifications/broadcast', b),
}

export default api
