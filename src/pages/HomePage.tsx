// 今日课程 + 出勤标记

import { useState, useEffect } from "react";
import { useTodayClasses } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X, WifiOff } from "lucide-react";
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

export default function HomePage() {
  const { data: classes, isLoading, error } = useTodayClasses();
  const qc = useQueryClient();
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [online, setOnline] = useState(isOnline());
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  // 监听在线状态
  useEffect(() => {
    const onOnline = () => { setOnline(true); replayQueue(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // 定时检查
    const interval = setInterval(() => setOnline(isOnline()), 30000);
    // 启动时检查队列
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
      // 乐观更新本地缓存
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
    <div className="max-w-5xl mx-auto px-4 py-6">
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{today}</h2>

      {error ? (
        <Alert variant="destructive"><AlertDescription>{String(error)}</AlertDescription></Alert>
      ) : !classes || classes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">今天没有排课</h3>
            <p className="text-gray-500">
              先去「学生管理」给已报名的学生排课吧
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((sc) => {
            const isDone = sc.status !== "scheduled";
            return (
              <Card key={sc.id} className={isDone ? "opacity-60" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-700 w-32">
                      {sc.start_time?.slice(0, 5)} - {sc.end_time?.slice(0, 5)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {sc.students?.name ?? "-"}
                      </h4>
                      <p className={`text-sm ${isDone ? "text-gray-400" : "text-green-600"}`}>
                        {STATUS_LABELS[sc.status] ?? sc.status}
                      </p>
                    </div>
                  </div>
                  {!isDone && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleMark(sc.id, "attended")}
                        className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4" />出席
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleMark(sc.id, "no_show")}
                        className="border-yellow-500 text-yellow-700 hover:bg-yellow-50">
                        <X className="w-4 h-4" />缺勤
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleMark(sc.id, "cancelled")}
                        className="text-gray-500 hover:text-gray-700">
                        取消
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}