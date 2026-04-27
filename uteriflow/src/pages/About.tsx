import { Goal, Heart, Users, Zap } from "lucide-react";
import Header from "../components/Header";

export default function About() {
  const cards = [
    {
      icon: Goal,
      title: "Our Mission",
      text: "We created UteriFlow to give women with PCOS the tools, knowledge, and support they deserve. This isn't just another period tracker – it's your complete PCOS wellness companion.",
    },
    {
      icon: Heart,
      title: "Your Wellness",
      text: "We understand that managing PCOS can feel overwhelming and lonely. Irregular cycles, hormonal changes, and constant uncertainty shouldn't define your life.",
    },
    {
      icon: Zap,
      title: "Empowerment",
      text: "Through personalized insights, expert articles, and a supportive community, we empower you to take control of your health and make informed decisions about your wellness.",
    },
  ];

  const features = [
    {
      title: "Accurate Tracking",
      description:
        "Track your cycle with precision and get personalized insights based on your PCOS patterns.",
    },
    {
      title: "Expert Insights",
      description:
        "Access curated wellness articles written by healthcare professionals for women's health.",
    },
    {
      title: "Privacy First",
      description:
        "Your health data is yours. We prioritize your privacy and security above everything.",
    },
    {
      title: "Community Support",
      description:
        "Connect with others on similar journeys and share experiences in a safe, supportive space.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header title="UteriFlow" />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-color to-secondary-color text-white py-20 sm:py-32 px-4 mt-16 sm:mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6">
            Your Needs?
          </h1>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            We Get It.
          </h2>
          <p className="text-base sm:text-xl text-gray-100 leading-relaxed">
            Managing PCOS can feel overwhelming and lonely. Irregular cycles,
            hormonal changes, and constant uncertainty shouldn't define your
            life. We're here to change that.
          </p>
        </div>
      </section>

      {/* Mission Cards */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-20">
            {cards.map((card, index) => (
              <div
                className="group border border-gray-200 bg-white/60 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:border-primary-color"
                key={index}
              >
                <div className="text-primary-color mb-4">
                  <card.icon size={40} />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 group-hover:text-primary-color transition">
                  {card.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">
              Why Choose UteriFlow?
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              We combine cutting-edge technology with compassionate care to
              support your wellness journey.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-primary-color rounded-lg flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-xl">
                    {index + 1}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary-color to-secondary-color text-white rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6">
            Ready to Take Control?
          </h2>
          <p className="text-base sm:text-xl text-gray-100 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of women who are taking charge of their PCOS journey
            with UteriFlow.
          </p>
          <button className="bg-white text-primary-color px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition w-full sm:w-auto\">
            Join the Waitlist
          </button>
        </div>
      </section>
    </div>
  );
}
