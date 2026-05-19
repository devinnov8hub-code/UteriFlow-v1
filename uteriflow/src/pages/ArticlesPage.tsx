import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Clock, ArrowUpRight, BookOpen } from "lucide-react";
import { lifestyleService } from "../lib/services/lifestyle.service";
import type { LifestyleTip } from "../types/lifestyle";
import logo from "../assets/logo.svg";

/**
 * Articles index. Lists every article posted by an admin via the
 * /admin/content page (which writes to `lifestyle_articles` and exposes them
 * through `GET /api/v1/lifestyle`).
 *
 * Per product direction the previous category filter chips ("All / PCOS /
 * Cycle / Education / Hormones / Nutrition / Lifestyle") have been removed —
 * articles are just listed chronologically. If you ever want category
 * filtering back, the v1 backend already accepts `?category=...` on the
 * /lifestyle endpoint and the categories are constrained server-side.
 */

function CategoryBadge({ category }: { category: string }) {
  // Subtle tint per category but no UI to filter on it — just decoration.
  const palette: Record<string, { bg: string; text: string }> = {
    "Daily Habits":     { bg: "#F3D6F1", text: "#690064" },
    "Stress Management":{ bg: "#FFE4EC", text: "#FB6F92" },
    "Cycle Care":       { bg: "#D5F4F5", text: "#38AFB7" },
  };
  const colors = palette[category] || { bg: "#F3D6F1", text: "#690064" };
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: colors.bg, color: colors.text }}
    >
      {category}
    </span>
  );
}

function ArticleCard({ article }: { article: LifestyleTip }) {
  return (
    <Link
      to={`/articles/${article.id}`}
      className="group block bg-white rounded-3xl overflow-hidden hover-lift shadow-card transition-all duration-300 border border-gray-50"
    >
      {/* Cover */}
      <div
        className="h-48 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #F3D6F1 0%, #FFE4EC 100%)" }}
      >
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <>
            <div
              className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full opacity-30"
              style={{ background: "rgba(255,255,255,0.5)" }}
            />
            <div
              className="absolute -top-4 -left-4 w-24 h-24 rounded-full opacity-20"
              style={{ background: "rgba(255,255,255,0.6)" }}
            />
            <div className="absolute bottom-4 left-4 opacity-20">
              <img
                src={logo}
                alt=""
                className="h-5 w-auto"
                style={{ filter: "brightness(0)" }}
              />
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {article.category && <CategoryBadge category={article.category} />}
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug group-hover:text-[#690064] transition-colors line-clamp-2">
          {article.title}
        </h3>

        <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">
          {article.summary}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {article.read_time || 4} min read
            </span>
          </div>
          <div
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "#690064" }}
          >
            Read article
            <ArrowUpRight size={13} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<LifestyleTip[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    lifestyleService
      .getLifestyle()
      .then((data) => {
        setArticles(data);
        setError(null);
      })
      .catch(() => setError("Could not load articles."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#FDFAFD" }}>
      {/* Hero */}
      <section
        className="pt-28 pb-14 text-center px-5 sm:px-8"
        style={{
          background:
            "linear-gradient(160deg, #FAF0FA 0%, #FFE4EC 50%, #D5F4F5 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <span
            className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full"
            style={{ background: "#F3D6F1", color: "#690064" }}
          >
            Health education
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            Read, learn,{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #690064, #AB2EA5 55%, #FB6F92)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              understand.
            </span>
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Expert-backed articles on PCOS, your cycle, hormones, and
            reproductive health — written in plain language, for real African
            women.
          </p>
        </div>
      </section>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        {!loading && !error && (
          <div className="mb-8">
            <p className="text-sm text-gray-400">
              {articles.length} article{articles.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl overflow-hidden animate-pulse"
              >
                <div className="h-48" style={{ background: "#F3D6F1" }} />
                <div className="p-6">
                  <div className="h-3 bg-gray-100 rounded mb-3 w-1/3" />
                  <div className="h-4 bg-gray-100 rounded mb-2" />
                  <div className="h-4 bg-gray-100 rounded mb-4 w-3/4" />
                  <div className="h-3 bg-gray-50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-gray-400">{error}</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={40} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400">
              No articles yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
