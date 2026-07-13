// 数据看板 — 月度收入、出勤率、活跃学生等统计

import { useMonthlyPayments, useMonthlyAttendance, useStudents, useLowBalanceEnrollments } from "@/lib/queries";
import { Loader2, TrendingUp, Users, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/useTypedTranslation";

export default function StatsPage() {
  const { t } = useT();
  const { data: monthlyPayments, isLoading: loadingPayments } = useMonthlyPayments();
  const { data: attendanceRecords, isLoading: loadingAttendance } = useMonthlyAttendance();
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: lowBalanceEnrollments } = useLowBalanceEnrollments();

  if (loadingPayments || loadingAttendance || loadingStudents) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  // 本月收入
  const totalCents = (monthlyPayments ?? []).reduce((sum, p) => sum + p.amount_cents, 0);
  const totalRevenue = totalCents / 100;
  const totalClassesSold = (monthlyPayments ?? []).reduce((sum, p) => sum + p.classes_paid, 0);

  // 活跃学生
  const activeStudents = (students ?? []).filter((s: any) => s.status === "active").length;

  // 本月出勤
  const totalAttendance = attendanceRecords?.length ?? 0;
  const attendedCount = attendanceRecords?.filter(r => r.result === "attended").length ?? 0;
  const attendanceRate = totalAttendance > 0 ? Math.round((attendedCount / totalAttendance) * 100) : null;

  // 待续费
  const lowBalanceCount = lowBalanceEnrollments?.length ?? 0;

  // 本月每日收入（柱状图数据）
  const dailyRevenue = buildDailyRevenue(monthlyPayments ?? []);

  // 本月交易笔数
  const transactionCount = monthlyPayments?.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t("stats.title")}</h2>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("stats.monthlyRevenue")}
          value={`¥${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle={t("stats.classesAndTx", { classes: totalClassesSold, count: transactionCount })}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard
          title={t("stats.activeStudents")}
          value={String(activeStudents)}
          subtitle={t("stats.studentsTotal", { count: students?.length ?? 0 })}
          icon={<Users className="w-5 h-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title={t("stats.monthlyAttendance")}
          value={attendanceRate !== null ? `${attendanceRate}%` : "—"}
          subtitle={t("stats.attendanceSubtitle", { attended: attendedCount, total: totalAttendance })}
          icon={<CheckCircle className="w-5 h-5" />}
          color="text-[#5BB5A2]"
          bgColor="bg-[#E8F4F0]"
        />
        <StatCard
          title={t("stats.pendingRenewals")}
          value={String(lowBalanceCount)}
          subtitle={t("stats.lowBalance")}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      {/* Row 2: Daily revenue chart */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{t("stats.dailyRevenue")}</h3>
            <span className="text-xs text-gray-400">
              ¥{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {t("stats.perMonth")}
            </span>
          </div>
          {dailyRevenue.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">{t("stats.noPayments")}</div>
          ) : (
            <DailyChart data={dailyRevenue} />
          )}
        </CardContent>
      </Card>

      {/* Row 3: Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickLink href="#/payments" label={t("stats.quickLinks.recordPayment")} icon={<DollarSign className="w-4 h-4" />} />
        <QuickLink href="#/students" label={t("stats.quickLinks.manageStudents")} icon={<Users className="w-4 h-4" />} />
        <QuickLink href="#/export" label={t("stats.quickLinks.exportData")} icon={<TrendingUp className="w-4 h-4" />} />
      </div>
    </div>
  );
}

// =============================================================================
// Stat Card
// =============================================================================

function StatCard({ title, value, subtitle, icon, color, bgColor }: {
  title: string; value: string; subtitle: string; icon: React.ReactNode; color: string; bgColor: string;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-gray-500 font-medium">{title}</span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgColor} ${color}`}>
            {icon}
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Simple bar chart — pure CSS, no deps
// =============================================================================

function DailyChart({ data }: { data: { day: number; label: string; amount: number }[] }) {
  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map(d => {
        const pct = (d.amount / maxAmount) * 100;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="text-[10px] font-medium text-gray-500 leading-none">
              ¥{d.amount > 0 ? d.amount : ""}
            </div>
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${Math.max(pct, d.amount > 0 ? 2 : 0)}%`,
                backgroundColor: d.amount > 0 ? "#5BB5A2" : "#F3F4F6",
                minHeight: d.amount > 0 ? "4px" : "2px",
              }}
            />
            <div className="text-[10px] text-gray-400 leading-none mt-0.5">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Quick Link Card
// =============================================================================

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a href={href} onClick={e => e.preventDefault()}
      className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-[#5BB5A2] hover:shadow-sm transition-all group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#E8F4F0] text-[#5BB5A2] flex items-center justify-center group-hover:bg-[#5BB5A2] group-hover:text-white transition-colors">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
      </div>
    </a>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function buildDailyRevenue(payments: { paid_at: string; amount_cents: number }[]) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daily = new Map<number, number>();

  for (const p of payments) {
    const day = new Date(p.paid_at).getDate();
    daily.set(day, (daily.get(day) ?? 0) + p.amount_cents);
  }

  const result: { day: number; label: string; amount: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const cents = daily.get(d) ?? 0;
    // Only show days that have passed or current day
    if (d <= now.getDate()) {
      result.push({ day: d, label: `${d}日`, amount: cents / 100 });
    }
  }
  return result;
}
