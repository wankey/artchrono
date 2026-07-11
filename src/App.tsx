// App 根组件 — V1 带侧边导航 + 学生详情页

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/pages/Login";
import LoginPage from "@/pages/LoginPage";
import { supabase } from "@/lib/supabase";
import HomePage from "@/pages/HomePage";
import StudentsPage from "@/pages/StudentsPage";
import StudentDetailPage from "@/pages/StudentDetailPage";
import CoursesPage from "@/pages/CoursesPage";
import ExportPage from "@/pages/ExportPage";
import PaymentsPage from "@/pages/PaymentsPage";
import StatsPage from "@/pages/StatsPage";
import OnboardingPage from "@/pages/OnboardingPage";
import { LogoIcon } from "@/components/Logo";
import { BarChart3, CalendarDays, Users, GraduationCap, CreditCard, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type Page = "home" | "stats" | "students" | "student_detail" | "courses" | "payments" | "export" | "onboarding";

function Layout() {
  const [page, setPage] = useState<Page>("home");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { state, signOut } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;

  // 启动时兜底 regeneration
  useEffect(() => {
    if (state.status !== "authenticated") return;
    const run = async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id")
        .eq("status", "active");
      for (const e of enrollments ?? []) {
        try {
          await supabase.rpc("regenerate_for_enrollment", { p_enrollment_id: e.id });
        } catch { /* non-fatal */ }
      }
    };
    run();
  }, [state.status]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 text-gray-100 flex flex-col" style={{ backgroundColor: "#1A3C38" }}>
        <div className="px-4 py-4 border-b border-gray-700/30">
          <div className="flex items-center gap-2">
            <LogoIcon size="sm" />
            <h1 className="text-base font-bold tracking-wide" style={{ color: "#E8F4F0" }}>艺时纪</h1>
          </div>
        </div>
        <nav className="flex-1 py-2">
          <NavItem icon={<BarChart3 className="w-4 h-4" />} label="数据看板" active={page === "stats"} onClick={() => { setPage("stats"); setSelectedStudentId(null); }} />
          <NavItem icon={<CalendarDays className="w-4 h-4" />} label="今日课程" active={page === "home"} onClick={() => { setPage("home"); setSelectedStudentId(null); }} />
          <NavItem icon={<Users className="w-4 h-4" />} label="学生管理" active={page === "students" || page === "student_detail"} onClick={() => { setPage("students"); setSelectedStudentId(null); }} />
          <NavItem icon={<GraduationCap className="w-4 h-4" />} label="课程管理" active={page === "courses"} onClick={() => { setPage("courses"); setSelectedStudentId(null); }} />
          <NavItem icon={<CreditCard className="w-4 h-4" />} label="付款录入" active={page === "payments"} onClick={() => { setPage("payments"); setSelectedStudentId(null); }} />
          <NavItem icon={<Download className="w-4 h-4" />} label="数据导出" active={page === "export"} onClick={() => { setPage("export"); setSelectedStudentId(null); }} />
        </nav>
        <div className="px-4 py-3 border-t border-gray-700/30 flex items-center justify-between">
          <span className="text-xs text-gray-400 truncate">{user?.email}</span>
          <button onClick={() => signOut()} className="text-gray-400 hover:text-white" title="登出">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        {page === "stats" && <StatsPage />}
        {page === "home" && <HomePage onSelectStudent={(id) => { setSelectedStudentId(id); setPage("student_detail"); }} />}
        {page === "students" && (
          <StudentsPage onSelectStudent={(id) => { setSelectedStudentId(id); setPage("student_detail"); }} />
        )}
        {page === "student_detail" && selectedStudentId && (
          <StudentDetailPage studentId={selectedStudentId} onBack={() => { setPage("students"); setSelectedStudentId(null); }} />
        )}
        {page === "courses" && <CoursesPage />}
        {page === "payments" && <PaymentsPage />}
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
      className={`w-full justify-start gap-3 rounded-none px-4 py-2.5 text-sm font-normal transition-colors ${
        active ? "text-white" : "text-gray-300 hover:text-white"
      }`}
      style={active ? { backgroundColor: "#2D8A7B" } : {}}
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