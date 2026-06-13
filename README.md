# CSFloat Trade-Up Helper

A Chrome extension that adds trade-up convenience features to csfloat.com.

## Features
1. **Search pages** — under each **tradeup-eligible** listing's float
   value, shows the trade-up *adjusted float* (`TU: 0.xxxx`), computed as
   `(actual_float − low_cap) / (high_cap − low_cap)`. "Eligible" means the
   skin can actually be a trade-up input. Case/terminal collections (those
   with a knife/glove "gold" slot) let every grade up to and including
   Covert trade up, so those Coverts are included. Collections without a
   gold (map / operation / armory sets, and single-skin novelty sets) only
   count if the set actually holds the next grade up, so their
   top-of-collection skins are skipped — as are knives and gloves
   themselves. Works for all search queries and keeps working as you scroll
   (paging) or hit "reload listings".
   <img width="2125" height="1134" alt="image" src="https://github.com/user-attachments/assets/b83a67e4-6cb3-4e3d-91d0-c7a6997c6c71" />

2. **Adjusted-float search** — a **Tradeup Input Adjusted** checkbox in
   the Wear filter. With it on, type your float range as *adjusted*
   (`0–1`) values straight into the Wear *Minimum* / *Maximum* fields;
   the extension translates them to the skin's actual float range and
   refreshes the search (the browser URL gets the real `min_float` /
   `max_float`). The fields look identical to CSFloat's native ones — it
   overlays them in place. The checkbox is greyed out (with a hover hint)
   unless the search is filtered to one specific skin, since the
   conversion needs that skin's float caps.
   <img width="357" height="214" alt="image" src="https://github.com/user-attachments/assets/23157db1-3545-4e8f-8282-201a19906c40" />

3. **Trade-up calculator** — once you add a skin and set its float, the
   item's title becomes a clickable link to a prefilled CSFloat search
   (`sort_by=lowest_price`, `type=buy_now`, `max_float=<your float>`,
   plus the correct `def_index` / `paint_index`).
   <img width="1316" height="460" alt="image" src="https://github.com/user-attachments/assets/aa2a0d2a-48d2-4271-9d13-03de4c4b07a9" />


## Data source
Float caps, def/paint indices and tradeup eligibility come from CSFloat's
own `/api/v1/schema` endpoint, trimmed to a compact
`name → [def, paint, min, max, eligible]` map (~87 KB) and cached in
localStorage for 24h. No bundled database — it self-updates when new
skins release.

## Install (unpacked)
1. Save `manifest.json`, `content.js`, `styles.css` in one folder.
2. Go to `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the folder.
4. Open any csfloat.com search or trade-up page.
