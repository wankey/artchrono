// 学生列表页

import { useState } from "react";
import { useStudents } from "@/lib/queries";
import { useCreateStudent } from "@/lib/mutations";
import { Search, Plus, Loader2 } from "lucide-react";

export default function StudentsPage({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) {
  const { data: students, isLoading, error } = useStudents();
  const createStudent = useCreateStudent();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentWechat, setParentWechat] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) return;
    await createStudent.mutateAsync({
      name: name.trim(),
      parent_name: parentName || undefined,
      parent_phone: parentPhone || undefined,
      parent_wechat: parentWechat || undefined,
    });
    setName(""); setParentName(""); setParentPhone(""); setParentWechat("");
    setShowForm(false);
  };

  const filtered = (students ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.parent_phone?.includes(search)
  );

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (error) return <div className="text-red-600 p-4">加载失败：{String(error)}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">学生管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          添加学生
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">添加学生</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
              <input
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="学生姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">家长姓名</label>
              <input
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parentName} onChange={(e) => setParentName(e.target.value)}
                placeholder="家长姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">家长电话</label>
              <input
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parentPhone} onChange={(e) => setParentPhone(e.target.value)}
                placeholder="手机号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">家长微信</label>
              <input
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parentWechat} onChange={(e) => setParentWechat(e.target.value)}
                placeholder="微信号"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={createStudent.isPending || !name.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {createStudent.isPending ? "保存中..." : "保存"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-600 px-6 py-2 rounded border hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-10 pr-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="搜索学生、家长或手机号..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {students?.length === 0 ? "还没有学生，添加第一个吧" : "无匹配结果"}
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 cursor-pointer"
                 onClick={() => onSelectStudent?.(s.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{s.name}</h4>
                  <div className="text-sm text-gray-500 mt-1 space-x-4">
                    {s.parent_name && <span>家长：{s.parent_name}</span>}
                    {s.parent_phone && <span>📱 {s.parent_phone}</span>}
                    {s.parent_wechat && <span>💬 {s.parent_wechat}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    s.status === "active" ? "bg-green-100 text-green-700" :
                    s.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {s.status === "active" ? "在读" : s.status === "paused" ? "暂停" : "毕业"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}