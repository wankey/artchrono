// @vitest-environment jsdom

import React, { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/pages/Login", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    state: { status: "authenticated", user: { email: "teacher@example.com" } },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: vi.fn().mockResolvedValue({ data: [] }),
      }),
    }),
    rpc: vi.fn(),
  },
}));

vi.mock("@/i18n/useTypedTranslation", () => ({
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock("@/pages/LoginPage", () => ({ default: () => <div>login-page</div> }));
vi.mock("@/pages/HomePage", () => ({ default: () => <div>home-page</div> }));
vi.mock("@/pages/StatsPage", () => ({ default: () => <div>stats-page</div> }));
vi.mock("@/pages/StudentsPage", () => ({
  default: ({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) => (
    <button type="button" onClick={() => onSelectStudent?.("student 1")}>open-student</button>
  ),
}));
vi.mock("@/pages/StudentDetailPage", () => ({
  default: ({ studentId, onBack }: { studentId: string; onBack: () => void }) => (
    <div>
      <span>student-detail:{studentId}</span>
      <button type="button" onClick={onBack}>back-to-students</button>
    </div>
  ),
}));
vi.mock("@/pages/CoursesPage", () => ({ default: () => <div>courses-page</div> }));
vi.mock("@/pages/PaymentsPage", () => ({ default: () => <div>payments-page</div> }));
vi.mock("@/pages/ExportPage", () => ({ default: () => <div>export-page</div> }));
vi.mock("@/pages/SettingsPage", () => ({ default: () => <div>settings-page</div> }));
vi.mock("@/pages/OnboardingPage", () => ({ default: () => <div>onboarding-page</div> }));

// 提供一个已 resolved 的 Promise，确保 React.lazy 立即进入成功分支
const lazyResolved = (component: React.ComponentType<any>) => ({ default: component });
vi.mock("@/pages/LoginPage", () => lazyResolved(() => <div>login-page</div>));
vi.mock("@/pages/HomePage", () => lazyResolved(() => <div>home-page</div>));
vi.mock("@/pages/StatsPage", () => lazyResolved(() => <div>stats-page</div>));
vi.mock("@/pages/StudentsPage", () => lazyResolved(
  ({ onSelectStudent }: { onSelectStudent?: (id: string) => void }) => (
    <button type="button" onClick={() => onSelectStudent?.("student 1")}>open-student</button>
  ),
));
vi.mock("@/pages/StudentDetailPage", () => lazyResolved(
  ({ studentId, onBack }: { studentId: string; onBack: () => void }) => (
    <div>
      <span>student-detail:{studentId}</span>
      <button type="button" onClick={onBack}>back-to-students</button>
    </div>
  ),
));
vi.mock("@/pages/CoursesPage", () => lazyResolved(() => <div>courses-page</div>));
vi.mock("@/pages/PaymentsPage", () => lazyResolved(() => <div>payments-page</div>));
vi.mock("@/pages/ExportPage", () => lazyResolved(() => <div>export-page</div>));
vi.mock("@/pages/SettingsPage", () => lazyResolved(() => <div>settings-page</div>));
vi.mock("@/pages/OnboardingPage", () => lazyResolved(() => <div>onboarding-page</div>));

const mountedRoots: { root: Root; container: HTMLDivElement }[] = [];

async function renderApp(path: string) {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });

  await act(async () => {
    root.render(<App />);
  });

  return container;
}

afterEach(async () => {
  await act(async () => {
    for (const { root } of mountedRoots) root.unmount();
  });
  for (const { container } of mountedRoots) container.remove();
  mountedRoots.length = 0;
});

describe("App routing", () => {
  it("stores the selected student in the URL and supports back navigation", async () => {
    const container = await renderApp("/students");

    const openStudent = Array.from(container.querySelectorAll("button"))
      .find(button => button.textContent === "open-student");
    expect(openStudent).toBeDefined();

    await act(async () => openStudent?.click());

    expect(window.location.pathname).toBe("/students/student%201");
    expect(container.textContent).toContain("student-detail:student 1");

    const back = Array.from(container.querySelectorAll("button"))
      .find(button => button.textContent === "back-to-students");
    await act(async () => back?.click());

    expect(window.location.pathname).toBe("/students");
    expect(container.textContent).toContain("open-student");
  });

  it("navigates with sidebar links and redirects unknown routes", async () => {
    const container = await renderApp("/missing");

    expect(window.location.pathname).toBe("/");
    expect(container.textContent).toContain("home-page");

    const statsLink = Array.from(container.querySelectorAll("a"))
      .find(link => link.textContent?.includes("sidebar.stats"));
    expect(statsLink).toBeDefined();

    await act(async () => statsLink?.click());

    expect(window.location.pathname).toBe("/stats");
    expect(container.textContent).toContain("stats-page");
  });
});
