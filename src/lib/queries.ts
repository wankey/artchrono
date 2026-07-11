// TanStack Query hooks: 所有 supabase 读取操作

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatDateISO } from "@/lib/utils";

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
// Dashboard / Stats
// =============================================================================

export function useMonthlyPayments() {
  const now = new Date();
  const monthStart = formatDateISO(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = formatDateISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return useQuery({
    queryKey: ["payments", "monthly", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("paid_at, amount_cents, classes_paid")
        .gte("paid_at", monthStart)
        .lte("paid_at", monthEnd + "T23:59:59Z")
        .order("paid_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMonthlyAttendance() {
  const now = new Date();
  const monthStart = formatDateISO(new Date(now.getFullYear(), now.getMonth(), 1));
  return useQuery({
    queryKey: ["attendance", "monthly", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("result")
        .gte("marked_at", monthStart);
      if (error) throw error;
      return (data ?? []) as { result: string }[];
    },
  });
}

// =============================================================================
// Scheduled Classes (by date — for day navigation)
// =============================================================================

export function useDayClasses(dateStr: string | undefined) {
  return useQuery({
    queryKey: ["day_classes", dateStr],
    queryFn: async () => {
      if (!dateStr) return [];
      const { data, error } = await supabase
        .from("scheduled_classes")
        .select("*, students(name), class_slots(location)")
        .eq("scheduled_date", dateStr)
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dateStr,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// =============================================================================
// Scheduled Classes (today — kept for backwards compat)
// =============================================================================

export function useTodayClasses() {
  const today = formatDateISO();
  return useDayClasses(today);
}

// =============================================================================
// Scheduled Classes (this week, Mon-Sun)
// =============================================================================

function getWeekBoundsForOffset(weekOffset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  const dayOfWeek = now.getDay(); // 0=Sun
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday: formatDateISO(monday), sunday: formatDateISO(sunday) };
}

export function useWeekClasses(weekOffset = 0) {
  const { monday, sunday } = getWeekBoundsForOffset(weekOffset);
  return useQuery({
    queryKey: ["week_classes", monday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_classes")
        .select("*, students(name), class_slots(location)")
        .gte("scheduled_date", monday)
        .lte("scheduled_date", sunday)
        .order("scheduled_date")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// =============================================================================
// Holidays
// =============================================================================

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("date, name, type")
        .order("date");
      if (error) throw error;
      return data as Array<{ date: string; name: string; type: string }> ?? [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// =============================================================================
// Next class date per enrollment
// =============================================================================

export function useNextClassDate(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ["next_class_date", enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return null;
      const { data, error } = await supabase
        .from("scheduled_classes")
        .select("scheduled_date, start_time, end_time")
        .eq("enrollment_id", enrollmentId)
        .eq("status", "scheduled")
        .gte("scheduled_date", formatDateISO())
        .order("scheduled_date")
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!enrollmentId,
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

// =============================================================================
// Low Balance Enrollments (for reminder banner)
// =============================================================================

export function useLowBalanceEnrollments() {
  return useQuery({
    queryKey: ["enrollments", "low_balance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, classes_remaining, student_id, students!inner(id, name), courses!inner(name)")
        .eq("status", "active")
        .lte("classes_remaining", 2)
        .order("classes_remaining");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        classes_remaining: number;
        student_id: string;
        students: { id: string; name: string };
        courses: { name: string };
      }>;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// =============================================================================
// Payments (per student)
// =============================================================================

export function useStudentPayments(studentId: string | undefined) {
  return useQuery({
    queryKey: ["payments", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*, enrollments!inner(courses!inner(name), exam_levels!inner(level_number, level_name))")
        .eq("student_id", studentId)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        classes_paid: number;
        amount_cents: number;
        paid_at: string;
        payment_method: string | null;
        notes: string | null;
        enrollments: {
          courses: { name: string };
          exam_levels: { level_number: number; level_name: string | null };
        };
      }>;
    },
    enabled: !!studentId,
  });
}

// =============================================================================
// Attendance History (per student)
// =============================================================================

export function useStudentAttendance(studentId: string | undefined) {
  return useQuery({
    queryKey: ["attendance", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("*, scheduled_classes!inner(scheduled_date, start_time, end_time), enrollments!inner(courses!inner(name))")
        .eq("student_id", studentId)
        .order("marked_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        result: string;
        marked_at: string;
        notes: string | null;
        scheduled_classes: {
          scheduled_date: string;
          start_time: string;
          end_time: string;
        };
        enrollments: {
          courses: { name: string };
        };
      }>;
    },
    enabled: !!studentId,
  });
}

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