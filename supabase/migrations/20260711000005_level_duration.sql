-- Migration: 等级可覆盖课程默认课时长度
ALTER TABLE exam_levels ADD COLUMN IF NOT EXISTS default_duration_minutes INT;  -- NULL = 使用课程默认值
