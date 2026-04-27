import Header from "../components/Header";
import homeImg from "../assets/images/mockuper (4).png";
import img1 from "../assets/images/ovulation.png";
import img2 from "../assets/images/lifestyle.png";
import img3 from "../assets/images/community.png";
import Waitlist from "../components/Waitlist";
import { Accessibility } from "lucide-react";
import { lifestyleService } from "../lib/services/lifestyle.service";
import { useEffect, useState } from "react";
import { type LifestyleTip } from "../types/lifestyle";
import { Link } from "react-router";

interface CardProps {
  icon: string | any;
  title: string;
  text: string;
}

interface FeatureProps {
  title: string;
  text: string;
  img: string;
}

interface StruggleProps {
  title: string;
  text: string;
  author: string;
  // index: number;
}

const Home = () => {
  const cards: CardProps[] = [
    {
      icon: Accessibility,
      title: "Accuracy",
      text: "Track your cycle and symptoms with clinical-grade precision designed for PCOS. Our algorithm learns your patterns to provide increasingly accurate predictions and personalized insights.",
    },
    {
      icon: Accessibility,
      title: "Accountability",
      text: "Take ownership of your health journey with comprehensive tracking and detailed health reports. Share your data securely with healthcare providers for better-informed medical decisions.",
    },
    {
      icon: Accessibility,
      title: "Privacy",
      text: "Your health data is sacred. We use enterprise-grade encryption and never sell your information. Your wellness journey remains completely private and under your control.",
    },
  ];

  const features = [
    {
      title: "Cycle & Ovulation Tracking",
      text: "Easily track your menstrual cycle and ovulation with PCOS-specific insights to understand your body's patterns.",
      img: img1,
    },
    {
      title: "Lifestyle Tips from Health Experts",
      text: "Get simple, expert tips on diet, exercise, and stress management to effectively manage PCOS and boost your overall well-being.",
      img: img2,
    },
    {
      title: "Community Support",
      text: "Join a safe, anonymous community to share experiences and connect with thousands of other women living with PCOS.",
      img: img3,
    },
  ];

  const dummyTips: LifestyleTip[] = [
    {
      id: "fallback-1",
      title: "Managing PCOS with small daily habits",
      summary:
        "Daily routines like regular sleep, hydration, and gentle movement can help ease PCOS symptoms over time.",
      image_url:
        "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80",
      category: "Wellness",
      read_time: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: "fallback-2",
      title: "Food choices that support hormone balance",
      summary:
        "Learn the foods that can help stabilize insulin and reduce inflammation for better PCOS management.",
      image_url:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
      category: "Nutrition",
      read_time: 6,
      created_at: new Date().toISOString(),
    },
    {
      id: "fallback-3",
      title: "Stress relief strategies for hormonal health",
      summary:
        "Simple practices like breathing exercises, walking, and reflection can support your body and mood.",
      image_url:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
      category: "Self-care",
      read_time: 4,
      created_at: new Date().toISOString(),
    },
  ];

  const struggle: StruggleProps[] = [
    {
      title: "I'm managing alone with no support",
      text: "I have irregular periods and struggle with weight loss, but I've never had proper medical guidance. I feel like I'm managing everything on my own and need a community of women who understand what I'm going through.",
      author: "Anonymous",
      // index: "Jun 30, 2025",
    },
    {
      title: "My symptoms affect everything",
      text: "Irregular periods, excess hair, acne, weight gain, mood swings - PCOS impacts my daily life significantly. I'm somewhat informed but still struggle with managing everything. I need personalized help that addresses all my symptoms, not just periods.",
      author: "Anonymous",
      // index: "Jun 30, 2025",
    },
    {
      title: "I need more than just period tracking",
      text: "I have irregular periods, acne, and mood swings, but most apps only track periods. I need something that helps me track all my symptoms, connects me with professionals, and gives me mental health support too.",
      author: "Anonymous",
      // index: "Jun 30, 2025",
    },
  ];
  const [lifestyleTips, setLifestyleTips] = useState<LifestyleTip[]>([]);

  useEffect(() => {
    const handleFetchTips = async () => {
      try {
        const response = await lifestyleService.getLifestyle();
        setLifestyleTips(response);
        console.log(response);
      } catch (error) {
        console.error("Error fetching lifestyle tips:", error);
      }
    };
    handleFetchTips();
  }, []);

  const displayedTips = lifestyleTips.length > 0 ? lifestyleTips : dummyTips;

  return (
    <>
      <Header title="UteriFlow" />
      <main className="pt-16 sm:pt-20">
        <section className="hero w-full bg-soft-color relative z-10 mx-auto px-4 sm:px-6 sm:py-10 flex justify-between items-center min-h-screen">
          <div className="content flex flex-col lg:flex-row justify-center items-center w-full  mx-auto gap-8 sm:gap-12">
            <div className="flex-1 md:ml-30">
              <p className="font-medium text-base sm:text-xl bg-secondary-color/10 text-secondary-color inline p-2 sm:p-3 px-3 sm:px-6 rounded-full mb-4">
                Your Holistic PCOS Companion
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold py-4 sm:py-8 text-primary-color">
                Built For You.
              </h1>
              <p className="text-base sm:text-lg text-secondary-color mb-6 sm:mb-8 leading-relaxed">
                UteriFlow is a comprehensive platform that helps women track
                their cycles, manage PCOS symptoms, access expert health tips,
                and connect with medical professionals—all privately and
                securely.
              </p>
              <button className="rounded p-3 sm:p-4 px-6 sm:px-8 bg-primary-color text-white font-semibold hover:bg-secondary-color transition w-full sm:w-auto">
                Get It On PlayStore
              </button>
            </div>
            <div className="flex-2">
              <img
                src={homeImg}
                alt="UteriFlow App"
                className="animate-[float_6s_ease-in-out_infinite] drop-shadow-lg w-full max-w-5xl sm:max-w-lg lg:max-w-6xl"
              />
            </div>
          </div>
        </section>

        <section className="relative z-10 mt-12 sm:mt-12 bg-primary-color backdrop-blur-md p-20 sm:p-10 md:p-24 rounded-2xl max-w-5xl mx-4 sm:mx-auto border border-white/40">
          <h1 className="text-2xl sm:text-3xl md:text-4xl text-white text-center font-semibold">
            Trusted by <b>20,000+</b> women in the community
          </h1>
        </section>

        <section className="text-center mt-20 sm:mt-30 my-8 sm:my-16 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-8 sm:mb-12">
              Why Choose <span className="text-secondary-color">UteriFlow</span>
            </h1>
            <div className="card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {cards.map((card, index) => (
                <div
                  className="group border border-white/40 bg-white/60 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-md transition-all duration-500 hover:-translate-y-3 hover:shadow-xl hover:border-secondary-color"
                  key={index}
                >
                  <div className="text-secondary-color mb-4">
                    <card.icon size={32} />
                  </div>
                  <h1 className="text-lg sm:text-xl font-semibold text-secondary-color group-hover:text-primary-color transition mb-3">
                    {card.title}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    {card.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary-color rounded-t-3xl sm:rounded-t-4xl p-6 sm:p-10 md:p-16">
          <div className=" ">
            <h1 className="text-4xl text-start sm:text-5xl md:text-6xl lg:text-7xl xl:text-[200px] text-white font-bold  mb-4">
              Everything
            </h1>
            <h1 className="text-end text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[150px] text-secondary-color/80 font-bold mb-12 sm:mb-20">
              You Need!
            </h1>

            <section className="features space-y-8 sm:space-y-12 max-w-7xl mx-auto">
              {features.map((item, index) => (
                <div
                  className={`container flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} justify-between items-center gap-6 sm:gap-8 text-white`}
                  key={index}
                >
                  <div className="w-full lg:w-1/2 bg-secondary-color/30 backdrop-blur-md border border-white/10 p-10 sm:p-15 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-[#784ab7]/40 transition duration-500">
                    <h1 className="text-2xl sm:text-3xl font-semibold mb-4">
                      {item.title}
                    </h1>
                    <p className="text-sm sm:text-base leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                  <div className="w-full lg:w-1/2 flex justify-center">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full max-w-xs sm:max-w-sm rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              ))}
            </section>
          </div>
        </section>

        <section className="tips flex flex-col justify-center items-center py-12 sm:py-20 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary-color mb-2 sm:mb-4 text-center">
            Learn & Thrive
          </h1>
          <p className="text-base sm:text-lg text-gray-600 text-center mb-8 sm:mb-12">
            Medical Insights and practical advice for your wellness journey
          </p>

          <section className="flex flex-col sm:flex-row flex-wrap justify-center gap-6 sm:gap-8 max-w-6xl mx-auto">
            {displayedTips.slice(0, 3).map((item, index) => (
              <div
                className="group p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white shadow-lg hover:-translate-y-3 hover:shadow-2xl transition-all duration-500 w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-16px)] flex flex-col"
                key={index}
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-32 sm:h-40 object-cover rounded-lg mb-4"
                  />
                )}
                <h1 className="text-lg sm:text-2xl font-semibold my-3 sm:my-4 text-gray-900">
                  {item.title}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-2">
                  {item.summary}
                </p>

                <Link to={`/articles/${item.id}`} className="mt-auto">
                  <button className="rounded-full px-4 sm:px-6 py-2 sm:py-3 bg-primary-color text-white font-semibold shadow-md group-hover:scale-105 transition w-full sm:w-auto">
                    Read More
                  </button>
                </Link>
                <div className="pt-4 sm:pt-8">
                  <h1 className="font-semibold text-sm text-primary-color">
                    {item.category.toUpperCase()}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {item.read_time} min read
                  </p>
                </div>
              </div>
            ))}
          </section>
        </section>

        <section className="relative overflow-hidden flex flex-col items-center py-12 sm:py-20 md:py-32 bg-soft-color px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary-color mb-2">
            We Heard Your Struggles
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-16">
            So we built something better.
          </p>

          <section className="flex flex-col sm:flex-row flex-wrap justify-center gap-6 sm:gap-8 max-w-6xl">
            {struggle.map((item, index) => (
              <div
                key={index}
                className="relative w-full sm:w-[calc(50%-16px)] lg:w-85 p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl"
              >
                {/* Big soft quote icon */}
                <span className="absolute -top-4 sm:-top-6 left-4 sm:left-6 text-5xl sm:text-7xl text-secondary-color opacity-40">
                  “
                </span>

                <h2 className="text-lg sm:text-xl font-semibold text-primary-color mb-3 sm:mb-4 relative z-10">
                  {item.title}
                </h2>

                <p className="text-sm sm:text-base text-gray-600 leading-relaxed relative z-10">
                  {item.text}
                </p>

                {/* User badge */}
                <div className="flex items-center gap-3 mt-6">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary-color to-secondary-color flex items-center justify-center text-white font-bold text-sm">
                    A
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary-color">
                      {item.author}
                    </p>
                    <p className="text-xs text-gray-400">Community Member</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </section>

        <Waitlist />
      </main>
    </>
  );
};

export default Home;
