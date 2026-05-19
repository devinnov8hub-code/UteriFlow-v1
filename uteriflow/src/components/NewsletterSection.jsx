import { useState } from 'react'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { landingService, landingErrorCode } from '../lib/services/landing.service'

/**
 * Newsletter signup. Posts to /api/v1/landing/newsletter so the admin
 * dashboard's Newsletter page can see every email that comes in.
 *
 * Substack lives at uteriflow.substack.com — we keep a link to it at the
 * bottom of the card, but the actual email capture happens through our
 * own backend so the admin owns the list.
 */
export default function NewsletterSection() {
  const [email, setEmail]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email'); return }

    setLoading(true)
    try {
      await landingService.subscribeNewsletter(email.trim())
      setSubmitted(true)
    } catch (err) {
      const code = landingErrorCode(err)
      if (code === 'already_subscribed') {
        // Treat as a soft success — the user is already on the list.
        setSubmitted(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="newsletter" className="py-16 sm:py-20 bg-white">
      <div className="max-w-2xl mx-auto px-5 sm:px-8">
        <div
          className="reveal rounded-3xl px-7 sm:px-12 py-10 sm:py-14 text-center"
          style={{ background: 'linear-gradient(145deg, #FAF0FA, #F3D6F1 60%, #FFE4EC)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-soft"
            style={{ background: 'linear-gradient(135deg, #AB2EA5, #FB6F92)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 leading-tight">
            Stay in the loop
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-md mx-auto">
            Get PCOS tips, cycle health education, and community stories delivered to your inbox.
            No spam — just things worth reading.
          </p>

          {submitted ? (
            <div className="bg-white rounded-2xl p-6 shadow-card flex flex-col items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #38AFB7, #A0E1E3)' }}
              >
                <CheckCircle size={24} color="white" />
              </div>
              <p className="text-sm text-gray-700 font-medium">
                Thanks — we'll keep you posted at <span className="font-semibold text-[#690064]">{email}</span>.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-white rounded-2xl p-3 shadow-card flex flex-col sm:flex-row gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="yourname@example.com"
                aria-label="Email address"
                autoComplete="email"
                className="flex-1 px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-xl text-white font-semibold text-sm shadow-soft hover-lift transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #690064, #AB2EA5)' }}
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>Subscribe <ArrowRight size={15} /></>
                )}
              </button>
            </form>
          )}

          {error && !submitted && (
            <p role="alert" className="mt-3 text-sm text-[#FB6F92]">{error}</p>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Also publishing on{' '}
            <a
              href="https://uteriflow.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#AB2EA5] transition-colors"
            >
              Substack
            </a>
            . Unsubscribe any time.
          </p>
        </div>
      </div>
    </section>
  )
}
