import { Link } from 'react-router'
import { ArrowLeft, FileText } from 'lucide-react'

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing the UteriFlow website, joining our waitlist, subscribing to our newsletter, or using the UteriFlow application, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our services.

If you have questions about these terms, contact us at uteriflow@gmail.com before proceeding.`,
  },
  {
    title: '2. Description of Service',
    body: `UteriFlow is a reproductive health and cycle-tracking application designed for women, particularly those living with Polycystic Ovary Syndrome (PCOS). Our service provides:

- Menstrual cycle and symptom tracking tools
- Personalised health insights based on logged data
- Reproductive health education content
- An anonymous peer community

UteriFlow is currently in development. Features described on this website represent our planned product offering and are subject to change.`,
  },
  {
    title: '3. Medical Disclaimer',
    body: `UteriFlow is a wellness and information tool. It is NOT a medical device, and the information, insights, and content provided by UteriFlow do NOT constitute medical advice, diagnosis, or treatment.

Always seek the advice of a qualified healthcare professional regarding any medical condition or health concern. Never disregard professional medical advice or delay seeking it based on information from UteriFlow. In a medical emergency, contact your local emergency services immediately.

If you believe you may have a medical condition, please consult a licensed healthcare provider.`,
  },
  {
    title: '4. Eligibility',
    body: `You must be at least 16 years of age to use UteriFlow. By using our service, you represent that you meet this age requirement. If you are under 18, you must have the consent of a parent or legal guardian.

UteriFlow is designed for individuals with ovaries who are of reproductive age. We welcome all users who can benefit from our service, regardless of gender identity.`,
  },
  {
    title: '5. User Accounts and Waitlist',
    body: `When you join our waitlist, you agree to provide accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.

We reserve the right to remove any person from the waitlist or deny access to the service if we reasonably believe their use violates these Terms or applicable law.`,
  },
  {
    title: '6. Acceptable Use',
    body: `You agree not to use UteriFlow to:

- Upload, post, or transmit any harmful, abusive, harassing, threatening, or illegal content
- Impersonate any person or entity
- Collect or harvest personal data from other users
- Attempt to gain unauthorised access to any part of the service
- Use the service for any commercial purpose without our written consent
- Violate any applicable law or regulation

We reserve the right to terminate access for any user who violates these terms.`,
  },
  {
    title: '7. Community Guidelines',
    body: `UteriFlow's anonymous community is a safe space for women to share, ask questions, and support one another. By participating, you agree to:

- Be respectful and kind to other community members
- Keep discussions relevant to reproductive and hormonal health
- Not share personally identifiable information (your own or others')
- Not promote harmful health practices or misinformation
- Report any content that violates these guidelines to uteriflow@gmail.com

We moderate the community and reserve the right to remove any content or user that disrupts the safe, supportive environment we're building.`,
  },
  {
    title: '8. Intellectual Property',
    body: `All content on the UteriFlow website and application — including but not limited to text, graphics, logos, icons, and software — is the property of UteriFlow and is protected by applicable copyright and intellectual property laws.

You may not reproduce, distribute, modify, or create derivative works of our content without our express written permission. Our logo and brand assets may not be used without prior written consent.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, UteriFlow and its founders, employees, and partners shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the service.

UteriFlow provides the service "as is" without warranty of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses or other harmful components.`,
  },
  {
    title: '10. Changes to These Terms',
    body: `We may update these Terms of Service at any time. When we make material changes, we will notify waitlist subscribers by email and update the date at the top of this page.

Continued use of UteriFlow after changes take effect constitutes your acceptance of the revised terms. If you disagree with the updated terms, you may discontinue use of the service and request account deletion by emailing uteriflow@gmail.com.`,
  },
  {
    title: '11. Governing Law',
    body: `These Terms of Service are governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions. Any dispute arising from these terms shall be resolved through good-faith negotiation first, and if unresolved, through the courts of Nigeria.`,
  },
  {
    title: '12. Contact',
    body: `For questions, concerns, or feedback about these Terms of Service, please contact us:

Email: uteriflow@gmail.com
Instagram: @uteriflow

We aim to respond to all enquiries within 5 business days.`,
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FDFAFD' }}>
      {/* Header */}
      <section
        className="pt-28 pb-14 px-5 sm:px-8"
        style={{ background: 'linear-gradient(160deg, #D5F4F5 0%, #FAF0FA 100%)' }}
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
              style={{ background: 'linear-gradient(135deg, #38AFB7, #A0E1E3)' }}
            >
              <FileText size={24} color="white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                Terms of Service
              </h1>
              <p className="text-sm text-gray-400 mt-1">Last updated: April 2026</p>
            </div>
          </div>
          <div
            className="mt-6 p-5 rounded-2xl text-sm leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #A0E1E3' }}
          >
            Please read these terms carefully. By using UteriFlow, you agree to be bound by
            them. We've written them in plain language — if anything is unclear, email us at{' '}
            <a href="mailto:uteriflow@gmail.com" className="font-semibold text-[#38AFB7] hover:underline">
              uteriflow@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
        <div className="flex flex-col gap-10">
          {sections.map(({ title, body }) => (
            <div key={title}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
              <p className="text-gray-600 text-base leading-relaxed whitespace-pre-line">{body}</p>
            </div>
          ))}
        </div>

        <div
          className="mt-14 rounded-3xl p-7 text-center"
          style={{ background: 'linear-gradient(135deg, #D5F4F5, #FAF0FA)' }}
        >
          <p className="text-base font-semibold text-gray-900 mb-2">Questions about our terms?</p>
          <a
            href="mailto:uteriflow@gmail.com"
            className="text-sm font-semibold"
            style={{ color: '#38AFB7' }}
          >
            uteriflow@gmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
