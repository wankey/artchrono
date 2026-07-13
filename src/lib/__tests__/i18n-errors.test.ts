// src/lib/__tests__/i18n-errors.test.ts
import { describe, it, expect } from "vitest";
import { translateSupabaseError } from "../i18n-errors";

const t = (key: string) => `[${key}]`;

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
