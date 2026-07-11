// 课程 + 考级管理页（含默认课时长度）

import { useState } from "react";
import { useCourses, useExamLevels } from "@/lib/queries";
import { useCreateCourse, useCreateExamLevel } from "@/lib/mutations";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, ChevronDown, ChevronRight } from "lucide-react";

export default function CoursesPage() {
  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const createLevel = useCreateExamLevel();
  const qc = useQueryClient();

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [duration, setDuration] = useState(60);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [showLevelFormFor, setShowLevelFormFor] = useState<string | null>(null);
  const [levelNum, setLevelNum] = useState(1);
  const [levelName, setLevelName] = useState("");
  const [priceYuan, setPriceYuan] = useState("200");

  // 更新课程时长
  const handleUpdateDuration = async (id: string, mins: number) => {
    await supabase.from("courses").update({ default_duration_minutes: mins }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["courses"] });
  };

  const handleAddCourse = async () => {
    if (!courseName.trim()) return;
    await createCourse.mutateAsync({ name: courseName.trim(), description: courseDesc.trim() || undefined, default_duration_minutes: duration });
    // 设置默认时长
    setCourseName(""); setCourseDesc(""); setDuration(60); setShowCourseForm(false);
  };

  const handleAddLevel = async (courseId: string) => {
    if (!levelNum) return;
    await createLevel.mutateAsync({ course_id: courseId, level_number: levelNum, level_name: levelName || undefined, price_cents: Math.round(parseFloat(priceYuan)*100), default_duration_minutes: levelDuration });
    setLevelNum(prev => prev + 1); setLevelName(""); setPriceYuan(""); setLevelDuration(undefined);
    setShowLevelFormFor(null);
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">课程管理</h2>
        <button onClick={() => setShowCourseForm(!showCourseForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"><Plus className="w-4 h-4" />添加课程</button>
      </div>

      {showCourseForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">添加课程</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">课程名 *</label>
              <input className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="钢琴" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <input className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={courseDesc} onChange={e => setCourseDesc(e.target.value)} placeholder="一对一教学" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">默认课时（分钟）</label>
              <input type="number" min={15} max={240} className="w-full px-3 py-2 border rounded" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddCourse} disabled={createCourse.isPending || !courseName.trim()} className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">{createCourse.isPending ? "保存中..." : "保存"}</button>
            <button onClick={() => setShowCourseForm(false)} className="text-gray-600 px-6 py-2 rounded border hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {courses?.length === 0 && <div className="text-center py-12 text-gray-400">还没有课程</div>}
        {courses?.map((course: any) => (
          <CourseCard key={course.id} course={course} expanded={expandedCourse === course.id} onToggle={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
            showLevelForm={showLevelFormFor === course.id} onShowLevelForm={() => setShowLevelFormFor(course.id)} onHideLevelForm={() => setShowLevelFormFor(null)}
            levelNum={levelNum} setLevelNum={setLevelNum} levelName={levelName} setLevelName={setLevelName}
            priceYuan={priceYuan} setPriceYuan={setPriceYuan} onAddLevel={() => handleAddLevel(course.id)} addingLevel={createLevel.isPending}
            onUpdateDuration={(mins: number) => handleUpdateDuration(course.id, mins)} />
        ))}
      </div>
    </div>
  );
}

function CourseCard({ course, expanded, onToggle, showLevelForm, onShowLevelForm, onHideLevelForm, levelNum, setLevelNum, levelName, setLevelName, priceYuan, setPriceYuan, onAddLevel, addingLevel, onUpdateDuration }: any) {
  const { data: levels } = useExamLevels(course.id);
  const [editingDuration, setEditingDuration] = useState(false);
  const [dur, setDur] = useState(course.default_duration_minutes ?? 60);

  return (
    <div className="bg-white rounded-lg shadow">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
        <div className="text-left">
          <h4 className="font-semibold text-gray-900">{course.name}</h4>
          <p className="text-sm text-gray-500">{course.description || ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{levels?.length ?? 0} 个等级 · {course.default_duration_minutes ?? 60}分钟/课</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t space-y-2 pt-3">
          {/* 默认课时长度 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>默认课时：</span>
            {editingDuration ? (
              <><input type="number" min={15} max={240} className="w-16 px-2 py-0.5 border rounded text-sm" value={dur} onChange={e => setDur(parseInt(e.target.value)||60)} />
                <button onClick={() => { onUpdateDuration(dur); setEditingDuration(false); }} className="text-blue-600 hover:underline text-xs">保存</button>
                <button onClick={() => setEditingDuration(false)} className="text-gray-400 text-xs">取消</button></>
            ) : (
              <><span className="font-medium">{course.default_duration_minutes ?? 60} 分钟</span>
                <button onClick={() => setEditingDuration(true)} className="text-blue-600 hover:underline text-xs">修改</button></>
            )}
          </div>

          {levels?.length === 0 && <p className="text-sm text-gray-400">还没设等级</p>}
          {levels?.map((lvl: any) => (
            <div key={lvl.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-700">{lvl.level_name || `第 ${lvl.level_number} 级`}</span>
              <span className="text-gray-600">
                ¥{(lvl.price_cents / 100).toFixed(0)} / 节
                {lvl.default_duration_minutes ? ` · ${lvl.default_duration_minutes}min` : ""}
              </span>
            </div>
          ))}

          {showLevelForm ? (
            <div className="bg-gray-50 rounded p-3 space-y-2 mt-3">
              <div className="grid grid-cols-4 gap-2">
                <div><label className="block text-xs text-gray-600 mb-1">等级序号</label><input type="number" min={1} className="w-full px-2 py-1 border rounded text-sm" value={levelNum} onChange={e => setLevelNum(parseInt(e.target.value)||1)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">等级名</label><input className="w-full px-2 py-1 border rounded text-sm" value={levelName} onChange={e => setLevelName(e.target.value)} placeholder="初级" /></div>
                <div><label className="block text-xs text-gray-600 mb-1">单节课费（元）</label><input className="w-full px-2 py-1 border rounded text-sm" value={priceYuan} onChange={e => setPriceYuan(e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">课时（分，留空=课程默认）</label><input type="number" min={15} max={240} className="w-full px-2 py-1 border rounded text-sm" value={levelDuration ?? ""} onChange={e => setLevelDuration(e.target.value ? parseInt(e.target.value) : undefined)} placeholder={String(course.default_duration_minutes ?? 60)} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={onAddLevel} disabled={addingLevel} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50">{addingLevel ? "保存中..." : "保存"}</button>
                <button onClick={onHideLevelForm} className="text-gray-600 px-3 py-1 rounded text-sm border hover:bg-gray-50">取消</button>
              </div>
            </div>
          ) : (
            <button onClick={onShowLevelForm} className="text-blue-600 text-sm hover:underline mt-2 inline-block">+ 添加等级</button>
          )}
        </div>
      )}
    </div>
  );
}