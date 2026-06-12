# CSFloat Trade-Up Helper

A Chrome extension that adds trade-up convenience features to csfloat.com.

## Features
1. **Search pages** — under each listing's float value, shows the
   trade-up *adjusted float* (`TU: 0.xxxx`), computed as
   `(actual_float − low_cap) / (high_cap − low_cap)`. Works for all
   search queries and keeps working as you scroll (paging) or hit
   "reload listings".
2. **Trade-up calculator** — once you add a skin and set its float, the
   item's title becomes a clickable link to a prefilled CSFloat search
   (`sort_by=lowest_price`, `type=buy_now`, `max_float=<your float>`,
   plus the correct `def_index` / `paint_index`).

## Data source
Float caps and def/paint indices come from CSFloat's own
`/api/v1/schema` endpoint, trimmed to a compact `name → [def, paint,
min, max]` map (~83 KB) and cached in localStorage for 24h. No bundled
database — it self-updates when new skins release.

## Install (unpacked)
1. Save `manifest.json`, `content.js`, `styles.css` in one folder.
2. Go to `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the folder.
4. Open any csfloat.com search or trade-up page.