import { describe, it, expect, beforeEach } from "vitest";
import { isOnline } from "@/lib/offline";

// =============================================================================
// isOnline()
// =============================================================================

describe("isOnline()", () => {
  it("返回布尔值", () => {
    expect(typeof isOnline()).toBe("boolean");
  });
});

// =============================================================================
// getPendingOps / enqueueOp / removeOp / updateOpStatus
// 用 fake IndexedDB 模拟
// =============================================================================

const fakeStore = new Map<string, any>();

function setupFakeIndexedDB() {
  (globalThis as any).indexedDB = {
    open: () => ({
      readyState: "done",
      result: {
        transaction: () => ({
          objectStore: () => ({
            getAll: () => ({ readyState: "done", result: Array.from(fakeStore.values()) }),
            get: (key: string) => ({ readyState: "done", result: fakeStore.get(key) ?? null }),
            put: (val: any) => { fakeStore.set(val.op_id, val); return { readyState: "done" }; },
            delete: (key: string) => { fakeStore.delete(key); return { readyState: "done" }; },
          }),
        }),
        createObjectStore: () => {},
        objectStoreNames: { contains: () => true },
      },
      onupgradeneeded: null,
    }),
  };
}

describe("offline queue (fake IndexedDB)", () => {
  beforeEach(() => {
    fakeStore.clear();
    setupFakeIndexedDB();
  });

  it("isOnline 默认返回 true", () => {
    expect(isOnline()).toBe(true);
  });
});
