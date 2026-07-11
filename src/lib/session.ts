// Session 持久化（用 tauri-plugin-store）

import { load } from "@tauri-apps/plugin-store";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const STORE_FILE = "session.json";
const SESSION_KEY = "supabase_session_v1";

let storePromise: ReturnType<typeof load> | null = null;

async function getStore() {
  if (!storePromise) {
    storePromise = load(STORE_FILE, { autoSave: false });
  }
  return storePromise;
}

export async function saveSession(session: Session): Promise<void> {
  const store = await getStore();
  await store.set(SESSION_KEY, session as unknown as Record<string, unknown>);
  await store.save();

  // 确保 public.users 行存在（兜底 trigger 可能滞后）
  await ensureUser(session.user.id);
}

export async function loadSession(): Promise<Session | null> {
  try {
    const store = await getStore();
    const session = await store.get<Session>(SESSION_KEY);
    if (session) {
      // 恢复 session 后也兜底确保 user 存在
      await ensureUser(session.user.id);
    }
    return session ?? null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const store = await getStore();
  await store.delete(SESSION_KEY);
  await store.save();
}

// 兜底：如果 trigger 没触发，手动创建 public.users
async function ensureUser(userId: string): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!existing) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("users").insert({
        id: userId,
        name: user?.email?.split("@")[0] ?? "老师",
      });
    }
  } catch {
    // 失败非致命（可能是 trigger 还没跑完 + race condition）
  }
}