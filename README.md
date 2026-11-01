# Luach+

An offline Hebrew calendar built with FullCalendar, KosherZmanim and Tauri.
Licensed under AGPLv3. The agreed scope is in [SPEC.md](SPEC.md).

## Run the web app

Use Node.js 22.12 or newer:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:1420. Everything, including fonts and calculation code,
is bundled locally. Set your location in **Settings → Location**; the initial
preset is Jerusalem. The website build stores data in this browser's local
storage. Export a backup before clearing browser data or changing browser origins.

```sh
npm run build
npm run preview
```

The `dist/` directory can be served as a static website. Browser notifications
require a secure context or localhost, permission, and an open page.

## Run the desktop app

Install Rust and your operating system's [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).
On Debian/Ubuntu this includes WebKitGTK 4.1 and GTK 3 development packages.
Windows uses WebView2; the installer installs it if necessary, which requires
a connection on machines that do not already have the runtime. Calendar use
after installation is offline. macOS uses the system WebKit runtime.

```sh
npm ci
npm run tauri -- dev
npm run tauri -- build
```

Desktop data is written atomically to `calendar.json` in Tauri's app-data
directory for `org.luachplus.desktop`. It does not use browser local storage.
Closing the window hides it to the tray when available; use the tray's **Quit**
action to exit. If tray creation fails, closing the window exits normally.
Notifications stop when the application exits. Missed reminders are not replayed.

Desktop builds are defined in `.github/workflows/check.yml` for Linux, macOS
and Windows. Native compilation and actual OS print/notification dialogs must
be verified on those systems; browser tests do not establish native integration.

## Use the calendar

- Switch between Hebrew and Gregorian months above the grid; both dates remain
  visible. Week, day and agenda views use the same saved events.
- Select a day to see its complete schedule. Holidays, parasha and Omer appear
  inside day cells. At narrow widths the schedule follows the calendar.
- Add events using **Add event**, or drag a range in the calendar. The editor
  accepts Gregorian dates and Hebrew start-date fields. End dates are inclusive
  in the editor; overnight events need the following day's end date.
- Monthly/yearly repeats follow the chosen calendar. Hebrew day 30 adjusts to
  day 29 where necessary unless you select skip. Adar choices are explicit.
  The whole series is edited or deleted together. Birthday/yahrzeit are labels,
  not automatic religious anniversary rulings.
- Event clock times are floating: changing the zmanim location never shifts
  appointments. Reminders use the computer's local clock; all-day reminders
  use 09:00. A reminder requires the app to remain running.
- Configure any supported zman variant under **Settings → Zmanim & learning**.
  Several opinions can appear together. Special-day times appear automatically.
- **Settings → Display** changes language, direction, stock theme, appearance,
  seconds and whether printing appends the selected day's full schedule.
- **Settings → Backup** exports or restores events and settings. Restore shows
  a confirmation before replacing data. Failed validation does not replace data.

## Calculation references

See [docs/calculations.md](docs/calculations.md) for the Itim Labina method map,
the exact Java reference commit and two verified corrections applied to the
pinned TypeScript library during `npm ci`. Terrain visibility is deferred;
astronomical sunrise is not a surveyed visible-sunrise table.

Location data and its attribution are in [src/data/NOTICE.md](src/data/NOTICE.md).
Third-party licenses and source links are listed in [THIRD_PARTY.md](THIRD_PARTY.md).

## Verification

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

To include the authoritative Java comparison (requires a JDK):

```sh
curl -L --fail https://codeload.github.com/KosherJava/zmanim/tar.gz/04dc83975db43582414d8639e0e204d9681aa6f0 -o /tmp/luach-java.tar.gz
mkdir -p /tmp/luach-java-source /tmp/luach-java-classes
tar -xzf /tmp/luach-java.tar.gz -C /tmp/luach-java-source --strip-components=1
javac -d /tmp/luach-java-classes $(find /tmp/luach-java-source/src/main/java -name '*.java') scripts/KosherJavaReference.java
KOSHERJAVA_CLASSPATH=/tmp/luach-java-classes npm test
```

The Java test is explicitly skipped when its classpath is not provided. It
checks the method catalog, including lunar methods and the Itim compositions,
across seasons and elevations. Browser tests cover Hebrew month layout and
navigation, all views, event persistence/series editing, location independence,
themes, Hebrew RTL, backup/restore and PDF output.
