import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, Btn } from '../components/UI'

async function updateSupabaseUser(fields) {
  const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
  const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
  const token         = localStorage.getItem('uf_token')

  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL not set in .env')
  if (!token)        throw new Error('Not authenticated')

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey':        SUPABASE_ANON || '',
    },
    body: JSON.stringify(fields),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.msg || data.message || data.error_description || 'Update failed')
  }
  return data
}

function Field({ label, type = 'text', value, onChange, placeholder, right }) {
  const [showPw, setShowPw] = useState(false)
  const inputType = type === 'password' ? (showPw ? 'text' : 'password') : type

  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: type === 'password' ? '11px 40px 11px 14px' : '11px 14px',
            border: '1.5px solid var(--gray-200)', borderRadius: '8px',
            fontSize: '14px', outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 0.2s', color: 'var(--gray-900)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', padding: 0 }}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, icon, children, onSave, onDiscard, saving }) {
  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '28px 32px', boxShadow: 'var(--shadow-sm)', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', paddingBottom: '16px', borderBottom: '1px solid var(--gray-100)' }}>
        <span style={{ width: '36px', height: '36px', background: 'var(--purple-pale)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', flexShrink: 0 }}>
          {icon}
        </span>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)' }}>{title}</h3>
      </div>
      {children}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={onDiscard}>Discard</Btn>
        <Btn variant="primary" loading={saving} onClick={onSave}>Save changes</Btn>
      </div>
    </div>
  )
}

export default function SettingsPage() {

  const [newEmail, setNewEmail]     = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

 
  const [newPass, setNewPass]       = useState('')
  const [confirmPass, setConfirm]   = useState('')
  const [savingPass, setSavingPass] = useState(false)

  async function saveEmail() {
    if (!newEmail.trim()) return toast.error('Please enter a new email address')
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(newEmail)) return toast.error('Please enter a valid email address')

    setSavingEmail(true)
    try {
      await updateSupabaseUser({ email: newEmail.trim() })
      toast.success('Email updated! Check your new inbox for a confirmation link.')
      setNewEmail('')
    } catch (e) {
      toast.error(e.message || 'Failed to update email')
    } finally { setSavingEmail(false) }
  }

  async function savePassword() {
    if (!newPass)         return toast.error('Please enter a new password')
    if (newPass.length < 6) return toast.error('Password must be at least 6 characters')
    if (newPass !== confirmPass) return toast.error('Passwords do not match')

    setSavingPass(true)
    try {
      await updateSupabaseUser({ password: newPass })
      toast.success('Password updated successfully!')
      setNewPass(''); setConfirm('')
    } catch (e) {
      toast.error(e.message || 'Failed to update password')
    } finally { setSavingPass(false) }
  }

  return (
    <div>
      <style>{`
        .settings-hero { display:flex; align-items:center; gap:28px; background:white; border-radius:var(--radius); padding:28px 32px; box-shadow:var(--shadow-sm); margin-bottom:24px; }
        .settings-hero-img { width:120px; height:120px; flex-shrink:0; background:linear-gradient(135deg,var(--purple-pale),#e0e7ff); border-radius:16px; display:flex; align-items:center; justify-content:center; }
        @media(max-width:640px) {
          .settings-hero { flex-direction:column; align-items:flex-start; padding:20px; gap:16px; }
          .settings-hero-img { width:72px; height:72px; }
        }
      `}</style>

      <PageHeader title="Settings" subtitle="Update your admin credentials and preferences." />

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
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--purple)', marginBottom: '8px' }}>Account Configuration</h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: 1.7, maxWidth: '420px' }}>
            Update your admin email or password below. Changes to email require confirmation from your new inbox.
          </p>
        </div>
      </div>

      {/* ── Email section ── */}
      <SectionCard
        title="Change Email Address"
        icon={<Mail size={16} />}
        onSave={saveEmail}
        onDiscard={() => setNewEmail('')}
        saving={savingEmail}
      >
        <div style={{ maxWidth: '420px' }}>
          <Field
            label="New email address"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Enter your new email address"
          />
          <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '8px', lineHeight: 1.6 }}>
            ℹ️ After saving, confirmation link would be send to your new email. You must click it to complete the change.
          </p>
        </div>
      </SectionCard>

      {/* ── Password section ── */}
      <SectionCard
        title="Change Password"
        icon={<Lock size={16} />}
        onSave={savePassword}
        onDiscard={() => { setNewPass(''); setConfirm('') }}
        saving={savingPass}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '640px' }}>
          <Field
            label="New password"
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="Min. 6 characters"
          />
          <Field
            label="Confirm new password"
            type="password"
            value={confirmPass}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat new password"
          />
        </div>

        {/* Live match indicator */}
        {newPass && confirmPass && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            {newPass === confirmPass
              ? <><Check size={13} color="var(--green)" /> <span style={{ color: 'var(--green)' }}>Passwords match</span></>
              : <><span style={{ color: 'var(--red)' }}>✗ Passwords don't match</span></>
            }
          </div>
        )}

        <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '12px', lineHeight: 1.6 }}>
          ℹ️ You'll remain logged in after changing your password. Use it next time you sign in.
        </p>

        <style>{`
          @media(max-width:480px) {
            .pw-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </SectionCard>
    </div>
  )
}
