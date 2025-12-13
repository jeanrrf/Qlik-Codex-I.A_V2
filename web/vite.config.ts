import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    port: 5173,
    // Proxy API calls to local backend during development.
    // If the backend isn't running this would previously cause ECONNREFUSED errors
    // logged by Vite. We add a proxy error handler to return a clear 502 response
    // and a console warning — this avoids noisy stack traces in the dev console
    // and gives actionable instructions for developers.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // attach a small error handler so we return a friendly message when
        // the target (backend) isn't running instead of repeated ECONNREFUSED
        // stack traces in the Vite proxy logs.
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            // err is commonly ECONNREFUSED when backend not started
            // If res has been provided (it's an http.ServerResponse) we return
            // a compact JSON message the frontend can show or log.
            try {
              if (res && !res.headersSent) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  error: "Backend server unreachable",
                  message:
                    "Start the backend API (from the project root run: npm run start:dev)"
                }));
              }
            } catch (e) {
              // On some edge cases the response stream might be unavailable.
              // Don't crash Vite – just log a developer-friendly message.
            }
            // Keep a short, action-oriented warning in the dev server console.
            // Avoid printing the full stack to reduce noise in the terminal.
            // eslint-disable-next-line no-console
            console.warn(
              "[vite] proxy error connecting to backend (is the server running on http://localhost:3000?)."
            );
          });
        }
      }
    }
  },
  build: {
    outDir: "dist",
    // Keep vendor chunks small to avoid bundle warnings in Vercel builds
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        }
      }
    }
  }
});
