# Third-party notices

Luach+ application code is AGPL-3.0-only; dependency code retains its own license.
The lockfile records the exact installed npm packages and their source origins.

| Component | License | Source |
| --- | --- | --- |
| FullCalendar Standard | MIT | https://github.com/fullcalendar/fullcalendar |
| FullCalendar adaptive printing | AGPLv3 route | https://fullcalendar.io/license |
| KosherZmanim 0.9.0 | npm metadata: LGPL-3.0; repository license file: LGPL-2.1 | https://github.com/BehindTheMath/KosherZmanim |
| KosherJava reference | LGPL-2.1 | https://github.com/KosherJava/zmanim |
| Luxon | MIT | https://github.com/moment/luxon |
| Preact (FullCalendar dependency) | MIT | https://github.com/preactjs/preact |
| Application icon: Schedule, Freepik | Flaticon License, attribution required | https://www.flaticon.com/free-icon/schedule_3652267 |
| ksni (Linux tray) | MIT / Apache-2.0 | https://github.com/iovxw/ksni |
| Material Design Icons | Apache-2.0 | https://github.com/Templarian/MaterialDesign-JS |
| Tauri and official plugins | MIT / Apache-2.0 | https://github.com/tauri-apps |
| Location data | LGPL-2.1, with legacy corrections | src/data/NOTICE.md |
| tz-lookup (build-time location conversion) | CC0-1.0 | https://github.com/darkskyapp/tz-lookup |

The KosherZmanim package metadata and repository license differ. Preserve both
upstream notices and the exact source reference when redistributing. The app's
two package corrections are available
in scripts/patch-kosher-zmanim.mjs. No publisher PDF or proprietary sunrise
table is bundled. The Itim source is cited for calculation definitions only.

FullCalendar's premium source is consumed as a package dependency under its
AGPLv3 route. Distributed desktop builds and any hosted modified application
must make corresponding source available under the applicable licenses.

## Application icon

The application icon is **Schedule**, created by **Freepik** (now Magnific),
distributed by [Flaticon](https://www.flaticon.com/free-icon/schedule_3652267).
The asset page permits personal and commercial use with attribution under the
[Flaticon License](https://www.flaticon.com/legal#nav-flaticon). This artwork retains
that license separately from the app's AGPL license. Its restrictions on
standalone redistribution, sublicensing and trademark use still apply.

`public/app-icon.png` is the unchanged 512px PNG copied from legacy Luach+.
It matches the publisher's PNG byte for byte (SHA-256:
`51fd1b678c2dbc1e49b7956c5e09b44ff7c4a2441989e6a70fe365fbca1bb946`).
The files in `src-tauri/icons/` are size/format conversions for desktop packaging.
Regenerate them with `npm run tauri -- icon public/app-icon.png` and keep the
formats listed in `tauri.conf.json`. Attribution is also shown in About.
