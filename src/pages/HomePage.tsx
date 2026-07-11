// 已登录用户的首页（骨架）
// V1 暂时只是占位，下一步（T6+）填充真实内容

import { useAuth } from "@/pages/Auth";
import { LogOut } from "lucide-react";

export default function HomePage() {
  const { state, signOut } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">课程管家</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1 text-sm text-gray-700 hover:text-red-600"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎 🎉</h2>
          <p className="text-gray-600">
            T5 (Auth flow) 完成。下一步 T6（学生/课程/考级 CRUD）。
          </p>
          <p className="text-sm text-gray-400 mt-4">
            User ID: {user?.id}
          </p>
        </div>
      </main>
    </div>
  );
}