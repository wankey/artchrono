// Session 管理 — V1 直接使用 Supabase 内置 persistSession（localStorage）
// Tauri WebView 的 localStorage 会随应用保持，不需要额外存储层
// V1.1 如需更安全的存储：切回 tauri-plugin-store 或 stronghold

import { supabase } from "@/lib/supabase";

export async function ensureUser(userId: string, email?: string): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!existing) {
      await supabase.from("users").insert({
        id: userId,
        name: email?.split("@")[0] ?? "老师",
      });
    }
  } catch {
    // 非致命
  }
}