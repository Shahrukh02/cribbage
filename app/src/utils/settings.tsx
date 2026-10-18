import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Difficulty } from '../game/types';

export type AiSpeed = 'fast' | 'normal' | 'slow';

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** Show a plain-English reason after every scoring event. */
  explanations: boolean;
  /** Show contextual coaching in the message strip. */
  hints: boolean;
  difficulty: Difficulty;
  aiSpeed: AiSpeed;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  explanations: true,
  hints: true,
  difficulty: 'medium',
  aiSpeed: 'normal',
};

/** AI "thinking" delay in milliseconds. */
export const AI_DELAY: Record<AiSpeed, number> = {
  fast: 450,
  normal: 900,
  slow: 1500,
};

const KEY = 'cribbage.settings.v1';

interface Ctx {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  update: () => {},
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (raw && alive) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, loaded, update }), [settings, loaded, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
