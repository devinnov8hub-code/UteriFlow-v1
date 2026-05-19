import { HelpCircle, HeartCrack, AlertCircle } from 'lucide-react'

const painPoints = [
  {
    icon: HelpCircle,
    color: '#FFE4EC',
    iconColor: '#FB6F92',
    title: '"My period just does whatever it wants."',
    body:
      'Irregular cycles that show up unannounced — or not at all. You track on a basic calendar app and hope for the best, but your body keeps changing the rules.',
  },
  {
    icon: AlertCircle,
    color: '#F3D6F1',
    iconColor: '#AB2EA5',
    title: '"The symptoms confuse me more than my cycle."',
    body:
      "Bloating, cramps, hair loss, skin breakouts — you've Googled every combination and still don't know what's normal for your body versus what's PCOS.",
  },
  {
    icon: HeartCrack,
    color: '#D5F4F5',
    iconColor: '#38AFB7',
    title: '"I feel alone trying to figure this out."',
    body:
      "Nobody in your life talks openly about reproductive health. Doctors give you five minutes and a pamphlet. You're left to figure it out by yourself.",
  },
]

export default function ProblemSection() {
  return (
    <section id="problem" className="py-20 sm:py-28 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Section header */}
        <div className="text-center mb-14 reveal">
          <span
            className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full"
            style={{ background: '#FFE4EC', color: '#FB6F92' }}
          >
            The real struggle
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            You know your body is talking.
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #690064, #AB2EA5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              You just can't hear it clearly.
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Millions of African women live with irregular cycles and PCOS symptoms with no real
            support. The tools out there weren't built for your experience.
          </p>
        </div>

        {/* Pain point cards — slide up with stagger */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {painPoints.map(({ icon: Icon, color, iconColor, title, body }, i) => (
            <div
              key={title}
              className="reveal rounded-3xl p-7 hover-lift cursor-default"
              style={{
                background: color,
                transitionDelay: `${i * 130}ms`,
              }}
            >
              <div
                className="reveal-scale w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'white', transitionDelay: `${i * 130 + 180}ms` }}
              >
                <Icon size={22} style={{ color: iconColor }} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-3 leading-snug">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Bridge paragraph */}
        <div className="mt-16 text-center reveal" style={{ transitionDelay: '200ms' }}>
          <div
            className="inline-block px-8 py-6 rounded-3xl max-w-2xl"
            style={{ background: 'linear-gradient(135deg, #FAF0FA, #FFE4EC)' }}
          >
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed font-medium">
              You shouldn't have to guess what your body is doing.{' '}
              <span className="font-bold text-[#690064]">UteriFlow</span> was built so you
              can finally stop guessing and start understanding.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
