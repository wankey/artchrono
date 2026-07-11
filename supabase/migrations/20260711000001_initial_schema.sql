-- =============================================================================
-- 艺术培训课程与续费管理系统 V1 — Initial Schema
-- Generated: 2026-07-11
-- Source: docs/design.md
--
-- 11 表 + RLS + pgcrypto + client_op_id 幂等约束
-- 此 migration 幂等（可重复执行）
-- =============================================================================

-- 时区约定：所有 TIMESTAMPTZ 字段按 UTC 存储和查询（Postgres 内部总是 UTC）
-- 应用层负责 UTC → Asia/Shanghai 转换（display 用途）
SET TIME ZONE 'UTC';

-- 启用 pgcrypto（client_op_id 用 gen_random_uuid()）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 用户（老师）
-- 注：email 字段存在于 auth.users（Supabase Auth），不 mirror 到 public schema
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,  -- 等于 auth.users.id
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 课程（钢琴、小提琴、乐理等）
-- =============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, name)
);

-- =============================================================================
-- 考级（每个课程下的等级 + 单节课学费）
-- price_cents 是"这一级一节课多少钱"（单节课学费），不是"这一级总学费"
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  level_number INT NOT NULL,
  level_name TEXT,
  price_cents INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, level_number)
);

-- =============================================================================
-- 学生
-- =============================================================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  parent_wechat TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'graduated')),
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 报名（核心：每个学生在每个等级下的进度 + 余额）
-- teacher_id 反规范化便于 RLS
-- =============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id),
  exam_level_id UUID NOT NULL REFERENCES exam_levels(id),
  classes_remaining INT NOT NULL DEFAULT 0,
  price_paid_cents INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'dropped')),
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id, exam_level_id)
);

-- =============================================================================
-- 课位（学生固定周课，关联到具体报名）
-- =============================================================================
CREATE TABLE IF NOT EXISTS class_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 实际排课实例
-- 每个 class_slot 在未来 N 周内展开为多条 scheduled_classes
-- UNIQUE (class_slot_id, scheduled_date) 让 upsert 幂等
-- =============================================================================
CREATE TABLE IF NOT EXISTS scheduled_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_slot_id UUID REFERENCES class_slots(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'attended', 'no_show', 'cancelled', 'make_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_slot_id, scheduled_date)
);

-- =============================================================================
-- 考勤记录（关联到具体报名，扣减该报名的余额）
-- client_op_id 是客户端生成的 UUID，用于幂等性（防双击/replay）
-- =============================================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_op_id UUID NOT NULL,
  scheduled_class_id UUID NOT NULL REFERENCES scheduled_classes(id),
  student_id UUID NOT NULL REFERENCES students(id),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marked_by UUID NOT NULL REFERENCES users(id),
  result TEXT NOT NULL CHECK (result IN ('attended', 'no_show', 'cancelled', 'make_up')),
  notes TEXT,
  UNIQUE (client_op_id)
);

-- =============================================================================
-- 付款记录（针对具体报名）
-- client_op_id 是客户端生成的 UUID，用于幂等性
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_op_id UUID NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  student_id UUID NOT NULL REFERENCES students(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  amount_cents INT NOT NULL,
  classes_paid INT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT,
  notes TEXT,
  UNIQUE (client_op_id)
);

-- =============================================================================
-- 提醒日志（针对报名，每报名每天最多一次提醒）
-- V1 横幅走 enrollments 实时计算；reminders 表保留作审计日志
-- =============================================================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  student_id UUID NOT NULL REFERENCES students(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('low_balance', 'payment_due')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  threshold_value INT,
  notification_channel TEXT,
  dedup_key TEXT NOT NULL,
  UNIQUE (enrollment_id, dedup_key)
);

-- =============================================================================
-- 节假日表（由 scripts/sync-holidays.mjs 从 timor.tech 同步，年更 + 首次启动）
-- type: 'holiday'=放假 | 'workday'=调休上班
-- holidays_readable_by_all 策略允许所有 authenticated user 读
-- =============================================================================
CREATE TABLE IF NOT EXISTS holidays (
  date DATE PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('holiday', 'workday')),
  source TEXT NOT NULL DEFAULT 'timor.tech',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- users: teacher 只能访问自己的 profile
DROP POLICY IF EXISTS "teacher_owns_users" ON users;
CREATE POLICY "teacher_owns_users" ON users
  FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- courses: teacher 只能访问自己的
DROP POLICY IF EXISTS "teacher_owns_courses" ON courses;
CREATE POLICY "teacher_owns_courses" ON courses
  FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- exam_levels: 通过 courses 表检查 teacher_id
DROP POLICY IF EXISTS "teacher_owns_exam_levels" ON exam_levels;
CREATE POLICY "teacher_owns_exam_levels" ON exam_levels
  FOR ALL TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE teacher_id = (SELECT auth.uid())))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE teacher_id = (SELECT auth.uid())));

-- students: teacher 只能访问自己的
DROP POLICY IF EXISTS "teacher_owns_students" ON students;
CREATE POLICY "teacher_owns_students" ON students
  FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- enrollments: teacher 只能访问自己的
DROP POLICY IF EXISTS "teacher_owns_enrollments" ON enrollments;
CREATE POLICY "teacher_owns_enrollments" ON enrollments
  FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- class_slots
DROP POLICY IF EXISTS "teacher_owns_class_slots" ON class_slots;
CREATE POLICY "teacher_owns_class_slots" ON class_slots
  FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- scheduled_classes
DROP POLICY IF EXISTS "teacher_owns_scheduled_classes" ON scheduled_classes;
CREATE POLICY "teacher_owns_scheduled_classes" ON scheduled_classes
  FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- attendance
DROP POLICY IF EXISTS "teacher_owns_attendance" ON attendance;
CREATE POLICY "teacher_owns_attendance" ON attendance
  FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- payments
DROP POLICY IF EXISTS "teacher_owns_payments" ON payments;
CREATE POLICY "teacher_owns_payments" ON payments
  FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- reminders
DROP POLICY IF EXISTS "teacher_owns_reminders" ON reminders;
CREATE POLICY "teacher_owns_reminders" ON reminders
  FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- holidays: 公共可读，所有 authenticated user 都能 SELECT
DROP POLICY IF EXISTS "holidays_readable_by_all" ON holidays;
CREATE POLICY "holidays_readable_by_all" ON holidays
  FOR SELECT TO authenticated USING (true);

-- 注：holidays 表的 INSERT/UPDATE/DELETE 只能由 service role（GitHub Actions）执行
-- 不为 authenticated user 写 holidays 策略 = 默认拒绝（除 service role）

-- =============================================================================
-- 索引（性能优化）
-- =============================================================================

-- teacher_id 索引（RLS 过滤常用）
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exam_levels_course_id ON exam_levels(course_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_teacher_id ON enrollments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_slots_teacher_id ON class_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_slots_enrollment_id ON class_slots(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_teacher_id ON scheduled_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_enrollment_date ON scheduled_classes(enrollment_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_date_status ON scheduled_classes(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher_id ON attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_id ON attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_teacher_id ON payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payments_enrollment_id ON payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_teacher_id ON reminders(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reminders_enrollment_id ON reminders(enrollment_id);

-- 余额低提醒查询：enrollments WHERE status='active' AND classes_remaining <= threshold
CREATE INDEX IF NOT EXISTS idx_enrollments_active_balance ON enrollments(status, classes_remaining)
  WHERE status = 'active';