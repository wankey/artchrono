// src/i18n/__tests__/catalog-completeness.test.ts
import { describe, it, expect } from "vitest";
import zhCN from "../../../public/locales/zh-CN/translation.json";
import en from "../../../public/locales/en/translation.json";

function flatten(obj: any, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    flatten(v, `${prefix}${k}.`)
  ).map(s => s.replace(/\.$/, ""));
}

describe("i18n catalogs", () => {
  it("every key in zh-CN exists in en", () => {
    const zhKeys = flatten(zhCN).sort();
    const enKeys = flatten(en).sort();
    const missing = zhKeys.filter(k => !enKeys.includes(k));
    expect(missing, `Missing en keys: ${missing.join(", ")}`).toEqual([]);
  });
});
