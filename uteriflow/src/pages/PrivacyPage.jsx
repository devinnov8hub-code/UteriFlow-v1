import { Link } from 'react-router'
import { ArrowLeft, Shield } from 'lucide-react'

const sections = [
  {
    title: '1. Information We Collect',
    body: `When you join our waitlist or subscribe to our newsletter, we collect your name and email address. When you use the UteriFlow app, we may collect health-related data you choose to log, including menstrual cycle dates, symptoms, mood, and other reproductive health information you voluntarily provide.

We do not collect any information you do not actively provide. We do not use tracking pixels, third-party advertising SDKs, or behavioural advertising tools.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use the information you provide solely to:

- Notify you about the UteriFlow app launch and product updates
- Send you our health education newsletter (only if you subscribed)
- Improve the UteriFlow experience based on aggregated, anonymised trends
- Provide personalised cycle insights within the app

We do not use your health data for advertising, profiling, or any commercial purpose beyond delivering the UteriFlow service to you.`,
  },
  {
    title: '3. Data Sharing',
    body: `We do not sell, rent, or trade your personal information to any third party — ever.

We work with a small number of trusted service providers (such as our cloud hosting and database provider) to operate UteriFlow. These providers are contractually prohibited from using your data for any purpose other than providing services to us. We review each provider carefully and require strong data protection standards.`,
  },
  {
    title: '4. Health Data — A Special Note',
    body: `Your reproductive health data is deeply personal. We treat it accordingly.

All health data you log in UteriFlow is encrypted in transit and at rest. We will never share identifiable health data with employers, insurance companies, government agencies, or third-party marketers. Any analysis of health data for product improvement is performed on anonymised, aggregated datasets only.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your personal data for as long as you have an active account or relationship with UteriFlow. If you request deletion of your account and data, we will permanently remove your information within 30 days, except where retention is required by law.

To request deletion of your data, email us at uteriflow@gmail.com with the subject line "Data Deletion Request".`,
  },
  {
    title: '6. Your Rights',
    body: `You have the right to:

- Access the personal data we hold about you
- Correct inaccurate data
- Request deletion of your data
- Withdraw consent at any time
- Lodge a complaint with a data protection authority

To exercise any of these rights, contact us at uteriflow@gmail.com. We will respond within 30 days.`,
  },
  {
    title: '7. Cookies',
    body: `Our website uses only essential, functional cookies — the minimum required to keep the site working properly. We do not use advertising or tracking cookies. You can disable cookies in your browser settings at any time, though this may affect some functionality.`,
  },
  {
    title: '8. Children',
    body: `UteriFlow is intended for users aged 16 and above. We do not knowingly collect personal data from anyone under the age of 16. If you believe we have inadvertently collected data from a minor, please contact us immediately at uteriflow@gmail.com and we will delete the information promptly.`,
  },
  {
    title: '9. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we make significant changes, we will notify subscribers by email and update the "Last updated" date at the top of this page. Continued use of UteriFlow after changes take effect constitutes your acceptance of the updated policy.`,
  },
  {
    title: '10. Contact Us',
    body: `If you have any questions, concerns, or requests related to this Privacy Policy or your data, please reach out:

Email: uteriflow@gmail.com
Instagram: @uteriflow
We are committed to responding within 5 business days.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FDFAFD' }}>
      {/* Header */}
      <section
        className="pt-28 pb-14 px-5 sm:px-8"
        style={{ background: 'linear-gradient(160deg, #FAF0FA 0%, #F3D6F1 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#690064] transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Home
          </Link>
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-soft"
              style={{ background: 'linear-gradient(135deg, #690064, #AB2EA5)' }}
            >
              <Shield size={24} color="white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                Privacy Policy
              </h1>
              <p className="text-sm text-gray-400 mt-1">Last updated: April 2026</p>
            </div>
          </div>
          <div
            className="mt-6 p-5 rounded-2xl text-sm leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #F3D6F1' }}
          >
            <strong className="text-[#690064]">Your privacy is sacred to us.</strong>{' '}
            UteriFlow handles sensitive reproductive health data. We built this policy with
            clarity and honesty — not legalese. Your data belongs to you, and we will always
            treat it that way.
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
        <div className="flex flex-col gap-10">
          {sections.map(({ title, body }) => (
            <div key={title}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
              <div className="text-gray-600 text-base leading-relaxed whitespace-pre-line">
                {body}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-14 rounded-3xl p-7 text-center"
          style={{ background: 'linear-gradient(135deg, #FAF0FA, #FFE4EC)' }}
        >
          <p className="text-base font-semibold text-gray-900 mb-2">
            Have a question about your data?
          </p>
          <a
            href="mailto:uteriflow@gmail.com"
            className="text-sm font-semibold hover-lift transition-all"
            style={{ color: '#690064' }}
          >
            uteriflow@gmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
