// App 根组件 — V1 带侧边导航

import { useState } from "react";
import { AuthProvider, useAuth } from "@/pages/Login";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import StudentsPage from "@/pages/StudentsPage";
import CoursesPage from "@/pages/CoursesPage";
import { CalendarDays, Users, GraduationCap, LogOut } from "lucide-react";

type Page = "home" | "students" | "courses";

function Layout() {
  const [page, setPage] = useState<Page>("home");
  const { state, signOut } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">课程管家</h1>
        </div>
        <nav className="flex-1 py-2">
          <NavItem icon={<CalendarDays className="w-4 h-4" />} label="今日课程" active={page === "home"} onClick={() => setPage("home")} />
          <NavItem icon={<Users className="w-4 h-4" />} label="学生管理" active={page === "students"} onClick={() => setPage("students")} />
          <NavItem icon={<GraduationCap className="w-4 h-4" />} label="课程管理" active={page === "courses"} onClick={() => setPage("courses")} />
        </nav>
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400 truncate">{user?.email}</span>
          <button onClick={() => signOut()} className="text-gray-400 hover:text-white" title="登出">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        {page === "home" && <HomePage />}
        {page === "students" && <StudentsPage />}
        {page === "courses" && <CoursesPage />}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        active ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Root() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">加载中…</div></div>;
  }

  if (state.status === "anonymous") {
    return <LoginPage />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}