// 学生详情页 + Enrollment / Class Slot 管理

import { useState } from "react";
import { useStudent, useEnrollments, useCourses, useExamLevels, useClassSlots } from "@/lib/queries";
import { useCreateEnrollment, useCreateClassSlot } from "@/lib/mutations";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

type Tab = "info" | "enrollments";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function StudentDetailPage({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const { data: student } = useStudent(studentId);
  const [tab, setTab] = useState<Tab>("enrollments");

  if (!student) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          student.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}>
          {student.status === "active" ? "在读" : student.status}
        </span>
      </div>

      {/* Tabs */}
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
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

// 学生基本信息
function InfoTab({ student }: { student: { name: string; parent_name?: string; parent_phone?: string; parent_wechat?: string; enrolled_at?: string; notes?: string } }) {
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

// 报名 + 课位
function EnrollmentsTab({ student }: { student: { id: string; name: string } }) {
  const { data: enrollments } = useEnrollments(student.id);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">报名</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" />新建报名
        </button>
      </div>

      {showAdd && <AddEnrollmentForm studentId={student.id} onDone={() => setShowAdd(false)} />}

      {enrollments?.length === 0 && !showAdd && (
        <div className="text-center py-8 text-gray-400">还没有报名，创建第一个吧</div>
      )}

      {enrollments?.map((enr) => (
        <EnrollmentCard key={enr.id} enrollment={enr} studentId={student.id} />
      ))}
    </div>
  );
}

// 新建报名表单
function AddEnrollmentForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const { data: courses } = useCourses();
  const [courseId, setCourseId] = useState("");
  const { data: levels } = useExamLevels(courseId || undefined);
  const [levelId, setLevelId] = useState("");
  const [classesPaid, setClassesPaid] = useState(10);
  const [amountYuan, setAmountYuan] = useState("2000");
  const createEnrollment = useCreateEnrollment();

  const selectedLevel = levels?.find(l => l.id === levelId);

  const handleSubmit = async () => {
    if (!courseId || !levelId) return;
    await createEnrollment.mutateAsync({
      student_id: studentId,
      course_id: courseId,
      exam_level_id: levelId,
      classes_paid: classesPaid,
      amount_cents: Math.round(parseFloat(amountYuan) * 100),
      payment_method: "cash",
    });
    onDone();
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">课程 *</label>
          <select className="w-full px-2 py-1.5 border rounded text-sm" value={courseId} onChange={(e) => { setCourseId(e.target.value); setLevelId(""); }}>
            <option value="">选课程</option>
            {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">等级 *</label>
          <select className="w-full px-2 py-1.5 border rounded text-sm" value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!courseId}>
            <option value="">选等级</option>
            {levels?.map(l => <option key={l.id} value={l.id}>{l.level_name || `第 ${l.level_number} 级`} (¥{(l.price_cents / 100).toFixed(0)}/节)</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">付款节数</label>
          <input type="number" min={0} className="w-full px-2 py-1.5 border rounded text-sm" value={classesPaid} onChange={(e) => setClassesPaid(parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">付款金额（元）</label>
          <input type="text" className="w-full px-2 py-1.5 border rounded text-sm" value={amountYuan} onChange={(e) => setAmountYuan(e.target.value)} />
        </div>
      </div>
      {selectedLevel && (
        <p className="text-xs text-gray-500">
          单节课费 ¥{(selectedLevel.price_cents / 100).toFixed(0)}，{classesPaid} 节 ≈ ¥{(selectedLevel.price_cents * classesPaid / 100).toFixed(0)}
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={createEnrollment.isPending || !courseId || !levelId}
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
          {createEnrollment.isPending ? "保存中..." : "保存"}
        </button>
        <button onClick={onDone} className="text-gray-600 px-4 py-1.5 rounded text-sm border hover:bg-gray-50">取消</button>
      </div>
    </div>
  );
}

// 报名卡片 + 课位
function EnrollmentCard({ enrollment, studentId }: { enrollment: any; studentId: string }) {
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [weekday, setWeekday] = useState(6);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const createSlot = useCreateClassSlot();
  const { data: slots } = useClassSlots(enrollment.id);

  const handleAddSlot = async () => {
    await createSlot.mutateAsync({
      student_id: studentId,
      enrollment_id: enrollment.id,
      weekday,
      start_time: startTime,
      end_time: endTime,
      location: location || undefined,
    });
    setShowSlotForm(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Enrollment header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">
            {enrollment.courses?.name ?? "—"}
            {enrollment.exam_levels?.level_name ? ` · ${enrollment.exam_levels.level_name}` : ""}
            <span className="text-sm font-normal text-gray-500 ml-1">
              (第 {enrollment.exam_levels?.level_number} 级)
            </span>
          </h4>
          <div className="text-sm text-gray-500 mt-0.5">
            余额 <span className={enrollment.classes_remaining <= 2 ? "text-red-600 font-semibold" : "font-semibold text-gray-900"}>
              {enrollment.classes_remaining}
            </span> 节
            {enrollment.exam_levels?.price_cents != null && (
              <span className="ml-2">
                ¥{(enrollment.exam_levels.price_cents / 100).toFixed(0)}/节
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowSlotForm(!showSlotForm)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />排课
        </button>
      </div>

      {/* Add slot form */}
      {showSlotForm && (
        <div className="bg-gray-50 rounded p-3 mb-3 grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">星期</label>
            <select className="w-full px-2 py-1.5 border rounded text-sm" value={weekday} onChange={(e) => setWeekday(parseInt(e.target.value))}>
              {WEEKDAY_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">开始</label>
            <input type="time" className="w-full px-2 py-1.5 border rounded text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">结束</label>
            <input type="time" className="w-full px-2 py-1.5 border rounded text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">教室</label>
            <input className="w-full px-2 py-1.5 border rounded text-sm" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="选填" />
          </div>
          <div className="col-span-4 flex gap-2 mt-1">
            <button onClick={handleAddSlot} disabled={createSlot.isPending}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {createSlot.isPending ? "保存中..." : "保存"}
            </button>
            <button onClick={() => setShowSlotForm(false)} className="text-gray-600 px-3 py-1 rounded text-sm border hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      {/* Existing slots */}
      {slots?.length === 0 && !showSlotForm && (
        <p className="text-sm text-gray-400">还没有课位，点击"排课"添加</p>
      )}
      {slots?.map((slot) => (
        <div key={slot.id} className="flex items-center justify-between text-sm py-1 border-t">
          <span className="text-gray-700">
            📅 {WEEKDAY_LABELS[slot.weekday]} {slot.start_time}-{slot.end_time}
          </span>
          <span className="text-gray-400">{slot.location || ""}</span>
        </div>
      ))}
    </div>
  );
}