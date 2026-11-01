# Luach+

## Platform

web

## Stack

Tauri desktop shell for Windows, macOS and Linux; TypeScript web UI with FullCalendar and KosherZmanim. Supporting implementation choices are delegated. Dependencies are pinned packages, not copied library trees. AGPLv3 application.

## Users and purpose

A free, offline Hebrew calendar for daily planning and consulting Jewish dates, zmanim and learning assignments. A later website should offer the same functionality with local data, without accounts or synchronization.

## Confirmed functionality

- Hebrew and Gregorian month navigation, week, day and agenda views. Stable civil-date cells contain dual dates, holidays, parasha and Omer. Hebrew/English UI with immediate language changes and RTL support.
- Selected-day panel, themed consistently with FullCalendar. Every zero-argument time-producing method exposed by the pinned KosherZmanim library is accessible; multiple shitos can be enabled together. Helpers, durations and configuration setters are not independent zmanim.
- Default selection follows Itim Labina where formulas can be established. NOAA calculations, not terrain sunrise. Never claim exact Itim parity without evidence. Verify calculations against KosherJava 2.5.0, commit 04dc83975db43582414d8639e0e204d9681aa6f0, matching KosherZmanim 0.9.0.
- One saved location: preset or manual latitude, longitude, elevation and IANA timezone. Editable candle-lighting offset and Israel/diaspora observance. Negative ground elevations are permitted; astronomical horizon elevation cannot be negative.
- Candle lighting, fast boundaries and Shabbos/Yom Tov endings appear only when applicable. Optional library-provided Daf Yomi Bavli and Yerushalmi assignments.
- Header Hebrew date advances at the saved location's sunset; calendar cells and events never shift at sunset.
- Local all-day, timed, overnight and multi-day events. One-time, weekly, monthly or yearly recurrence; monthly/yearly can use Hebrew or Gregorian dates. Birthday/yahrzeit are labels with explicit recurrence controls, not claims of religious anniversary rulings. Edit/delete the whole series only.
- Hebrew missing day defaults to the last existing day; an optional skip policy. Adar I/II map to common Adar in common years; common Adar defaults to Adar II in leap years, with explicit alternatives. Gregorian missing dates skip. Monthly Hebrew recurrence visits both Adars.
- Floating event dates and clock times remain unchanged when location changes. Notifications follow the computer's local clock and operate only while running, including the tray. No closed-application delivery or replay of missed reminders.
- Printing current calendar view, optionally appending the complete selected-day schedule. FullCalendar adaptive plugin under its AGPL route. Full backup and restore of settings/events. Optional seconds; retain full precision internally.

## Brand commitments

Preserve the useful legacy grid/sidebar composition. Use FullCalendar's existing themes and keep the panel and settings consistent with them. No invented visual identity or decorative marketing surface.

## Evidence and open research

Legacy repository: ../luach-plus, especially feature/events-reminders, feature/per-location-candle-lighting and feature/sunset-rollover. Location dataset credits MyZman (LGPL-2.1); offsets reference ItimHebrewCalendar. Revalidate Windows timezone identifiers against actual locations instead of mechanically converting them. Itim's exact current formula mapping is still research work and must remain explicit in documentation.

## Deferred

Cloud synchronization, accounts, ICS interchange, terrain sunrise, learning cycles beyond the library, occurrence exceptions, closed-app reminders and a month-wide printed zmanim table.
