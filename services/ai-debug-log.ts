import type { AiDebugLogEntry, AiDebugLogLevel, AiDebugLogSource } from "@/services/types";

type AiDebugLogInput = {
  level?: AiDebugLogLevel;
  source?: AiDebugLogSource;
  event: string;
  traceId?: string;
  modelId?: string;
  message?: string;
  metadata?: AiDebugLogEntry["metadata"];
};

type Listener = (entries: AiDebugLogEntry[]) => void;

const MAX_ENTRIES = 300;
const listeners = new Set<Listener>();
let entries: AiDebugLogEntry[] = [];

function emit() {
  const snapshot = entries;
  listeners.forEach((listener) => listener(snapshot));
}

function normalizeMetadata(metadata: AiDebugLogEntry["metadata"]) {
  if (!metadata) {
    return undefined;
  }
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

export function createAiTraceId() {
  return `pulse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const aiDebugLog = {
  add(input: AiDebugLogInput) {
    const entry: AiDebugLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      level: input.level ?? "info",
      source: input.source ?? "pulse",
      event: input.event,
      traceId: input.traceId,
      modelId: input.modelId,
      message: input.message,
      metadata: normalizeMetadata(input.metadata)
    };
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    emit();

    const consolePayload = {
      traceId: entry.traceId,
      source: entry.source,
      event: entry.event,
      modelId: entry.modelId,
      message: entry.message,
      ...entry.metadata
    };
    const log = entry.level === "error" ? console.error : entry.level === "warn" ? console.warn : console.log;
    log("[pulse-ai]", consolePayload);
    return entry;
  },
  clear() {
    entries = [];
    emit();
  },
  getEntries() {
    return entries;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(entries);
    return () => {
      listeners.delete(listener);
    };
  }
};

export function formatAiDebugLogEntries(items: AiDebugLogEntry[]) {
  return JSON.stringify(items, null, 2);
}
