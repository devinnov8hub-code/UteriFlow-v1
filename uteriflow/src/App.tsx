import "./App.css";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";

// Landing shell
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Landing sections
import HeroSection from "./components/HeroSection";
import ProblemSection from "./components/ProblemSection";
import SolutionSection from "./components/SolutionSection";
import HowItWorksSection from "./components/HowItWorksSection";
import ValuePropositionSection from "./components/ValuePropositionSection";
import NewsletterSection from "./components/NewsletterSection";
import WaitlistSection from "./components/WaitlistSection";

// Landing pages
import ArticlesPage from "./pages/ArticlesPage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";

// Admin sub-app — owns /admin/*
import AdminApp from "./admin/AdminApp";

/**
 * UteriFlow web app
 *
 *   /            → landing home (waitlist marketing page)
 *   /articles    → public health-education articles index
 *   /articles/:id→ single article (reads from /api/v1/lifestyle/:id)
 *   /contact, /privacy, /terms
 *   /admin/*     → admin dashboard (login required; analytics, users,
 *                  content, newsletter, waitlist, notifications, settings)
 *
 * The landing chrome (Navbar + Footer) wraps everything EXCEPT the admin
 * section — admin has its own sidebar/topbar, so showing the public navbar
 * inside /admin would look broken.
 */

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    const timer = setTimeout(() => {
      document
        .querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-line")
        .forEach((el) => observer.observe(el));
    }, 50);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [location.pathname]);

  return null;
}

function LandingHome() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <ValuePropositionSection />
      <NewsletterSection />
      <WaitlistSection />
    </main>
  );
}

/**
 * Wraps the public site routes with the shared Navbar and Footer.
 * /admin/* is matched in App before this falls through.
 */
function LandingShell() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingHome />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:id" element={<ArticleDetailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<LandingHome />} />
      </Routes>
      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<LandingShell />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
