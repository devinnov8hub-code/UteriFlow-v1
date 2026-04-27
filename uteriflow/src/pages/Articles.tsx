import { type LifestyleTip } from "../types/lifestyle";
import { lifestyleService } from "../lib/services/lifestyle.service";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import Header from "../components/Header";
import { Clock, Tag } from "lucide-react";

export default function Articles() {
  const [lifestyleTips, setLifestyleTips] = useState<LifestyleTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLifestyleTips = async () => {
      try {
        setLoading(true);
        const tips = await lifestyleService.getLifestyle();
        setLifestyleTips(tips);
        setError(null);
      } catch (err) {
        console.error("Error fetching lifestyle tips:", err);
        setError("Failed to load articles. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchLifestyleTips();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header title="UteriFlow" />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-color to-secondary-color text-white py-20 sm:py-32 px-4 mt-16 sm:mt-20">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            Wellness Articles
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl mx-auto leading-relaxed">
            Explore our collection of expert-written articles on women's health,
            wellness, and lifestyle. Stay informed and empowered with insights
            tailored for your wellbeing.
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg sm:text-xl text-gray-600">
                Loading articles...
              </p>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg sm:text-xl text-red-600">{error}</p>
            </div>
          ) : lifestyleTips.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg sm:text-xl text-gray-600">
                No articles available at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {lifestyleTips.map((tip) => (
                <Link
                  key={tip.id}
                  to={`/articles/${tip.id}`}
                  className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  {/* Image Container */}
                  <div className="relative h-40 sm:h-48 overflow-hidden bg-gray-200">
                    {tip.image_url && (
                      <img
                        src={tip.image_url}
                        alt={tip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                      <span className="inline-flex items-center gap-1 bg-primary-color text-white px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">
                        <Tag size={14} />
                        {tip.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary-color transition">
                      {tip.title}
                    </h3>

                    <p className="text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-3">
                      {tip.summary}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3 sm:pt-4">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{tip.read_time} min read</span>
                      </div>
                      <span className="text-xs">
                        {new Date(tip.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    <div className="text-primary-color font-semibold text-sm group-hover:text-secondary-color transition">
                      Read Article →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
