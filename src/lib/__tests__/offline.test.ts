// Offline queue unit tests

import { describe, it, expect, beforeEach } from "vitest";
import { enqueueOp, getPendingOps, removeOp, updateOpStatus } from "@/lib/offline";

// IndexedDB 在 jsdom 中以 fake-indexeddb 模拟
// V1 简化：占位测试，V1.1 加 fake-indexeddb 后跑真实的 IndexedDB 测试

describe("offline queue", () => {
  it("enqueueOp creates a pending operation", async () => {
    const opId = "test-op-1";
    await enqueueOp({ op_id: opId, op_type: "attendance", payload: { scheduled_class_id: "x" }, created_at: Date.now() });
    const ops = await getPendingOps();
    const found = ops.find(o => o.op_id === opId);
    expect(found).toBeTruthy();
    expect(found?.op_type).toBe("attendance");
    expect(found?.status).toBe("pending");
    await removeOp(opId);
  });

  it("updateOpStatus changes status", async () => {
    const opId = "test-op-2";
    await enqueueOp({ op_id: opId, op_type: "payment", payload: {}, created_at: Date.now() });
    await updateOpStatus(opId, "in_flight");
    const ops = await getPendingOps();
    expect(ops.find(o => o.op_id === opId)?.status).toBe("in_flight");
    await removeOp(opId);
  });

  it("removeOp deletes the operation", async () => {
    const opId = "test-op-3";
    await enqueueOp({ op_id: opId, op_type: "attendance", payload: {}, created_at: Date.now() });
    await removeOp(opId);
    const ops = await getPendingOps();
    expect(ops.find(o => o.op_id === opId)).toBeUndefined();
  });
});