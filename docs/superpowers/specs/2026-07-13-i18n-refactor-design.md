# artchrono — i18n Refactor Design

**Date:** 2026-07-13
**Branch:** `main`
**Status:** Draft (awaiting user review)

## Background

`artchrono` (艺时纪) is a Tauri desktop app for independent art teachers. The entire UI is currently hardcoded Chinese — ~16,978 Chinese characters across 29 `.tsx`/`.ts` files. Two issues surfaced during QA:

- **ISSUE-001** Login error "Invalid login credentials" is in English on a Chinese UI
- **ISSUE-002** Signup error "User already registered" is in English on a Chinese UI

These are visible symptoms of a deeper problem: the app has no i18n layer at all. Every Supabase error, every UI label, every button text is hardcoded. The user wants a proper i18n refactor that supports multiple languages, not a patch.

## Goals

1. Ship zh-CN + en with a runtime switcher
2. Fix the two reported Supabase error bugs as part of the refactor
3. Set up the architecture to support future languages (just add a JSON file)
4. Keep the existing Chinese users unaffected (default to zh-CN when OS locale is not English)
5. Don't break the existing Tauri + Supabase + React 19 stack

## Non-Goals

- Adding a third language now (the architecture supports it; we just ship 2)
- Translating user-entered data (student names, course names, payment notes) — that's data, not UI
- Server-side error localization (Supabase Auth's error messages are hardcoded in their Go server; we translate client-side)
- Currency conversion (this is a Chinese teacher's app — currency is always CNY)

## Locked-in decisions

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | Target languages | zh-CN + en | User explicitly requested multi-language |
| 2 | Library | react-i18next | De-facto React standard; mature; JSON catalogs |
| 3 | Default locale | OS auto-detect (no persistence) | Native desktop UX; user chose A over C |
| 4 | Switcher location | New Settings page | User chose D — sets up future settings infrastructure |
| 5 | Settings page scope | Language only | YAGNI; one section, room to grow |
| 6 | Supabase error handling | Client-side string map | Maps known Supabase English errors to i18n keys |
| 7 | Date/number formatting | i18n-locale drives formatting | Complete language switch; UI and formatting both follow i18n |
| 8 | Type safety | i18next-typescript (typed keys) | Catches typos at compile time |
| 9 | Translation workflow | Hybrid (AI first pass, manual for high-touch) | ~80% AI-accept / 20% manual |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  main.tsx                                                   │
│   └─ i18n.init({                                            │
│        lng: navigator.language (OS auto-detect),           │
│        fallbackLng: 'zh-CN',                                │
│        resources: { zh-CN, en }                             │
│      })                                                     │
│   └─ <I18nextProvider><App /></I18nextProvider>             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Components / Pages                                         │
│   └─ const { t, i18n } = useTranslation()                   │
│   └─ <h1>{t('home.title')}</h1>                             │
│   └─ i18n.changeLanguage('en')  // from Settings page       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Catalogs (public/locales/)                                 │
│   ├─ zh-CN/translation.json    ← source of truth            │
│   └─ en/translation.json       ← AI-drafted, manually edited│
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Type safety (i18next-typescript)                           │
│   └─ Reads public/locales/zh-CN/translation.json             │
│   └─ Generates src/i18n/types.d.ts                          │
│   └─ t() accepts only known keys                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase error map (src/i18n/errors.ts)                    │
│   └─ Maps Supabase error message → i18n key                 │
│   └─ translateSupabaseError(t, rawError) → localized string │
└─────────────────────────────────────────────────────────────┘
```

**Important note:** Catalogs live in `public/locales/` and are bundled into the Tauri binary. There's no network fetch at runtime — all locales ship in the app. This is the right pattern for a desktop app.

## File structure

```
artchrono/
├── public/
│   └── locales/
│       ├── zh-CN/
│       │   └── translation.json          ← source of truth
│       └── en/
│           └── translation.json          ← AI-drafted, manually edited
├── src/
│   ├── i18n/
│   │   ├── config.ts                     ← i18next init
│   │   ├── types.d.ts                    ← generated by i18next-typescript
│   │   ├── errors.ts                     ← Supabase error → i18n key map
│   │   └── high-touch-keys.md            ← list of keys to manually review
│   ├── pages/
│   │   ├── SettingsPage.tsx              ← NEW
│   │   ├── LoginPage.tsx                 ← refactored to t()
│   │   ├── HomePage.tsx                  ← refactored
│   │   ├── StatsPage.tsx                 ← refactored
│   │   ├── StudentsPage.tsx              ← refactored
│   │   ├── StudentDetailPage.tsx         ← refactored
│   │   ├── CoursesPage.tsx               ← refactored
│   │   ├── PaymentsPage.tsx              ← refactored
│   │   ├── ExportPage.tsx                ← refactored
│   │   └── OnboardingPage.tsx            ← refactored
│   ├── components/
│   │   ├── Logo.tsx                      ← untouched (visual asset)
│   │   ├── ConfirmModal.tsx              ← refactored
│   │   └── ui/                           ← untouched (shadcn primitives)
│   ├── lib/
│   │   ├── queries.ts                    ← refactored for error map
│   │   ├── mutations.ts                  ← refactored for error map
│   │   └── utils.ts                      ← untouched (no UI strings)
│   └── App.tsx                           ← add Settings page route
├── package.json                          ← add: i18next, react-i18next, i18next-browser-languagedetector, i18next-typescript
└── tsconfig.json                         ← include src/i18n/types.d.ts
```

## Key naming convention

- `common.*` — shared buttons/labels used in 2+ places
- `<page>.*` — page-specific labels
- `<page>.errors.*` — error states specific to a page
- `errors` at the top level of a page = auth/Supabase errors

Example shape:

```json
{
  "common": { "save": "保存", "cancel": "取消" },
  "login": {
    "title": "登录",
    "errors": {
      "invalidCredentials": "邮箱或密码错误",
      "userExists": "该邮箱已注册",
      "weakPassword": "密码至少 6 位"
    }
  },
  "sidebar": { "stats": "数据看板", "settings": "设置" }
}
```

## Component pattern

```tsx
// Before
<h1>登录</h1>

// After
const { t } = useTranslation();
<h1>{t('login.title')}</h1>
```

## Supabase error translation (fixes ISSUE-001, ISSUE-002)

```ts
// src/lib/i18n-errors.ts
const errorMap: Record<string, string> = {
  "Invalid login credentials": "login.errors.invalidCredentials",
  "User already registered": "login.errors.userExists",
  "Password should be at least 6 characters": "login.errors.weakPassword",
  "Email not confirmed": "login.errors.emailNotConfirmed",
  // ... cover the common ones
};

export function translateSupabaseError(t: TFunction, rawError: string | null | undefined): string | null {
  if (!rawError) return null;
  const key = errorMap[rawError] ?? "login.errors.unknown";
  return t(key);
}
```

**Where the translation happens:** The auth provider in `src/pages/Login.tsx` returns the raw English error string from Supabase. `LoginPage.tsx` (which has access to `t()`) calls `translateSupabaseError(t, error)` before display. The auth provider stays pure — no React/i18n coupling.

## Locale detection + switcher

```ts
// src/i18n/config.ts
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { "zh-CN": { translation: zhCN }, "en": { translation: en } },
    fallbackLng: "zh-CN",
    detection: {
      order: ["navigator"],
      caches: false
    },
    interpolation: { escapeValue: false }
  });
