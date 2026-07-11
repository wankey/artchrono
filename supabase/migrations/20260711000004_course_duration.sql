-- Migration: 课程加默认课时长度
ALTER TABLE courses ADD COLUMN IF NOT EXISTS default_duration_minutes INT NOT NULL DEFAULT 60;
