// 今日 + 本周视图，带出勤标记

import { useState, useEffect } from "react";
import { useTodayClasses, useWeekClasses, useLowBalanceEnrollments } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateISO } from "@/lib/utils";
import { Loader2, Check, X, WifiOff, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { enqueueOp, getPendingOps, removeOp, updateOpStatus, isOnline } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "待上课",
  attended: "已出席",
  cancelled: "已取消",
  no_show: "缺勤",
  make_up: "补课",
};

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function HomePage({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) {
  const [view, setView] = useState<"day" | "week">("day");
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Header view={view} onViewChange={setView} />
      {view === "day" ? <DayView onSelectStudent={onSelectStudent} /> : <WeekView onSelectStudent={onSelectStudent} />}
    </div>
  );
}

function Header({ view, onViewChange }: { view: "day" | "week"; onViewChange: (v: "day" | "week") => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-0 border rounded-lg overflow-hidden">
        <button onClick={() => onViewChange("day")}
          className={`px-4 py-1.5 text-sm font-medium ${view === "day" ? "bg-[#5BB5A2] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>今日</button>
        <button onClick={() => onViewChange("week")}
          className={`px-4 py-1.5 text-sm font-medium ${view === "week" ? "bg-[#5BB5A2] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>本周</button>
      </div>
      {view === "week" && <WeekNavigator />}
    </div>
  );
}

function WeekNavigator() {
  const [weekOffset, setWeekOffset] = useState(0);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const label = `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}`;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 hover:text-gray-700"><ChevronLeft className="w-4 h-4" /></button>
      <span className="font-medium text-gray-700 min-w-[100px] text-center">{label}</span>
      <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 hover:text-gray-700"><ChevronRight className="w-4 h-4" /></button>
      {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-600 hover:underline ml-1">本周</button>}
    </div>
  );
}

// =============================================================================
// Day View (existing logic)
// =============================================================================

function DayView({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) {
  const { data: classes, isLoading, error } = useTodayClasses();
  const { data: lowBalanceEnrollments } = useLowBalanceEnrollments();
  const qc = useQueryClient();
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [online, setOnline] = useState(isOnline());
  const today = new Date().toLocaleDateString(undefined, {
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
      qc.invalidateQueries({ queryKey: ["today_classes"] });
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
    qc.invalidateQueries({ queryKey: ["today_classes"] });
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
      <h2 className="text-xl font-bold text-gray-900 mb-6">{today}</h2>

      {error ? (
        <Alert variant="destructive"><AlertDescription>{String(error)}</AlertDescription></Alert>
      ) : !classes || classes.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">今天没有排课</h3>
          <p className="text-gray-500">先去「学生管理」给已报名的学生排课吧</p>
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
                      <p className={`text-sm ${isDone ? "text-gray-400" : "text-green-600"}`}>{STATUS_LABELS[sc.status] ?? sc.status}</p>
                    </div>
                  </div>
                  {!isDone && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleMark(sc.id, "attended")} className="bg-green-600 hover:bg-green-700"><Check className="w-4 h-4" />出席</Button>
                      <Button size="sm" variant="outline" onClick={() => handleMark(sc.id, "no_show")} className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"><X className="w-4 h-4" />缺勤</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleMark(sc.id, "cancelled")} className="text-gray-500 hover:text-gray-700">取消</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// =============================================================================
// Week View — 横向周日历
// =============================================================================

function WeekView({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) {
  const { data: allClasses, isLoading } = useWeekClasses();
  const qc = useQueryClient();

  // 计算本周的 7 天日期
  const now = new Date();
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

  // 按日期分组
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
    if (rpcErr) {
      console.error("[Attendance] mark_attendance failed:", rpcErr);
      return;
    }
    qc.invalidateQueries({ queryKey: ["week_classes"] });
    qc.invalidateQueries({ queryKey: ["today_classes"] });
    qc.invalidateQueries({ queryKey: ["enrollments"] });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const todayStr = formatDateISO();

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-3 min-w-[700px]">
        {days.map((day, i) => {
          const dateStr = formatDateISO(day);
          const isToday = dateStr === todayStr;
          const classes = byDate.get(dateStr) ?? [];

          return (
            <div key={i} className="flex-1 min-w-[90px]">
              {/* Day header */}
              <div className={`text-center pb-2 mb-2 border-b ${isToday ? "border-[#5BB5A2]" : "border-gray-200"}`}>
                <div className={`text-xs font-medium ${isToday ? "text-[#5BB5A2]" : "text-gray-400"}`}>{WEEKDAY_LABELS[i]}</div>
                <div className={`text-lg font-bold ${isToday ? "text-gray-900" : "text-gray-700"}`}>{day.getDate()}</div>
              </div>

              {/* Classes */}
              <div className="space-y-1.5">
                {classes.length === 0 && (
                  <div className="text-center py-4">
                    <div className="text-2xl mb-1 opacity-30">—</div>
                  </div>
                )}
                {classes.map((sc: any) => {
                  const isDone = sc.status !== "scheduled";
                  return (
                    <Card key={sc.id} className={`${isDone ? "opacity-50" : ""} cursor-pointer hover:shadow-sm transition-shadow`}
                      onClick={() => onSelectStudent?.(sc.student_id)}>
                      <CardContent className="p-2">
                        <div className="text-xs font-bold text-gray-700">{sc.start_time?.slice(0, 5)}</div>
                        <div className="text-sm font-semibold text-gray-900 truncate">{sc.students?.name ?? "-"}</div>
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
                            {STATUS_LABELS[sc.status]}
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
