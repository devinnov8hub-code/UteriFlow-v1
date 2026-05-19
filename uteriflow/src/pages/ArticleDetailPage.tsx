import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Clock, Calendar, BookOpen } from "lucide-react";
import { lifestyleService } from "../lib/services/lifestyle.service";
import type { LifestyleTipDetail } from "../types/lifestyle";

/**
 * Article reading view.
 *
 * Reads `lifestyle_articles` by id from the custom Express backend:
 *   GET /api/v1/lifestyle/:id
 *
 * Likes and comments were intentionally dropped from the original landing
 * version — the v1 backend doesn't expose those endpoints for lifestyle
 * articles, so wiring them up would just produce 404s. If we later add
 * `article_likes` / `article_comments` to the backend, this is the file to
 * extend.
 */

/* Minimal markdown-ish renderer. The content column on `lifestyle_articles`
 * is plain text — most posts will be paragraphs, with the occasional ##/###
 * heading or `-` bullet. We render that without pulling in a full markdown
 * library. Anything not matched falls through as a paragraph. */
function renderContent(raw: string): React.ReactNode[] {
  const lines = (raw || "").split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let buffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (buffer.length) {
      nodes.push(<p key={`p-${nodes.length}`}>{buffer.join(" ")}</p>);
      buffer = [];
    }
  };
  const flushList = () => {
    if (listBuffer.length) {
      nodes.push(
        <ul key={`ul-${nodes.length}`}>
          {listBuffer.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushParagraph(); flushList(); continue; }
    if (t.startsWith("### ")) {
      flushParagraph(); flushList();
      nodes.push(<h3 key={`h3-${nodes.length}`}>{t.slice(4)}</h3>);
    } else if (t.startsWith("## ")) {
      flushParagraph(); flushList();
      nodes.push(<h2 key={`h2-${nodes.length}`}>{t.slice(3)}</h2>);
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      flushParagraph();
      listBuffer.push(t.slice(2));
    } else if (t.startsWith("> ")) {
      flushParagraph(); flushList();
      nodes.push(<blockquote key={`bq-${nodes.length}`}>{t.slice(2)}</blockquote>);
    } else {
      flushList();
      buffer.push(t);
    }
  }
  flushParagraph();
  flushList();
  return nodes;
}

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<LifestyleTipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    lifestyleService
      .getLifestyleById(id)
      .then((data) => {
        if (!data) setError("Article not found.");
        else setArticle(data);
      })
      .catch(() => setError("Could not load article."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-28 px-5" style={{ background: "#FDFAFD" }}>
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-4 w-32 bg-gray-100 rounded mb-6" />
          <div className="h-10 bg-gray-100 rounded mb-3" />
          <div className="h-10 bg-gray-100 rounded mb-6 w-3/4" />
          <div className="h-64 bg-gray-100 rounded-3xl mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center" style={{ background: "#FDFAFD" }}>
        <BookOpen size={42} className="text-gray-200 mb-4" />
        <p className="text-gray-500 mb-6">{error || "Article not found."}</p>
        <Link
          to="/articles"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-soft hover-lift"
          style={{ background: "linear-gradient(135deg, #690064, #AB2EA5)" }}
        >
          <ArrowLeft size={15} /> Back to articles
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FDFAFD" }}>
      {/* Hero */}
      <section
        className="pt-28 pb-14 px-5 sm:px-8"
        style={{
          background:
            "linear-gradient(160deg, #FAF0FA 0%, #FFE4EC 50%, #D5F4F5 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <Link
            to="/articles"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#AB2EA5] transition-colors mb-6"
          >
            <ArrowLeft size={15} /> All articles
          </Link>

          {article.category && (
            <span
              className="inline-block text-[11px] font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
              style={{ background: "#F3D6F1", color: "#690064" }}
            >
              {article.category}
            </span>
          )}
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            {article.title}
          </h1>
          {article.summary && (
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {article.read_time || 4} min read
            </span>
            {article.created_at && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(article.created_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Cover */}
      {article.image_url && (
        <div className="max-w-3xl mx-auto px-5 sm:px-8 -mt-8">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full rounded-3xl shadow-card object-cover"
            style={{ maxHeight: "440px" }}
          />
        </div>
      )}

      {/* Body */}
      <article className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
        <div className="prose">{renderContent(article.content)}</div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#690064] hover:text-[#AB2EA5] transition-colors"
          >
            <ArrowLeft size={15} /> Back to all articles
          </Link>
          <Link
            to="/#waitlist"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-soft hover-lift"
            style={{ background: "linear-gradient(135deg, #690064, #AB2EA5)" }}
          >
            Join the waitlist
          </Link>
        </div>
      </article>
    </div>
  );
}
