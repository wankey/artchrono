import { describe, it, expect } from "vitest";
import { cn, formatDateISO } from "@/lib/utils";

// =============================================================================
// cn()
// =============================================================================

describe("cn()", () => {
  it("合并多个类名", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("过滤假值", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("合并 Tailwind 冲突（后覆盖前）", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("空输入返回空字符串", () => {
    expect(cn()).toBe("");
  });
});

// =============================================================================
// formatDateISO()
// =============================================================================

describe("formatDateISO()", () => {
  it("无参返回当天 YYYY-MM-DD", () => {
    const result = formatDateISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("格式化指定日期", () => {
    const d = new Date(2026, 6, 11); // Jul 11, 2026
    expect(formatDateISO(d)).toBe("2026-07-11");
  });

  it("1月1日", () => {
    const d = new Date(2026, 0, 1);
    expect(formatDateISO(d)).toBe("2026-01-01");
  });

  it("12月31日", () => {
    const d = new Date(2026, 11, 31);
    expect(formatDateISO(d)).toBe("2026-12-31");
  });

  it("个位数月日补零", () => {
    const d = new Date(2026, 2, 5); // Mar 5
    expect(formatDateISO(d)).toBe("2026-03-05");
  });
});
