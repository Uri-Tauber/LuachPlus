import {
  mdiPlus, mdiPrinterOutline, mdiCogOutline, mdiMagnify, mdiClose, mdiCalendarToday,
  mdiCalendarMonthOutline, mdiViewWeekOutline, mdiViewDayOutline, mdiFormatListBulleted,
  mdiChevronLeft, mdiChevronRight, mdiChevronDoubleLeft, mdiChevronDoubleRight,
  mdiCalendarOutline, mdiCalendarStar, mdiRestore, mdiContentSaveOutline,
  mdiDeleteOutline, mdiDownload, mdiUpload, mdiInformationOutline,
  mdiPaletteOutline, mdiMapMarkerOutline, mdiClockOutline, mdiBackupRestore,
} from '@mdi/js';

const paths = {
  add: mdiPlus, print: mdiPrinterOutline, settings: mdiCogOutline, search: mdiMagnify,
  close: mdiClose, today: mdiCalendarToday, month: mdiCalendarMonthOutline,
  week: mdiViewWeekOutline, day: mdiViewDayOutline, agenda: mdiFormatListBulleted,
  previous: mdiChevronLeft, next: mdiChevronRight, previousYear: mdiChevronDoubleLeft,
  nextYear: mdiChevronDoubleRight, gregorian: mdiCalendarOutline, hebrew: mdiCalendarStar,
  reset: mdiRestore, save: mdiContentSaveOutline, delete: mdiDeleteOutline,
  download: mdiDownload, upload: mdiUpload, about: mdiInformationOutline,
  palette: mdiPaletteOutline, location: mdiMapMarkerOutline, clock: mdiClockOutline, backup: mdiBackupRestore,
};
export type Icon = keyof typeof paths;
export function icon(name: Icon, directional = false): string {
  return `<svg class="icon${directional ? ' directional' : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[name]}"></path></svg>`;
}
