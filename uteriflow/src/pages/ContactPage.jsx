import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle } from 'lucide-react'

const TOPICS = [
  'General enquiry',
  'Waitlist question',
  'Partnership / collaboration',
  'Press / media',
  'Technical issue',
  'Data / privacy request',
  'Other',
]

const contactChannels = [
  {
    label: 'Email us',
    value: 'uteriflow@gmail.com',
    href: 'mailto:uteriflow@gmail.com',
    icon: <Mail size={20} color="white" />,
    bg: 'linear-gradient(135deg, #690064, #AB2EA5)',
    desc: 'For detailed enquiries. We reply within 5 business days.',
  },
  {
    label: 'Instagram DM',
    value: '@uteriflow',
    href: 'https://www.instagram.com/uteriflow?igsh=M2hleHMxcWg1enpi&utm_source=qr',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="white" stroke="none" />
      </svg>
    ),
    bg: 'linear-gradient(135deg, #FB6F92, #AB2EA5)',
    desc: 'Quick questions and community updates.',
  },
  {
    label: 'WhatsApp community',
    value: 'Join our group',
    href: 'https://chat.whatsapp.com/GBH5gMBlpyq3YJloAOY9pe?mode=gi_t',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
      </svg>
    ),
    bg: 'linear-gradient(135deg, #25D366, #128C7E)',
    desc: 'Connect with our community of women.',
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter your name'
    if (!form.email.trim()) e.email = 'Please enter your email'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email address'
    if (!form.message.trim()) e.message = 'Please enter your message'
    return e
  }

  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    // Compose mailto link and open it, then show success
    const subject = encodeURIComponent(`[UteriFlow] ${form.topic || 'Contact form'} — ${form.name}`)
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nTopic: ${form.topic || 'Not specified'}\n\n${form.message}`
    )
    window.open(`mailto:uteriflow@gmail.com?subject=${subject}&body=${body}`, '_blank')
    setTimeout(() => { setSent(true); setLoading(false) }, 600)
  }

  const inputClass = 'input-glow w-full px-4 py-3.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all'

  return (
    <div className="min-h-screen" style={{ background: '#FDFAFD' }}>
      {/* Header */}
      <section
        className="pt-28 pb-14 px-5 sm:px-8"
        style={{ background: 'linear-gradient(160deg, #FAF0FA 0%, #FFE4EC 60%, #D5F4F5 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#690064] transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Home
          </Link>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-soft"
            style={{ background: 'linear-gradient(135deg, #FB6F92, #AB2EA5)' }}
          >
            <MessageSquare size={26} color="white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Get in touch</h1>
          <p className="text-gray-500 text-lg max-w-lg mx-auto leading-relaxed">
            Whether you have a question, want to collaborate, or just want to say hi — we'd
            love to hear from you.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid lg:grid-cols-2 gap-10">

          {/* Left — contact channels */}
          <div className="flex flex-col gap-5">
            <h2 className="text-xl font-extrabold text-gray-900">Other ways to reach us</h2>

            {contactChannels.map(({ label, value, href, icon, bg, desc }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex items-start gap-4 p-5 bg-white rounded-3xl hover-lift shadow-card border border-gray-50 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-soft"
                  style={{ background: bg }}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="text-sm font-medium" style={{ color: '#AB2EA5' }}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </a>
            ))}

            {/* FAQ nudge */}
            <div
              className="rounded-3xl p-5"
              style={{ background: 'linear-gradient(135deg, #FAF0FA, #F3D6F1)' }}
            >
              <p className="text-sm font-bold text-gray-900 mb-1">Looking for quick answers?</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Check our{' '}
                <Link to="/articles" className="font-semibold text-[#690064] hover:underline">
                  articles
                </Link>{' '}
                for reproductive health guidance, or read our{' '}
                <Link to="/privacy" className="font-semibold text-[#690064] hover:underline">
                  Privacy Policy
                </Link>{' '}
                for data-related questions.
              </p>
            </div>
          </div>

          {/* Right — contact form */}
          <div>
            {sent ? (
              <div
                className="rounded-3xl p-8 flex flex-col items-center text-center gap-4 shadow-card"
                style={{ background: 'white' }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-soft"
                  style={{ background: 'linear-gradient(135deg, #38AFB7, #A0E1E3)' }}
                >
                  <CheckCircle size={28} color="white" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">Message sent!</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your email app should have opened. If it didn't, send us a direct email at{' '}
                  <a href="mailto:uteriflow@gmail.com" className="font-semibold text-[#690064]">
                    uteriflow@gmail.com
                  </a>
                  . We reply within 5 business days.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', topic: '', message: '' }) }}
                  className="text-sm font-semibold px-5 py-2.5 rounded-full hover-lift transition-all"
                  style={{ background: '#F3D6F1', color: '#690064' }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="bg-white rounded-3xl p-7 shadow-card border border-gray-50 flex flex-col gap-5"
              >
                <h2 className="text-xl font-extrabold text-gray-900">Send us a message</h2>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-name" className="text-sm font-semibold text-gray-700">
                    Your name <span className="text-[#FB6F92]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="Amaka Okonkwo"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    className={inputClass}
                    style={{ borderColor: errors.name ? '#FB6F92' : '#e5e7eb' }}
                  />
                  {errors.name && <p className="text-xs text-[#FB6F92]" role="alert">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-email" className="text-sm font-semibold text-gray-700">
                    Email address <span className="text-[#FB6F92]">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="yourname@email.com"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    className={inputClass}
                    style={{ borderColor: errors.email ? '#FB6F92' : '#e5e7eb' }}
                  />
                  {errors.email && <p className="text-xs text-[#FB6F92]" role="alert">{errors.email}</p>}
                </div>

                {/* Topic */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-topic" className="text-sm font-semibold text-gray-700">
                    Topic
                  </label>
                  <select
                    id="contact-topic"
                    value={form.topic}
                    onChange={handleChange('topic')}
                    className={inputClass}
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    <option value="">Select a topic...</option>
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-message" className="text-sm font-semibold text-gray-700">
                    Message <span className="text-[#FB6F92]">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    value={form.message}
                    onChange={handleChange('message')}
                    placeholder="Tell us what's on your mind..."
                    rows={5}
                    aria-invalid={!!errors.message}
                    className={`${inputClass} resize-none`}
                    style={{ borderColor: errors.message ? '#FB6F92' : '#e5e7eb' }}
                  />
                  {errors.message && <p className="text-xs text-[#FB6F92]" role="alert">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-full text-white font-semibold text-sm hover-lift transition-all disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #690064, #AB2EA5)' }}
                >
                  {loading
                    ? <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    : <><Send size={16} /> Send message</>
                  }
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Or email us directly at{' '}
                  <a href="mailto:uteriflow@gmail.com" className="font-semibold text-[#AB2EA5] hover:underline">
                    uteriflow@gmail.com
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
