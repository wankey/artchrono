// App 根组件 - V1 阶段
// 根据 auth state 切换 login / home

import { AuthProvider, useAuth } from "@/pages/Login";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";

function Root() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中…</div>
      </div>
    );
  }

  if (state.status === "anonymous") {
    return <LoginPage />;
  }

  return <HomePage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}