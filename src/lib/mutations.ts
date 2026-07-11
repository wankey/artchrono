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
    mutationFn: async (input: { name: string; description?: string }) => {
      const teacherId = await getTeacherId();
      const { data, error } = await supabase
        .from("courses")
        .insert({
          teacher_id: teacherId,
          name: input.name,
          description: input.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });
}

// =============================================================================
// Exam Levels
// =============================================================================

export function useCreateExamLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { course_id: string; level_number: number; level_name?: string; price_cents: number; description?: string }) => {
      const { data, error } = await supabase
        .from("exam_levels")
        .insert({
          course_id: input.course_id,
          level_number: input.level_number,
          level_name: input.level_name || null,
          price_cents: input.price_cents,
          description: input.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["exam_levels", vars.course_id] }),
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

      // 有课位后立即触发 regeneration
      // V1：先不调 RPC（等 weekly cron 兜底）
      // V1.1：改为此处调 regenerate_for_enrollment RPC
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class_slots"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}