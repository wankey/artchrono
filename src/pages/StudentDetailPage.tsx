// 学生详情 — Enrollment + Class Slot + 升级 + 付款

import { useState, useEffect } from "react";
import { useStudent, useEnrollments, useCourses, useExamLevels, useClassSlots, useStudentPayments, useStudentAttendance } from "@/lib/queries";
import { useCreateEnrollment, useCreateClassSlot, useUpdateStudent } from "@/lib/mutations";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function StudentDetailPage({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const { data: student } = useStudent(studentId);
  const [tab, setTab] = useState<"enrollments" | "info" | "payments" | "attendance">("enrollments");
  if (!student) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
        <Badge variant={
          student.status === "graduated" ? "secondary" :
          student.status === "paused" ? "outline" :
          "default"
        }>{student.status === "graduated" ? "已毕业" : student.status === "paused" ? "暂停" : "在读"}</Badge>
      </div>
      <div className="flex gap-0 border-b mb-6">
        <TabButton label="报名与课位" active={tab === "enrollments"} onClick={() => setTab("enrollments")} />
        <TabButton label="付款记录" active={tab === "payments"} onClick={() => setTab("payments")} />
        <TabButton label="考勤历史" active={tab === "attendance"} onClick={() => setTab("attendance")} />
        <TabButton label="学生信息" active={tab === "info"} onClick={() => setTab("info")} />
      </div>
      {tab === "enrollments" && <EnrollmentsTab student={student} />}
      {tab === "payments" && <PaymentsTab studentId={student.id} />}
      {tab === "attendance" && <AttendanceTab studentId={student.id} />}
      {tab === "info" && <InfoTab student={student} />}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <Button variant="ghost" onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none ${active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{label}</Button>;
}

function InfoTab({ student }: any) {
  const updateStudent = useUpdateStudent();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(student.name);
  const [parentName, setParentName] = useState(student.parent_name ?? "");
  const [parentPhone, setParentPhone] = useState(student.parent_phone ?? "");
  const [parentWechat, setParentWechat] = useState(student.parent_wechat ?? "");
  const [notes, setNotes] = useState(student.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStudent.mutateAsync({ id: student.id, name, parent_name: parentName || undefined, parent_phone: parentPhone || undefined, parent_wechat: parentWechat || undefined, notes: notes || undefined });
      setEditing(false);
    } catch (e: any) {
      alert("保存失败：" + (e?.message ?? String(e)));
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setName(student.name);
    setParentName(student.parent_name ?? "");
    setParentPhone(student.parent_phone ?? "");
    setParentWechat(student.parent_wechat ?? "");
    setNotes(student.notes ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <Card><CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><Label className="text-xs text-gray-500">姓名</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label className="text-xs text-gray-500">家长</Label><Input value={parentName} onChange={e => setParentName(e.target.value)} /></div>
          <div><Label className="text-xs text-gray-500">电话</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} /></div>
          <div><Label className="text-xs text-gray-500">微信</Label><Input value={parentWechat} onChange={e => setParentWechat(e.target.value)} /></div>
          <div><Label className="text-xs text-gray-500">入学</Label><div className="py-2 text-gray-600">{student.enrolled_at || "—"}</div></div>
          <div><Label className="text-xs text-gray-500">备注</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "保存中..." : "保存"}</Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>取消</Button>
        </div>
      </CardContent></Card>
    );
  }

  return (
    <Card><CardContent className="p-6 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">学生信息</h3>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>编辑</Button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">姓名：</span>{student.name}</div>
        <div><span className="text-gray-500">家长：</span>{student.parent_name || "—"}</div>
        <div><span className="text-gray-500">电话：</span>{student.parent_phone || "—"}</div>
        <div><span className="text-gray-500">微信：</span>{student.parent_wechat || "—"}</div>
        <div><span className="text-gray-500">入学：</span>{student.enrolled_at || "—"}</div>
        <div><span className="text-gray-500">备注：</span>{student.notes || "—"}</div>
      </div>
      </CardContent>
    </Card>
  );
}

