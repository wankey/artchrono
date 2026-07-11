// TanStack Query mutations: 所有 supabase 写操作

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// =============================================================================
// Students
// =============================================================================

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; parent_name?: string; parent_phone?: string; parent_wechat?: string }) => {
      const { data, error } = await supabase
        .from("students")
        .insert({
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
      const { data, error } = await supabase
        .from("courses")
        .insert({
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