// TanStack Query hooks: 所有 supabase 读取操作

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// =============================================================================
// Students
// =============================================================================

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// =============================================================================
// Courses
// =============================================================================

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// =============================================================================
// Exam Levels (per course)
// =============================================================================

export function useExamLevels(courseId: string | undefined) {
  return useQuery({
    queryKey: ["exam_levels", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("exam_levels")
        .select("*")
        .eq("course_id", courseId)
        .order("level_number");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

// =============================================================================
// Scheduled Classes (today)
// =============================================================================

export function useTodayClasses() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }); // YYYY-MM-DD
  return useQuery({
    queryKey: ["today_classes", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_classes")
        .select("*, students(name), class_slots(location)")
        .eq("scheduled_date", today)
        .order("start_time");
      if (error) throw error;
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// =============================================================================
// Enrollments (per student)
// =============================================================================

export function useEnrollments(studentId: string | undefined) {
  return useQuery({
    queryKey: ["enrollments", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(name, default_duration_minutes), exam_levels(level_number, level_name, price_cents, default_duration_minutes)")
        .eq("student_id", studentId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

// =============================================================================
// Class Slots (per enrollment or per student)
// =============================================================================

export function useClassSlots(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ["class_slots", enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return [];
      const { data, error } = await supabase
        .from("class_slots")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .eq("active", true)
        .order("weekday")
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!enrollmentId,
  });
}