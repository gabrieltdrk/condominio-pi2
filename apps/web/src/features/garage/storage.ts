import type { GarageState, OccupancyHistory } from "./types";

const STORAGE_KEY = "garage:state:v2";

export function readGarageState(): GarageState | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GarageState;
  } catch {
    return null;
  }
}

export function saveGarageState(state: GarageState) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function appendHistory(state: GarageState, history: Omit<OccupancyHistory, "id">) {
  const entry: OccupancyHistory = { id: `hist-${Date.now()}`, ...history };
  return { ...state, history: [entry, ...state.history].slice(0, 120) };
}
