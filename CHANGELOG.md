# Changelog

## v0.2.2 — 2026-06-13

### Fixed
- Trade-up eligibility now recognises case/terminal collections. A collection
  that contains a "gold" (knife/glove) lets every grade up to and including
  **Covert** trade up, so Coverts from cases (e.g. AK-47 | Fire Serpent,
  M4A1-S | Chantico's Fire, AWP | Asiimov) show the `TU:` line again — v0.2.1
  wrongly hid them. Collections without a gold (map / operation / armory sets,
  e.g. Dust, and single-skin novelty sets like Blacksite / X-Ray) keep the
  stricter rule: a skin is eligible only if its set actually holds the next
  grade up, so top-of-collection skins remain excluded.

### Changed
- The **Tradeup Input Adjusted** checkbox now enables only when the search is
  filtered to one skin that is itself an eligible trade-up input (using the same
  eligibility rule as the `TU:` display). Selecting an ineligible skin — a Covert
  with no gold (e.g. AWP | Dragon Lore), a knife/glove, or a top-of-collection
  skin — keeps it greyed out, with an updated hover hint explaining why.

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
