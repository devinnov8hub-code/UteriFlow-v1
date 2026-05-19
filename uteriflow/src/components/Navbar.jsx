import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import logo from "../assets/logo.svg";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "Features", href: "/#solution" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Articles", href: "/articles" },
  { label: "Community", href: "/#waitlist" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setIsOpen(false), [location.pathname]);

  const isTransparent = isHome && !scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent
          ? "bg-transparent"
          : "bg-white/95 backdrop-blur-md shadow-soft"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center"
            aria-label="UteriFlow home"
          >
            <img
              src={logo}
              alt="UteriFlow"
              className="h-7 sm:h-8 w-auto"
              style={{ maxWidth: "160px" }}
            />
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden md:flex items-center gap-7"
            aria-label="Main navigation"
          >
            {navLinks.map((link) =>
              link.href.startsWith("/") && !link.href.includes("#") ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    location.pathname === link.href
                      ? "text-[#AB2EA5] font-semibold"
                      : "text-gray-500 hover:text-[#AB2EA5]"
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-gray-500 hover:text-[#AB2EA5] transition-colors duration-200"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          {/* Desktop CTA */}
          <a
            href="/#waitlist"
            className="hidden md:inline-flex items-center px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-soft hover-lift transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #690064, #AB2EA5)" }}
          >
            Join Waitlist
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-[#AB2EA5] hover:bg-[#FAF0FA] transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/98 backdrop-blur-md border-t border-[#F3D6F1] px-5 pb-6 pt-4">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) =>
              link.href.startsWith("/") && !link.href.includes("#") ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className="py-3 text-base font-medium text-gray-600 hover:text-[#AB2EA5] transition-colors border-b border-gray-50 last:border-0"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="py-3 text-base font-medium text-gray-600 hover:text-[#AB2EA5] transition-colors border-b border-gray-50 last:border-0"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
          <a
            href="/#waitlist"
            className="mt-4 flex items-center justify-center w-full px-5 py-3.5 rounded-full text-white text-sm font-semibold shadow-soft"
            style={{ background: "linear-gradient(135deg, #690064, #AB2EA5)" }}
          >
            Join Waitlist
          </a>
        </div>
      </div>
    </header>
  );
}
