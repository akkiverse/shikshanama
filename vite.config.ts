import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "app/static/dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/admin/")) {
            return "admin";
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
