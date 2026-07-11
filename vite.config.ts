import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // 与 tsconfig.json paths 保持一致
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Tauri 期望固定端口 1421
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    host: false,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 1421,
    },
    watch: {
      // 忽略 src-tauri 目录避免重复触发 Rust rebuild
      ignored: ["**/src-tauri/**"],
    },
  },
  // Vite 8 默认配置 Tauri-friendly
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});