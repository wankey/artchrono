# 课程管家 (Course Manager)

> 简易艺术培训机构 / 个体老师课程管理系统

**设计文档**：[docs/design.md](docs/design.md) — 完整 spec + 17 次修订记录 + 3 轮 review

---

## 🚀 快速开始

### 前置条件

- Node.js ≥ 20
- pnpm ≥ 8
- macOS（开发 V1.1 加 Windows/Linux 测试）
- Rust toolchain（`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`）
- Xcode CLI Tools（`xcode-select --install`）
- Supabase 账号（免费档）

### 1. 创建 Supabase 项目

1. 访问 https://supabase.com/dashboard
2. 新建项目：`art-course-manager`
3. 选择区域：Singapore（亚洲延迟最低）
4. 设置数据库密码（记下来！）
5. 等待项目启动（~2 分钟）

### 2. 运行 Schema Migration

**方式 A：Dashboard SQL Editor（推荐新手）**
1. 项目 Dashboard → SQL Editor → New query
2. 复制 `supabase/migrations/20260711000001_initial_schema.sql` 全部内容
3. 粘贴 → Run
4. 再 Run `supabase/seed.sql`（可选，测试数据）

**方式 B：Supabase CLI**
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### 3. 获取项目凭证

Dashboard → Settings → API：
- `Project URL` → `SUPABASE_URL`
- `anon public` key → `SUPABASE_ANON_KEY`
- `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 仅 GitHub Actions 用，不要给前端）

### 4. 初始化 Tauri 项目（待 T4）

```bash
pnpm create tauri-app .
# 选 React + TypeScript
# 替换 package.json / Cargo.toml / src-tauri/ 内容（待 T4）
```

### 5. 开发模式

```bash
pnpm tauri dev
```

---

## 📁 目录结构

```
xProject/
├── docs/
│   └── design.md                      # 完整设计文档
├── src/                               # Tauri 前端 (待 T4)
│   ├── pages/
│   ├── components/
│   └── lib/
├── src-tauri/                         # Tauri Rust 后端 (待 T4)
├── supabase/
│   ├── migrations/
│   │   └── 20260711000001_initial_schema.sql
│   └── seed.sql                       # 开发测试数据
├── scripts/                           # GitHub Actions cron 脚本 (待 T11/T12)
│   ├── regenerate-all-enrollments.mjs
│   └── sync-holidays.mjs
├── .github/workflows/                 # CI/CD (待 T11/T12)
└── tests/                             # Vitest + Playwright (待 T13)
```

---

## 🛠 技术栈

- **客户端壳**：Tauri ^2.11
- **前端**：Vite ^8.1 + React ^19.2 + TypeScript ^7.0.2（备 ^6.0.3）+ Tailwind ^4.3 + shadcn ^4.13
- **数据层**：TanStack Query ^5.101 + IndexedDB（离线持久化）
- **后端**：Supabase (Postgres + Auth + Realtime)
- **定时任务**：GitHub Actions cron（regenerate + holidays sync + reminders）

---

## 📋 任务进度

15 个实施任务，详见 TaskList。Lane A 后端基础（已部分完成：T1 schema migration）+ Lane B 客户端（T4 T5 待做）。

---

## 📜 License

MIT（待定）