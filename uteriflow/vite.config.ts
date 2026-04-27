import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In local dev, forward /api/* to the backend on port 3000 so the admin
    // can call /api/v1/admin/users without CORS pain. Production reads
    // VITE_API_URL directly (set in Vercel env vars).
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
