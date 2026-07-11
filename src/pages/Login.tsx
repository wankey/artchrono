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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      await saveSession(data.session);
      setState({
        status: "authenticated",
        session: data.session,
        user: data.user!,
      });
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      // Confirm email 关掉后会立即返回 session；否则需 email 验证
      await saveSession(data.session);
      setState({
        status: "authenticated",
        session: data.session,
        user: data.user!,
      });
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