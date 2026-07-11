// TanStack Query mutations: 所有 supabase 写操作

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// 获取当前用户的 teacher_id (= auth.uid())
async function getTeacherId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return user.id;
}

// =============================================================================
// Students
// =============================================================================

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; parent_name?: string; parent_phone?: string; parent_wechat?: string }) => {
      const teacherId = await getTeacherId();
      const { data, error } = await supabase
        .from("students")
        .insert({
          teacher_id: teacherId,
          name: input.name,
          parent_name: input.parent_name || null,
          parent_phone: input.parent_phone || null,
          parent_wechat: input.parent_wechat || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; parent_name?: string; parent_phone?: string; parent_wechat?: string; status?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("students")
        .update({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.parent_name !== undefined && { parent_name: input.parent_name }),
          ...(input.parent_phone !== undefined && { parent_phone: input.parent_phone }),
          ...(input.parent_wechat !== undefined && { parent_wechat: input.parent_wechat }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.notes !== undefined && { notes: input.notes }),
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

// =============================================================================
// Courses
// =============================================================================

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; default_duration_minutes?: number }) => {
      const teacherId = await getTeacherId();
      const { data, error } = await supabase
        .from("courses")
        .insert({
          teacher_id: teacherId,
          name: input.name,
          description: input.description || null,
          default_duration_minutes: input.default_duration_minutes ?? 60,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["exam_levels"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

// =============================================================================
// Exam Levels
// =============================================================================

export function useCreateExamLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { course_id: string; level_number: number; level_name?: string; price_cents: number; description?: string; default_duration_minutes?: number }) => {
      const { data, error } = await supabase
        .from("exam_levels")
        .insert({
          course_id: input.course_id,
          level_number: input.level_number,
          level_name: input.level_name || null,
          price_cents: input.price_cents,
          description: input.description || null,
          default_duration_minutes: input.default_duration_minutes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["exam_levels", vars.course_id] }),
  });
}

export function useDeleteExamLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam_levels"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

// =============================================================================
// Enrollments
// =============================================================================

export function useCreateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      course_id: string;
      exam_level_id: string;
      classes_paid: number;       // 初始付款节数（>= 0）
      amount_cents: number;       // 初始付款金额（>= 0）
      payment_method?: string;
    }) => {
      const teacherId = await getTeacherId();
      // 调用 RPC record_payment（这样 initial payment + enrollment create + regeneration 全在一个事务里）
      // V1 简化：先建 enrollment，再可选调 record_payment
      // 1. 创建 enrollment
      const { data: enrollment, error: enrollErr } = await supabase
        .from("enrollments")
        .insert({
          teacher_id: teacherId,
          student_id: input.student_id,
          course_id: input.course_id,
          exam_level_id: input.exam_level_id,
          classes_remaining: 0,
          price_paid_cents: 0,
        })
        .select()
        .single();
      if (enrollErr) throw enrollErr;

      // 2. 如果有初始付款 → 调用 record_payment RPC
      if (input.classes_paid > 0 || input.amount_cents > 0) {
        const clientOpId = crypto.randomUUID();
        const { error: rpcErr } = await supabase.rpc("record_payment", {
          p_client_op_id: clientOpId,
          p_enrollment_id: enrollment.id,
          p_classes_paid: input.classes_paid,
          p_amount_cents: input.amount_cents,
          p_payment_method: input.payment_method || "cash",
        });
        if (rpcErr) throw rpcErr;
      }

      return enrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["today_classes"] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 检查是否有未来 scheduled_classes
      const { data: futureClasses } = await supabase
        .from("scheduled_classes")
        .select("id")
        .eq("student_id", id)
        .gte("scheduled_date", new Date().toISOString().slice(0, 10))
        .neq("status", "cancelled")
        .limit(1);
      if (futureClasses && futureClasses.length > 0) {
        throw new Error("该学生还有未来课程，请先取消或结课后删除");
      }
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["today_classes"] });
    },
  });
}

// =============================================================================
// Class Slots
// =============================================================================

export function useCreateClassSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      enrollment_id: string;
      weekday: number;       // 0=周日, 6=周六
      start_time: string;   // "09:00"
      end_time: string;     // "10:00"
      location?: string;
      notes?: string;
    }) => {
      const teacherId = await getTeacherId();
      const { data, error } = await supabase
        .from("class_slots")
        .insert({
          teacher_id: teacherId,
          student_id: input.student_id,
          enrollment_id: input.enrollment_id,
          weekday: input.weekday,
          start_time: input.start_time,
          end_time: input.end_time,
          location: input.location || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      // 有课位后立即触发 regeneration（调用 DB RPC）
      try {
        await supabase.rpc("regenerate_for_enrollment", { p_enrollment_id: input.enrollment_id });
      } catch (e) {
        console.warn("[ClassSlot] regeneration RPC failed (non-fatal):", e);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class_slots"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["today_classes"] });
    },
  });
}