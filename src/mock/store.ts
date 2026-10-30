import type { StoreState } from "@/types";
import { createSeedStore, models as seedModels } from "@/mock/seed";

const STORAGE_KEY = "ai-nexus:v1";

let memory: StoreState | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStore(): StoreState {
  if (!hydrated || !canUseStorage()) {
    return memory ?? createSeedStore();
  }
  if (memory) return memory;
  return loadFromStorage();
}

const hydrationListeners = new Set<() => void>();

export function isHydrated(): boolean {
  return hydrated;
}

export function subscribeHydration(listener: () => void): () => void {
  hydrationListeners.add(listener);
  return () => hydrationListeners.delete(listener);
}

export function hydrateFromStorage(): void {
  if (hydrated || !canUseStorage()) return;
  loadFromStorage();
  hydrated = true;
  hydrationListeners.forEach((fn) => fn());
  listeners.forEach((fn) => fn());
}

export function setStore(next: StoreState): void {
  memory = next;
  persist();
  listeners.forEach((fn) => fn());
}

export function updateStore(mutator: (draft: StoreState) => void): StoreState {
  const current = structuredClone(getStore());
  mutator(current);
  setStore(current);
  return current;
}

export function resetStore(): StoreState {
  memory = createSeedStore();
  persist();
  listeners.forEach((fn) => fn());
  return memory;
}

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadFromStorage(): StoreState {
  if (canUseStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        memory = migrateStore(JSON.parse(raw) as StoreState);
        persist();
        return memory;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
  memory = createSeedStore();
  persist();
  return memory;
}

function persist(): void {
  if (!memory || !canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

function migrateStore(state: StoreState): StoreState {
  const catalog = new Map(seedModels.map((item) => [item.id, item]));
  return {
    ...state,
    models: state.models.map((model) => {
      const next = catalog.get(model.id);
      if (!next) return model;
      return {
        ...model,
        name: next.name,
        displayName: next.displayName,
        provider: next.provider,
        version: next.version,
        description: next.description,
        type: next.type,
        contextWindow: next.contextWindow,
      };
    }),
    alerts: state.alerts.map((alert) => ({
      ...alert,
      title: alert.title.replaceAll("DeepSeek-V3", "DeepSeek-V4-Pro"),
      message: alert.message.replaceAll("DeepSeek-V3", "DeepSeek-V4-Pro"),
    })),
    notifications: state.notifications.map((item) => ({
      ...item,
      title: item.title.replaceAll("DeepSeek-V3", "DeepSeek-V4-Pro").replaceAll("星河代码-7B", "星河代码-V4"),
    })),
    traces: state.traces.map((trace) => ({
      ...trace,
      spans: trace.spans.map((span) => ({
        ...span,
        name: span.name
          .replaceAll("DeepSeek-V3", "DeepSeek-V4-Pro")
          .replaceAll("xinghe-customer-v3", "xinghe-customer-v4")
          .replaceAll("xinghe-legal-review-v2", "xinghe-legal-review-v3"),
      })),
    })),
  };
}
