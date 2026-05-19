import { Globe, ShieldCheck, Lock, Star } from 'lucide-react'

const props = [
  {
    icon: Globe,
    bg: 'linear-gradient(135deg, #690064, #AB2EA5)',
    title: 'Built for African women',
    body:
      'Most health apps treat African bodies as an afterthought. UteriFlow was designed from the ground up with Nigerian and African women at the centre — our language, our context, our lives.',
  },
  {
    icon: ShieldCheck,
    bg: 'linear-gradient(135deg, #38AFB7, #A0E1E3)',
    title: 'PCOS-aware from day one',
    body:
      "Standard cycle apps fail women with PCOS. UteriFlow is built with the understanding that your cycle won't behave like a textbook — and it doesn't try to force it into a 28-day box.",
  },
  {
    icon: Lock,
    bg: 'linear-gradient(135deg, #FB6F92, #FF8FAB)',
    title: 'Your privacy is sacred',
    body:
      'We will never sell your health data. Period. Your information stays yours — protected, encrypted, and handled with the care it deserves.',
  },
  {
    icon: Star,
    bg: 'linear-gradient(135deg, #AB2EA5, #D088CC)',
    title: 'Expert-backed, community-loved',
    body:
      'Our content is reviewed by reproductive health professionals. Our community is shaped by women who live this every day. You get the best of both.',
  },
]

export default function ValuePropositionSection() {
  return (
    <section
      id="value"
      className="py-20 sm:py-28 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FAF0FA 0%, #FFE4EC 50%, #D5F4F5 100%)' }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Section header */}
        <div className="text-center mb-14 reveal">
          <span
            className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full bg-white/70"
            style={{ color: '#690064' }}
          >
            Why UteriFlow
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            Different by design.
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #690064, #AB2EA5 55%, #FB6F92)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Made with intention.
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            We didn't just build another period tracker. We built something that actually
            respects and understands your experience.
          </p>
        </div>

        {/* Value cards — alternating slide direction */}
        <div className="grid sm:grid-cols-2 gap-6">
          {props.map(({ icon: Icon, bg, title, body }, i) => (
            <div
              key={title}
              className={`${i % 2 === 0 ? 'reveal-left' : 'reveal-right'} bg-white rounded-3xl p-7 sm:p-8 hover-lift flex gap-5 items-start shadow-card`}
              style={{ transitionDelay: `${Math.floor(i / 2) * 130}ms` }}
            >
              <div
                className="reveal-scale w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-soft"
                style={{ background: bg, transitionDelay: `${Math.floor(i / 2) * 130 + 200}ms` }}
              >
                <Icon size={24} color="white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quote callout */}
        <div className="mt-14 reveal-scale" style={{ transitionDelay: '150ms' }}>
          <div
            className="relative rounded-3xl px-8 sm:px-12 py-10 text-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #690064, #AB2EA5 60%, #FB6F92)' }}
          >
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
              style={{ background: 'white' }}
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10"
              style={{ background: 'white' }}
              aria-hidden="true"
            />
            <p className="relative text-xl sm:text-2xl font-bold text-white leading-relaxed mb-4">
              "You deserve to understand what's happening in your own body — not in
              clinical terms, but in a way that actually makes sense for your life."
            </p>
            <p className="relative text-sm text-white/70 font-medium">
              — The UteriFlow team
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
