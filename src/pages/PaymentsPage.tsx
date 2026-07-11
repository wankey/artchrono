// 付款录入页 — 续费 / 追加付款

import { useState } from "react";
import { useStudents, useEnrollments } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
              <Card key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedStudentId(s.id)}>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-gray-900">{s.name}</h4>
                  <p className="text-sm text-gray-500">{s.parent_name} · {s.parent_phone}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Step 1.5: 回退 */}
          <Button variant="link" size="sm" onClick={() => setSelectedStudentId(null)} className="mb-4">← 选其他学生</Button>

          {/* Step 2: 选报名 */}
          {!selectedEnrollmentId ? (
            <div className="space-y-2">
              {(enrollments ?? []).length === 0 ? (
                <p className="text-gray-400">该学生还没有报名</p>
              ) : (
                enrollments?.map((enr: any) => (
                  <Card key={enr.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEnrollmentChange(enr.id)}>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900">
                        {enr.courses?.name} · 第{enr.exam_levels?.level_number}级
                      </h4>
                      <p className="text-sm text-gray-500">
                        余额：<span className={enr.classes_remaining <= 2 ? "text-red-600 font-semibold" : "font-semibold"}>{enr.classes_remaining}</span> 节
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Step 3: 填写付款信息 */}
              <Card className="mt-2">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold">
                    {selectedEnrollment?.courses?.name} · 第{selectedEnrollment?.exam_levels?.level_number}级
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      当前余额：{selectedEnrollment?.classes_remaining} 节
                    </span>
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>节数 *</Label>
                      <Input type="number" min={1} value={classesPaid}
                        onChange={(e) => {
                          setClassesPaid(parseInt(e.target.value) || 0);
                          if (selectedEnrollment?.exam_levels?.price_cents) {
                            setAmountYuan(((selectedEnrollment.exam_levels.price_cents * parseInt(e.target.value)) / 100).toFixed(0));
                          }
                        }} />
                    </div>
                    <div className="space-y-1">
                      <Label>金额（元）</Label>
                      <Input type="text" value={amountYuan} onChange={(e) => setAmountYuan(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>收款方式</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wechat">微信</SelectItem>
                          <SelectItem value="alipay">支付宝</SelectItem>
                          <SelectItem value="cash">现金</SelectItem>
                          <SelectItem value="bank">银行转账</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  {success && <Alert className="border-green-200 bg-green-50 text-green-800"><AlertDescription>{success}</AlertDescription></Alert>}
                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} disabled={loading || !selectedEnrollmentId || classesPaid <= 0}>
                      {loading ? "处理中..." : "确认收款"}
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedEnrollmentId("")}>重选</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}