```

Tauri's `WebviewWindow` exposes `navigator.language` (the system locale on macOS). The switcher calls `i18n.changeLanguage('en')`; no reload, no localStorage, no Supabase write. Next app open re-detects from OS.

## Date/number formatting

```tsx
const { i18n } = useTranslation();
const locale = i18n.language;

new Intl.NumberFormat(locale, { style: "currency", currency: "CNY" })
  .format(payment.amount_cents / 100);

new Intl.DateTimeFormat(locale, { dateStyle: "long" })
  .format(new Date(payment.created_at));
```

Currency stays CNY regardless of UI language — this is a Chinese teacher's app, the data is in CNY. Only the format style changes with the i18n locale.

## Type safety

```bash
pnpm add -D i18next-typescript
```

```json
// package.json
"scripts": {
  "i18n:types": "i18next-typescript generate -p public/locales/zh-CN/translation.json -o src/i18n/types.d.ts"
}
```

Generated `src/i18n/types.d.ts` makes `t("login.titel")` a compile-time error. Workflow: edit `zh-CN.json` → run `pnpm i18n:types` → edit `en.json` to match → use the new key in a component.

`tsc --noEmit` (already part of `pnpm lint`) catches any `t()` call whose key isn't in the catalog.

## Migration phases

**Phase 1: Infrastructure (no UI changes)**
1. Install deps: `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `i18next-typescript`
2. Create `src/i18n/config.ts`, init in `main.tsx`
3. Create `public/locales/zh-CN/translation.json` and `en/translation.json` (initially empty)
4. Run `pnpm i18n:types` — generate types
5. Create `SettingsPage.tsx` with language toggle
6. Add Settings icon to sidebar; add settings route in `App.tsx`

