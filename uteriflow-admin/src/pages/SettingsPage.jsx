import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, Btn } from '../components/UI'

export default function SettingsPage() {
  const [email, setEmail]         = useState('')
  const [oldPass, setOldPass]     = useState('')
  const [confirmPass, setConfirm] = useState('')
  const [days, setDays]           = useState('30')
  const [saving, setSaving]       = useState(false)

  function discard() {
    setEmail(''); setOldPass(''); setConfirm(''); setDays('30')
    toast.success('Changes discarded')
  }
  async function save() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    toast.success('Settings saved!')
    setSaving(false)
  }

  const field = (label, icon, type, value, onChange, placeholder) => (
    <div>
      <label style={{ display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }}>{label}</label>
      <div style={{ position:'relative' }}>
        {icon}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          style={{ width:'100%', padding:'11px 14px 11px 38px', border:'1.5px solid var(--gray-200)', borderRadius:'8px', fontSize:'14px', outline:'none', fontFamily:'inherit', transition:'border-color 0.2s' }}
          onFocus={e => e.target.style.borderColor='var(--accent)'}
          onBlur={e => e.target.style.borderColor='var(--gray-200)'}
        />
      </div>
    </div>
  )

  const iconStyle = { position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }

  return (
    <div>
      <style>{`
        .settings-hero  { display:flex; align-items:center; gap:28px; background:white; border-radius:var(--radius); padding:28px 32px; box-shadow:var(--shadow-sm); margin-bottom:24px; }
        .settings-grid  { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px; }
        .settings-btns  { display:flex; justify-content:flex-end; gap:12px; flex-wrap:wrap; }
        .settings-hero-img { width:130px; height:130px; flex-shrink:0; background:linear-gradient(135deg,var(--purple-pale),#e0e7ff); border-radius:16px; display:flex; align-items:center; justify-content:center; }
        @media(max-width:640px) {
          .settings-hero  { flex-direction:column; align-items:flex-start; padding:24px 20px; gap:18px; }
          .settings-hero-img { width:80px; height:80px; }
          .settings-grid  { grid-template-columns:1fr; gap:14px; }
          .settings-btns  { justify-content:stretch; }
          .settings-btns button { flex:1; }
        }
      `}</style>

      <PageHeader title="Settings" subtitle="Administrator settings"/>

      {/* Hero */}
      <div className="settings-hero">
        <div className="settings-hero-img">
          <svg viewBox="0 0 100 100" width="70" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="28" width="84" height="62" rx="8" fill="var(--purple-pale)" stroke="var(--purple-light)" strokeWidth="1.5"/>
            <rect x="18" y="40" width="36" height="7" rx="3.5" fill="var(--purple-light)" opacity="0.6"/>
            <rect x="18" y="53" width="24" height="5" rx="2.5" fill="var(--purple-light)" opacity="0.4"/>
            <rect x="18" y="64" width="64" height="18" rx="5" fill="white" stroke="var(--gray-200)" strokeWidth="1"/>
            <circle cx="76" cy="25" r="16" fill="var(--purple)" opacity="0.2"/>
            <circle cx="76" cy="25" r="10" fill="var(--purple)" opacity="0.3"/>
            <path d="M71 25l4 4 8-8" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 style={{ fontSize:'20px', fontWeight:700, color:'var(--purple)', marginBottom:'10px' }}>Account Configuration</h2>
          <p style={{ fontSize:'14px', color:'var(--gray-500)', lineHeight:1.7, maxWidth:'420px' }}>
            Manage your administrative credentials and platform preferences. Update your security settings and adjust how your analytics data is processed.
          </p>
        </div>
      </div>

      {/* Form */}
      <div style={{ background:'white', borderRadius:'var(--radius)', padding:'28px 32px', boxShadow:'var(--shadow-sm)' }}>
        <div className="settings-grid">
          {field('Change email',
            <Mail size={14} style={iconStyle}/>,
            'email', email, e => setEmail(e.target.value), 'Old email'
          )}
          {field('Change password',
            <Lock size={14} style={iconStyle}/>,
            'password', oldPass, e => setOldPass(e.target.value), 'Old password'
          )}
          {field('Confirm password',
            <Lock size={14} style={iconStyle}/>,
            'password', confirmPass, e => setConfirm(e.target.value), 'Old password'
          )}
          <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }}>Change Analytics date</label>
            <select value={days} onChange={e => setDays(e.target.value)}
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'8px', fontSize:'14px', outline:'none', fontFamily:'inherit', background:'white', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center' }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor='var(--gray-200)'}
            >
              <option value="30">30 days</option>
              <option value="90">3 months</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
              <option value="9999">All time</option>
            </select>
          </div>
        </div>
        <div className="settings-btns">
          <Btn variant="ghost" onClick={discard}>Discard Changes</Btn>
          <Btn variant="primary" loading={saving} onClick={save}>Save Settings</Btn>
        </div>
      </div>
    </div>
  )
}
