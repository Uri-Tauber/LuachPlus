import { invoke, isTauri } from '@tauri-apps/api/core';
import { validateEvent, type UserEvent } from './events';
import { defaultSettings, validateSettings, type Settings } from './settings';
export interface AppData { version: 1; settings: Settings; events: UserEvent[] }
const key = 'luach-plus-v1';
export function validateData(input: unknown): AppData {
  const d = input as AppData;
  if (!d || d.version !== 1 || !Array.isArray(d.events) || d.events.length > 10000) throw new Error('Invalid Luach+ backup');
  validateSettings(d.settings);
  d.events.forEach(validateEvent);
  if (new Set(d.events.map(e => e.id)).size !== d.events.length) throw new Error('Duplicate event identifiers');
  return d;
}
export async function loadData(): Promise<AppData> {
  const raw = isTauri() ? await invoke<string | null>('load_data') : localStorage.getItem(key);
  return raw ? validateData(JSON.parse(raw)) : { version: 1, settings: defaultSettings(), events: [] };
}
export async function saveData(data: AppData): Promise<void> {
  validateData(data);
  const raw = JSON.stringify(data);
  if (isTauri()) await invoke('save_data', { data: raw });
  else localStorage.setItem(key, raw);
}
