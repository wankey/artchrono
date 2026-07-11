// Auth context + login/logout/session 管理
//
// 单用户自用：只支持邮箱+密码登录
// session 持久化到 tauri-plugin-store

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { saveSession, loadSession, clearSession } from "@/lib/session";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; session: Session; user: User };

type AuthContext = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  // 应用启动：尝试恢复 session
  useEffect(() => {
    (async () => {
      const saved = await loadSession();
      if (saved) {
        // 把 session 设回 supabase 客户端
        await supabase.auth.setSession({
          access_token: saved.access_token,
          refresh_token: saved.refresh_token,
        });
        setState({
          status: "authenticated",
          session: saved,
          user: saved.user,
        });
      } else {
        setState({ status: "anonymous" });
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("[Auth] signIn start");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("[Auth] signIn result:", { error: error?.message, hasSession: !!data.session });
    if (error) return { error: error.message };
    if (data.session) {
      try {
        await saveSession(data.session);
      } catch (e) {
        console.warn("[Auth] saveSession failed (non-fatal):", e);
      }
      setState({
        status: "authenticated",
        session: data.session,
        user: data.user!,
      });
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    console.log("[Auth] signUp start, URL:", import.meta.env.VITE_SUPABASE_URL?.slice(0, 30) + "...");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
      },
    });
    console.log("[Auth] signUp result:", { error: error?.message, hasSession: !!data.session, hasUser: !!data.user });
    if (error) return { error: error.message };
    if (data.session) {
      await saveSession(data.session);
      setState({
        status: "authenticated",
        session: data.session,
        user: data.user!,
      });
    } else if (data.user && data.user.identities?.length === 0) {
      // 邮箱已存在：提示去登录
      return { error: "邮箱已存在，请直接登录" };
    } else if (!data.session) {
      // Confirm email 还没关 — 需要去邮箱验证
      return { error: "注册成功但需邮箱验证。去 Supabase Dashboard → Authentication → Providers → Email → 关闭 Confirm email" };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await clearSession();
    setState({ status: "anonymous" });
  };

  return (
    <AuthCtx.Provider value={{ state, signIn, signUp, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}