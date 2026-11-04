# Luach+

A free Hebrew calendar for Windows, macOS, Linux and the web. Plan events,
check zmanim for your location, and switch between Hebrew and Gregorian dates.
The calendar works offline and stores your data on your device.

## Download

Open this repository's **Releases** page and download the file for your system:

| System | Download | Install |
| --- | --- | --- |
| Windows | `.exe` | Run the installer. |
| macOS | `.dmg` | Open the disk image and drag Luach+ to Applications. |
| Linux | `.AppImage` | Make the file executable, then open it. |
| Debian / Ubuntu | `.deb` | Open it with your package installer. |

A new release is published after each change to the default branch passes the tests and
builds for all three systems. Each release identifies the commit it contains.

## Get started

1. Select **Change** beside the location above the zmanim, or open **Settings → Location**. Choose your city or enter its coordinates,
   elevation and timezone. Check the candle-lighting offset and Israel/diaspora
   observance. The initial location is Jerusalem.
2. Choose **Hebrew months** or **Gregorian months** above the calendar. Use the
   view buttons for month, week, day or agenda. Single arrows move by one
   period; double arrows move by one year. Use **Go to date** for a Gregorian
   date or **Hebrew date…** to enter a Hebrew day, month and year.
3. Select a day to see its zmanim, daily learning and events. Holidays, parasha
   and Omer also appear inside the calendar.
4. Select **Add event** to create an event. Events
   can repeat weekly, monthly or yearly. Monthly and yearly events can follow
   either calendar. The editor offers choices for missing dates and Adar.
5. Open **Settings → Zmanim & learning** to choose the times and opinions you
   want to display. Expand a time group to see its default methods, or expand
   **Additional methods** to compare alternatives. Search reveals matching
   methods in all groups. You can select several opinions together.

**Settings → Display** changes the language, theme, color palette, light/dark appearance and
whether zmanim show seconds. The calendar fits the window height and uses a
compact layout in smaller windows. Applicable
candle-lighting, fast and Shabbat/holiday ending times appear above the full
schedule. Scroll inside the desktop day panel to see longer schedules.

## Keyboard navigation

Tab to the selected calendar date. Left/Right moves one day (mirrored in RTL),
Up/Down moves one week, Home/End selects the first/last day of the week, and
Page Up/Down moves one month. Add Shift for a year jump.

With the calendar focused, use T for today, C for a new event, D/W/M/A for
views, N/P for the next/previous period, G to enter a date, / to search events, and S for settings.
Press ? or select the keyboard button to see the shortcuts. Shortcuts leave
text fields and dialogs alone; Escape closes dialogs.

These follow familiar patterns from
[Google Calendar](https://support.google.com/calendar/answer/37034) and
[Outlook](https://support.microsoft.com/en-us/office/keyboard-shortcuts-for-outlook-3cdeb221-7ae5-4c1d-8c1d-9e63216c1efd).

## Events and reminders

Events can last all day, have start/end times, or span several days. End dates
in the editor are inclusive. Editing or deleting a repeating event changes the
whole series.

Use the toolbar search button to find an event by title or notes. Search shows
each repeating series once, with its start date. Select a result to edit it.

Changing location does not move your events or change their clock times.
Reminders use your computer's local clock and require Luach+ to stay running.
All-day reminders use 09:00. Closing the desktop window keeps the app in the
system tray when available. Its menu follows the app language. Click or double-click
the icon to reopen the window on Windows; click it on macOS or Linux. Linux uses
[StatusNotifierItem activation](https://docs.rs/ksni/latest/ksni/trait.Tray.html#method.activate)
for a single-click action, with Open also available in the tray menu. Use the tray's **Quit** command to exit.

## Back up and print

Use **Settings → Backup → Export backup** to save your events and settings.
To restore a backup, choose its file and confirm the replacement.

Select **Print** to print the current calendar view. Enable **Append selected
day schedule when printing** in Display settings to include the full schedule.

In the web version, data belongs to the browser and site address you use.
Export a backup before clearing browser data or moving to another browser.

## Development

Use Node.js 22.12 or newer:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:1420. To build the static web version, run `npm run build`;
the output is in `dist/`.

Desktop development also requires Rust and the operating system's
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/):

```sh
npm run tauri -- dev
npm run tauri -- build
```

Desktop data is stored in `calendar.json` in the app-data directory for
`org.luachplus.desktop`. Windows uses WebView2; its first installation may need
an internet connection. Calendar use after installation is offline.

Run the checks with:

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

See [calculation references and Java verification](docs/calculations.md) for
the numerical definitions and upstream comparison setup.

## License

Application code is AGPLv3. The application icon retains its separate Flaticon
license and attribution. See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY.md).
