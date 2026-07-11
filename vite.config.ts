import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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