**Phase 2: Error map (fixes ISSUE-001, ISSUE-002)**
1. Create `src/lib/i18n-errors.ts` with the error map
2. Update `LoginPage.tsx` to wrap Supabase errors with `translateSupabaseError(t, error)`
3. Verify both reported bugs are fixed
4. Commit

**Phase 3: Refactor pages** (one at a time, dependency order)
1. Login form
2. Sidebar labels (manual translation)
3. HomePage
4. StatsPage
5. StudentsPage + StudentDetailPage
6. CoursesPage
7. PaymentsPage
8. ExportPage
9. OnboardingPage
10. ConfirmModal component

Per-page workflow:
1. Read the file, list every Chinese string
2. Add keys to `zh-CN.json` (preserving existing text)
3. Run `pnpm i18n:types`
4. Add English to `en.json` (AI first pass for non-high-touch, manual for high-touch)
5. Replace Chinese strings with `t("key")` calls
6. Verify in browser: switch language, confirm both render
7. Run `pnpm lint` (catches missing keys)
8. Commit

**Phase 4: Date/number formatting**
1. Find all `Intl.*` calls
2. Replace hardcoded locale argument with `i18n.language`
3. Verify: dates format differently in zh-CN vs en

**Phase 5: Tests**
1. Unit test for `translateSupabaseError`
2. Unit test: every key in `zh-CN.json` exists in `en.json`
3. E2E test: load page in zh-CN, switch to en, verify key UI strings

**Phase 6: Cleanup**
1. Remove any hardcoded Chinese that escaped the migration
2. Run full QA pass

## High-touch keys (manual translation)

Per Q9, these get hand-translated, not AI-drafted:

- `login.title`, `login.subtitle`
- `login.errors.*` (all 8)
- `settings.*` (all)
- `onboarding.*` (all)
- `sidebar.*` (small set, high visibility)

Tracked in `src/i18n/high-touch-keys.md` as the working list during the refactor.

## Test strategy

**Unit (Vitest):**
- `translateSupabaseError`: known errors map, unknown errors fall back to "unknown", null/undefined input returns null
- Catalog completeness: every key in `zh-CN.json` exists in `en.json`

**E2E (Playwright):**
- Language switcher works on the Login page
- Supabase error displays in current locale

**Not testing:**
- Visual regression (out of scope)
- Every page in both languages (manual smoke test)
- Translation quality (manual review of high-touch keys)

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| AI-drafted English has awkward phrasings | High-touch keys are manual; bulk is acceptable for low-visibility strings |
| i18next-typescript drifts from JSON | `pnpm i18n:types` runs after every JSON edit; `pnpm lint` catches missing keys |
| Tauri bundling doubles app size (en + zh-CN shipped) | Both locales are small (~20KB each); negligible in a 50MB+ binary |
| Supabase adds a new error string we don't have mapped | Fallback key `login.errors.unknown` catches it; user sees a generic message in their locale |
| Date formatting changes break existing snapshot tests | No existing snapshot tests; manual visual verification in both locales |

## Open questions

None at this time. All 9 design decisions are locked.

## Next step

After spec approval, invoke `superpowers:writing-plans` to create the implementation plan.
