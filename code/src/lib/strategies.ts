import type { Rule } from "./engine";

export interface SavedStrategy { id: string; name: string; query: string; rules: Rule[]; savedAt: string }
const KEY = "stocklens.strategies.v1";

export function loadStrategies(): SavedStrategy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((s) => s && typeof s.name === "string" && Array.isArray(s.rules)) : [];
  } catch { return []; }
}
export function saveStrategies(list: SavedStrategy[]) { localStorage.setItem(KEY, JSON.stringify(list)); }