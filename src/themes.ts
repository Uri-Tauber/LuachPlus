import forma from 'fullcalendar/themes/forma';
import monarch from 'fullcalendar/themes/monarch';
import breezy from 'fullcalendar/themes/breezy';
import pulse from 'fullcalendar/themes/pulse';
import classic from 'fullcalendar/themes/classic';
import 'fullcalendar/skeleton.css';
import 'fullcalendar/themes/forma/theme.css';
import 'fullcalendar/themes/monarch/theme.css';
import 'fullcalendar/themes/breezy/theme.css';
import 'fullcalendar/themes/pulse/theme.css';
import 'fullcalendar/themes/classic/theme.css';
import { paletteFor, type Theme } from './palettes';

const paletteStyles = import.meta.glob<string>([
  '/node_modules/fullcalendar/themes/*/palettes/*.css',
  '/node_modules/fullcalendar/themes/classic/palette.css',
], { eager: true, query: '?inline', import: 'default' });

export function applyPalette(theme: Theme, selection?: string) {
  const palette = paletteFor(theme, selection);
  const file = theme === 'classic' ? 'palette.css' : `palettes/${palette}.css`;
  let style = document.querySelector<HTMLStyleElement>('#theme-palette');
  if (!style) { style = document.createElement('style'); style.id = 'theme-palette'; document.head.append(style); }
  style.textContent = paletteStyles[`/node_modules/fullcalendar/themes/${theme}/${file}`];
}
export const themes = { forma, monarch, breezy, pulse, classic };
