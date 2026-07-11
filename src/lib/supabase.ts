import { createClient } from "@supabase/supabase-js";

// ⚠️ VITE_ 前缀变量会被 Vite 暴露给客户端
// SUPABASE_ANON_KEY 是公开安全的（受 RLS 保护）
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env.local and fill in values."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,  // Tauri 不需要 URL 检测
  },
});