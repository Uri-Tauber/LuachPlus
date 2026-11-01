# Calculation references

The app uses KosherZmanim 0.9.0, verified against KosherJava 2.5.0 commit
`04dc83975db43582414d8639e0e204d9681aa6f0`.
NOAA is used throughout. Full calculation precision is retained; minute-only
display rounds to the nearest minute, while seconds display truncates subsecond precision.

## Itim Labina default

Primary reference: [publisher's Emanuel 5786 edition, page 3](https://www.emanuel.muni.il/uploads/n/1758467214.8935.pdf).

The preset maps dawn A/B to 19.75°/16.02°, misheyakir to 11.5°, MGA 90/72
to symmetric 19.75°/16.02° days, and stringent Shema to 19.75° dawn through
6.45° nightfall. Midday is the sunrise/sunset midpoint; midnight is twelve hours
later. Mincha gedola uses the later of half a seasonal hour or thirty minutes
after that midpoint. Shabbos ends at 8.5°, fasts at 6.45°, and Chazon Ish
nightfall at 9.28°. GRA methods use the library's sunrise/sunset day.

Sunrise and sunset use an astronomical horizon with configurable elevation.
Local terrain and the printed edition's half-minute markers are not included
in these calculations.

## Upstream corrections

`scripts/patch-kosher-zmanim.mjs` applies two guarded fixes to the pinned npm
package's CommonJS and ES-module builds on installation:

1. The raw timezone offset helper negated standard offsets in DST-observing
   zones. Sydney was incorrectly treated as crossing the antimeridian, shifting
   calculations by one day. Fixed-local-noon calculations were also affected.
2. Mincha Gedola Ahavat Shalom compared an unavailable-hour sentinel with `NaN`
   using equality, returning a result where Java returned null at high latitudes.

The installation script checks the dependency version and source before applying
either correction. Both are covered by the Java comparison.

## Special days

The library's JewishCalendar determines Israel/diaspora observance. Candle
lighting is before sunset on Friday, including when Friday is Yom Tov. On an
already sacred day before a non-Shabbos Yom Tov, it is after the configured
nightfall, with an existing-flame label. Fast and sacred-day boundaries are
included only when applicable. Unavailable polar times are not extrapolated.

Lunar and chametz getters may return null outside their applicable dates; these
rows are omitted rather than displayed as daily unavailable astronomical times.

## Verification

Compile the pinned Java source and `scripts/KosherJavaReference.java` into one
class directory, then run:

```sh
KOSHERJAVA_CLASSPATH=/path/to/classes npm test
```

Without that environment variable the parity test is explicitly skipped.
The current matrix makes 9,504 comparisons: 198 methods across six locations,
four seasonal dates and both elevation policies. Null availability must agree;
numeric results must differ by no more than 20 milliseconds, allowing the
Java library's integer truncation versus TypeScript fractional milliseconds.
