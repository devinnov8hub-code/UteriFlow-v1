import { ArrowRight, Bell, Sparkles } from "lucide-react";
import homeImg from "../assets/Homephoneimage.png";

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative min-h-dvh flex items-center pt-20 pb-12 overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, #FAF0FA 0%, #FFE4EC 45%, #D5F4F5 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-16 right-0 w-96 h-96 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, #D088CC, transparent)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #A0E1E3, transparent)" }}
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #FEB3C7, transparent)" }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 w-full">
        <section className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-[#F3D6F1] shadow-soft mb-6">
              <Sparkles size={14} className="text-[#AB2EA5]" />
              <span className="text-xs font-semibold text-[#690064] tracking-wide uppercase">
                Coming soon — join the waitlist
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-gray-900 mb-6">
              Understand your{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #690064, #AB2EA5 55%, #FB6F92)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                cycle.
              </span>
              <br />
              Own your{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #690064, #AB2EA5 55%, #FB6F92)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                health.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-lg">
              UteriFlow is a care app built for you — African women navigating
              irregular cycles, PCOS, and the everyday questions nobody talks
              about. Track, learn, and feel in control.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-white font-semibold text-base shadow-hero hover-lift transition-all"
                style={{
                  background: "linear-gradient(135deg, #690064, #AB2EA5)",
                }}
              >
                Join the Waitlist <ArrowRight size={18} />
              </a>
              <a
                href="#newsletter"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base border-2 border-[#AB2EA5] text-[#690064] bg-white/60 backdrop-blur-sm hover:bg-[#FAF0FA] transition-all"
              >
                <Bell size={16} /> Subscribe to Newsletter
              </a>
            </div>

            {/* WhatsApp CTA */}
            <a
              href="https://chat.whatsapp.com/GBH5gMBlpyq3YJloAOY9pe?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-medium mb-8 transition-all hover-lift"
              style={{
                background: "rgba(37,211,102,0.12)",
                border: "1px solid rgba(37,211,102,0.3)",
                color: "#15803d",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              Join our WhatsApp community
            </a>

            {/* Social proof */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {["#690064", "#AB2EA5", "#38AFB7", "#FB6F92"].map(
                  (color, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: color }}
                      aria-hidden="true"
                    >
                      {["A", "F", "C", "K"][i]}
                    </div>
                  ),
                )}
              </div>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-[#690064]">500+</span> women
                already on the list
              </p>
            </div>
          </div>

          {/* Right — Premium phone mockup */}
          <div
            className="relative flex justify-center lg:justify-end translate-x-6 animate-fade-up delay-300"
            aria-hidden="true"
          >
            <div className="relative flex justify-center w-full max-w-4xl scale-125 lg:scale-150">
              <div
                className="absolute inset-0 rounded-[44px] blur-2xl opacity-50 scale-85"
                style={{
                  background:
                    "linear-gradient(135deg, #AB2EA5, #FB6F92, #38AFB7)",
                }}
              />
              <img
                src={homeImg}
                alt="UteriFlow App"
                style={{ width: "100%", height: "auto" }}
                className="relative z-10 w-full max-w-[850px] object-contain animate-[float_6s_ease-in-out_infinite] drop-shadow-2xl"
              />

              {/* Floating cards */}
              <div className="absolute left-12 top-1/4 z-20 bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl px-3.5 py-3 flex items-center gap-2.5 animate-fade-up delay-500">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#FFE4EC" }}
                >
                  <span className="text-sm">💜</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Community</p>
                  <p className="text-xs font-bold text-gray-900">Anonymous</p>
                </div>
              </div>

              <div className="absolute right-12 bottom-1/3 bg-white rounded-2xl shadow-card px-3.5 py-3 flex items-center gap-2.5 animate-fade-up delay-600">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#D5F4F5" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 12l2 2 4-4"
                      stroke="#38AFB7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="#38AFB7"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">PCOS-aware</p>
                  <p className="text-xs font-bold text-gray-900">Insights</p>
                </div>
              </div>

              <div className="absolute left-20 bottom-1/4 bg-white rounded-2xl shadow-card px-3.5 py-3 animate-fade-up delay-400">
                <p className="text-[10px] text-gray-400 mb-0.5">Cycle day</p>
                <p className="text-lg font-black" style={{ color: "#690064" }}>
                  14
                </p>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: i < 3 ? "#AB2EA5" : "#F3D6F1" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-14 animate-fade-in delay-600">
          <a
            href="#problem"
            className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-[#AB2EA5] transition-colors"
            aria-label="Scroll down"
          >
            <span className="text-xs font-medium">Scroll to learn more</span>
            <div className="w-5 h-8 rounded-full border-2 border-current flex items-start justify-center pt-1.5">
              <div className="w-1 h-2 bg-current rounded-full animate-bounce" />
            </div>
          </a>
        </div>
      </div>

      {/* </div> */}
    </section>
  );
}
