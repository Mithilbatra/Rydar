import Storage from 'expo-sqlite/kv-store';
import { createContext, use, useState, type ReactNode } from 'react';

import type { Settings } from '@/types';

const KEY = 'settings';
const DEFAULTS: Settings = { units: 'metric', defaultPublic: false, lastActivity: 'bicycle' };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(Storage.getItemSync(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext<{ settings: Settings; update: (patch: Partial<Settings>) => void } | null>(
  null,
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load);
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    Storage.setItemSync(KEY, JSON.stringify(next));
  };
  return <SettingsContext value={{ settings, update }}>{children}</SettingsContext>;
}

export function useSettings() {
  const ctx = use(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
