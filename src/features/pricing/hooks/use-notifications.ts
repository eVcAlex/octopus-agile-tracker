import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  type NotificationPrefs,
} from '../../../lib/push';
import { getStoredJSON, setStoredJSON } from '../../../lib/storage';
import { errorMessage } from '../../../lib/errors';
import type { Region } from '../schemas';

const PREFS_KEY = 'agile-tracker-notif-prefs';

interface StoredNotifState {
  enabled: boolean;
  ratesPublished: boolean;
  plunge: boolean;
  cheapWindow: boolean;
  cheapWindowHours: 1 | 2 | 3 | 4;
}

const DEFAULTS: StoredNotifState = {
  enabled: false,
  ratesPublished: true,
  plunge: true,
  cheapWindow: false,
  cheapWindowHours: 2,
};

function loadState(): StoredNotifState {
  return {
    ...DEFAULTS,
    ...getStoredJSON<Partial<StoredNotifState>>(PREFS_KEY, {}),
  };
}

function saveState(state: StoredNotifState) {
  setStoredJSON(PREFS_KEY, state);
}

export function useNotifications(region: Region) {
  const [state, setState] = useState<StoredNotifState>(loadState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = isPushSupported();
  const regionRef = useRef(region);

  const toPrefs = useCallback(
    (s: StoredNotifState): NotificationPrefs => ({
      region,
      ratesPublished: s.ratesPublished,
      plunge: s.plunge,
      cheapWindow: s.cheapWindow,
      cheapWindowHours: s.cheapWindowHours,
    }),
    [region]
  );

  const apply = useCallback(
    async (next: StoredNotifState) => {
      setBusy(true);
      setError(null);
      try {
        if (next.enabled) {
          await subscribeToPush({
            region,
            ratesPublished: next.ratesPublished,
            plunge: next.plunge,
            cheapWindow: next.cheapWindow,
            cheapWindowHours: next.cheapWindowHours,
          });
        } else {
          await unsubscribeFromPush();
        }
        setState(next);
        saveState(next);
      } catch (err) {
        setError(errorMessage(err) ?? 'Something went wrong');
      } finally {
        setBusy(false);
      }
    },
    [region]
  );

  // Keep the server-side region in sync when the user switches region
  useEffect(() => {
    if (regionRef.current === region) return;
    regionRef.current = region;
    if (state.enabled) {
      subscribeToPush(toPrefs(state)).catch(() => {
        /* next explicit change will retry */
      });
    }
  }, [region, state, toPrefs]);

  return {
    supported,
    enabled: state.enabled,
    prefs: state,
    busy,
    error,
    setEnabled: (enabled: boolean) => apply({ ...state, enabled }),
    updatePref: <K extends keyof StoredNotifState>(
      key: K,
      value: StoredNotifState[K]
    ) => apply({ ...state, [key]: value }),
  };
}
