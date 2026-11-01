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
| Tauri and official plugins | MIT / Apache-2.0 | https://github.com/tauri-apps |
| Location data | LGPL-2.1, with legacy corrections | src/data/NOTICE.md |
| tz-lookup (build-time location conversion) | CC0-1.0 | https://github.com/darkskyapp/tz-lookup |

The KosherZmanim package metadata and repository license differ. Preserve both
upstream notices and the exact source reference when redistributing; do not
silently relabel its license. The app's two package corrections are available
in scripts/patch-kosher-zmanim.mjs. No publisher PDF or proprietary sunrise
table is bundled. The Itim source is cited for calculation definitions only.

FullCalendar's premium source is consumed as a package dependency under its
AGPLv3 route. Distributed desktop builds and any hosted modified application
must make corresponding source available under the applicable licenses.
