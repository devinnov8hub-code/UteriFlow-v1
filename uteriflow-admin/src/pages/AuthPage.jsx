import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import api from '../api'
import { Btn } from '../components/UI'

function PwInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <Lock size={14} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }} />
        <input
          type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
          style={{ width:'100%', padding:'11px 40px 11px 38px', border:'1.5px solid var(--gray-200)', borderRadius:'8px', fontSize:'14px', outline:'none', fontFamily:'inherit', color:'var(--gray-900)', transition:'border-color 0.2s' }}
          onFocus={e => e.target.style.borderColor='#c084fc'}
          onBlur={e => e.target.style.borderColor='var(--gray-200)'}
        />
        <button type="button" onClick={() => setShow(s => !s)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', cursor:'pointer', color:'var(--gray-400)', display:'flex', padding:0 }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

function EmailInput({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom:'18px' }}>
      <label style={{ display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <Mail size={14} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none' }} />
        <input
          type="email" value={value} onChange={onChange} placeholder={placeholder}
          style={{ width:'100%', padding:'11px 14px 11px 38px', border:'1.5px solid var(--gray-200)', borderRadius:'8px', fontSize:'14px', outline:'none', fontFamily:'inherit', color:'var(--gray-900)', transition:'border-color 0.2s' }}
          onFocus={e => e.target.style.borderColor='#c084fc'}
          onBlur={e => e.target.style.borderColor='var(--gray-200)'}
        />
      </div>
    </div>
  )
}

/* Logo — purple version for white background */
function Logo() {
  return (
    <div style={{ display:'flex', justifyContent:'center', marginBottom:'28px' }}>
      <img src="/Logo-purple.png" alt="UteriFlow" style={{ height:'32px', objectFit:'contain' }} />
    </div>
  )
}

/* Left panel — brand + dazzle illustration */
function AuthLeft() {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div style={{
      width:'100%', background:'var(--purple)', padding:'48px',
      display:'flex', flexDirection:'column', justifyContent:'space-between',
      color:'white', position:'relative', overflow:'hidden', minHeight:'100vh',
    }}>
      {/* decorative circles */}
      <div style={{ position:'absolute', width:'380px', height:'380px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', top:'-100px', right:'-100px', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:'260px', height:'260px', borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:'-60px', left:'-60px', pointerEvents:'none' }} />

      {/* brand row — white logo on purple background */}
      <div style={{ display:'flex', alignItems:'center', position:'relative', zIndex:1 }}>
        <img
          src="/logo.png"
          alt="UteriFlow"
          style={{ height:'26px', objectFit:'contain' }}
        />
      </div>

      {/* headline + desc */}
      <div style={{ position:'relative', zIndex:1 }}>
        <h1 style={{ fontFamily:'DM Serif Display, serif', fontSize:'clamp(26px, 2.8vw, 42px)', lineHeight:1.2, marginBottom:'18px' }}>
          Administrator Dashboard
        </h1>
        <p style={{ fontSize:'14px', opacity:0.72, lineHeight:1.8, maxWidth:'360px' }}>
          Manage members with ease, create and share posts that keep everyone informed.
          Track activities and stay updated in real time.
        </p>
      </div>

      {/* illustration — public/dazzle-working-dashboard-auth-flow.png */}
      <div style={{ position:'relative', zIndex:1 }}>
        {!imgFailed ? (
          <img
            src="/dazzle-working-dashboard-auth-flow.png"
            alt="Dashboard illustration"
            style={{ width:'100%', maxWidth:'420px', objectFit:'contain', display:'block' }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          /* fallback SVG if image not found */
          <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'16px', padding:'28px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:'200px' }}>
              <rect x="18" y="18" width="224" height="144" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
              <rect x="34" y="36" width="82" height="10" rx="5" fill="rgba(255,255,255,0.45)"/>
              <rect x="34" y="54" width="56" height="7" rx="3.5" fill="rgba(255,255,255,0.28)"/>
              <rect x="34" y="76" width="72" height="50" rx="8" fill="rgba(255,255,255,0.13)"/>
              <rect x="118" y="76" width="72" height="50" rx="8" fill="rgba(255,255,255,0.13)"/>
              <rect x="34" y="140" width="156" height="8" rx="4" fill="rgba(255,255,255,0.18)"/>
              <circle cx="198" cy="60" r="26" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
              <polyline points="188,60 195,68 210,50" stroke="rgba(255,255,255,0.85)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="46" y="88" width="50" height="6" rx="3" fill="rgba(255,255,255,0.3)"/>
              <rect x="46" y="102" width="36" height="6" rx="3" fill="rgba(255,255,255,0.2)"/>
              <rect x="130" y="88" width="50" height="6" rx="3" fill="rgba(255,255,255,0.3)"/>
              <rect x="130" y="102" width="36" height="6" rx="3" fill="rgba(255,255,255,0.2)"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  const { login, saveToken } = useAuth()
  const nav = useNavigate()

  const [screen, setScreen]   = useState('login')
  const [loading, setLoading] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass]   = useState('')

  const [signupEmail, setSignupEmail]     = useState('')
  const [signupPass, setSignupPass]       = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [otpStep, setOtpStep]             = useState(false)
  const [otpCode, setOtpCode]             = useState('')

  const [forgotEmail, setForgotEmail]   = useState('')
  const [resetCode, setResetCode]       = useState('')
  const [resetPass, setResetPass]       = useState('')
  const [resetConfirm, setResetConfirm] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!loginEmail || !loginPass) return toast.error('Please fill in all fields')
    setLoading(true)
    try { await login(loginEmail, loginPass); nav('/analytics') }
    catch (err) { toast.error(err.message || 'Invalid email or password') }
    finally { setLoading(false) }
  }

  async function handleSendOTP(e) {
    e.preventDefault()
    if (signupPass !== signupConfirm) return toast.error('Passwords do not match')
    setLoading(true)
    try { await api.sendOTP({ email: signupEmail }); setOtpStep(true); toast.success('Verification code sent!') }
    catch (err) { toast.error(err.message || 'Failed to send code') }
    finally { setLoading(false) }
  }

  async function handleVerifyAndCreate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.verifyOTP({ email: signupEmail, code: otpCode })
      const data = await api.createPassword({ email: signupEmail, password: signupPass })
      if (data.session) { saveToken(data.session.accessToken); toast.success('Account created!'); nav('/analytics') }
      else { toast.success('Account created! Login once admin access is granted.'); setScreen('login') }
    } catch (err) { toast.error(err.message || 'Verification failed') }
    finally { setLoading(false) }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true)
    try { await api.forgotPassword({ email: forgotEmail }); toast.success('Reset code sent!'); setScreen('reset') }
    catch (err) { toast.error(err.message || 'Failed to send reset code') }
    finally { setLoading(false) }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (resetPass !== resetConfirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      const { resetToken } = await api.verifyCode({ email: forgotEmail, code: resetCode })
      await api.resetPassword({ resetToken, password: resetPass, confirmPassword: resetConfirm })
      toast.success('Password reset!'); setScreen('login')
    } catch (err) { toast.error(err.message || 'Reset failed') }
    finally { setLoading(false) }
  }

  const TextBtn = ({ label, onClick, bold }) => (
    <button type="button" onClick={onClick} style={{ background:'none', border:'none', cursor:'pointer', color: bold ? 'var(--purple)' : 'var(--gray-500)', fontWeight: bold ? 600 : 400, fontSize:'13px', fontFamily:'inherit', padding:0 }}>{label}</button>
  )

  const formCard = {
    background:'white', borderRadius:'12px',
    border:'1.5px solid #c084fc', padding:'36px 32px',
    boxShadow: '0 2px 12px rgba(192, 132, 252, 0.08)',
  }

  return (
    <>
      <style>{`
        .auth-outer { display:flex; min-height:100vh; }
        .auth-left  { width:46%; flex-shrink:0; }
        .auth-right { flex:1; display:flex; align-items:center; justify-content:center; padding:48px 40px; background:white; min-height:100vh; }
        .auth-card  { width:100%; max-width:420px; animation:fadeIn 0.28s ease; }
        @media(max-width:900px) { .auth-left { width:40%; } }
        @media(max-width:700px) {
          .auth-left { display:none; }
          .auth-right { padding:28px 20px; background:var(--gray-50); }
        }
      `}</style>

      <div className="auth-outer">
        <div className="auth-left"><AuthLeft /></div>

        <div className="auth-right">
          <div className="auth-card">

            {/* ── LOGIN ── */}
            {screen === 'login' && (
              <form onSubmit={handleLogin} style={formCard}>
                <Logo />
                <h2 style={{ textAlign:'center', fontSize:'20px', fontWeight:600, marginBottom:'28px' }}>Hello! Welcome back</h2>
                <EmailInput label="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Enter your email address" />
                <PwInput label="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••••••" />
                <Btn type="submit" size="full" loading={loading} style={{ marginTop:'8px' }}>Login</Btn>
                <p style={{ textAlign:'center', marginTop:'18px', fontSize:'13px', color:'var(--gray-500)' }}>
                  Already Have an Account? <TextBtn label="SignUp" onClick={() => setScreen('signup')} bold />
                </p>
                <p style={{ textAlign:'center', marginTop:'10px', fontSize:'13px', color:'var(--gray-500)' }}>
                  Forgot Password? <TextBtn label="Reset" onClick={() => setScreen('forgot')} bold />
                </p>
              </form>
            )}

            {/* ── SIGNUP step 1 ── */}
            {screen === 'signup' && !otpStep && (
              <form onSubmit={handleSendOTP} style={formCard}>
                <Logo />
                <h2 style={{ textAlign:'center', fontSize:'20px', fontWeight:600, marginBottom:'28px' }}>Create an Admin Account</h2>
                <EmailInput label="Email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="Enter your email address" />
                <PwInput label="Create Password" value={signupPass} onChange={e => setSignupPass(e.target.value)} placeholder="Create a password" />
                <PwInput label="Confirm Password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} placeholder="Confirm your password" />
                <Btn type="submit" size="full" loading={loading} style={{ marginTop:'8px' }}>Create Account</Btn>
                <p style={{ textAlign:'center', marginTop:'18px', fontSize:'13px', color:'var(--gray-500)' }}>
                  Already Have an Account? <TextBtn label="Login" onClick={() => setScreen('login')} bold />
                </p>
              </form>
            )}

            {/* ── SIGNUP step 2 OTP ── */}
            {screen === 'signup' && otpStep && (
              <form onSubmit={handleVerifyAndCreate} style={formCard}>
                <Logo />
                <div style={{ textAlign:'center', marginBottom:'24px' }}>
                  <div style={{ width:'80px', height:'80px', background:'var(--purple-pale)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px', margin:'0 auto 14px' }}>✉️</div>
                  <h2 style={{ fontSize:'20px', fontWeight:600, marginBottom:'8px' }}>Verify Email</h2>
                  <p style={{ fontSize:'14px', color:'var(--gray-500)', lineHeight:1.6 }}>
                    We've sent a verification code to <strong>{signupEmail}</strong>
                  </p>
                </div>
                <div style={{ marginBottom:'18px' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }}>Verification code</label>
                  <div style={{ position:'relative' }}>
                    <Lock size={14} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
                    <input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} required
                      style={{ width:'100%', padding:'11px 14px 11px 38px', border:'1.5px solid var(--gray-200)', borderRadius:'8px', fontSize:'14px', outline:'none', fontFamily:'inherit', letterSpacing:'0.12em' }}
                      onFocus={e => e.target.style.borderColor='#c084fc'} onBlur={e => e.target.style.borderColor='var(--gray-200)'}
                    />
                  </div>
                </div>
                <Btn type="submit" size="full" loading={loading}>Verify & Continue</Btn>
              </form>
            )}

            {/* ── FORGOT ── */}
            {screen === 'forgot' && (
              <form onSubmit={handleForgot} style={formCard}>
                <Logo />
                <h2 style={{ textAlign:'center', fontSize:'20px', fontWeight:600, marginBottom:'8px' }}>Reset Password</h2>
                <p style={{ textAlign:'center', fontSize:'14px', color:'var(--gray-500)', marginBottom:'28px', lineHeight:1.6 }}>
                  Enter your email and we'll send you a verification link
                </p>
                <EmailInput label="Email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="Enter your email address" />
                <Btn type="submit" size="full" loading={loading}>Send verification link</Btn>
                <p style={{ textAlign:'center', marginTop:'18px', fontSize:'13px' }}>
                  <TextBtn label="← Go Back" onClick={() => setScreen('login')} />
                </p>
              </form>
            )}

            {/* ── RESET ── */}
            {screen === 'reset' && (
              <form onSubmit={handleReset} style={formCard}>
                <Logo />
                <h2 style={{ textAlign:'center', fontSize:'20px', fontWeight:600, marginBottom:'8px' }}>Reset Password</h2>
                <p style={{ textAlign:'center', fontSize:'14px', color:'var(--gray-500)', marginBottom:'28px' }}>Setup a new password to continue</p>
                <div style={{ marginBottom:'18px' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }}>Reset code</label>
                  <div style={{ position:'relative' }}>
                    <Lock size={14} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
                    <input value={resetCode} onChange={e => setResetCode(e.target.value)} placeholder="Enter 6-digit reset code" maxLength={6} required
                      style={{ width:'100%', padding:'11px 14px 11px 38px', border:'1.5px solid var(--gray-200)', borderRadius:'8px', fontSize:'14px', outline:'none', fontFamily:'inherit' }}
                      onFocus={e => e.target.style.borderColor='#c084fc'} onBlur={e => e.target.style.borderColor='var(--gray-200)'}
                    />
                  </div>
                </div>
                <PwInput label="Create New Password" value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="Create a password" />
                <PwInput label="Confirm New Password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder="Confirm your password" />
                <Btn type="submit" size="full" loading={loading}>Reset Password</Btn>
              </form>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
