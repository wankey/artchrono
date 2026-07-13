// src/lib/__tests__/i18n-errors.test.ts
import { describe, it, expect } from "vitest";
import type { TFunction } from "i18next";
import { translateSupabaseError } from "../i18n-errors";

// Mock t() — wrap as TFunction so it satisfies the i18next signature
const t = ((key: string | string[]) =>
  `[${Array.isArray(key) ? key.join(".") : key}]`) as unknown as TFunction;

describe("translateSupabaseError", () => {
  it("translates known Supabase errors to i18n keys", () => {
    expect(translateSupabaseError(t, "Invalid login credentials"))
      .toBe("[login.errors.invalidCredentials]");
    expect(translateSupabaseError(t, "User already registered"))
      .toBe("[login.errors.userExists]");
    expect(translateSupabaseError(t, "Password should be at least 6 characters"))
      .toBe("[login.errors.weakPassword]");
  });

  it("falls back to 'unknown' for unmapped errors", () => {
    expect(translateSupabaseError(t, "Some new Supabase error"))
      .toBe("[login.errors.unknown]");
  });

  it("returns null for null/undefined/empty input", () => {
    expect(translateSupabaseError(t, null)).toBeNull();
    expect(translateSupabaseError(t, undefined)).toBeNull();
    expect(translateSupabaseError(t, "")).toBeNull();
  });
});
