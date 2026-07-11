// 今日课程页（V1 骨架，T8 替换成真实内容）

export default function HomePage() {
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{today}</h2>
      <div className="bg-white rounded-lg shadow p-8 text-center mt-4">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">今日课程</h3>
        <p className="text-gray-500">
          T6 CRUD 完成。T7（Enrollment + Class Slot）实施后会显示真正的课程列表。
        </p>
      </div>
    </div>
  );
}