function PaymentsTab({ studentId }: { studentId: string }) {
  const { data: payments, isLoading } = useStudentPayments(studentId);

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  if (!payments || payments.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center">
        <div className="text-5xl mb-4">💰</div>
        <p className="text-gray-500">还没有付款记录</p>
      </CardContent></Card>
    );
  }

  const totalPaidCents = payments.reduce((sum, p) => sum + p.amount_cents, 0);
  const totalClasses = payments.reduce((sum, p) => sum + p.classes_paid, 0);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 flex gap-6 text-sm">
          <div><span className="text-gray-500">累计缴费：</span><span className="font-semibold text-gray-900">¥{(totalPaidCents / 100).toFixed(0)}</span></div>
          <div><span className="text-gray-500">累计购课：</span><span className="font-semibold text-gray-900">{totalClasses} 节</span></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs">
                <th className="text-left px-4 py-2 font-medium">日期</th>
                <th className="text-left px-4 py-2 font-medium">课程</th>
                <th className="text-right px-4 py-2 font-medium">节数</th>
                <th className="text-right px-4 py-2 font-medium">金额</th>
                <th className="text-center px-4 py-2 font-medium">方式</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{new Date(p.paid_at).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {p.enrollments?.courses?.name ?? "—"}
                    {p.enrollments?.exam_levels?.level_name
                      ? ` · ${p.enrollments.exam_levels.level_name}`
                      : p.enrollments?.exam_levels?.level_number
                        ? ` · 第${p.enrollments.exam_levels.level_number}级`
                        : ""}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{p.classes_paid}</td>
                  <td className="px-4 py-3 text-right font-medium">¥{(p.amount_cents / 100).toFixed(0)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{p.payment_method ? ({ wechat: "微信", alipay: "支付宝", cash: "现金", bank: "银行" } as Record<string, string>)[p.payment_method] ?? p.payment_method : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

const ATTENDANCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  attended: { label: "已出席", icon: "✅", color: "text-green-600" },
  no_show: { label: "缺勤", icon: "❌", color: "text-red-600" },
  cancelled: { label: "已取消", icon: "➖", color: "text-gray-400" },
  make_up: { label: "补课", icon: "🔄", color: "text-blue-600" },
};

function AttendanceTab({ studentId }: { studentId: string }) {
  const { data: records, isLoading } = useStudentAttendance(studentId);

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  if (!records || records.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-gray-500">还没有考勤记录</p>
      </CardContent></Card>
    );
  }

  const attendedCount = records.filter(r => r.result === "attended").length;
  const missedCount = records.filter(r => r.result === "no_show").length;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 flex gap-6 text-sm">
          <div><span className="text-green-600 font-semibold">✅ {attendedCount}</span><span className="text-gray-500 ml-1">次出席</span></div>
          <div><span className="text-red-600 font-semibold">❌ {missedCount}</span><span className="text-gray-500 ml-1">次缺勤</span></div>
          <div><span className="text-gray-600 font-semibold">{records.length}</span><span className="text-gray-500 ml-1">次总记录</span></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs">
                <th className="text-left px-4 py-2 font-medium">日期</th>
                <th className="text-left px-4 py-2 font-medium">课程</th>
                <th className="text-left px-4 py-2 font-medium">时间</th>
                <th className="text-center px-4 py-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const info = ATTENDANCE_LABELS[r.result] ?? { label: r.result, icon: "❓", color: "text-gray-500" };
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {new Date(r.scheduled_classes?.scheduled_date ?? r.marked_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(r as any).enrollments?.courses?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.scheduled_classes?.start_time?.slice(0, 5) ?? "—"}
                      {r.scheduled_classes?.end_time ? ` - ${r.scheduled_classes.end_time.slice(0, 5)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={info.color}>{info.icon} {info.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function EnrollmentsTab({ student }: { student: any }) {
  const { data: enrollments } = useEnrollments(student.id);
  const [showAdd, setShowAdd] = useState(false);
  const [showPayFor, setShowPayFor] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleGraduate = async () => {
    await supabase.from("students").update({ status: "graduated" }).eq("id", student.id);
    qc.invalidateQueries({ queryKey: ["students"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">报名</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="w-3.5 h-3.5" />新建报名</Button>
          {student.status !== "graduated" && (
            <Button size="sm" variant="secondary" onClick={handleGraduate}>毕业</Button>
          )}
        </div>
      </div>
      {showAdd && <AddEnrollmentForm studentId={student.id} onDone={() => setShowAdd(false)} />}
      {enrollments?.length === 0 && !showAdd && <div className="text-center py-8 text-gray-400">还没有报名</div>}
      {enrollments?.map((enr: any) => (
        <EnrollmentCard
          key={enr.id}
          enrollment={enr}
          studentId={student.id}
          showPayForm={showPayFor === enr.id}
          onTogglePay={() => setShowPayFor(showPayFor === enr.id ? null : enr.id)}
        />
      ))}
    </div>
  );
}

// 付款录入（嵌入在报名卡片内）
function PaymentForm({ enrollment, onDone }: { enrollment: any; onDone: () => void }) {
  const [classesPaid, setClassesPaid] = useState(10);
  const [amountYuan, setAmountYuan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wechat");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (enrollment.exam_levels?.price_cents) {
      setAmountYuan(((enrollment.exam_levels.price_cents * classesPaid) / 100).toFixed(0));
    }
  }, [classesPaid]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: rpcErr } = await supabase.rpc("record_payment", {
        p_client_op_id: crypto.randomUUID(),
        p_enrollment_id: enrollment.id,
        p_classes_paid: classesPaid,
        p_amount_cents: Math.round(parseFloat(amountYuan) * 100),
        p_payment_method: paymentMethod,
      });
      if (rpcErr) throw rpcErr;
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["today_classes"] });
      onDone();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
    setLoading(false);
  };

  return (
    <div className="bg-blue-50 rounded-lg p-3 mb-3 space-y-2">
      <div className="text-sm font-medium text-blue-900">录入付款</div>
      <div className="grid grid-cols-4 gap-2">
        <div><Label className="text-xs text-gray-600">节数</Label><Input type="number" min={1} className="h-8 text-sm" value={classesPaid} onChange={e => setClassesPaid(parseInt(e.target.value)||0)} /></div>
        <div><Label className="text-xs text-gray-600">金额（元）</Label><Input className="h-8 text-sm" value={amountYuan} onChange={e => setAmountYuan(e.target.value)} /></div>
        <div><Label className="text-xs text-gray-600">方式</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="wechat">微信</SelectItem>
              <SelectItem value="alipay">支付宝</SelectItem>
              <SelectItem value="cash">现金</SelectItem>
              <SelectItem value="bank">银行</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button size="sm" onClick={handleSubmit} disabled={loading}>{loading ? "..." : "确认"}</Button>
          <Button size="sm" variant="outline" onClick={onDone}>取消</Button>
        </div>
      </div>
      {error && <Alert variant="destructive" className="py-1"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
    </div>
  );
}

// 新建报名（含升级下一级预填）
function AddEnrollmentForm({ studentId, onDone, onCancel, prefillCourseId, prefillLevelNum }: { studentId: string; onDone: () => void; onCancel?: () => void; prefillCourseId?: string; prefillLevelNum?: number }) {
  const { data: courses } = useCourses();
  const [courseId, setCourseId] = useState(prefillCourseId ?? "");
  const { data: levels } = useExamLevels(courseId || undefined);
  const [levelId, setLevelId] = useState("");
  const [classesPaid, setClassesPaid] = useState(10);
  const [amountYuan, setAmountYuan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createEnrollment = useCreateEnrollment();

  const selectedLevel = levels?.find((l: any) => l.id === levelId);

  useEffect(() => {
    if (prefillLevelNum !== undefined && levels && levels.length > 0) {
      const match = levels.find((l: any) => l.level_number === prefillLevelNum);
      if (match) { setLevelId(match.id); }
    }
  }, [levels, prefillLevelNum]);

  useEffect(() => {
    if (selectedLevel) setAmountYuan(((selectedLevel.price_cents * classesPaid) / 100).toFixed(0));
  }, [levelId, classesPaid]);

  const handleSubmit = async () => {
    if (!courseId || !levelId) return;
    setError(null);
    try {
      await createEnrollment.mutateAsync({ student_id: studentId, course_id: courseId, exam_level_id: levelId, classes_paid: classesPaid, amount_cents: Math.round(parseFloat(amountYuan) * 100), payment_method: "cash" });
      onDone();
    } catch (e: any) { setError(e?.message || String(e)); }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs text-gray-600">课程 *</Label><select className="w-full px-2 py-1.5 border rounded text-sm h-9" value={courseId} onChange={e => { setCourseId(e.target.value); setLevelId(""); }}><option value="">选课程</option>{courses?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><Label className="text-xs text-gray-600">等级 *</Label><select className="w-full px-2 py-1.5 border rounded text-sm h-9" value={levelId} onChange={e => setLevelId(e.target.value)} disabled={!courseId}><option value="">选等级</option>{levels?.map((l: any) => <option key={l.id} value={l.id}>{l.level_name || `第 ${l.level_number} 级`} (¥{(l.price_cents/100).toFixed(0)}/节)</option>)}</select></div>
        <div><Label className="text-xs text-gray-600">付款节数</Label><Input type="number" min={0} className="h-9 text-sm" value={classesPaid} onChange={e => setClassesPaid(parseInt(e.target.value)||0)} /></div>
        <div><Label className="text-xs text-gray-600">付款金额（元）</Label><Input className="h-9 text-sm" value={amountYuan} onChange={e => setAmountYuan(e.target.value)} /></div>
      </div>
      {error && <Alert variant="destructive" className="py-1"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={createEnrollment.isPending || !courseId || !levelId}>{createEnrollment.isPending ? "保存中..." : "保存"}</Button>
        <Button size="sm" variant="outline" onClick={() => onCancel ? onCancel() : onDone()}>取消</Button>
      </div>
    </div>
  );
}

function EnrollmentCard({ enrollment, studentId, showPayForm, onTogglePay }: any) {
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [weekday, setWeekday] = useState(6);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [duration, setDuration] = useState(60);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const createSlot = useCreateClassSlot();
  const { data: slots } = useClassSlots(enrollment.id);
  const qc = useQueryClient();

  // 获取课时长度：等级优先，否则用课程默认
  useEffect(() => {
    const d = enrollment.exam_levels?.default_duration_minutes
      ?? enrollment.courses?.default_duration_minutes
      ?? 60;
    setDuration(d);
  }, [enrollment.exam_levels?.id, enrollment.courses?.default_duration_minutes]);

  // 自动计算结束时间
  const handleStartTimeChange = (t: string) => {
    setStartTime(t);
    const [h, m] = t.split(":").map(Number);
    const total = h * 60 + m + duration;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    setEndTime(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
  };

  const handleAddSlot = async () => {
    await createSlot.mutateAsync({ student_id: studentId, enrollment_id: enrollment.id, weekday, start_time: startTime, end_time: endTime, location: location || undefined });
    setShowSlotForm(false);
  };

  // 结束当前报名（余额>0 时弹确认框）
  const handleEndClick = () => {
    if (enrollment.classes_remaining > 0) {
      setShowEndConfirm(true);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    await supabase.from("enrollments").update({ status: "completed", completed_at: new Date().toISOString().slice(0, 10) }).eq("id", enrollment.id);
    setShowEndConfirm(false);
    qc.invalidateQueries({ queryKey: ["enrollments"] });
  };

  // 获取下一级信息 + 检查是否已是最高级
  const nextLevelNum = (enrollment.exam_levels?.level_number ?? 0) + 1;
  const { data: allLevels } = useExamLevels(enrollment.course_id);
  const maxLevelNum = allLevels?.length ? Math.max(...allLevels.map((l: any) => l.level_number)) : 0;
  const isMaxLevel = (enrollment.exam_levels?.level_number ?? 0) >= maxLevelNum;

  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">
            {enrollment.courses?.name ?? "—"}
            {enrollment.exam_levels?.level_name ? ` · ${enrollment.exam_levels.level_name}` : ""}
            <span className="text-sm font-normal text-gray-500 ml-1">(第 {enrollment.exam_levels?.level_number} 级)</span>
          </h4>
          <div className="text-sm text-gray-500 mt-0.5">
            余额 <span className={enrollment.classes_remaining <= 2 ? "text-red-600 font-semibold" : "font-semibold text-gray-900"}>{enrollment.classes_remaining}</span> 节
            {enrollment.exam_levels?.price_cents != null && <span className="ml-2">¥{(enrollment.exam_levels.price_cents / 100).toFixed(0)}/节</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="link" size="sm" onClick={onTogglePay}><CreditCard className="w-3.5 h-3.5" />付款</Button>
          <Button variant="link" size="sm" onClick={() => setShowSlotForm(!showSlotForm)}><Plus className="w-3.5 h-3.5" />排课</Button>
          <Button variant="link" size="sm" className="text-orange-600" onClick={handleEndClick}>结束</Button>
          {!isMaxLevel && (
            <Button variant="link" size="sm" className="text-green-600" onClick={() => setShowUpgrade(!showUpgrade)}>升级</Button>
          )}
        </div>
      </div>

      {/* 结束确认（余额 > 0 时弹） */}
      {showEndConfirm && (
        <Alert className="border-orange-200 bg-orange-50 mb-3">
          <AlertDescription>
            <p className="text-sm text-orange-800 font-medium mb-1">确认结束报名？</p>
            <p className="text-sm text-orange-700">
              该报名还有 <strong>{enrollment.classes_remaining}</strong> 节未上完，
              需退款约 <strong>¥{((enrollment.classes_remaining * (enrollment.exam_levels?.price_cents ?? 0)) / 100).toFixed(0)}</strong>
              {enrollment.exam_levels?.price_cents != null && enrollment.exam_levels.price_cents > 0
                ? `（¥${(enrollment.exam_levels.price_cents / 100).toFixed(0)}/节 × ${enrollment.classes_remaining} 节）`
                : ""}。
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={handleComplete}>确认结束</Button>
              <Button size="sm" variant="outline" onClick={() => setShowEndConfirm(false)}>取消</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 付款录入（嵌入在报名卡内） */}
      {showPayForm && (
        <PaymentForm
          enrollment={enrollment}
          onDone={() => onTogglePay()}
        />
      )}

      {/* 升级到下一级 */}
      {showUpgrade && (
        <div className="bg-green-50 rounded-lg p-4 mb-3">
          <p className="text-sm text-gray-700 mb-2">
            升级到 <strong>{enrollment.courses?.name}</strong> 第 {nextLevelNum} 级。
            剩余 <strong>{enrollment.classes_remaining}</strong> 节将转到新课位。
          </p>
          <AddEnrollmentForm
            studentId={studentId}
            prefillCourseId={enrollment.course_id}
            prefillLevelNum={nextLevelNum}
            onCancel={() => setShowUpgrade(false)}
            onDone={async () => {
              // 旧报名标 completed + 转移余额
              const oldBalance = enrollment.classes_remaining;
              if (oldBalance > 0) {
                // V1 简化：直接把余额加到新 enrollment
                // 拿到新创建的 enrollment（通过最近时间匹配）
                const { data: newEnrs } = await supabase.from("enrollments").select("id").eq("student_id", studentId).eq("course_id", enrollment.course_id).eq("status", "active").order("created_at", { ascending: false }).limit(1);
                if (newEnrs?.[0]) {
                  await supabase.rpc("record_payment", { p_client_op_id: crypto.randomUUID(), p_enrollment_id: newEnrs[0].id, p_classes_paid: oldBalance, p_amount_cents: 0 });
                }
              }
              await handleComplete();
              setShowUpgrade(false);
              qc.invalidateQueries({ queryKey: ["enrollments"] });
            }}
          />
          <button onClick={() => setShowUpgrade(false)} className="text-sm text-gray-500 hover:underline mt-2">取消</button>
        </div>
      )}

      {/* 排课表单 */}
      {showSlotForm && (
        <Card className="mb-3"><CardContent className="p-3 grid grid-cols-4 gap-2">
          <div><Label className="text-xs text-gray-600">星期</Label><select className="w-full px-2 py-1.5 border rounded text-sm h-9" value={weekday} onChange={e => setWeekday(parseInt(e.target.value))}>{WEEKDAY_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
          <div><Label className="text-xs text-gray-600">开始</Label><Input type="time" className="h-9 text-sm" value={startTime} onChange={e => handleStartTimeChange(e.target.value)} /></div>
          <div><Label className="text-xs text-gray-600">结束（{duration}min）</Label><Input type="time" className="h-9 text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
          <div><Label className="text-xs text-gray-600">教室</Label><Input className="h-9 text-sm" value={location} onChange={e => setLocation(e.target.value)} placeholder="选填" /></div>
          <div className="col-span-4 flex gap-2 mt-1">
            <Button size="sm" onClick={handleAddSlot} disabled={createSlot.isPending}>{createSlot.isPending ? "保存中..." : "保存"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowSlotForm(false)}>取消</Button>
          </div>
        </CardContent></Card>
      )}

      {slots?.length === 0 && !showSlotForm && <p className="text-sm text-gray-400">还没有课位，点击"排课"添加</p>}
      {slots?.map((slot: any) => (
        <div key={slot.id} className="flex items-center justify-between text-sm py-1 border-t">
          <span className="text-gray-700">📅 {WEEKDAY_LABELS[slot.weekday]} {slot.start_time?.slice(0,5)}-{slot.end_time?.slice(0,5)}</span>
          <span className="text-gray-400">{slot.location || ""}</span>
        </div>
      ))}
      </CardContent></Card>
  );
}