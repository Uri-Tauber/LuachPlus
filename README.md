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

A new release is published after each change to `main` passes the tests and
builds for all three systems. Each release identifies the commit it contains.

## Get started

1. Open **Settings → Location**. Choose your city or enter its coordinates,
   elevation and timezone. Check the candle-lighting offset and Israel/diaspora
   observance. The initial location is Jerusalem.
2. Choose **Hebrew months** or **Gregorian months** above the calendar. Use the
   view buttons for month, week, day or agenda. Single arrows move by one
   period; double arrows move by one year.
3. Select a day to see its zmanim, daily learning and events. Holidays, parasha
   and Omer also appear inside the calendar.
4. Select **Add event** to create an appointment, birthday or yahrzeit. Events
   can repeat weekly, monthly or yearly. Monthly and yearly events can follow
   either calendar. The editor offers choices for missing dates and Adar.
5. Open **Settings → Zmanim & learning** to choose the times and opinions you
   want to display. You can select several opinions together.

**Settings → Display** changes the language, theme, color palette, light/dark appearance and
whether zmanim show seconds. The calendar fits the window; scroll inside the
day panel to see longer schedules.

## Events and reminders

Events can last all day, have start/end times, or span several days. End dates
in the editor are inclusive. Editing or deleting a repeating event changes the
whole series.

Changing location does not move your events or change their clock times.
Reminders use your computer's local clock and require Luach+ to stay running.
All-day reminders use 09:00. Closing the desktop window keeps the app in the
system tray when available; use the tray's **Quit** command to exit.

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

AGPLv3. See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY.md).
