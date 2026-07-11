// 学生列表页 — 显示报名状态

import { useState } from "react";
import { useStudents } from "@/lib/queries";
import { useCreateStudent, useDeleteStudent } from "@/lib/mutations";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";

export default function StudentsPage({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) {
  const { data: students, isLoading, error } = useStudents();
  const createStudent = useCreateStudent();
  const deleteStudent = useDeleteStudent();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentWechat, setParentWechat] = useState("");

  // 批量获取所有报名（含课程+等级）
  const { data: allEnrollments } = useQuery({
    queryKey: ["enrollments", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, student_id, classes_remaining, courses(name), exam_levels(level_number, level_name, price_cents)")
        .eq("status", "active")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!students,
  });

  const handleAdd = async () => {
    if (!name.trim()) return;
    await createStudent.mutateAsync({
      name: name.trim(),
      parent_name: parentName || undefined,
      parent_phone: parentPhone || undefined,
      parent_wechat: parentWechat || undefined,
    });
    setName(""); setParentName(""); setParentPhone(""); setParentWechat("");
    setShowForm(false);
  };

  const filtered = (students ?? []).filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.parent_phone?.includes(search)
  );

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (error) return <div className="text-red-600 p-4">加载失败：{String(error)}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">学生管理</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" />添加学生
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">添加学生</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
              <input className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} placeholder="学生姓名" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">家长姓名</label>
              <input className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={parentName} onChange={e => setParentName(e.target.value)} placeholder="家长姓名" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">家长电话</label>
              <input className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="手机号" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">家长微信</label>
              <input className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={parentWechat} onChange={e => setParentWechat(e.target.value)} placeholder="微信号" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={createStudent.isPending || !name.trim()} className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">{createStudent.isPending ? "保存中..." : "保存"}</button>
            <button onClick={() => setShowForm(false)} className="text-gray-600 px-6 py-2 rounded border hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="w-full pl-10 pr-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="搜索学生、家长或手机号..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">{students?.length === 0 ? "还没有学生" : "无匹配结果"}</div>
        ) : (
          filtered.map((s: any) => {
            const enrollments = (allEnrollments ?? []).filter((e: any) => e.student_id === s.id);
            return (
              <div key={s.id} className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 cursor-pointer relative"
                   onClick={() => onSelectStudent?.(s.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{s.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        s.status === "graduated" ? "bg-gray-100 text-gray-600" :
                        s.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                        enrollments.length === 0 ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>{s.status === "graduated" ? "已毕业" : s.status === "paused" ? "暂停" : enrollments.length === 0 ? "预报名" : "在读"}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {s.parent_name && <span className="mr-3">家长：{s.parent_name}</span>}
                      {s.parent_phone && <span className="mr-3">📱{s.parent_phone}</span>}
                      {s.parent_wechat && <span>💬{s.parent_wechat}</span>}
                    </div>
                    {enrollments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {enrollments.map((enr: any) => (
                          <span key={enr.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            enr.classes_remaining <= 2 ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                          }`}>
                            {enr.courses?.name}
                            {enr.exam_levels?.level_name ? ` ${enr.exam_levels.level_name}` : ` ${enr.exam_levels?.level_number}级`}
                            <span className="font-bold ml-1">{enr.classes_remaining}节</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`确认删除学生「${s.name}」？\n（有未来课程会拒绝）`)) return;
                      try {
                        await deleteStudent.mutateAsync(s.id);
                      } catch (err: any) {
                        alert(`删除失败：${err.message}`);
                      }
                    }}
                    className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="删除学生"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}