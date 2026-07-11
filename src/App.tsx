// App 根组件 — V1 带侧边导航 + 学生详情页

import { useState } from "react";
import { AuthProvider, useAuth } from "@/pages/Login";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import StudentsPage from "@/pages/StudentsPage";
import StudentDetailPage from "@/pages/StudentDetailPage";
import CoursesPage from "@/pages/CoursesPage";
import ExportPage from "@/pages/ExportPage";
import OnboardingPage from "@/pages/OnboardingPage";
import { CalendarDays, Users, GraduationCap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type Page = "home" | "students" | "student_detail" | "courses" | "export" | "onboarding";

function Layout() {
  const [page, setPage] = useState<Page>("home");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { state, signOut } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">艺时纪</h1>
        </div>
        <nav className="flex-1 py-2">
          <NavItem icon={<CalendarDays className="w-4 h-4" />} label="今日课程" active={page === "home"} onClick={() => { setPage("home"); setSelectedStudentId(null); }} />
          <NavItem icon={<Users className="w-4 h-4" />} label="学生管理" active={page === "students" || page === "student_detail"} onClick={() => { setPage("students"); setSelectedStudentId(null); }} />
          <NavItem icon={<GraduationCap className="w-4 h-4" />} label="课程管理" active={page === "courses"} onClick={() => { setPage("courses"); setSelectedStudentId(null); }} />
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
        {page === "students" && (
          <StudentsPage onSelectStudent={(id) => { setSelectedStudentId(id); setPage("student_detail"); }} />
        )}
        {page === "student_detail" && selectedStudentId && (
          <StudentDetailPage studentId={selectedStudentId} onBack={() => { setPage("students"); setSelectedStudentId(null); }} />
        )}
        {page === "courses" && <CoursesPage />}
        {page === "export" && <ExportPage />}
        {page === "onboarding" && <OnboardingPage onComplete={() => setPage("home")} />}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`w-full justify-start gap-3 rounded-none px-4 py-2.5 text-sm font-normal ${
        active ? "bg-gray-700 text-white hover:bg-gray-700 hover:text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Button>
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