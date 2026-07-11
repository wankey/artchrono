-- =============================================================================
-- RPCs: 原子性 + 幂等性 + 多 slot 算法
-- Migration: 20260711000002_rpcs.sql
-- =============================================================================

-- =============================================================================
-- mark_attendance: 标记一次考勤
--
-- 原子操作（单事务）：
--   1. INSERT attendance（含 client_op_id 幂等去重）
--   2. UPDATE enrollments.classes_remaining（仅 result='attended' 时 -1）
--   3. UPDATE scheduled_classes.status
--
-- client_op_id 防双击/replay：相同 client_op_id 第二次调用返回原记录，UI 无副作用
-- =============================================================================
CREATE OR REPLACE FUNCTION mark_attendance(
  p_client_op_id UUID,
  p_scheduled_class_id UUID,
  p_result TEXT,  -- 'attended' | 'no_show' | 'cancelled' | 'make_up'
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  attendance_id UUID,
  classes_remaining INT,
  scheduled_class_status TEXT,
  was_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER  -- 因为要跨表写入
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_student_id UUID;
  v_enrollment_id UUID;
  v_existing_id UUID;
  v_classes_remaining INT;
  v_new_status TEXT;
BEGIN
  -- 1. 检查幂等性：如果 client_op_id 已存在，直接返回原记录
  SELECT id INTO v_existing_id
  FROM attendance
  WHERE client_op_id = p_client_op_id;

  IF v_existing_id IS NOT NULL THEN
    SELECT a.classes_remaining, sc.status
    INTO v_classes_remaining, v_new_status
    FROM attendance a
    JOIN scheduled_classes sc ON sc.id = a.scheduled_class_id
    JOIN enrollments e ON e.id = a.enrollment_id
    WHERE a.id = v_existing_id;

    RETURN QUERY SELECT v_existing_id, v_classes_remaining, v_new_status, TRUE;
    RETURN;
  END IF;

  -- 2. 取 scheduled_class 的 teacher/student/enrollment
  SELECT sc.teacher_id, sc.student_id, sc.enrollment_id
  INTO v_teacher_id, v_student_id, v_enrollment_id
  FROM scheduled_classes sc
  WHERE sc.id = p_scheduled_class_id;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'scheduled_class % not found', p_scheduled_class_id;
  END IF;

  -- 3. 权限校验：必须是该 teacher
  IF v_teacher_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- 4. INSERT attendance
  INSERT INTO attendance (
    client_op_id, scheduled_class_id, student_id, enrollment_id,
    teacher_id, marked_by, result, notes
  ) VALUES (
    p_client_op_id, p_scheduled_class_id, v_student_id, v_enrollment_id,
    v_teacher_id, (SELECT auth.uid()), p_result, p_notes
  )
  RETURNING id INTO v_existing_id;

  -- 5. 扣减余额（仅 attended）
  IF p_result = 'attended' THEN
    UPDATE enrollments
    SET classes_remaining = GREATEST(classes_remaining - 1, -1000),  -- 允许负数
        updated_at = NOW()
    WHERE id = v_enrollment_id
    RETURNING classes_remaining INTO v_classes_remaining;
  ELSE
    SELECT classes_remaining INTO v_classes_remaining
    FROM enrollments WHERE id = v_enrollment_id;
  END IF;

  -- 6. 更新 scheduled_class 状态
  UPDATE scheduled_classes
  SET status = p_result
  WHERE id = p_scheduled_class_id
  RETURNING status INTO v_new_status;

  RETURN QUERY SELECT v_existing_id, v_classes_remaining, v_new_status, FALSE;
END;
$$;

-- =============================================================================
-- record_payment: 录一次付款
--
-- 原子操作（单事务）：
--   1. INSERT payments（含 client_op_id 幂等去重）
--   2. UPDATE enrollments.classes_remaining（+= classes_paid）
--   3. UPDATE enrollments.price_paid_cents（+= amount_cents）
--   4. 调用 regenerate_for_enrollment() 补齐 scheduled_classes
--
-- 触发 regeneration 在同一事务里 → 失败时整个 payment 也回滚
-- =============================================================================
CREATE OR REPLACE FUNCTION record_payment(
  p_client_op_id UUID,
  p_enrollment_id UUID,
  p_classes_paid INT,
  p_amount_cents INT,
  p_payment_method TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  payment_id UUID,
  classes_remaining INT,
  scheduled_classes_generated INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_existing_id UUID;
  v_classes_remaining INT;
  v_classes_generated INT;
BEGIN
  -- 1. 幂等性检查
  SELECT id INTO v_existing_id
  FROM payments
  WHERE client_op_id = p_client_op_id;

  IF v_existing_id IS NOT NULL THEN
    SELECT classes_remaining INTO v_classes_remaining
    FROM enrollments WHERE id = p_enrollment_id;

    RETURN QUERY SELECT v_existing_id, v_classes_remaining, 0;
    RETURN;
  END IF;

  -- 2. 取 enrollment 的 teacher
  SELECT teacher_id INTO v_teacher_id
  FROM enrollments WHERE id = p_enrollment_id;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'enrollment % not found', p_enrollment_id;
  END IF;

  -- 3. 权限校验
  IF v_teacher_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- 4. INSERT payment
  INSERT INTO payments (
    client_op_id, enrollment_id, student_id, teacher_id,
    amount_cents, classes_paid, payment_method, notes
  ) VALUES (
    p_client_op_id, p_enrollment_id,
    (SELECT student_id FROM enrollments WHERE id = p_enrollment_id),
    v_teacher_id, p_amount_cents, p_classes_paid, p_payment_method, p_notes
  )
  RETURNING id INTO v_existing_id;

  -- 5. 加余额 + 累加已付金额
  UPDATE enrollments
  SET classes_remaining = classes_remaining + p_classes_paid,
      price_paid_cents = price_paid_cents + p_amount_cents,
      updated_at = NOW()
  WHERE id = p_enrollment_id
  RETURNING classes_remaining INTO v_classes_remaining;

  -- 6. 立即触发 regeneration（同一事务内，确保 atomicity）
  v_classes_generated := regenerate_for_enrollment(p_enrollment_id);

  RETURN QUERY SELECT v_existing_id, v_classes_remaining, v_classes_generated;
END;
$$;

-- =============================================================================
-- regenerate_for_enrollment: 按 enrollment.classes_remaining 补齐 scheduled_classes
--
-- 关键特性：
-- - 多 class_slot per enrollment 轮询分配
-- - 跳过已存在的 scheduled_date
-- - 不跳过节假日（节假日由老师手动改 status='cancelled'）
-- - 正差值 → 补；负差值 → 删最新
-- - 不跳过 status='scheduled' 之外的状态（attended/no_show 等保留）
--
-- 返回生成的行数（净变化）
-- =============================================================================
CREATE OR REPLACE FUNCTION regenerate_for_enrollment(
  p_enrollment_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
  v_slots RECORD[];
  v_slot RECORD;
  v_target_count INT;
  v_today DATE;
  v_taken_dates DATE[];
  v_existing_count INT;
  v_diff INT;
  v_to_insert RECORD[];
  v_cursor_date DATE;
  v_slot_idx INT;
  v_date_str TEXT;
  v_inserted INT := 0;
  v_deleted INT := 0;
BEGIN
  -- 1. 取 enrollment
  SELECT * INTO v_enrollment
  FROM enrollments
  WHERE id = p_enrollment_id;

  IF v_enrollment.id IS NULL THEN
    RAISE EXCEPTION 'enrollment % not found', p_enrollment_id;
  END IF;

  -- 2. 权限校验
  IF v_enrollment.teacher_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF v_enrollment.status != 'active' THEN
    RETURN 0;  -- non-active 不需要生成
  END IF;

  -- 3. 取所有 active class_slots（按 weekday 排序，轮询有序）
  SELECT ARRAY_AGG(s.* ORDER BY s.weekday, s.start_time)
  INTO v_slots
  FROM class_slots s
  WHERE s.enrollment_id = p_enrollment_id
    AND s.active = TRUE;

  IF v_slots IS NULL OR ARRAY_LENGTH(v_slots, 1) = 0 THEN
    RETURN 0;  -- 没有课位，无须生成
  END IF;

  -- 4. 目标数 = classes_remaining
  v_target_count := v_enrollment.classes_remaining;
  v_today := CURRENT_DATE;

  -- 5. 取已有未来 scheduled_classes 日期
  SELECT ARRAY_AGG(sc.scheduled_date ORDER BY sc.scheduled_date)
  INTO v_taken_dates
  FROM scheduled_classes sc
  WHERE sc.enrollment_id = p_enrollment_id
    AND sc.scheduled_date >= v_today
    AND sc.status = 'scheduled';

  v_existing_count := COALESCE(ARRAY_LENGTH(v_taken_dates, 1), 0);
  v_diff := v_target_count - v_existing_count;

  IF v_diff = 0 THEN
    RETURN 0;
  END IF;

  -- 6. 差值 > 0：补齐
  IF v_diff > 0 THEN
    -- 为每个 slot 初始化游标到下一个 weekday 日期
    -- 简化：直接用一个 slot 索引轮询
    v_slot_idx := 0;

    -- 展开所有候选日期（每个 slot 未来 12 周的每个 weekday）
    FOR v_slot IN SELECT UNNEST(v_slots) LOOP
      v_cursor_date := v_today;
      -- 找到下一个 weekday
      WHILE EXTRACT(DOW FROM v_cursor_date) != v_slot.weekday LOOP
        v_cursor_date := v_cursor_date + 1;
      END LOOP;
      -- 在 taken set 中记录这个 slot 的起始日期
      -- 用一个临时数组存储每个 slot 的游标
      PERFORM 1;  -- placeholder; 实际逻辑在下面
    END LOOP;

    -- 实际生成：轮询各 slot 直到凑够 v_diff 个
    -- 用一个临时表记录每个 slot 的当前游标
    CREATE TEMP TABLE IF NOT EXISTS _slot_cursors (
      slot_id UUID PRIMARY KEY,
      next_date DATE NOT NULL
    ) ON COMMIT DROP;

    -- 初始化每个 slot 的游标
    INSERT INTO _slot_cursors (slot_id, next_date)
    SELECT
      s.id,
      v_today + ((7 + s.weekday - EXTRACT(DOW FROM v_today)::INT) % 7)
    FROM UNNEST(v_slots) AS s;

    v_slot_idx := 0;
    WHILE v_slot_idx < v_diff LOOP
      -- 轮询：取第 v_slot_idx % slot_count 个 slot
      DECLARE
        v_cur RECORD;
      BEGIN
        SELECT sc.slot_id, sc.next_date, s.start_time, s.end_time, s.id AS slot_id_real
        INTO v_cur
        FROM _slot_cursors sc
        JOIN class_slots s ON s.id = sc.slot_id
        ORDER BY sc.slot_id
        OFFSET (v_slot_idx % (SELECT COUNT(*) FROM _slot_cursors))
        LIMIT 1;

        v_date_str := v_cur.next_date::TEXT;

        -- 检查这个日期是否已在 taken set
        IF v_date_str != ALL(v_taken_dates::TEXT[]) OR v_taken_dates IS NULL THEN
          -- 插入
          INSERT INTO scheduled_classes (
            class_slot_id, student_id, enrollment_id, teacher_id,
            scheduled_date, start_time, end_time, status
          ) VALUES (
            v_cur.slot_id_real,
            v_enrollment.student_id,
            p_enrollment_id,
            v_enrollment.teacher_id,
            v_cur.next_date,
            v_cur.start_time,
            v_cur.end_time,
            'scheduled'
          );
          v_inserted := v_inserted + 1;
          -- 更新 taken set（追加到这个 array）
          v_taken_dates := ARRAY_APPEND(COALESCE(v_taken_dates, ARRAY[]::DATE[]), v_cur.next_date);
        END IF;

        -- 推进游标到下一个 weekday
        UPDATE _slot_cursors
        SET next_date = next_date + 7
        WHERE slot_id = v_cur.slot_id;
      END;

      v_slot_idx := v_slot_idx + 1;
    END LOOP;

    DROP TABLE _slot_cursors;
  END IF;

  -- 7. 差值 < 0：删除多余的（最新的先删）
  IF v_diff < 0 THEN
    WITH deleted AS (
      DELETE FROM scheduled_classes
      WHERE id IN (
        SELECT id FROM scheduled_classes
        WHERE enrollment_id = p_enrollment_id
          AND scheduled_date >= v_today
          AND status = 'scheduled'
        ORDER BY scheduled_date DESC
        LIMIT (-v_diff)
      )
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_deleted FROM deleted;
  END IF;

  RETURN v_inserted - v_deleted;
END;
$$;

-- =============================================================================
-- 给 RLS：authenticated user 可调用这 3 个 RPC（函数体内部 SECURITY DEFINER 跨表写入）
-- 默认 authenticated 用户有 EXECUTE 权限
-- =============================================================================
GRANT EXECUTE ON FUNCTION mark_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION record_payment TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_for_enrollment TO authenticated;