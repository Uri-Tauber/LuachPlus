import locations from './data/locations.json';
import { defaultMethods, zmanMethods, type ZmanSettings } from './zmanim';
import type { CalendarSystem, Language } from './dates';
import { paletteFor } from './palettes';
export interface Settings extends ZmanSettings {
  language: Language; direction: 'auto' | 'ltr' | 'rtl'; theme: 'forma' | 'monarch' | 'breezy' | 'pulse' | 'classic';
  colorScheme: 'light' | 'dark' | 'system'; seconds: boolean; calendar: CalendarSystem; printSchedule: boolean;
  palette?: string;
}
export const presets = locations;
export function defaultSettings(): Settings {
  return { language: navigator.language.startsWith('he') ? 'he' : 'en', direction: 'auto', theme: 'forma',
    palette: 'blue', colorScheme: 'system', seconds: false, calendar: 'hebrew', printSchedule: false,
    location: { ...locations.find(p => p.name === 'Jerusalem')! }, useElevation: false,
    zmanMethods: [...defaultMethods], endMethod: 'getTzaisGeonim8Point5Degrees', fastStartMethod: 'itimDawn72',
    fastEndMethod: 'getTzaisGeonim6Point45Degrees', bavli: true, yerushalmi: false };
}
export function validateSettings(s: Settings): void {
  if (!s || typeof s !== 'object' || !['en', 'he'].includes(s.language) || !['auto', 'ltr', 'rtl'].includes(s.direction) ||
    !['forma', 'monarch', 'breezy', 'pulse', 'classic'].includes(s.theme) || !['light', 'dark', 'system'].includes(s.colorScheme) ||
    !['hebrew', 'gregorian'].includes(s.calendar)) throw new Error('Invalid settings');
  if (s.palette !== undefined && (typeof s.palette !== 'string' || paletteFor(s.theme, s.palette) !== s.palette)) throw new Error('Invalid theme palette');
  for (const key of ['seconds', 'printSchedule', 'useElevation', 'bavli', 'yerushalmi'] as const) if (typeof s[key] !== 'boolean') throw new Error('Invalid display setting');
  const p = s.location;
  if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 150 ||
    !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180 ||
    !Number.isFinite(p.elevation) || p.elevation < -500 || p.elevation > 9000 ||
    !Number.isFinite(p.candleMinutes) || p.candleMinutes < 0 || p.candleMinutes > 120 || typeof p.inIsrael !== 'boolean') throw new Error('Invalid location');
  if (typeof p.timezone !== 'string' || p.timezone.length > 100) throw new Error('Invalid timezone');
  try { new Intl.DateTimeFormat('en', { timeZone: p.timezone }); } catch { throw new Error('Use a valid IANA timezone, for example Asia/Jerusalem'); }
  if (!Array.isArray(s.zmanMethods) || s.zmanMethods.length > zmanMethods.length || new Set(s.zmanMethods).size !== s.zmanMethods.length ||
    !s.zmanMethods.every(m => zmanMethods.includes(m))) throw new Error('Invalid zman selection');
  for (const method of [s.endMethod, s.fastStartMethod, s.fastEndMethod]) if (!zmanMethods.includes(method)) throw new Error('Invalid special-day method');
}
