// 学生列表页 — 显示报名状态

import { useState } from "react";
import { useStudents } from "@/lib/queries";
import { useCreateStudent, useDeleteStudent } from "@/lib/mutations";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import { ConfirmModal, AlertModal } from "@/components/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/useTypedTranslation";

export default function StudentsPage({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) {
  const { t } = useT();
  const { data: students, isLoading, error } = useStudents();
  const createStudent = useCreateStudent();
  const deleteStudent = useDeleteStudent();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentWechat, setParentWechat] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

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
        <h2 className="text-2xl font-bold text-gray-900">{t("students.title")}</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />{t("students.addStudent")}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">{t("students.form.title")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>{t("students.form.nameLabel")}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder={t("students.form.namePlaceholder")} /></div>
              <div className="space-y-1"><Label>{t("students.form.parentNameLabel")}</Label><Input value={parentName} onChange={e => setParentName(e.target.value)} placeholder={t("students.form.parentNamePlaceholder")} /></div>
              <div className="space-y-1"><Label>{t("students.form.parentPhoneLabel")}</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder={t("students.form.parentPhonePlaceholder")} /></div>
              <div className="space-y-1"><Label>{t("students.form.parentWechatLabel")}</Label><Input value={parentWechat} onChange={e => setParentWechat(e.target.value)} placeholder={t("students.form.parentWechatPlaceholder")} /></div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAdd} disabled={createStudent.isPending || !name.trim()}>{createStudent.isPending ? t("common.saving") : t("common.save")}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-10" placeholder={t("students.search")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">{students?.length === 0 ? t("students.empty") : t("students.noMatch")}</div>
        ) : (
          filtered.map((s: any) => {
            const enrollments = (allEnrollments ?? []).filter((e: any) => e.student_id === s.id);
            return (
              <Card key={s.id} className="hover:bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 cursor-pointer" onClick={() => onSelectStudent?.(s.id)}>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    title="删除学生"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="确认删除学生"
        message={`确认删除「${confirmDelete?.name}」？\n（有未来课程会拒绝）`}
        confirmText="删除"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await deleteStudent.mutateAsync(confirmDelete.id);
          } catch (err: any) {
            setAlertMsg(err.message || String(err));
          }
          setConfirmDelete(null);
        }}
      />
      <AlertModal open={!!alertMsg} title="删除失败" message={alertMsg || ""} onClose={() => setAlertMsg(null)} />
    </div>
  );
}