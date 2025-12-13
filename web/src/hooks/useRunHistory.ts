import { useState, useCallback } from 'react';
import { OptimizeMode } from '../types/api';

export type RunHistoryItem = {
  id: string;
  mode: OptimizeMode;
  status: "success" | "error";
  finishedAt: string;
  provider?: string;
  duration?: number;
};

const HISTORY_STORAGE_KEY = "qlik_codex_recent_runs_v1";

const loadHistory = (): RunHistoryItem[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
};

export const useRunHistory = () => {
  const [recentRuns, setRecentRuns] = useState<RunHistoryItem[]>(loadHistory);

  const pushHistory = useCallback((entry: RunHistoryItem) => {
    setRecentRuns(prev => {
      const next = [entry, ...prev].slice(0, 5);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return { recentRuns, pushHistory };
};
