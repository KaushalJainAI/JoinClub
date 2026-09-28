import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    build: {
      rollupOptions: {
        output: {
          // Long-lived vendor chunks cache well across deploys.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom", "react-redux", "@reduxjs/toolkit"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs", "@radix-ui/react-avatar", "@radix-ui/react-label", "sonner", "next-themes"],
          },
        },
      },
    },
    server: {
      // In dev the browser talks to Vite only; /api is forwarded to the backend, so
      // cookies and streaming work without CORS.
      proxy: { "/api": { target: env.VITE_BACKEND_URL || "http://localhost:8000", changeOrigin: true } },
    },
  };
});
