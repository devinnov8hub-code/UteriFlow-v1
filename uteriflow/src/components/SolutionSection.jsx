import { CalendarDays, BarChart3, BookOpen, Users } from 'lucide-react'

const features = [
  {
    icon: CalendarDays,
    gradient: 'linear-gradient(135deg, #F3D6F1 0%, #D088CC 100%)',
    iconBg: 'linear-gradient(135deg, #690064, #AB2EA5)',
    label: 'Cycle Tracking',
    title: 'Know exactly where you are in your cycle',
    body:
      "Log your period, symptoms, mood, and flow. Get a clear picture of your cycle — especially if it's irregular or PCOS-related. No guessing, no anxiety.",
    tag: 'Daily logging',
  },
  {
    icon: BarChart3,
    gradient: 'linear-gradient(135deg, #D5F4F5 0%, #A0E1E3 100%)',
    iconBg: 'linear-gradient(135deg, #38AFB7, #A0E1E3)',
    label: 'Smart Insights',
    title: 'Personalised insights that actually make sense',
    body:
      'UteriFlow learns your patterns and tells you what they mean — in plain, clear language. Know when to expect your period, how your symptoms connect, and what to watch for.',
    tag: 'AI-powered',
  },
  {
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #FFE4EC 0%, #FEB3C7 100%)',
    iconBg: 'linear-gradient(135deg, #FB6F92, #FF8FAB)',
    label: 'Health Education',
    title: 'Learn about your body without the jargon',
    body:
      'Access bite-sized, expert-reviewed content on PCOS, hormones, fertility, and reproductive health — written for real African women, not a textbook.',
    tag: 'Expert-backed',
  },
  {
    icon: Users,
    gradient: 'linear-gradient(135deg, #FAF0FA 0%, #F3D6F1 100%)',
    iconBg: 'linear-gradient(135deg, #AB2EA5, #FB6F92)',
    label: 'Safe Community',
    title: 'Talk freely in a space built for you',
    body:
      'Share your experience, ask questions, and find your people — all anonymously. No judgment. No exposure. Just women who get it.',
    tag: '100% anonymous',
  },
]

export default function SolutionSection() {
  return (
    <section
      id="solution"
      className="py-20 sm:py-28 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FDFAFD 0%, #FAF0FA 100%)' }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Section header */}
        <div className="text-center mb-14 reveal">
          <span
            className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full"
            style={{ background: '#F3D6F1', color: '#690064' }}
          >
            What UteriFlow does
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            Everything you need{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #690064, #AB2EA5 55%, #FB6F92)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              in one place.
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            We built UteriFlow around the four things women with PCOS need most — and made
            each one feel effortless.
          </p>
        </div>

        {/* Feature cards — left col slides from left, right col from right */}
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, gradient, iconBg, label, title, body, tag }, i) => (
            <div
              key={label}
              className={`${i % 2 === 0 ? 'reveal-left' : 'reveal-right'} rounded-3xl p-7 sm:p-8 hover-lift flex flex-col gap-4 group`}
              style={{
                background: gradient,
                transitionDelay: `${Math.floor(i / 2) * 120}ms`,
              }}
            >
              {/* Icon + tag row */}
              <div className="flex items-start justify-between">
                <div
                  className="reveal-scale w-13 h-13 rounded-2xl flex items-center justify-center shadow-soft flex-shrink-0"
                  style={{ background: iconBg, width: '52px', height: '52px', transitionDelay: `${Math.floor(i / 2) * 120 + 200}ms` }}
                >
                  <Icon size={22} color="white" />
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/70 text-gray-600">
                  {tag}
                </span>
              </div>

              <span className="text-xs font-bold tracking-widest uppercase text-gray-400">
                {label}
              </span>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
