// 付款录入页 — 续费 / 追加付款

import { useState } from "react";
import { useStudents, useEnrollments } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

export default function PaymentsPage() {
  const qc = useQueryClient();
  const { data: students, isLoading: loadingStudents } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { data: enrollments } = useEnrollments(selectedStudentId ?? undefined);

  // Payment form state
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
  const [classesPaid, setClassesPaid] = useState(10);
  const [amountYuan, setAmountYuan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wechat");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedEnrollment = enrollments?.find((e: any) => e.id === selectedEnrollmentId);

  // 自动填充预计金额
  const handleEnrollmentChange = (id: string) => {
    setSelectedEnrollmentId(id);
    const enr = enrollments?.find((e: any) => e.id === id);
    if (enr?.exam_levels?.price_cents) {
      setAmountYuan(((enr.exam_levels.price_cents * classesPaid) / 100).toFixed(0));
    }
  };

  const handleSubmit = async () => {
    if (!selectedEnrollmentId || classesPaid <= 0) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error: rpcErr } = await supabase.rpc("record_payment", {
        p_client_op_id: crypto.randomUUID(),
        p_enrollment_id: selectedEnrollmentId,
        p_classes_paid: classesPaid,
        p_amount_cents: Math.round(parseFloat(amountYuan) * 100),
        p_payment_method: paymentMethod,
      });
      if (rpcErr) throw rpcErr;
      setSuccess(`已录 ${classesPaid} 节，¥${amountYuan}`);
      setSelectedEnrollmentId("");
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["today_classes"] });
    } catch (e: any) {
      setError(e?.message || String(e));
    }
    setLoading(false);
  };

  if (loadingStudents) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">付款录入</h2>

      {/* Step 1: 选学生 */}
      {!selectedStudentId ? (
        <>
          <p className="text-sm text-gray-500 mb-4">先选学生，再选对应报名 → 录入付款</p>
          <div className="space-y-2">
            {students?.map((s) => (
              <div key={s.id}
                className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedStudentId(s.id)}>
                <h4 className="font-semibold text-gray-900">{s.name}</h4>
                <p className="text-sm text-gray-500">{s.parent_name} · {s.parent_phone}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Step 1.5: 回退 */}
          <button onClick={() => setSelectedStudentId(null)} className="text-blue-600 text-sm hover:underline mb-4">← 选其他学生</button>

          {/* Step 2: 选报名 */}
          {!selectedEnrollmentId ? (
            <div className="space-y-2">
              {(enrollments ?? []).length === 0 ? (
                <p className="text-gray-400">该学生还没有报名</p>
              ) : (
                enrollments?.map((enr: any) => (
                  <div key={enr.id}
                    className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEnrollmentChange(enr.id)}>
                    <h4 className="font-semibold text-gray-900">
                      {enr.courses?.name} · 第{enr.exam_levels?.level_number}级
                    </h4>
                    <p className="text-sm text-gray-500">
                      余额：<span className={enr.classes_remaining <= 2 ? "text-red-600 font-semibold" : "font-semibold"}>{enr.classes_remaining}</span> 节
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Step 3: 填写付款信息 */}
              <div className="bg-white rounded-lg shadow p-6 space-y-4 mt-2">
                <h3 className="font-semibold">
                  {selectedEnrollment?.courses?.name} · 第{selectedEnrollment?.exam_levels?.level_number}级
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    当前余额：{selectedEnrollment?.classes_remaining} 节
                  </span>
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">节数 *</label>
                    <input type="number" min={1} value={classesPaid}
                      onChange={(e) => {
                        setClassesPaid(parseInt(e.target.value) || 0);
                        if (selectedEnrollment?.exam_levels?.price_cents) {
                          setAmountYuan(((selectedEnrollment.exam_levels.price_cents * parseInt(e.target.value)) / 100).toFixed(0));
                        }
                      }}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">金额（元）</label>
                    <input type="text" value={amountYuan}
                      onChange={(e) => setAmountYuan(e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">收款方式</label>
                    <select value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="wechat">微信</option>
                      <option value="alipay">支付宝</option>
                      <option value="cash">现金</option>
                      <option value="bank">银行转账</option>
                    </select>
                  </div>
                </div>
                {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}
                {success && <div className="text-green-600 text-sm bg-green-50 px-3 py-2 rounded">{success}</div>}
                <div className="flex gap-2">
                  <button onClick={handleSubmit} disabled={loading || !selectedEnrollmentId || classesPaid <= 0}
                    className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
                    {loading ? "处理中..." : "确认收款"}
                  </button>
                  <button onClick={() => setSelectedEnrollmentId("")} className="text-gray-600 px-4 py-2 rounded border hover:bg-gray-50">重选</button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}