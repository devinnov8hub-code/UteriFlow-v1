import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart2, FileText, Settings, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/content',   icon: FileText,  label: 'Manage Content' },
  { to: '/settings',  icon: Settings,  label: 'Settings' },
]

/* White drop SVG — used everywhere as the brand icon */
const DropIcon = ({ size = 20 }) => (
  <svg width={size} height={Math.round(size * 1.27)} viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2C11 2 2 12.5 2 18C2 22.4 6.1 26 11 26C15.9 26 20 22.4 20 18C20 12.5 11 2 11 2Z" fill="white"/>
    <circle cx="14.5" cy="15.5" r="2.5" fill="rgba(74,16,96,0.3)"/>
  </svg>
)

function Brand() {
  return (
    <div style={{
      display:'flex', alignItems:'center',
      padding:'0 24px 24px',
      borderBottom:'1px solid rgba(255,255,255,0.1)',
      flexShrink:0,
    }}>
      <img
        src="/logo.png"
        alt="UteriFlow"
        style={{ height:'24px', objectFit:'contain' }}
      />
    </div>
  )
}

function NavItems({ onNav }) {
  const { logout } = useAuth()
  return (
    <>
      <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:'2px', marginTop:'8px' }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onNav}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:'12px',
              padding:'12px 24px',
              color: isActive ? 'white' : 'rgba(255,255,255,0.60)',
              fontSize:'14px', fontWeight:500, textDecoration:'none',
              background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
              borderLeft: isActive ? '3px solid white' : '3px solid transparent',
              transition:'all 0.15s',
            })}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <button onClick={logout} style={{
        display:'flex', alignItems:'center', gap:'12px',
        padding:'12px 24px', background:'transparent', border:'none',
        color:'rgba(255,255,255,0.55)', fontSize:'14px', fontWeight:500,
        cursor:'pointer', width:'100%',
        borderTop:'1px solid rgba(255,255,255,0.1)',
        marginTop:'4px', fontFamily:'inherit', transition:'color 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.color='white'}
        onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.55)'}
      >
        <LogOut size={18} /><span>Logout</span>
      </button>
    </>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', paddingTop:'28px', paddingBottom:'16px' }}>
      <Brand />
      <NavItems onNav={() => setMobileOpen(false)} />
    </div>
  )

  return (
    <>
      <style>{`
        .sidebar-desktop {
          width: var(--sidebar-w);
          background: var(--purple);
          position: fixed; top:0; left:0; bottom:0;
          z-index:100; display:flex; flex-direction:column;
        }
        .sidebar-topbar {
          display: none;
          position: fixed; top:0; left:0; right:0;
          background: var(--purple); padding: 14px 20px;
          align-items: center; justify-content: space-between;
          z-index: 200; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .sidebar-topbar-brand {
          display:flex; align-items:center; gap:8px;
          color:white; font-size:15px; font-weight:600;
        }
        .sidebar-drawer-overlay {
          display:none; position:fixed; inset:0;
          background:rgba(0,0,0,0.45); z-index:300;
          backdrop-filter:blur(2px);
        }
        .sidebar-drawer {
          width:240px; background:var(--purple);
          height:100vh; display:flex; flex-direction:column;
          position:relative;
        }
        .sidebar-drawer-close {
          position:absolute; top:14px; right:14px;
          background:rgba(255,255,255,0.1); border:none;
          color:white; border-radius:8px; padding:6px;
          cursor:pointer; display:flex;
        }
        @media(max-width:768px) {
          .sidebar-desktop { display:none; }
          .sidebar-topbar  { display:flex; }
          .sidebar-drawer-overlay.open { display:flex; }
        }
        @media(min-width:769px) {
          .sidebar-drawer-overlay { display:none !important; }
        }
      `}</style>

      {/* Desktop */}
      <div className="sidebar-desktop">{sidebarContent}</div>

      {/* Mobile top bar */}
      <div className="sidebar-topbar">
        <div className="sidebar-topbar-brand">
          <img src="/logo.png" alt="UteriFlow" style={{ height:'22px', objectFit:'contain' }} />
        </div>
        <button onClick={() => setMobileOpen(true)} style={{ background:'rgba(255,255,255,0.12)', border:'none', color:'white', borderRadius:'8px', padding:'8px', cursor:'pointer', display:'flex' }}>
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`sidebar-drawer-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)}>
        <div className="sidebar-drawer" onClick={e => e.stopPropagation()}>
          <button className="sidebar-drawer-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
          <div style={{ paddingTop:'28px', flex:1, display:'flex', flexDirection:'column' }}>
            <Brand />
            <NavItems onNav={() => setMobileOpen(false)} />
          </div>
        </div>
      </div>
    </>
  )
}
