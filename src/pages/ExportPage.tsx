// CSV 导出（学生 + 付款）

import { useStudents } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useT } from "@/i18n/useTypedTranslation";

export default function ExportPage() {
  const { t } = useT();
  const { data: students, isLoading, error } = useStudents();
  const [studentExportDone, setStudentExportDone] = useState(false);
  const [paymentExportDone, setPaymentExportDone] = useState(false);
  const [exportingPayments, setExportingPayments] = useState(false);

  const handleExportStudents = async () => {
    const rows = [["学生姓名", "家长姓名", "电话", "微信", "状态", "在读课程", "等级", "余额(节)"]];

    // 批量获取 enrollment 数据
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id, courses(name), exam_levels(level_number, level_name), classes_remaining")
      .eq("status", "active");

    const byStudent = new Map<string, any[]>();
    for (const e of enrollments ?? []) {
      const list = byStudent.get(e.student_id) ?? [];
      list.push(e);
      byStudent.set(e.student_id, list);
    }

    for (const s of students ?? []) {
      const enrs = byStudent.get(s.id);
      if (enrs && enrs.length > 0) {
        for (const e of enrs) {
          rows.push([
            s.name,
            s.parent_name ?? "",
            s.parent_phone ?? "",
            s.parent_wechat ?? "",
            s.status,
            e.courses?.name ?? "",
            e.exam_levels?.level_name ?? `第${e.exam_levels?.level_number ?? "—"}级`,
            String(e.classes_remaining ?? 0),
          ]);
        }
      } else {
        rows.push([s.name, s.parent_name ?? "", s.parent_phone ?? "", s.parent_wechat ?? "", s.status, "", "", ""]);
      }
    }

    downloadCsv(rows, `students-${new Date().toISOString().slice(0, 10)}.csv`);
    setStudentExportDone(true);
    setTimeout(() => setStudentExportDone(false), 2000);
  };

  const handleExportPayments = async () => {
    setExportingPayments(true);
    const rows = [["日期", "学生", "课程", "等级", "节数", "金额", "付款方式"]];

    const { data: payments } = await supabase
      .from("payments")
      .select("paid_at, classes_paid, amount_cents, payment_method, students!inner(name), enrollments!inner(courses!inner(name), exam_levels!inner(level_number, level_name))")
      .order("paid_at", { ascending: false });

    for (const p of payments ?? []) {
      rows.push([
        new Date(p.paid_at).toLocaleDateString(),
        (p as any).students?.name ?? "",
        (p as any).enrollments?.courses?.name ?? "",
        (p as any).enrollments?.exam_levels?.level_name ?? `第${(p as any).enrollments?.exam_levels?.level_number ?? "—"}级`,
        String(p.classes_paid),
        `¥${(p.amount_cents / 100).toFixed(0)}`,
        p.payment_method ? ({ wechat: "微信", alipay: "支付宝", cash: "现金", bank: "银行" } as Record<string, string>)[p.payment_method] ?? p.payment_method : "",
      ]);
    }

    downloadCsv(rows, `payments-${new Date().toISOString().slice(0, 10)}.csv`);
    setExportingPayments(false);
    setPaymentExportDone(true);
    setTimeout(() => setPaymentExportDone(false), 2000);
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (error) return <div className="text-red-600 p-4">加载失败：{String(error)}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("export.title")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-1">{t("export.students.title")}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("export.students.description")}</p>
            <Button onClick={handleExportStudents} disabled={!students || students.length === 0}>
              <Download className="w-4 h-4" />
              {studentExportDone ? t("export.students.exported") : t("export.button")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-1">{t("export.payments.title")}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("export.payments.description")}</p>
            <Button onClick={handleExportPayments} disabled={exportingPayments}>
              <Download className="w-4 h-4" />
              {exportingPayments ? t("export.students.exporting") : paymentExportDone ? t("export.students.exported") : t("export.button")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 通用 CSV 下载
function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}