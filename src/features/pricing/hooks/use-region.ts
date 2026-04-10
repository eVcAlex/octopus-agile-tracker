import { useState, useCallback } from 'react';
import { regionSchema, type Region } from '../schemas';

const STORAGE_KEY = 'agile-tracker-region';

function loadRegion(): Region | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return regionSchema.parse(raw);
  } catch {
    return null;
  }
}

function saveRegion(region: Region) {
  try {
    localStorage.setItem(STORAGE_KEY, region);
  } catch {
    // Storage unavailable (private browsing, quota)
  }
}

export function useRegion() {
  const saved = loadRegion();
  const [region, setRegionState] = useState<Region>(saved ?? (null as unknown as Region));

  const setRegion = useCallback((next: Region) => {
    setRegionState(next);
    saveRegion(next);
  }, []);

  return { region, setRegion, isFirstTime: saved === null };
}
