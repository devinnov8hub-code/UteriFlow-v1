import { useState } from 'react'
import { Bell, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { PageHeader, Btn } from '../components/UI'

const TYPES = [
  { value: 'tip',    label: '💡 Tip'         },
  { value: 'system', label: '🔔 System Alert' },
]

export default function NotificationsPage() {
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [type,    setType]    = useState('tip')
  const [userIds, setUserIds] = useState('')
  const [busy,    setBusy]    = useState(false)

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Title and body are required'); return }
    setBusy(true)
    try {
      const payload = { title: title.trim(), body: body.trim(), type }
      if (userIds.trim()) {
        payload.userIds = userIds.split(',').map(s => s.trim()).filter(Boolean)
      }
      const res = await api.broadcastNotification(payload)
      const msg = (res?.data ?? res)?.message ?? 'Notification sent!'
      toast.success(msg)
      setTitle(''); setBody(''); setUserIds('')
    } catch (e) {
      toast.error(e.message || 'Failed to send')
    } finally { setBusy(false) }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid var(--gray-200)',
    borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
    color: 'var(--gray-900)', transition: 'border-color 0.2s',
  }
  const labelStyle = { display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }

  return (
    <div style={{ maxWidth: '640px' }}>
      <PageHeader
        title="Notifications"
        subtitle="Broadcast a message to all users or specific user IDs."
      />

      <div style={{ background:'white', borderRadius:'var(--radius)', padding:'28px', boxShadow:'var(--shadow-sm)', marginTop:'24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'24px' }}>
          <div style={{ width:'40px', height:'40px', background:'var(--purple-pale)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bell size={20} color="var(--purple)" />
          </div>
          <div>
            <div style={{ fontWeight:600, fontSize:'15px' }}>Send Notification</div>
            <div style={{ fontSize:'12px', color:'var(--gray-400)' }}>Leave User IDs blank to broadcast to all users</div>
          </div>
        </div>

        <div style={{ marginBottom:'16px' }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display:'flex', gap:'8px' }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                padding:'8px 16px', borderRadius:'8px', border:'1.5px solid',
                borderColor: type === t.value ? 'var(--purple)' : 'var(--gray-200)',
                background:  type === t.value ? 'var(--purple-pale)' : 'white',
                color:        type === t.value ? 'var(--purple)' : 'var(--gray-600)',
                fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'inherit',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:'16px' }}>
          <label style={labelStyle}>Title *</label>
          <input
            style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Your period is coming up!"
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--gray-200)'}
          />
        </div>

        <div style={{ marginBottom:'16px' }}>
          <label style={labelStyle}>Body *</label>
          <textarea
            style={{ ...inputStyle, resize:'vertical', minHeight:'90px' }}
            value={body} onChange={e => setBody(e.target.value)}
            placeholder="e.g. Based on your cycle, your period is expected in 3 days. Log your symptoms early!"
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--gray-200)'}
          />
        </div>

        <div style={{ marginBottom:'24px' }}>
          <label style={labelStyle}>User IDs <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional — comma separated UUIDs, leave blank for all)</span></label>
          <textarea
            style={{ ...inputStyle, resize:'vertical', minHeight:'64px', fontSize:'12px', fontFamily:'monospace' }}
            value={userIds} onChange={e => setUserIds(e.target.value)}
            placeholder="uuid-1, uuid-2, uuid-3"
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--gray-200)'}
          />
        </div>

        <Btn loading={busy} onClick={send} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <Send size={16} /> Send Notification
        </Btn>
      </div>
    </div>
  )
}
