// 离线读写：IndexedDB 写队列 + 在线检测 + 自动 replay

const DB_NAME = "course-manager-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_ops";

type QueuedOp = {
  op_id: string;
  op_type: "attendance" | "payment";
  payload: Record<string, unknown>;
  created_at: number;
  status: "pending" | "in_flight" | "failed";
  retry_count: number;
  last_error: string | null;
};

// IndexedDB 连接（单例）
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "op_id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// 读取所有 pending ops
export async function getPendingOps(): Promise<QueuedOp[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => resolve([]);
  });
}

// 入队
export async function enqueueOp(op: Omit<QueuedOp, "status" | "retry_count" | "last_error">): Promise<void> {
  const db = await getDB();
  const record: QueuedOp = { ...op, status: "pending", retry_count: 0, last_error: null };
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
  });
}

// 更新状态
export async function updateOpStatus(op_id: string, status: QueuedOp["status"], last_error?: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(op_id);
    req.onsuccess = () => {
      const op = req.result;
      if (op) {
        op.status = status;
        if (last_error) op.last_error = last_error;
        if (status === "failed") op.retry_count = (op.retry_count ?? 0) + 1;
        store.put(op);
      }
      tx.oncomplete = () => resolve();
    };
  });
}

// 删除成功的 op
export async function removeOp(op_id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(op_id);
    tx.oncomplete = () => resolve();
  });
}

// 在线检测：navigator.onLine + 定时 ping
export function isOnline(): boolean {
  return navigator.onLine ?? true;
}