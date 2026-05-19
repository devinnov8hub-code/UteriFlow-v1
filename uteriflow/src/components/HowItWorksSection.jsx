import { UserPlus, ClipboardList, Lightbulb, HeartHandshake } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create your profile',
    body:
      'Sign up in under two minutes. Tell us about your cycle history, whether you have PCOS, and what matters most to you. We keep everything private.',
    color: '#F3D6F1',
    textColor: '#690064',
  },
  {
    number: '02',
    icon: ClipboardList,
    title: 'Log your symptoms daily',
    body:
      'Each day, record how you feel — your mood, energy, cramps, bloating, skin, sleep. It takes 30 seconds and builds a picture over time.',
    color: '#D5F4F5',
    textColor: '#38AFB7',
  },
  {
    number: '03',
    icon: Lightbulb,
    title: 'Receive personalised insights',
    body:
      "UteriFlow spots your patterns and explains them in simple terms. Understand your cycle phases, predict your next period, and know what's normal for you.",
    color: '#FFE4EC',
    textColor: '#FB6F92',
  },
  {
    number: '04',
    icon: HeartHandshake,
    title: 'Feel more in control',
    body:
      'With knowledge comes confidence. Plan around your cycle, have better conversations with your doctor, and connect with others who truly get it.',
    color: '#F3D6F1',
    textColor: '#AB2EA5',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Section header */}
        <div className="text-center mb-16 reveal">
          <span
            className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full"
            style={{ background: '#D5F4F5', color: '#38AFB7' }}
          >
            Simple by design
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            From sign up to{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #690064, #AB2EA5 55%, #FB6F92)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              in control
            </span>
            , in four steps.
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            No complicated onboarding. No medical forms. Just a simple, caring experience
            that gets better the more you use it.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Animated connector line (desktop only) */}
          <div
            className="reveal-line hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5"
            style={{
              background: 'linear-gradient(90deg, #F3D6F1, #D5F4F5, #FFE4EC, #F3D6F1)',
              transitionDelay: '300ms',
            }}
            aria-hidden="true"
          />

          {steps.map(({ number, icon: Icon, title, body, color, textColor }, i) => (
            <div
              key={number}
              className="reveal-scale flex flex-col items-center text-center"
              style={{ transitionDelay: `${i * 140}ms` }}
            >
              {/* Step bubble */}
              <div className="relative mb-6 z-10">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center shadow-card"
                  style={{ background: color }}
                >
                  <Icon size={32} style={{ color: textColor }} />
                </div>
                <div
                  className="absolute -top-1.5 -right-1.5 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-soft"
                  style={{ background: textColor }}
                >
                  <span className="text-white text-xs font-extrabold">{i + 1}</span>
                </div>
              </div>

              {/* Step number */}
              <span
                className="text-4xl font-black mb-2 leading-none"
                style={{ color: color, WebkitTextStroke: `1px ${textColor}40` }}
                aria-hidden="true"
              >
                {number}
              </span>

              <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* CTA nudge */}
        <div className="text-center mt-14 reveal" style={{ transitionDelay: '100ms' }}>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold text-base shadow-hero hover-lift transition-all"
            style={{ background: 'linear-gradient(135deg, #690064, #AB2EA5)' }}
          >
            Start your journey today
          </a>
        </div>
      </div>
    </section>
  )
}
