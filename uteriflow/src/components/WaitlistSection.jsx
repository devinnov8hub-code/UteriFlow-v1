import { useState } from 'react'
import { ArrowRight, CheckCircle, Sparkles, Clock, Gift } from 'lucide-react'
import { landingService, landingErrorCode } from '../lib/services/landing.service'

const perks = [
  { icon: Clock, text: 'First access when we launch' },
  { icon: Gift, text: 'Exclusive early adopter features' },
  { icon: Sparkles, text: 'Free premium month at launch' },
]

export default function WaitlistSection() {
  const [form, setForm] = useState({ name: '', email: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter your name'
    if (!form.email.trim()) e.email = 'Please enter your email'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email address'
    return e
  }

  const handleChange = (field) => (ev) => {
    setForm((prev) => ({ ...prev, [field]: ev.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    setServerError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    setServerError('')
    try {
      await landingService.joinWaitlist(form.name.trim(), form.email.trim())
      setSubmitted(true)
    } catch (err) {
      const code = landingErrorCode(err)
      if (code === 'already_registered') {
        setServerError("You're already on the waitlist! We'll reach out soon.")
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="waitlist"
      className="py-20 sm:py-28 relative overflow-hidden"
      style={{ background: '#0D0010' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #AB2EA5, transparent)' }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #38AFB7, transparent)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div className="reveal text-white">
            <span
              className="inline-block text-xs font-bold tracking-widest uppercase mb-5 px-4 py-1.5 rounded-full"
              style={{ background: 'rgba(171,46,165,0.3)', color: '#D088CC' }}
            >
              Limited early access
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
              Be the first to try{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #D088CC, #FB6F92)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                UteriFlow.
              </span>
            </h2>
            <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-8">
              Join the waitlist today and be part of shaping the app that millions of women
              will use to understand their bodies.
            </p>
            <ul className="flex flex-col gap-4">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(171,46,165,0.25)' }}
                  >
                    <Icon size={16} color="#D088CC" />
                  </div>
                  <span className="text-sm text-gray-300">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — form */}
          <div className="reveal" style={{ transitionDelay: '150ms' }}>
            {submitted ? (
              <div
                className="rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center gap-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-soft"
                  style={{ background: 'linear-gradient(135deg, #38AFB7, #A0E1E3)' }}
                >
                  <CheckCircle size={32} color="white" />
                </div>
                <h3 className="text-2xl font-extrabold text-white">You're on the list!</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Welcome, <span className="font-semibold text-white">{form.name.split(' ')[0]}</span>!
                  We'll reach out at{' '}
                  <span className="font-semibold text-[#D088CC]">{form.email}</span> as soon as
                  we're ready.
                </p>
                <a
                  href="https://chat.whatsapp.com/GBH5gMBlpyq3YJloAOY9pe?mode=gi_t"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all hover-lift"
                  style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                  Join our WhatsApp community
                </a>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-3xl p-7 sm:p-9 flex flex-col gap-5"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div>
                  <h3 className="text-xl font-extrabold text-white mb-1">Join the waitlist</h3>
                  <p className="text-gray-400 text-sm">No credit card. No pressure.</p>
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="waitlist-name" className="text-sm font-medium text-gray-300">
                    Your name <span className="text-[#FB6F92]" aria-label="required">*</span>
                  </label>
                  <input
                    id="waitlist-name"
                    type="text"
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="Amaka Okonkwo"
                    autoComplete="name"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    className="px-5 py-3.5 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: errors.name ? '1.5px solid #FB6F92' : '1.5px solid rgba(255,255,255,0.12)',
                    }}
                  />
                  {errors.name && (
                    <p id="name-error" role="alert" className="text-xs text-[#FB6F92]">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="waitlist-email" className="text-sm font-medium text-gray-300">
                    Email address <span className="text-[#FB6F92]" aria-label="required">*</span>
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="yourname@gmail.com"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className="px-5 py-3.5 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: errors.email ? '1.5px solid #FB6F92' : '1.5px solid rgba(255,255,255,0.12)',
                    }}
                  />
                  {errors.email && (
                    <p id="email-error" role="alert" className="text-xs text-[#FB6F92]">{errors.email}</p>
                  )}
                </div>

                {serverError && (
                  <p role="alert" className="text-sm rounded-xl px-4 py-2.5"
                    style={{ background: 'rgba(251,111,146,0.12)', color: '#FB6F92' }}>
                    {serverError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full text-white font-semibold text-base shadow-hero hover-lift transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #690064, #AB2EA5)' }}
                >
                  {loading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>Reserve my spot <ArrowRight size={18} /></>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  By joining, you agree to receive launch updates. We never share your data.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
