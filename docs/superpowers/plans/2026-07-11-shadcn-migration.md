# Migrate to shadcn UI Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hand-rolled Tailwind UI primitives with shadcn/ui components, satisfying `docs/design.md:109` (locked tech stack requirement).

**Architecture:** Install shadcn CLI as devDependency, configure with `components.json` (Vite/React 19/Tailwind 4/CSS variables preset), generate the minimum component set needed by the existing 9 pages, then refactor each page to import from `@/components/ui/*` while preserving all existing business logic, RPC calls, and offline behavior. No data-layer changes.

**Tech Stack:** shadcn 4.13 CLI (devDep), `@radix-ui/react-*` primitives, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` (already installed), Tailwind CSS 4.3 (CSS variables via `@theme inline`).

## Global Constraints

- Project uses Tauri 2.x + Vite 8 + React 19 + TypeScript 7 (per `design.md`).
- Path alias `@/*` → `./src/*` (per `tsconfig.json:23` and `vite.config.ts:11`).
- Tailwind v4 is CSS-first: do NOT create `tailwind.config.js`. Theme tokens go in `src/index.css` under `@theme` / `@theme inline`.
- shadcn for Tailwind v4 + React 19: install via `npx shadcn@latest init` then `npx shadcn@latest add <component>`. Do NOT use older `shadcn-ui` package.
- Do NOT modify `src/lib/*` (queries, mutations, supabase client, offline queue). Pure UI refactor.
- Preserve all Chinese copy verbatim. Preserve all business logic (RPC names, error handling, offline enqueue, optimistic updates).
- Every page must compile under `tsc --noEmit` and look visually equivalent (functionally identical) to the hand-rolled version after migration.
- Commit after each task. Branch off `main` first.

---

## File Structure

**New files:**
- `components.json` — shadcn config (paths, style, CSS vars)
- `src/lib/utils.ts` — `cn()` helper (`clsx` + `tailwind-merge`)
- `src/components/ui/button.tsx` — Button
- `src/components/ui/input.tsx` — Input
- `src/components/ui/label.tsx` — Label
- `src/components/ui/card.tsx` — Card (CardHeader, CardTitle, CardContent, CardFooter)
- `src/components/ui/select.tsx` — Select
- `src/components/ui/badge.tsx` — Badge
- `src/components/ui/alert.tsx` — Alert (AlertTitle, AlertDescription)
- `src/components/ui/separator.tsx` — Separator
- `src/components/ui/dialog.tsx` — Dialog (for confirmations)

**Modified files (UI-only refactor, no logic change):**
- `src/index.css` — add shadcn CSS variables under `@theme inline`
- `src/App.tsx` — replace sidebar buttons with shadcn Button
- `src/pages/LoginPage.tsx` — form → shadcn Input/Label/Button/Alert
- `src/pages/HomePage.tsx` — banner → Alert, action buttons → Button, card → Card
- `src/pages/StudentsPage.tsx` — search input, cards, action buttons
- `src/pages/StudentDetailPage.tsx` — tabs (custom), cards, dialogs (Dialog), forms (Input/Label/Select)
- `src/pages/CoursesPage.tsx` — accordion-like expand (keep custom), forms
- `src/pages/PaymentsPage.tsx` — selector cards, payment form
- `src/pages/ExportPage.tsx` — single card + button
- `src/pages/OnboardingPage.tsx` — step boxes, inputs, buttons
- `package.json` — add deps
- `docs/design.md` — Revision History entry (Revision 19) documenting migration

**Untouched:**
- `src/lib/*` (queries, mutations, supabase, offline, session)
- `src-tauri/*`
- `supabase/*`
- `vite.config.ts`, `tsconfig.json` (already correct)
- Test files

---

## Task 1: Install shadcn dependencies and configure

**Files:**
- Modify: `package.json` (add devDeps)
- Create: `components.json`
- Modify: `src/index.css` (add CSS vars for shadcn)
- Create: `src/lib/utils.ts` (create, shadcn's `cn()` helper)
- Test: `tsc --noEmit` passes

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` from `@/lib/utils`
- Produces: `components.json` with `aliases.@/components`, `aliases.@/lib/utils`

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feat/shadcn-migration
```

- [ ] **Step 2: Install shadcn runtime dependencies**

```bash
pnpm add class-variance-authority clsx tailwind-merge lucide-react
```

(`lucide-react` already installed; pnpm will no-op or upgrade.)

- [ ] **Step 3: Install shadcn CLI as devDependency**

```bash
pnpm add -D shadcn
```

Expected: `package.json` adds `"shadcn": "^4.x"` under devDependencies.

- [ ] **Step 4: Create `components.json` manually** (avoids interactive init)

Write `components.json` at project root:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 5: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Add shadcn CSS variables to `src/index.css`**

Append to `src/index.css` (keep existing `@import "tailwindcss"` and `@theme` block):

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.55 0.18 250);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-success: oklch(0.65 0.18 145);
  --color-warning: oklch(0.75 0.18 75);
  --color-danger: oklch(0.60 0.22 25);

  --font-sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

html, body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 7: Verify TypeScript still compiles**

```bash
pnpm tsc --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml components.json src/lib/utils.ts src/index.css
git commit -m "chore(deps): install shadcn CLI + add components.json and CSS vars"
```

---

## Task 2: Generate core UI components (Button, Input, Label, Card, Select)

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/select.tsx`
- Test: visual smoke check that they render

**Interfaces:**
- `Button({ variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"; size?: "default" | "sm" | "lg" | "icon"; ...ButtonHTMLAttributes })`
- `Input({ ...InputHTMLAttributes })`
- `Label({ ...LabelHTMLAttributes })`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`

- [ ] **Step 1: Add components via CLI**

```bash
pnpm dlx shadcn@latest add button input label card select
```

Expected: creates files under `src/components/ui/`. Confirm files exist:
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/select.tsx`

If CLI fails (interactive prompt / network), fall back to manually pasting canonical shadcn source for each component from https://ui.shadcn.com/docs/components/<name>.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Smoke test by importing in App.tsx (temporary, removed next task)**

Skip — covered in Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): add shadcn Button, Input, Label, Card, Select"
```

---

## Task 3: Generate supporting UI components (Badge, Alert, Separator, Dialog)

**Files:**
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/alert.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/dialog.tsx`

**Interfaces:**
- `Badge({ variant?: "default" | "secondary" | "destructive" | "outline" })`
- `Alert`, `AlertTitle`, `AlertDescription`, `Alert variant?: "default" | "destructive"`
- `Separator({ orientation?: "horizontal" | "vertical" })`
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`

- [ ] **Step 1: Add components via CLI**

```bash
pnpm dlx shadcn@latest add badge alert separator dialog
```

Expected: 4 new files in `src/components/ui/`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): add shadcn Badge, Alert, Separator, Dialog"
```

---

## Task 4: Migrate App.tsx (sidebar + layout)

**Files:**
- Modify: `src/App.tsx`

**Replacements:**
- `<button className="...">` sidebar items → `<Button variant="ghost" className="justify-start w-full">`
- Loading spinner stays as plain div
- Layout/structure unchanged

- [ ] **Step 1: Replace sidebar NavItem button with shadcn Button**

In `src/App.tsx`, replace the `NavItem` function (lines 59–71) and its 3 usages. Use:

```tsx
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`w-full justify-start gap-3 rounded-none px-4 py-2.5 text-sm font-normal ${
        active ? "bg-gray-700 text-white hover:bg-gray-700" : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Button>
  );
}
```

Add import at top: `import { Button } from "@/components/ui/button";`

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refactor(ui): migrate App sidebar to shadcn Button"
```

---

## Task 5: Migrate LoginPage.tsx

**Files:**
- Modify: `src/pages/LoginPage.tsx`

**Replacements:**
- `<input className="px-3 py-2 border ...">` → `<Input />`
- `<label className="block ...">` → `<Label />`
- `<div className="bg-red-50 ...">` error → `<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>`
- `<button className="bg-blue-600 ...">` submit → `<Button type="submit" className="w-full" disabled={loading}>`
- Mode toggle `<button>` → `<Button variant="link">`
- Card wrapper `<div className="bg-white rounded-lg shadow p-8">` → `<Card><CardContent className="p-8">`

- [ ] **Step 1: Refactor file**

Replace imports + JSX. Final imports:
```tsx
import { useState, FormEvent } from "react";
import { useAuth } from "@/pages/Login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
```

JSX rules:
- Wrap form contents in `<Card><CardContent className="p-8">`
- Each form field: `<div className="space-y-1"><Label htmlFor="email">邮箱</Label><Input id="email" type="email" ... /></div>`
- Error: `<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>`
- Submit: `<Button type="submit" disabled={loading} className="w-full">{loading ? "处理中..." : mode === "signin" ? "登录" : "注册"}</Button>`
- Toggle: `<Button type="button" variant="link" onClick={...}>`

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "refactor(ui): migrate LoginPage to shadcn"
```

---

## Task 6: Migrate HomePage.tsx

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Replacements:**
- Offline/queue banner → `<Alert variant={!online ? "destructive" : "default"}>` with `<WifiOff>` icon
- Today header `<h2>` stays as plain heading
- Empty state `<div className="bg-white rounded-lg shadow p-8 text-center">` → `<Card><CardContent className="p-8 text-center">`
- Class cards → `<Card><CardContent className="p-4 flex items-center justify-between">`
- Attendance buttons:
  - "出席" → `<Button size="sm" className="bg-green-600 hover:bg-green-700">` (preserve exact green)
  - "缺勤" → `<Button size="sm" variant="outline" className="border-yellow-500 text-yellow-700">`
  - "取消" → `<Button size="sm" variant="ghost">`

Note: shadcn Button supports custom classes via `className`; we keep the existing color scheme to match design intent.

- [ ] **Step 1: Refactor file**

Replace imports + JSX. Add imports:
```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
```

Banner JSX:
```tsx
{(!online || offlineQueueCount > 0) && (
  <Alert variant={!online ? "destructive" : "default"} className="mb-4">
    <div className="flex items-center gap-2 text-sm">
      {!online && <><WifiOff className="w-4 h-4" /> 离线模式</>}
      {offlineQueueCount > 0 && <> · {offlineQueueCount} 个操作待同步</>}
      {online && offlineQueueCount > 0 && (
        <Button variant="link" size="sm" onClick={replayQueue} className="ml-auto underline">立即同步</Button>
      )}
    </div>
  </Alert>
)}
```

Empty state, class cards, attendance buttons: use shadcn Card/Button per spec above. Preserve all `handleMark` business logic verbatim.

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "refactor(ui): migrate HomePage to shadcn"
```

---

## Task 7: Migrate StudentsPage.tsx

**Files:**
- Modify: `src/pages/StudentsPage.tsx`

**Replacements:**
- Search input → `<Input placeholder="搜索学生或家长..." />` with Search icon inside (use `<div className="relative">` wrapper)
- "新建学生" button → `<Button>` with `<Plus>` icon
- Trash button → `<Button variant="ghost" size="icon">` with `<Trash2>`
- Student cards → `<Card><CardContent className="p-4 hover:bg-gray-50 cursor-pointer">`
- Add-student form (when expanded) → use Input/Label/Button
- Loader spinner stays as plain div

- [ ] **Step 1: Refactor file**

Add imports:
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
```

Search wrapper:
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
  <Input placeholder="搜索..." value={search} onChange={...} className="pl-9" />
</div>
```

Form fields use `<div className="space-y-1"><Label>...</Label><Input /></div>`.

Cards wrap each student entry. Preserve `onSelectStudent` callback and search filter logic unchanged.

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/StudentsPage.tsx
git commit -m "refactor(ui): migrate StudentsPage to shadcn"
```

---

## Task 8: Migrate StudentDetailPage.tsx (most complex)

**Files:**
- Modify: `src/pages/StudentDetailPage.tsx`

**Replacements:**
- Top status pill `<span className="px-2 py-1 rounded text-xs">` → `<Badge variant={...}>` (green=在读, yellow=暂停, secondary=已毕业)
- Back arrow button → `<Button variant="ghost" size="icon">`
- Tab buttons: keep custom (shadcn Tabs would force URL state changes); style them with shadcn Button `variant="ghost"` and underline styling
- InfoTab `<div className="bg-white rounded-lg shadow p-6">` → `<Card><CardContent className="p-6">`
- EnrollmentsTab headers/buttons → `<Button>` with `<Plus>` icon
- `EnrollmentCard` wrapper → `<Card><CardContent className="p-4">`
- Action buttons (付款/排课/结束/升级) → `<Button variant="link" size="sm">`
- `PaymentForm` → form fields use Input/Label, select uses shadcn Select
- `AddEnrollmentForm` → same treatment
- End confirmation `<div className="bg-orange-50 ...">` → `<Alert>` (custom variant or use default with className `border-orange-200 bg-orange-50`)
- Slot form `<div className="bg-gray-50 rounded p-3">` → `<Card><CardContent className="p-3">`
- Slot list `<div className="flex items-center justify-between text-sm py-1 border-t">` → keep, but wrap with `<Separator />` between rows

This is the largest file. **Strategy:** refactor piece-by-piece (InfoTab first, then EnrollmentsTab, then nested components) to keep each commit small.

- [ ] **Step 1: Refactor imports + page header + tabs**

Replace `<span>` status badge with `<Badge>`. Replace back button. Wrap InfoTab with Card/CardContent. Use Button for tab styling.

- [ ] **Step 2: Refactor EnrollmentsTab header buttons + EnrollmentCard wrapper**

Wrap with Card/CardContent. Convert action buttons to shadcn Button (variants: default for "新建报名", ghost for actions).

- [ ] **Step 3: Refactor PaymentForm**

Convert labels to `<Label>`, inputs to `<Input>`, select to shadcn `<Select>` (wechat/alipay/cash/bank), submit/cancel to `<Button>`.

- [ ] **Step 4: Refactor AddEnrollmentForm**

Same as PaymentForm. Course select, level select, classes paid input, amount input.

- [ ] **Step 5: Refactor slot form + end confirmation**

Slot form: Card + Input/Label/Select. End confirmation: `<Alert>` with destructive-ish orange styling via className.

- [ ] **Step 6: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: exit 0. Fix any type errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/StudentDetailPage.tsx
git commit -m "refactor(ui): migrate StudentDetailPage to shadcn"
```

---

## Task 9: Migrate CoursesPage.tsx

**Files:**
- Modify: `src/pages/CoursesPage.tsx`

**Replacements:**
- Add course form wrapper → `<Card><CardContent className="p-6">`
- Form fields → Input + Label
- Course list wrapper → `<Card>`
- Delete trash button → `<Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">`
- Expand chevron header → `<Button variant="ghost" className="flex-1 justify-between">`
- Duration editor inline input → `<Input type="number" className="w-16">`
- Level list rows keep custom but wrap with `<Separator />`
- Level form → Card + Input/Label + Button
- "添加课程" / "添加等级" buttons → `<Button>` with `<Plus>`

- [ ] **Step 1: Refactor file**

Add imports:
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
```

Preserve all `handleAddCourse`, `handleAddLevel`, `handleUpdateDuration` business logic. Replace `confirm()` calls with `window.confirm` if removed (actually keep as-is — `confirm` is browser global, not shadcn component).

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CoursesPage.tsx
git commit -m "refactor(ui): migrate CoursesPage to shadcn"
```

---

## Task 10: Migrate PaymentsPage.tsx

**Files:**
- Modify: `src/pages/PaymentsPage.tsx`

**Replacements:**
- Student selector cards → `<Card>` with hover style + click handler
- Enrollment selector cards → `<Card>`
- Payment form wrapper → `<Card><CardContent className="p-6">`
- Form fields → Input + Label
- Payment method select → shadcn Select
- Error → `<Alert variant="destructive">`
- Success → `<Alert className="border-green-200 bg-green-50 text-green-800">` or just `<Alert>` with success classes
- "确认收款" / "重选" / "← 选其他学生" → `<Button>` variants

- [ ] **Step 1: Refactor file**

Add imports:
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
```

For `<Select>` with shadcn: the `value` prop and `onValueChange` differ from native `<select>`. Use:

```tsx
<Select value={paymentMethod} onValueChange={setPaymentMethod}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="wechat">微信</SelectItem>
    <SelectItem value="alipay">支付宝</SelectItem>
    <SelectItem value="cash">现金</SelectItem>
    <SelectItem value="bank">银行转账</SelectItem>
  </SelectContent>
</Select>
```

Preserve all `handleSubmit`, `handleEnrollmentChange` logic. Preserve auto-fill of `amountYuan`.

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PaymentsPage.tsx
git commit -m "refactor(ui): migrate PaymentsPage to shadcn"
```

---

## Task 11: Migrate ExportPage.tsx

**Files:**
- Modify: `src/pages/ExportPage.tsx`

**Replacements:**
- Card wrapper → `<Card><CardContent className="p-6">`
- Download button → `<Button>` with `<Download>` icon

- [ ] **Step 1: Refactor file**

Add imports:
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
```

Replace the wrapper div and the button. Preserve `handleExport` logic verbatim (CSV generation unchanged).

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ExportPage.tsx
git commit -m "refactor(ui): migrate ExportPage to shadcn"
```

---

## Task 12: Migrate OnboardingPage.tsx

**Files:**
- Modify: `src/pages/OnboardingPage.tsx`

**Replacements:**
- StepBox `<div className="bg-white rounded-lg shadow p-6">` → `<Card><CardContent className="p-6">`
- Inputs (course name, level number, level name, price, student name, phone, classes paid, amount) → `<Input>` with `<Label>` where space allows
- Selects (weekday) → shadcn Select
- "下一步" / "完成" / "开始使用" buttons → `<Button>` with `<ArrowRight>` / `<Check>` icon
- Done state `<div className="bg-green-50 rounded-lg p-8 text-center">` → `<Card className="border-green-200 bg-green-50"><CardContent className="p-8 text-center">`

- [ ] **Step 1: Refactor file**

Add imports:
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

Replace StepBox wrapper. Replace `<input>`/`<select>` elements. Preserve all `mutateAsync` callbacks verbatim.

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/OnboardingPage.tsx
git commit -m "refactor(ui): migrate OnboardingPage to shadcn"
```

---

## Task 13: Run full build and visual smoke check

**Files:** none (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 2: Run production build**

```bash
pnpm build
```

Expected: build succeeds, no warnings about missing modules.

- [ ] **Step 3: Run existing tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Visual smoke test**

Launch dev server:
```bash
pnpm dev
```

Manual checks (5 min):
- Sidebar items render correctly, active state visible
- Login page form looks right
- HomePage shows alert banner when offline, attendance buttons styled
- StudentsPage search input has icon, cards clickable
- StudentDetailPage tabs work, status badge colored, action buttons present
- CoursesPage expand/collapse works, level form appears
- PaymentsPage wizard steps progress
- ExportPage downloads CSV
- OnboardingPage advances through 4 steps

If anything looks broken visually, fix and re-verify before proceeding.

- [ ] **Step 5: Commit any visual fixes**

```bash
git add -A
git commit -m "fix(ui): visual adjustments from smoke test"
```

---

## Task 14: Update design.md Revision History

**Files:**
- Modify: `docs/design.md`

- [ ] **Step 1: Append Revision 19 entry**

In `docs/design.md`, find the "### Revision 18 — Plan-eng-review 5 个决策全部 Yes（应用工程评审）" block (around line 1450) and add immediately after it:

```markdown
### Revision 19 — 落地 shadcn UI 库

将 `tech-stack` 表里的 shadcn ^4.13 (CLI) 实际接入。所有页面的手写 `<button>` / `<input>` / `<select>` / `<label>` / `<div className="bg-white rounded-lg shadow">` 已迁移到 shadcn 组件（Button、Input、Label、Select、Card、Badge、Alert、Separator、Dialog）。`src/lib/*` 数据层未动；Tauri 配置未动；视觉保持等价。

新增依赖：`shadcn`（devDep CLI）+ `class-variance-authority` + `clsx` + `tailwind-merge`。`components.json` 已生成；`src/components/ui/*` 共 9 个组件文件。
```

- [ ] **Step 2: Commit**

```bash
git add docs/design.md
git commit -m "docs(design): Revision 19 — shadcn UI library landed"
```

---

## Task 15: Merge and cleanup

- [ ] **Step 1: Verify final state**

```bash
git log --oneline main..HEAD
```

Expected: ~13 commits covering the migration.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/shadcn-migration
```

- [ ] **Step 3: Open PR** (via `gh` CLI or web UI)

PR title: `feat(ui): migrate to shadcn UI library`

PR description: paste Revision 19 entry.

- [ ] **Step 4: Switch back to main after merge**

```bash
git checkout main
git pull
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ shadcn installed (Tasks 1–3)
- ✅ All 9 pages migrated (Tasks 4–12)
- ✅ TypeScript builds clean (every task ends with tsc check)
- ✅ Visual equivalence preserved (Task 13 smoke test)
- ✅ Documentation updated (Task 14)
- ✅ PR shipped (Task 15)

**Out of scope (intentionally):**
- Tabs component (custom tab styling preserved; shadcn Tabs would force URL state)
- Dialog-based replaces for `confirm()` / `alert()` (browser globals still used in CoursesPage; migration would require adding Dialog state and is not UI primitive substitution)
- Theme color overhaul (Tailwind 4 `@theme` already defines primary/success/warning/danger; shadcn vars added alongside)

**Type consistency check:**
- `cn` defined once in Task 1, used by all generated shadcn components
- Button `variant` values consistent across pages (default, ghost, link, destructive)
- Card subcomponents consistent (Card → CardContent pattern)