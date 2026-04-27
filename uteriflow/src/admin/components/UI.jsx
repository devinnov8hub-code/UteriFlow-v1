import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function Btn({ children, variant='primary', size='md', loading, className='', style: styleProp={}, ...props }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', borderRadius: '8px', fontFamily: 'inherit', fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
    transition: 'all 0.18s ease', outline: 'none',
  }
  const sizes = {
    sm:  { padding: '7px 14px', fontSize: '13px' },
    md:  { padding: '11px 20px', fontSize: '14px' },
    lg:  { padding: '14px 28px', fontSize: '15px' },
    full:{ padding: '13px 20px', fontSize: '15px', width: '100%' },
  }
  const variants = {
    primary: { background: 'var(--purple)', color: '#fff' },
    danger:  { background: 'var(--red)',    color: '#fff' },
    ghost:   { background: 'transparent',  color: 'var(--gray-600)', border: '1.5px solid var(--gray-200)' },
    soft:    { background: 'var(--gray-100)', color: 'var(--gray-700)' },
    purple:  { background: 'var(--purple-pale)', color: 'var(--purple)' },
  }
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], opacity: loading ? 0.7 : 1, ...styleProp }} {...props}>
      {loading && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />}
      {children}
    </button>
  )
}

export function Input({ label, icon: Icon, error, className='', ...props }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      {label && <label style={{ display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }}>{label}</label>}
      <div style={{ position:'relative' }}>
        {Icon && <Icon size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }} />}
        <input
          style={{
            width: '100%', padding: Icon ? '11px 14px 11px 38px' : '11px 14px',
            border: `1.5px solid ${error ? 'var(--red)' : 'var(--gray-200)'}`,
            borderRadius: '8px', fontSize: '14px', color: 'var(--gray-900)',
            background: 'white', outline: 'none', transition: 'border-color 0.2s',
            fontFamily: 'inherit',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--gray-200)'}
          {...props}
        />
      </div>
      {error && <p style={{ color:'var(--red)', fontSize:'12px', marginTop:'4px' }}>{error}</p>}
    </div>
  )
}

export function Card({ children, style={}, className='', ...props }) {
  return (
    <div style={{ background:'white', borderRadius:'var(--radius)', boxShadow:'var(--shadow-sm)', ...style }} {...props}>
      {children}
    </div>
  )
}

export function Badge({ children, color='purple' }) {
  const colors = {
    purple: { bg:'var(--purple-pale)', color:'var(--purple)' },
    green:  { bg:'var(--green-light)', color:'#065f46' },
    red:    { bg:'var(--red-light)',   color:'#991b1b' },
    yellow: { bg:'var(--yellow-light)',color:'#92400e' },
    gray:   { bg:'var(--gray-100)',    color:'var(--gray-600)' },
  }
  const c = colors[color] || colors.purple
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'4px',
      padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
      background: c.bg, color: c.color,
    }}>
      {children}
    </span>
  )
}

export function Avatar({ name, email, size=32 }) {
  const str = name || email || '?'
  const initials = str.slice(0, 2).toUpperCase()
  const colors = ['#7c3aed','#4a1060','#6b2d8b','#9b59b6','#a78bfa']
  const i = str.charCodeAt(0) % colors.length
  return (
    <div style={{
      width: size, height: size, borderRadius:'50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${colors[i]}, ${colors[(i+2)%colors.length]})`,
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'white', fontSize: size * 0.36, fontWeight:600,
    }}>
      {initials}
    </div>
  )
}

export function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:1000, backdropFilter:'blur(4px)',
      }}
    >
      <div style={{
        background:'white', borderRadius:'16px', padding:'36px',
        maxWidth:'420px', width:'90%', animation:'fadeIn 0.2s ease',
        boxShadow:'var(--shadow-lg)',
      }}>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, icon='🗑️', confirmLabel='Confirm', danger=true, loading }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'52px', marginBottom:'16px' }}>{icon}</div>
        <h3 style={{ fontSize:'20px', fontWeight:700, marginBottom:'8px' }}>{title}</h3>
        <p style={{ fontSize:'14px', color:'var(--gray-500)', lineHeight:1.6, marginBottom:'28px' }}>{description}</p>
        <div style={{ display:'flex', gap:'12px', justifyContent:'center' }}>
          <Btn variant='ghost' onClick={onClose}>Cancel</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </Modal>
  )
}

export function Spinner({ size=28 }) {
  return (
    <div style={{
      width: size, height: size,
      border: '3px solid var(--gray-200)',
      borderTopColor: 'var(--purple)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

export function Empty({ icon='💬', message='Nothing here yet' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 20px', gap:'12px', color:'var(--gray-400)' }}>
      <span style={{ fontSize:'44px', opacity:0.5 }}>{icon}</span>
      <p style={{ fontSize:'14px' }}>{message}</p>
    </div>
  )
}

export function Dropdown({ trigger, items }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position:'relative' }} onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div style={{
          position:'absolute', right:0, top:'calc(100% + 4px)',
          background:'white', borderRadius:'10px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
          border:'1px solid var(--gray-100)', minWidth:'180px',
          zIndex:500, overflow:'hidden', animation:'fadeIn 0.15s ease',
        }}>
          {items.map((item, i) =>
            item === '---'
              ? <div key={i} style={{ height:'1px', background:'var(--gray-100)' }} />
              : (
                <button key={i} onClick={() => { item.onClick(); setOpen(false) }}
                  style={{
                    display:'flex', alignItems:'center', gap:'10px',
                    padding:'11px 16px', width:'100%', border:'none',
                    background:'transparent', color: item.danger ? 'var(--red)' : 'var(--gray-700)',
                    fontSize:'13px', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                    transition:'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'var(--red-light)' : 'var(--gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {item.icon && <span>{item.icon}</span>}
                  {item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display:'flex', gap:'4px', background:'var(--gray-100)',
      padding:'4px', borderRadius:'10px', width:'fit-content',
    }}>
      {tabs.map(tab => (
        <button key={tab.value} onClick={() => onChange(tab.value)}
          style={{
            padding:'8px 18px', borderRadius:'7px', fontSize:'13px',
            fontWeight: active === tab.value ? 600 : 500,
            border:'none', fontFamily:'inherit', cursor:'pointer',
            background: active === tab.value ? 'white' : 'transparent',
            color: active === tab.value ? 'var(--gray-900)' : 'var(--gray-500)',
            boxShadow: active === tab.value ? 'var(--shadow-sm)' : 'none',
            transition:'all 0.15s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder='Search...' }) {
  return (
    <div style={{ position:'relative', flex:1 }}>
      <svg style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', padding:'10px 14px 10px 38px',
          border:'1.5px solid var(--gray-200)', borderRadius:'8px',
          fontSize:'14px', outline:'none', background:'white',
          fontFamily:'inherit', transition:'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
      />
    </div>
  )
}

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom:'28px' }}>
      <h1 style={{ fontSize:'28px', fontWeight:700, color:'var(--gray-900)' }}>{title}</h1>
      {subtitle && <p style={{ fontSize:'14px', color:'var(--purple-light)', marginTop:'4px' }}>{subtitle}</p>}
    </div>
  )
}
