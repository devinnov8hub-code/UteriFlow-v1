import "./App.css";
import { Route, Routes, BrowserRouter } from "react-router";
import Home from "./pages/Home";
import About from "./pages/About";
import Articles from "./pages/Articles";
import TipDetail from "./pages/TipDetail";
import AdminApp from "./admin/AdminApp";

/**
 * Single SPA serving:
 *   /, /about, /articles, /articles/:id    →  public landing site (waitlist)
 *   /admin/*                                →  admin dashboard (login required)
 *
 * The admin section is its own self-contained <Routes> (`AdminApp`) mounted
 * with the splat path `/admin/*`. Its internal routes (login, analytics,
 * users, content, notifications, settings) resolve under /admin without
 * needing a separate <BrowserRouter>.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing routes */}
        <Route path="/" index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/articles/:id" element={<TipDetail />} />

        {/* Admin sub-app — owns /admin, /admin/login, /admin/analytics, etc. */}
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
