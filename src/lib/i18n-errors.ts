// src/lib/i18n-errors.ts
import type { TFunction } from "i18next";

const errorMap: Record<string, string> = {
  "Invalid login credentials": "login.errors.invalidCredentials",
  "User already registered": "login.errors.userExists",
  "Password should be at least 6 characters": "login.errors.weakPassword",
  "Email not confirmed": "login.errors.emailNotConfirmed",
  "Email rate limit exceeded": "login.errors.rateLimited",
  "Network request failed": "login.errors.networkError"
};

export function translateSupabaseError(
  t: TFunction,
  rawError: string | null | undefined
): string | null {
  if (!rawError) return null;
  const key = errorMap[rawError] ?? "login.errors.unknown";
  return t(key);
}
