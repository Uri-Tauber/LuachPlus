# Location data

Coordinates, elevations and candle-lighting offsets were extracted from
`luach-plus` branch `feature/per-location-candle-lighting`, commit b9ad4a5.
The original location list credits MyZman:
https://github.com/NykUser/MyZman/blob/master/Resources/LocationsList.XML
under LGPL-2.1. See LICENSE-LGPL-2.1 in this directory.
The legacy offsets credit ItimHebrewCalendar's CitiesDatabase.
Some elevations in that list are approximate or zero. Users can override all fields.

Windows timezone names were replaced using offline tz-lookup coordinate lookup;
Israeli observance presets consistently use Asia/Jerusalem. Brasilia's latitude
sign was corrected to the southern hemisphere. These are editable presets,
not surveyed coordinates or a guarantee of local community custom.

The zman method inventory is generated from the pinned kosher-zmanim public
TypeScript declarations with scripts/generate-zman-catalog.mjs. It contains
public DateTime-producing getters callable without required arguments,
including inherited getters and optional-argument lunar methods.
Two no-argument runtime methods, getMinchaKetana and getPlagHamincha, are
included explicitly because the 0.9.0 declarations omit their no-argument overloads.
