// CSV 导出（学生 + 付款）

import { useStudents, useEnrollments } from "@/lib/queries";
import { Loader2, Download } from "lucide-react";
import { useState } from "react";

export default function ExportPage() {
  const { data: students, isLoading } = useStudents();
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    const rows = [["学生姓名", "家长姓名", "电话", "微信", "状态", "报名课程", "等级", "余额(节)", "已付(元)"]];

    for (const s of students ?? []) {
      // 简单导出版本（不 join enrollment 以减少复杂度）
      // V1.1 增强：包含 course/level/balance/price details
      rows.push([
        s.name,
        s.parent_name ?? "",
        s.parent_phone ?? "",
        s.parent_wechat ?? "",
        s.status,
        "", "", "", "",
      ]);
    }

    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">数据导出</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">导出学生列表为 CSV 文件（可用 Excel / Numbers 打开）</p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          {done ? "已导出 ✅" : "导出 CSV"}
        </button>
      </div>
    </div>
  );
}