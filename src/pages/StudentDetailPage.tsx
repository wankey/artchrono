// 学生详情 — Enrollment + Class Slot + 升级

import { useState, useEffect } from "react";
import { useStudent, useEnrollments, useCourses, useExamLevels, useClassSlots } from "@/lib/queries";
import { useCreateEnrollment, useCreateClassSlot } from "@/lib/mutations";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function StudentDetailPage({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const { data: student } = useStudent(studentId);
  const [tab, setTab] = useState<"enrollments" | "info">("enrollments");
  if (!student) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
        <span className={`px-2 py-1 rounded text-xs font-medium ${student.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{student.status === "active" ? "在读" : String(student.status)}</span>
      </div>
      <div className="flex gap-0 border-b mb-6">
        <TabButton label="报名与课位" active={tab === "enrollments"} onClick={() => setTab("enrollments")} />
        <TabButton label="学生信息" active={tab === "info"} onClick={() => setTab("info")} />
      </div>
      {tab === "enrollments" && <EnrollmentsTab student={student} />}
      {tab === "info" && <InfoTab student={student} />}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 ${active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{label}</button>;
}

function InfoTab({ student }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">姓名：</span>{student.name}</div>
        <div><span className="text-gray-500">家长：</span>{student.parent_name || "—"}</div>
        <div><span className="text-gray-500">电话：</span>{student.parent_phone || "—"}</div>
        <div><span className="text-gray-500">微信：</span>{student.parent_wechat || "—"}</div>
        <div><span className="text-gray-500">入学：</span>{student.enrolled_at || "—"}</div>
        <div><span className="text-gray-500">备注：</span>{student.notes || "—"}</div>
      </div>
    </div>
  );
}

function EnrollmentsTab({ student }: { student: any }) {
  const { data: enrollments } = useEnrollments(student.id);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">报名</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"><Plus className="w-3.5 h-3.5" />新建报名</button>
      </div>
      {showAdd && <AddEnrollmentForm studentId={student.id} onDone={() => setShowAdd(false)} />}
      {enrollments?.length === 0 && !showAdd && <div className="text-center py-8 text-gray-400">还没有报名</div>}
      {enrollments?.map((enr: any) => <EnrollmentCard key={enr.id} enrollment={enr} studentId={student.id} />)}
    </div>
  );
}

// 新建报名（含升级下一级预填）
function AddEnrollmentForm({ studentId, onDone, prefillCourseId, prefillLevelNum }: { studentId: string; onDone: () => void; prefillCourseId?: string; prefillLevelNum?: number }) {
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
        <div><label className="block text-xs text-gray-600 mb-1">课程 *</label><select className="w-full px-2 py-1.5 border rounded text-sm" value={courseId} onChange={e => { setCourseId(e.target.value); setLevelId(""); }}><option value="">选课程</option>{courses?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="block text-xs text-gray-600 mb-1">等级 *</label><select className="w-full px-2 py-1.5 border rounded text-sm" value={levelId} onChange={e => setLevelId(e.target.value)} disabled={!courseId}><option value="">选等级</option>{levels?.map((l: any) => <option key={l.id} value={l.id}>{l.level_name || `第 ${l.level_number} 级`} (¥{(l.price_cents/100).toFixed(0)}/节)</option>)}</select></div>
        <div><label className="block text-xs text-gray-600 mb-1">付款节数</label><input type="number" min={0} className="w-full px-2 py-1.5 border rounded text-sm" value={classesPaid} onChange={e => setClassesPaid(parseInt(e.target.value)||0)} /></div>
        <div><label className="block text-xs text-gray-600 mb-1">付款金额（元）</label><input type="text" className="w-full px-2 py-1.5 border rounded text-sm" value={amountYuan} onChange={e => setAmountYuan(e.target.value)} /></div>
      </div>
      {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded">{error}</div>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={createEnrollment.isPending || !courseId || !levelId} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">{createEnrollment.isPending ? "保存中..." : "保存"}</button>
        <button onClick={onDone} className="text-gray-600 px-4 py-1.5 rounded text-sm border hover:bg-gray-50">取消</button>
      </div>
    </div>
  );
}

function EnrollmentCard({ enrollment, studentId }: any) {
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [weekday, setWeekday] = useState(6);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [duration, setDuration] = useState(60);
  const createSlot = useCreateClassSlot();
  const { data: slots } = useClassSlots(enrollment.id);
  const qc = useQueryClient();

  // 获取课程默认时长
  useEffect(() => {
    const loadDuration = async () => {
      const { data: course } = await supabase.from("courses").select("default_duration_minutes").eq("id", enrollment.course_id).single();
      if (course?.default_duration_minutes) {
        setDuration(course.default_duration_minutes);
      }
    };
    loadDuration();
  }, [enrollment.course_id]);

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

  // 结束当前报名
  const handleComplete = async () => {
    await supabase.from("enrollments").update({ status: "completed", completed_at: new Date().toISOString().slice(0, 10) }).eq("id", enrollment.id);
    qc.invalidateQueries({ queryKey: ["enrollments"] });
  };

  // 获取下一级信息
  const nextLevelNum = (enrollment.exam_levels?.level_number ?? 0) + 1;

  return (
    <div className="bg-white rounded-lg shadow p-4">
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
          <button onClick={() => setShowSlotForm(!showSlotForm)} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" />排课</button>
          <button onClick={handleComplete} className="text-sm text-orange-600 hover:underline">结束</button>
          <button onClick={() => setShowUpgrade(!showUpgrade)} className="text-sm text-green-600 hover:underline">升级</button>
        </div>
      </div>

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
        <div className="bg-gray-50 rounded p-3 mb-3 grid grid-cols-4 gap-2">
          <div><label className="block text-xs text-gray-600 mb-1">星期</label><select className="w-full px-2 py-1.5 border rounded text-sm" value={weekday} onChange={e => setWeekday(parseInt(e.target.value))}>{WEEKDAY_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
          <div><label className="block text-xs text-gray-600 mb-1">开始</label><input type="time" className="w-full px-2 py-1.5 border rounded text-sm" value={startTime} onChange={e => handleStartTimeChange(e.target.value)} /></div>
          <div><label className="block text-xs text-gray-600 mb-1">结束（{duration}min）</label><input type="time" className="w-full px-2 py-1.5 border rounded text-sm bg-gray-100" value={endTime} readOnly /></div>
          <div><label className="block text-xs text-gray-600 mb-1">教室</label><input className="w-full px-2 py-1.5 border rounded text-sm" value={location} onChange={e => setLocation(e.target.value)} placeholder="选填" /></div>
          <div className="col-span-4 flex gap-2 mt-1">
            <button onClick={handleAddSlot} disabled={createSlot.isPending} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50">{createSlot.isPending ? "保存中..." : "保存"}</button>
            <button onClick={() => setShowSlotForm(false)} className="text-gray-600 px-3 py-1 rounded text-sm border hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      {slots?.length === 0 && !showSlotForm && <p className="text-sm text-gray-400">还没有课位，点击"排课"添加</p>}
      {slots?.map((slot: any) => (
        <div key={slot.id} className="flex items-center justify-between text-sm py-1 border-t">
          <span className="text-gray-700">📅 {WEEKDAY_LABELS[slot.weekday]} {slot.start_time?.slice(0,5)}-{slot.end_time?.slice(0,5)}</span>
          <span className="text-gray-400">{slot.location || ""}</span>
        </div>
      ))}
    </div>
  );
}