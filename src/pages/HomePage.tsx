// 今日 + 本周视图，带出勤标记、日期导航、节假日标注

import { useState, useEffect } from "react";
import { useDayClasses, useWeekClasses, useLowBalanceEnrollments, useHolidays } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
// (makeup classes insert directly via supabase)
import { Loader2, Check, X, WifiOff, AlertTriangle, ChevronLeft, ChevronRight, Plus, MapPin } from "lucide-react";
import { enqueueOp, getPendingOps, removeOp, updateOpStatus, isOnline } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useStudents, useEnrollments } from "@/lib/queries";
import { formatDateISO } from "@/lib/utils";
import { useT } from "@/i18n/useTypedTranslation";

const STATUS_KEYS: Record<string, string> = {
  scheduled: "home.attendance.scheduled",
  attended: "home.attendance.attended",
  cancelled: "home.attendance.cancelled",
  no_show: "home.attendance.noShow",
  make_up: "home.attendance.makeUp",
};

const WEEKDAY_KEYS = [
  "home.weekdays.sun",
  "home.weekdays.mon",
  "home.weekdays.tue",
  "home.weekdays.wed",
  "home.weekdays.thu",
  "home.weekdays.fri",
  "home.weekdays.sat",
];

export default function HomePage({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) {
  const { t } = useT();

  const [view, setView] = useState<"day" | "week">("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const dateStr = formatDateISO(targetDate);
  const { data: holidays } = useHolidays();
  const holidayMap = buildHolidayMap(holidays ?? []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* View toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-0 border rounded-lg overflow-hidden">
          <button onClick={() => setView("day")}
            className={`px-4 py-1.5 text-sm font-medium ${view === "day" ? "bg-[#5BB5A2] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{t("home.today")}</button>
          <button onClick={() => setView("week")}
            className={`px-4 py-1.5 text-sm font-medium ${view === "week" ? "bg-[#5BB5A2] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{t("home.thisWeek")}</button>
        </div>
        {view === "day" ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => setDayOffset(d => d - 1)} className="p-1 hover:text-gray-700"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setDayOffset(0)} className={`px-2 py-0.5 rounded text-xs font-medium ${dayOffset === 0 ? "bg-[#5BB5A2] text-white" : "text-gray-500 hover:text-gray-700"}`}>{t("home.todayShort")}</button>
            <button onClick={() => setDayOffset(d => d + 1)} className="p-1 hover:text-gray-700"><ChevronRight className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 hover:text-gray-700"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setWeekOffset(0)} className={`px-2 py-0.5 rounded text-xs font-medium ${weekOffset === 0 ? "bg-[#5BB5A2] text-white" : "text-gray-500 hover:text-gray-700"}`}>{t("home.thisWeek")}</button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 hover:text-gray-700"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      {view === "day"
        ? <DayView onSelectStudent={onSelectStudent} dateStr={dateStr} holidayMap={holidayMap} />
        : <WeekView onSelectStudent={onSelectStudent} weekOffset={weekOffset} holidayMap={holidayMap} />}
    </div>
  );
}

// =============================================================================
// Day View
// =============================================================================

function DayView({ onSelectStudent, dateStr, holidayMap }: {
  onSelectStudent?: (id: string) => void;
  dateStr: string;
  holidayMap: Map<string, { name: string }>;
}) {
  const { t } = useT();
  const { data: classes, isLoading, error } = useDayClasses(dateStr);
  const { data: lowBalanceEnrollments } = useLowBalanceEnrollments();
  const qc = useQueryClient();
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [online, setOnline] = useState(isOnline());
  const [showMakeup, setShowMakeup] = useState(false);
  const holiday = holidayMap.get(dateStr);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + Math.round((new Date(dateStr).getTime() - new Date(formatDateISO()).getTime()) / 86400000));
  const displayDate = targetDate.toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  useEffect(() => {
    const onOnline = () => { setOnline(true); replayQueue(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = setInterval(() => setOnline(isOnline()), 30000);
    refreshQueueCount();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  const refreshQueueCount = async () => {
    const ops = await getPendingOps();
    setOfflineQueueCount(ops.filter(o => o.status === "pending" || o.status === "in_flight").length);
  };

  const replayQueue = async () => {
    const ops = await getPendingOps();
    for (const op of ops) {
      if ((op.status as string) === "completed") continue;
      if (op.retry_count >= 5) continue;
      try {
        await updateOpStatus(op.op_id, "in_flight");
        if (op.op_type === "attendance") {
          await supabase.rpc("mark_attendance", {
            p_client_op_id: op.op_id,
            p_scheduled_class_id: op.payload.scheduled_class_id,
            p_result: op.payload.result,
          });
        }
        await removeOp(op.op_id);
      } catch (e: any) {
        await updateOpStatus(op.op_id, "failed", e?.message);
      }
    }
    await refreshQueueCount();
    qc.invalidateQueries();
  };

  const handleMark = async (scheduledClassId: string, result: string) => {
    const clientOpId = crypto.randomUUID();
    if (!online) {
      await enqueueOp({
        op_id: clientOpId,
        op_type: "attendance",
        payload: { scheduled_class_id: scheduledClassId, result },
        created_at: Date.now(),
      });
      await refreshQueueCount();
      qc.invalidateQueries({ queryKey: ["day_classes"] });
      return;
    }
    const { error: rpcErr } = await supabase.rpc("mark_attendance", {
      p_client_op_id: clientOpId,
      p_scheduled_class_id: scheduledClassId,
      p_result: result,
    });
    if (rpcErr) {
      console.error("[Attendance] mark_attendance failed:", rpcErr);
      return;
    }
    qc.invalidateQueries({ queryKey: ["day_classes"] });
    qc.invalidateQueries({ queryKey: ["enrollments"] });
    qc.invalidateQueries({ queryKey: ["students"] });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <>
      {/* 续费提醒横幅 */}
      {lowBalanceEnrollments && lowBalanceEnrollments.length > 0 && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-x-1 text-sm">
              <span className="text-orange-800 font-medium">续费提醒：</span>
              {lowBalanceEnrollments.map((enr, i) => (
                <span key={enr.id}>
                  <button onClick={() => onSelectStudent?.(enr.student_id)}
                    className="text-orange-700 hover:text-orange-900 hover:underline font-medium">{enr.students.name}</button>
                  <span className="text-orange-700">（{enr.courses.name} 余 <strong>{enr.classes_remaining}</strong> 节）</span>
                  {i < lowBalanceEnrollments.length - 1 && <span className="text-orange-400 mx-1">·</span>}
                </span>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 离线/队列状态横幅 */}
      {(!online || offlineQueueCount > 0) && (
        <Alert variant={!online ? "destructive" : "default"} className="mb-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            {!online && <><WifiOff className="w-4 h-4" /> 离线模式</>}
            {offlineQueueCount > 0 && <> · {offlineQueueCount} 个操作待同步</>}
            {online && offlineQueueCount > 0 && (
              <Button variant="link" size="sm" onClick={replayQueue} className="ml-auto underline">立即同步</Button>
            )}
          </div>
        </Alert>
      )}

      <h2 className="text-xl font-bold text-gray-900 mb-1">{displayDate}</h2>
      {holiday && <p className="text-sm text-[#5BB5A2] font-medium mb-4">🎌 {holiday.name}</p>}
      {!holiday && <div className="mb-4" />}

      {error ? (
        <Alert variant="destructive"><AlertDescription>{String(error)}</AlertDescription></Alert>
      ) : !classes || classes.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">这天没有排课</h3>
          <p className="text-gray-500">去「学生管理」给已报名的学生排课，或添加临时课程</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowMakeup(true)}>
            <Plus className="w-3.5 h-3.5" />添加临时课程
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {classes.map((sc: any) => {
            const isDone = sc.status !== "scheduled";
            return (
              <Card key={sc.id} className={isDone ? "opacity-60" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-700 w-32">
                      {sc.start_time?.slice(0, 5)} - {sc.end_time?.slice(0, 5)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{sc.students?.name ?? "-"}</h4>
                      <p className={`text-xs text-gray-400`}>
                        {sc.class_slots?.location && <><MapPin className="w-3 h-3 inline mr-0.5" />{sc.class_slots.location}</>}
                      </p>
                      <p className={`text-sm ${isDone ? "text-gray-400" : "text-green-600"}`}>{STATUS_KEYS[sc.status] ? t(STATUS_KEYS[sc.status]) : sc.status}</p>
                    </div>
                  </div>
                  {!isDone && (
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => handleMark(sc.id, "attended")}
                        className="bg-green-600 hover:bg-green-700 px-4"><Check className="w-4 h-4" />出席</Button>
                      <Button size="sm" variant="outline" onClick={() => handleMark(sc.id, "no_show")}
                        className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 px-2"><X className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleMark(sc.id, "cancelled")}
                        className="text-gray-400 hover:text-gray-600 px-2">取消</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* 新增临时课程 */}
          <div className="text-center pt-1">
            <Button variant="link" size="sm" onClick={() => setShowMakeup(!showMakeup)}
              className="text-gray-500 hover:text-gray-700">
              <Plus className="w-3.5 h-3.5" />{showMakeup ? "收起" : "添加临时课程"}
            </Button>
          </div>
          {showMakeup && <MakeupForm dateStr={dateStr} onDone={() => { setShowMakeup(false); qc.invalidateQueries({ queryKey: ["day_classes"] }); }} />}
        </div>
      )}
    </>
  );
}

// =============================================================================
// Make-up / Ad-hoc class form
// =============================================================================

function MakeupForm({ dateStr, onDone }: { dateStr: string; onDone: () => void }) {
  const { data: students } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const { data: enrollments } = useEnrollments(selectedStudentId || undefined);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!selectedStudentId || !enrollmentId) return;
    setSaving(true);
    setError(null);
    try {
      const teacherId = (await supabase.auth.getUser()).data.user?.id;
      if (!teacherId) throw new Error("未登录");
      const { error: insertErr } = await supabase.from("scheduled_classes").insert({
        class_slot_id: null,
        student_id: selectedStudentId,
        enrollment_id: enrollmentId,
        teacher_id: teacherId,
        scheduled_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        status: "make_up",
      });
      if (insertErr) throw insertErr;
      onDone();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
    setSaving(false);
  };

  return (
    <Card className="border-dashed border-[#5BB5A2]">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">临时补课 / 调课</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select className="px-2 py-1.5 border rounded text-sm" value={selectedStudentId}
            onChange={e => { setSelectedStudentId(e.target.value); setEnrollmentId(""); }}>
            <option value="">选学生</option>
            {students?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="px-2 py-1.5 border rounded text-sm" value={enrollmentId}
            onChange={e => setEnrollmentId(e.target.value)} disabled={!selectedStudentId}>
            <option value="">选报名</option>
            {enrollments?.map((e: any) => (
              <option key={e.id} value={e.id}>{e.courses?.name} · 第{e.exam_levels?.level_number}级</option>
            ))}
          </select>
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-9 text-sm" />
          <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-9 text-sm" />
        </div>
        {error && <Alert variant="destructive" className="py-1"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleCreate} disabled={saving || !selectedStudentId || !enrollmentId}>
            {saving ? "创建中..." : "创建"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Week View
// =============================================================================

function WeekView({ onSelectStudent, weekOffset, holidayMap }: {
  onSelectStudent?: (id: string) => void;
  weekOffset: number;
  holidayMap: Map<string, { name: string }>;
}) {
  const { t } = useT();
  const { data: allClasses, isLoading } = useWeekClasses(weekOffset);
  const qc = useQueryClient();

  const now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  const dayOfWeek = now.getDay();
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  const byDate = new Map<string, any[]>();
  for (const sc of allClasses ?? []) {
    const key = sc.scheduled_date;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(sc);
  }

  const handleMark = async (scheduledClassId: string, result: string) => {
    const clientOpId = crypto.randomUUID();
    const { error: rpcErr } = await supabase.rpc("mark_attendance", {
      p_client_op_id: clientOpId,
      p_scheduled_class_id: scheduledClassId,
      p_result: result,
    });
    if (rpcErr) { console.error("[Attendance] mark_attendance failed:", rpcErr); return; }
    qc.invalidateQueries({ queryKey: ["week_classes"] });
    qc.invalidateQueries({ queryKey: ["day_classes"] });
    qc.invalidateQueries({ queryKey: ["enrollments"] });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const todayStr = formatDateISO();

  const { monday: monStr, sunday: sunStr } = getWeekLabel(weekOffset);

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      {/* Week range label */}
      <p className="text-sm text-gray-400 mb-3 text-center">{monStr} ~ {sunStr}</p>
      <div className="flex gap-3 min-w-[700px]">
        {days.map((day, i) => {
          const dateStr = formatDateISO(day);
          const isToday = dateStr === todayStr;
          const classes = byDate.get(dateStr) ?? [];
          const holiday = holidayMap.get(dateStr);

          return (
            <div key={i} className="flex-1 min-w-[90px]">
              <div className={`text-center pb-2 mb-2 border-b ${isToday ? "border-[#5BB5A2]" : "border-gray-200"}`}>
                <div className={`text-xs font-medium ${isToday ? "text-[#5BB5A2]" : "text-gray-400"}`}>{t(WEEKDAY_KEYS[i])}</div>
                <div className={`text-lg font-bold ${isToday ? "text-gray-900" : "text-gray-700"}`}>{day.getDate()}</div>
                {holiday && <div className="text-[10px] text-[#5BB5A2] truncate">{holiday.name}</div>}
              </div>
              <div className="space-y-1.5">
                {classes.length === 0 && (
                  <div className="text-center py-4"><div className="text-2xl mb-1 opacity-30">—</div></div>
                )}
                {classes.map((sc: any) => {
                  const isDone = sc.status !== "scheduled";
                  return (
                    <Card key={sc.id} className={`${isDone ? "opacity-50" : ""} cursor-pointer hover:shadow-sm transition-shadow`}
                      onClick={() => onSelectStudent?.(sc.student_id)}>
                      <CardContent className="p-2">
                        <div className="text-xs font-bold text-gray-700">{sc.start_time?.slice(0, 5)}</div>
                        <div className="text-sm font-semibold text-gray-900 truncate">{sc.students?.name ?? "-"}</div>
                        {sc.class_slots?.location && <div className="text-[10px] text-gray-400 truncate">📍{sc.class_slots.location}</div>}
                        {!isDone && (
                          <div className="flex gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleMark(sc.id, "attended")}
                              className="flex-1 rounded bg-green-100 text-green-700 text-[10px] font-medium py-0.5 hover:bg-green-200">✓</button>
                            <button onClick={() => handleMark(sc.id, "no_show")}
                              className="flex-1 rounded bg-red-50 text-red-500 text-[10px] font-medium py-0.5 hover:bg-red-100">✗</button>
                            <button onClick={() => handleMark(sc.id, "cancelled")}
                              className="flex-1 rounded bg-gray-100 text-gray-400 text-[10px] font-medium py-0.5 hover:bg-gray-200">—</button>
                          </div>
                        )}
                        {isDone && (
                          <div className={`text-[10px] mt-1 font-medium ${sc.status === "attended" ? "text-green-600" : sc.status === "no_show" ? "text-red-500" : "text-gray-400"}`}>
                            {STATUS_KEYS[sc.status] ? t(STATUS_KEYS[sc.status]) : sc.status}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function buildHolidayMap(holidays: { date: string; name: string }[]): Map<string, { name: string }> {
  const map = new Map();
  for (const h of holidays) map.set(h.date, { name: h.name });
  return map;
}

function getWeekLabel(weekOffset: number) {
  const now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  const dayOfWeek = now.getDay();
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return { monday: fmt(monday), sunday: fmt(sunday) };
}
