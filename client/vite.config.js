import { defineConfig } from "vite";

export default defineConfig({
  build: {
    minify: false, // Disable minification to make debugging easier
    sourcemap: true, // Enable source maps for better debugging
  },
  esbuild: {
    legalComments: "none", // Remove legal comments
    keepNames: true, // Keep original variable names
  },
});
