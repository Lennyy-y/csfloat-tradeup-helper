# Changelog

## v0.2.1 — 2026-06-13

### Fixed
- Trade-up eligibility (which listings get the `TU:` adjusted-float line) is now
  determined per collection instead of by rarity alone. A skin counts only if its
  collection actually contains the next grade up — so top-of-collection skins that
  aren't Covert (e.g. R8 Revolver | Amber Fade, Desert Eagle | Blaze, Glock-18 |
  Fade) are now correctly excluded, along with Covert/Contraband, knives and gloves
  (the latter also no longer pollute the collection grade ladder).

## v0.2 — 2026-06-13

### Added
- **Adjusted-float search checkbox** (*Tradeup Input Adjusted*) in the Wear
  filter. On a single-skin search, type your wear range as *adjusted* (`0–1`)
  values directly into the Wear *Minimum* / *Maximum* fields — the extension
  translates them to the skin's actual float range and refreshes the results
  (the URL gets the real `min_float` / `max_float`). The inputs are overlaid in
  place so they look identical to CSFloat's native fields. The checkbox is
  greyed out, with a hover hint, unless the search targets one specific skin
  (a single `def_index` + `paint_index`), because the conversion needs that
  skin's float caps.

### Fixed
- Adjusted-float display (`TU:`) shows for every tradeup-eligible item again.
  Eligibility is now derived from item rarity (Consumer–Classified), since
  CSFloat's schema no longer carries an `eligible` flag.
- Trade-up calculator item titles are clickable search links again, after
  CSFloat restructured those cards.
- The checkbox sits inside the Wear panel body so clicking it no longer
  collapses the Wear filter.
- Disabling the checkbox restores the raw float values you had before enabling
  it, instead of leaving the translated actual floats behind.

## v0.1

- Initial release: trade-up adjusted-float display on search listings, and
  clickable item titles in the trade-up calculator.
