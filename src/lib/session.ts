// Session 持久化（用 tauri-plugin-store）
//
// V1 简化：用纯 JSON KV 存储 session token
// macOS app data dir 已有 OS 级保护，无需应用层加密
// V1.1 切换到 stronghold（如果需要真加密场景）

import { load } from "@tauri-apps/plugin-store";
import { Session } from "@supabase/supabase-js";

const STORE_FILE = "session.json";
const SESSION_KEY = "supabase_session_v1";

// 应用启动时调用一次：loadStore()
// 后续 saveSession / loadSession / clearSession 复用
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
}

export async function loadSession(): Promise<Session | null> {
  try {
    const store = await getStore();
    const session = await store.get<Session>(SESSION_KEY);
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