import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { lifestyleService } from "../lib/services/lifestyle.service";
import { type LifestyleTipDetail } from "../types/lifestyle";
import Header from "../components/Header";
import { ArrowLeft } from "lucide-react";

export default function TipDetail() {
  const { id } = useParams<{ id: string }>();
  const [tip, setTip] = useState<LifestyleTipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTip = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const tipData = await lifestyleService.getLifestyleById(id);
        setTip(tipData);
        setError(null);
      } catch (err) {
        console.error("Error fetching tip:", err);
        setError("Failed to load article. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTip();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading article...</p>
      </div>
    );
  }

  if (error || !tip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl text-red-600 mb-4">
          {error || "Article not found"}
        </p>
        <Link
          to="/articles"
          className="text-primary-color hover:text-secondary-color font-semibold"
        >
          Back to Articles
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <Header title="UteriFlow" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-20 mt-16 sm:mt-20">
        {/* Back Button */}
        <Link
          to="/articles"
          className="flex items-center gap-2 text-primary-color hover:text-secondary-color mb-8 sm:mb-8 transition"
        >
          <ArrowLeft size={20} />
          Back to Articles
        </Link>

        {/* Article Header */}
        <div className="mb-8 sm:mb-12">
          <div className="mb-4">
            <span className="inline-block bg-primary-color text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold">
              {tip.category}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            {tip.title}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-600 border-b pb-4">
            <span className="text-xs sm:text-sm">
              📅{" "}
              {new Date(tip.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-xs sm:text-sm">
              ⏱️ {tip.read_time} min read
            </span>
          </div>
        </div>

        {/* Featured Image */}
        {tip.image_url && (
          <div className="mb-8 sm:mb-12 rounded-lg overflow-hidden shadow-lg">
            <img
              src={tip.image_url}
              alt={tip.title}
              className="w-full h-48 sm:h-64 md:h-96 object-cover"
            />
          </div>
        )}

        {/* Summary */}
        <div className="mb-8 sm:mb-12 bg-gray-50 p-4 sm:p-6 rounded-lg border-l-4 border-primary-color">
          <p className="text-base sm:text-lg text-gray-700 italic leading-relaxed">
            {tip.summary}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-sm sm:prose md:prose-lg max-w-none">
          <div className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
            {tip.content}
          </div>
        </div>

        {/* Back to Articles Link */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t">
          <Link
            to="/articles"
            className="inline-block bg-primary-color text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-secondary-color transition text-sm sm:text-base"
          >
            Explore More Articles
          </Link>
        </div>
      </div>
    </div>
  );
}
