import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import "@/i18n/config";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 min
      gcTime: 1000 * 60 * 60 * 24,  // 24 hours
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",  // T10: 离线优先（有缓存就用缓存）
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

// T10 离线持久化：缓存查询结果到 IndexedDB
if (typeof window !== "undefined") {
  const asyncStoragePersister = createAsyncStoragePersister({
    storage: window.localStorage,
    key: "REACT_QUERY_OFFLINE_CACHE",
  });
  persistQueryClient({
    queryClient,
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24,  // 24h
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>
);