import { Link } from 'react-router'
import logo from '../assets/logo.svg'

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/uteriflow?igsh=M2hleHMxcWg1enpi&utm_source=qr',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/uteriflow?s=21',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@uteriflow0',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34l-.01-8.16a8.22 8.22 0 0 0 4.84 1.55V5.27a4.85 4.85 0 0 1-1.06-.58z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/uteriflow/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect x="2" y="9" width="4" height="12"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  },
  {
    label: 'Substack',
    href: 'https://uteriflow.substack.com',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
      </svg>
    ),
  },
]

const footerLinks = [
  { label: 'Features', href: '/#solution' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Articles', href: '/articles' },
  { label: 'Newsletter', href: '/#newsletter' },
  { label: 'Join Waitlist', href: '/#waitlist' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Contact Us', href: '/contact' },
]

export default function Footer() {
  return (
    <footer className="pt-16 pb-8" style={{ background: '#0D0010' }} aria-label="Site footer">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 pb-12 border-b border-white/10">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-5">
              <img
                src={logo}
                alt="UteriFlow"
                className="h-7 w-auto brightness-0 invert opacity-90"
                style={{ maxWidth: '150px' }}
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-xs">
              Empowering African women to understand their reproductive health — one cycle at a time.
              Built with love, backed by science.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {socialLinks.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all hover-lift"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav links */}
          <div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4">Navigation</h3>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.map(({ label, href }) => (
                <li key={label}>
                  {href.startsWith('/') && !href.includes('#') ? (
                    <Link to={href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {label}
                    </Link>
                  ) : (
                    <a href={href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + CTA */}
          <div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4">Legal</h3>
            <ul className="flex flex-col gap-2.5 mb-8">
              {legalLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link to={href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* WhatsApp community CTA */}
            <a
              href="https://chat.whatsapp.com/GBH5gMBlpyq3YJloAOY9pe?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all hover-lift"
              style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.2)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#25D366' }}>Join our WhatsApp</p>
                <p className="text-xs text-gray-500">Community of women</p>
              </div>
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            © {new Date().getFullYear()} UteriFlow. All rights reserved. Made with care for African women.
          </p>
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-600">Not a substitute for professional medical advice.</p>
            <Link
              to="/admin/login"
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors border-l border-white/10 pl-4"
            >
              Management
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
