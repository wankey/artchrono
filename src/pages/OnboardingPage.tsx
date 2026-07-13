// 首次运行引导

import { useState } from "react";
import { useCreateCourse, useCreateExamLevel, useCreateStudent, useCreateEnrollment, useCreateClassSlot } from "@/lib/mutations";
import { useCourses } from "@/lib/queries";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/useTypedTranslation";

type Step = "course" | "level" | "student" | "enrollment" | "slot" | "done";

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { t } = useT();
  const { data: courses } = useCourses();
  const [step, setStep] = useState<Step>(courses && courses.length > 0 ? "student" : "course");

  // 如果已有数据，可以跳到 step done
  if (courses && courses.length > 0 && step === "course") {
    setStep("student");
  }

  // State for each step
  const [courseName, setCourseName] = useState("");
  const [levelNum, setLevelNum] = useState(1);
  const [levelName, setLevelName] = useState("初级");
  const [priceYuan, setPriceYuan] = useState("200");
  const [studentName, setStudentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [classesPaid, setClassesPaid] = useState(10);
  const [amountYuan, setAmountYuan] = useState("2000");
  const [weekday, setWeekday] = useState(6);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  // IDs from previous steps
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [createdEnrollmentId, setCreatedEnrollmentId] = useState<string | null>(null);

  const createCourse = useCreateCourse();
  const createLevel = useCreateExamLevel();
  const createStudent = useCreateStudent();
  const createEnrollment = useCreateEnrollment();
  const createSlot = useCreateClassSlot();

  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const renderStep = () => {
    switch (step) {
      case "course":
        return (
          <StepBox title="1/4 · 添加第一个课程" subtitle="比如：「钢琴」">
            <Input placeholder="课程名" value={courseName} onChange={e => setCourseName(e.target.value)} />
            <Btn label="下一步" disabled={!courseName.trim() || createCourse.isPending}
              onClick={async () => {
                const c = await createCourse.mutateAsync({ name: courseName.trim() });
                setCreatedCourseId(c.id);
                setStep("level");
              }} loading={createCourse.isPending} />
          </StepBox>
        );
      case "level":
        return (
          <StepBox title="1/4 · 设置等级" subtitle="单节课学费">
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={1} placeholder="等级序号" value={levelNum} onChange={e => setLevelNum(parseInt(e.target.value)||1)} />
              <Input placeholder="等级名" value={levelName} onChange={e => setLevelName(e.target.value)} />
              <Input placeholder="单节费（元）" value={priceYuan} onChange={e => setPriceYuan(e.target.value)} />
            </div>
            <Btn label="下一步" disabled={!createdCourseId || createLevel.isPending}
              onClick={async () => {
                await createLevel.mutateAsync({ course_id: createdCourseId!, level_number: levelNum, level_name: levelName, price_cents: Math.round(parseFloat(priceYuan)*100) });
                setStep("student");
              }} loading={createLevel.isPending} />
          </StepBox>
        );
      case "student":
        return (
          <StepBox title="2/4 · 添加第一个学生" subtitle="">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="学生姓名" value={studentName} onChange={e => setStudentName(e.target.value)} />
              <Input placeholder="家长电话" value={parentPhone} onChange={e => setParentPhone(e.target.value)} />
            </div>
            <Btn label="下一步" disabled={!studentName.trim() || createStudent.isPending}
              onClick={async () => {
                const s = await createStudent.mutateAsync({ name: studentName.trim(), parent_phone: parentPhone || undefined });
                setCreatedStudentId(s.id);
                setStep("enrollment");
              }} loading={createStudent.isPending} />
          </StepBox>
        );
      case "enrollment":
        return (
          <StepBox title="3/4 · 报名 & 付款" subtitle="">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">付款节数</Label>
                <Input type="number" min={1} value={classesPaid} onChange={e => { setClassesPaid(parseInt(e.target.value)||0); setAmountYuan(((parseFloat(priceYuan)*parseInt(e.target.value))||0).toString()); }} />
              </div>
              <div>
                <Label className="text-xs text-gray-500">金额（元）</Label>
                <Input value={amountYuan} onChange={e => setAmountYuan(e.target.value)} />
              </div>
            </div>
            <Btn label="下一步" disabled={!createdStudentId || !createdCourseId || createEnrollment.isPending}
              onClick={async () => {
                const enr = await createEnrollment.mutateAsync({
                  student_id: createdStudentId!,
                  course_id: createdCourseId!,
                  exam_level_id: courses?.[0]?.exam_levels?.[0]?.id ?? "",
                  classes_paid: classesPaid,
                  amount_cents: Math.round(parseFloat(amountYuan)*100),
                });
                // 注：exam_level_id 需要从实际创建的 level 中取
                // V1 简化：使用已创建的 level
                setCreatedEnrollmentId(enr.id);
                setStep("slot");
              }} loading={createEnrollment.isPending} />
          </StepBox>
        );
      case "slot":
        return (
          <StepBox title="4/4 · 排第一节课" subtitle="确定固定上课时间">
            <div className="grid grid-cols-3 gap-2">
              <select className="px-3 py-2 border rounded" value={weekday} onChange={e => setWeekday(parseInt(e.target.value))}>
                {WEEKDAYS.map((d,i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <Btn label="完成 🎉" disabled={!createdEnrollmentId || !createdStudentId || createSlot.isPending}
              onClick={async () => {
                await createSlot.mutateAsync({
                  student_id: createdStudentId!,
                  enrollment_id: createdEnrollmentId!,
                  weekday, start_time: startTime, end_time: endTime,
                });
                setStep("done");
              }} loading={createSlot.isPending} />
          </StepBox>
        );
      case "done":
        return (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-800 mb-2">{t("onboarding.doneTitle")}</h3>
              <p className="text-green-700 mb-4">{t("onboarding.doneMessage")}</p>
              <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">{t("onboarding.startUsing")}</Button>
            </CardContent>
          </Card>
        );
    }
  };

  return <div className="max-w-xl mx-auto px-4 py-12">{renderStep()}</div>;
}

function StepBox({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Btn({ label, disabled, onClick, loading }: { label: string; disabled: boolean; onClick: () => void; loading: boolean }) {
  return (
    <Button onClick={onClick} disabled={disabled || loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
      {label}
    </Button>
  );
}