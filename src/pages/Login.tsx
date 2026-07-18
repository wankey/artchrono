// Auth context — 直接用 Supabase 内置 persistSession（localStorage）

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureUser } from "@/lib/session";

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

  // 应用启动：Supabase 自动从 localStorage 恢复 session
  useEffect(() => {
    let cancelled = false;
    // 兜底超时：Supabase 不可达（CI 占位 URL / 离线 / 网络抖动）时，
    // 避免 UI 永远卡在 loading 状态。
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      console.warn("[auth] getSession timeout, falling back to anonymous");
      setState({ status: "anonymous" });
    }, 3000);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) {
          setState({ status: "authenticated", session, user: session.user });
          try {
            await ensureUser(session.user.id, session.user.email);
          } catch {
            // ensureUser 失败不影响已认证状态
          }
        } else {
          setState({ status: "anonymous" });
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("[auth] getSession failed, falling back to anonymous", err);
        setState({ status: "anonymous" });
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      setState({ status: "authenticated", session: data.session, user: data.session.user });
      await ensureUser(data.session.user.id, data.session.user.email);
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: undefined } });
    if (error) return { error: error.message };
    if (data.session) {
      setState({ status: "authenticated", session: data.session, user: data.session.user });
      await ensureUser(data.session.user.id, data.session.user.email);
    } else if (data.user && !data.session) {
      return { error: "注册成功但需邮箱验证。去 Supabase Dashboard → Auth → 关闭 Confirm email" };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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