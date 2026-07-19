// App 根组件 — V1 带侧边导航 + 学生详情页

import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/pages/Login";
import { supabase } from "@/lib/supabase";
import { useT } from "@/i18n/useTypedTranslation";
import { LogoIcon } from "@/components/Logo";
import { BarChart3, CalendarDays, Users, GraduationCap, CreditCard, Download, LogOut, Settings as SettingsIcon } from "lucide-react";

// React.lazy: 每个页面按需加载；与 React Router 的 <Route> 配合即可按 URL 拆 chunk
const HomePage = lazy(() => import("@/pages/HomePage"));
const StatsPage = lazy(() => import("@/pages/StatsPage"));
const StudentsPage = lazy(() => import("@/pages/StudentsPage"));
const StudentDetailPage = lazy(() => import("@/pages/StudentDetailPage"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const ExportPage = lazy(() => import("@/pages/ExportPage"));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));

function RouteFallback() {
  const { t } = useT();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] items-center justify-center"
    >
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#5BB5A2]" aria-hidden="true" />
        <span>{t("common.loading")}</span>
      </div>
    </div>
  );
}

function Layout() {
  const { state, signOut } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const navigate = useNavigate();
  const { t } = useT();

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

  const openStudent = (id: string) => navigate(`/students/${encodeURIComponent(id)}`);

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
          <NavItem to="/stats" icon={<BarChart3 className="w-4 h-4" />} label={t("sidebar.stats")} />
          <NavItem to="/" end icon={<CalendarDays className="w-4 h-4" />} label={t("sidebar.home")} />
          <NavItem to="/students" icon={<Users className="w-4 h-4" />} label={t("sidebar.students")} />
          <NavItem to="/courses" icon={<GraduationCap className="w-4 h-4" />} label={t("sidebar.courses")} />
          <NavItem to="/payments" icon={<CreditCard className="w-4 h-4" />} label={t("sidebar.payments")} />
          <NavItem to="/export" icon={<Download className="w-4 h-4" />} label={t("sidebar.export")} />
          <NavItem to="/settings" icon={<SettingsIcon className="w-4 h-4" />} label={t("sidebar.settings")} />
        </nav>
        <div className="px-4 py-3 border-t border-gray-700/30 flex items-center justify-between">
          <span className="text-xs text-gray-400 truncate">{user?.email}</span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-gray-400 hover:text-white"
            title={t("sidebar.logout")}
            aria-label={t("sidebar.logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage onSelectStudent={openStudent} />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/students" element={<StudentsPage onSelectStudent={openStudent} />} />
            <Route path="/students/:studentId" element={<StudentDetailRoute />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/onboarding" element={<OnboardingPage onComplete={() => navigate("/", { replace: true })} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function StudentDetailRoute() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  if (!studentId) return <Navigate to="/students" replace />;

  return (
    <StudentDetailPage
      studentId={studentId}
      onBack={() => navigate("/students")}
    />
  );
}

function NavItem({ to, icon, label, end = false }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `flex w-full items-center justify-start gap-3 px-4 py-2.5 text-sm font-normal transition-colors ${
        isActive ? "text-white" : "text-gray-300 hover:text-white"
      }`}
      style={({ isActive }) => isActive ? { backgroundColor: "#2D8A7B" } : undefined}
    >
      {icon}
      {label}
    </NavLink>
  );
}

function Root() {
  const { state } = useAuth();
  const { t } = useT();

  if (state.status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">{t("common.loading")}</div></div>;
  }

  if (state.status === "anonymous") {
    return (
      <Suspense fallback={<RouteFallback />}>
        <LoginPage />
      </Suspense>
    );
  }

  return <Layout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  );
}