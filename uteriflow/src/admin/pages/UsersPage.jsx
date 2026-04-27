import { useState, useEffect, useCallback } from 'react'
import { Search, ShieldCheck, ShieldOff, Trash2, Ban, CheckCircle, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../api'
import { PageHeader, Spinner, Empty, ConfirmModal, Badge, Dropdown, SearchInput, Btn } from '../components/UI'

const pctColor = (n) => n >= 70 ? 'green' : n >= 40 ? 'yellow' : 'red'

function BanBadge({ ban }) {
  if (!ban) return <Badge color="green">Active</Badge>
  if (ban.ban_type === 'permanent') return <Badge color="red">Banned</Badge>
  const until = ban.banned_until ? new Date(ban.banned_until) : null
  if (until && until < new Date()) return <Badge color="green">Active</Badge>
  return <Badge color="yellow">Temp ban</Badge>
}

function UserRow({ user, onRefresh }) {
  const [confirm, setConfirm] = useState(null) // { action, label }
  const [busy, setBusy]       = useState(false)

  const act = async (fn, successMsg) => {
    setBusy(true)
    try {
      await fn()
      toast.success(successMsg)
      onRefresh()
    } catch (e) {
      toast.error(e.message || 'Action failed')
    } finally {
      setBusy(false); setConfirm(null)
    }
  }

  const name    = user.display_name || user.email?.split('@')[0] || '—'
  const ago     = user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : '—'
  const isBanned = !!user.ban && (user.ban.ban_type === 'permanent' || (user.ban.banned_until && new Date(user.ban.banned_until) > new Date()))

  const menuItems = [
    !isBanned
      ? { icon: '⏱', label: 'Ban 7 days',     onClick: () => setConfirm({ action: () => api.banUser(user.id, { ban_type: 'temporary', days: 7 }),  label: `Temporarily ban ${name}?` }) }
      : { icon: '✅', label: 'Unban user',      onClick: () => setConfirm({ action: () => api.unbanUser(user.id),                                    label: `Unban ${name}?` }) },
    { icon: '🚫', label: 'Ban permanently',    onClick: () => setConfirm({ action: () => api.banUser(user.id, { ban_type: 'permanent' }),              label: `Permanently ban ${name}?` }), danger: true },
    '---',
    { icon: '🛡', label: 'Grant admin',        onClick: () => setConfirm({ action: () => api.grantAdmin(user.id),                                      label: `Grant admin to ${name}?` }) },
    { icon: '🔓', label: 'Revoke admin',       onClick: () => setConfirm({ action: () => api.revokeAdmin(user.id),                                     label: `Revoke admin from ${name}?` }) },
    '---',
    { icon: '🗑', label: 'Delete user',        onClick: () => setConfirm({ action: () => api.deleteUser(user.id),                                       label: `Permanently delete ${name}? This cannot be undone.` }), danger: true },
  ]

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
        <td style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{name}</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{user.email}</div>
        </td>
        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--gray-500)' }}>{ago}</td>
        <td style={{ padding: '14px 16px' }}>
          <Badge color={user.onboarding_completed ? 'green' : 'yellow'}>
            {user.onboarding_completed ? 'Complete' : 'Pending'}
          </Badge>
        </td>
        <td style={{ padding: '14px 16px' }}><BanBadge ban={user.ban} /></td>
        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--gray-500)' }}>
          {user.personality_type?.replace(/_/g, ' ') || '—'}
        </td>
        <td style={{ padding: '14px 16px' }}>
          <Dropdown
            trigger={
              <button style={{ width:'30px', height:'30px', borderRadius:'6px', background:'var(--gray-100)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--gray-500)' }}>
                <MoreVertical size={14} />
              </button>
            }
            items={menuItems}
          />
        </td>
      </tr>
      {confirm && (
        <ConfirmModal
          title="Confirm action"
          message={confirm.label}
          onConfirm={() => act(confirm.action, 'Done!')}
          onCancel={() => setConfirm(null)}
          loading={busy}
        />
      )}
    </>
  )
}

export default function UsersPage() {
  const [users, setUsers]     = useState([])
  const [total, setTotal]     = useState(0)
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [offset, setOffset]   = useState(0)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getUsers({ limit, offset, search: search || undefined })
      setUsers(res.users ?? [])
      setTotal(res.pagination?.total ?? 0)
    } catch (e) {
      toast.error(e.message || 'Failed to load users')
    } finally { setLoading(false) }
  }, [offset, search])

  useEffect(() => { load() }, [load])

  const onSearch = (v) => { setSearch(v); setOffset(0) }

  return (
    <div>
      <style>{`
        .users-table { width:100%; border-collapse:collapse; background:white; border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-sm); }
        .users-table th { padding:12px 16px; text-align:left; font-size:12px; font-weight:600; color:var(--gray-500); text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid var(--gray-100); }
        @media(max-width:640px) { .users-table td:nth-child(3),.users-table th:nth-child(3){ display:none; } }
      `}</style>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <PageHeader title="Users" subtitle={`${total.toLocaleString()} total members`} />
        <SearchInput value={search} onChange={onSearch} placeholder="Search by name or email…" />
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'80px' }}><Spinner size={36} /></div>
      ) : users.length === 0 ? (
        <Empty message="No users found" />
      ) : (
        <>
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Joined</th>
                <th>Onboarding</th>
                <th>Status</th>
                <th>Personality</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => <UserRow key={u.id} user={u} onRefresh={load} />)}
            </tbody>
          </table>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'16px' }}>
            <span style={{ fontSize:'13px', color:'var(--gray-400)' }}>
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <div style={{ display:'flex', gap:'8px' }}>
              <Btn variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>Previous</Btn>
              <Btn variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>Next</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
