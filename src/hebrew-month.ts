import { DateProfileGenerator, addDays, type DateRange } from 'fullcalendar/protected-api';
import type { PluginInput, ViewOptions } from 'fullcalendar';
import dayGrid from 'fullcalendar/daygrid';

// A 29/30-day visibleRange is classified as "day" by FullCalendar, producing one long row.
// Keep its standard DayGrid renderer, but identify the range as a month and pad full weeks.
export class HebrewMonthProfile extends DateProfileGenerator {
  override buildCurrentRangeInfo(date: Date) {
    return { duration: undefined, unit: 'month', range: this.buildCustomVisibleRange(date) };
  }
  override buildRenderRange(range: DateRange): DateRange {
    const start = this.props.dateEnv.startOfWeek(range.start);
    const endWeek = this.props.dateEnv.startOfWeek(range.end);
    return { start, end: endWeek.valueOf() === range.end.valueOf() ? endWeek : addDays(endWeek, 7) };
  }
}

export const hebrewMonthPlugin: PluginInput = {
  name: 'hebrew-month',
  // Copy the base config: v7 merges inherited *Class functions as CSS generators.
  views: { hebrewMonth: { ...(dayGrid.views!.dayGrid as ViewOptions), dateProfileGeneratorClass: HebrewMonthProfile } },
};
