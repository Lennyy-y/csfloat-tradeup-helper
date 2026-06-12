(() => {
    "use strict";

    // ---------- Schema cache: name -> [def, paint, min, max, eligible] ----------
    const SCHEMA_KEY = "cftuh_schema_v2";
    const SCHEMA_TS_KEY = "cftuh_schema_ts_v2";
    const TTL_MS = 24 * 60 * 60 * 1000; // 24h
    let NAME_MAP = null;

    async function loadSchema() {
        try {
            const cached = localStorage.getItem(SCHEMA_KEY);
            const ts = parseInt(localStorage.getItem(SCHEMA_TS_KEY) || "0", 10);
            if (cached && Date.now() - ts < TTL_MS) {
                NAME_MAP = JSON.parse(cached);
                return;
            }
        } catch (e) { /* fall through */ }
        await fetchSchema();
    }

    async function fetchSchema() {
        try {
            const res = await fetch("/api/v1/schema", { headers: { accept: "application/json" } });
            const j = await res.json();

            // Pass 1: per-collection weapon max rarity, and whether collection has a knife/glove
            const collWeaponMaxRarity = {};
            const collHasRare = {};
            for (const def in j.weapons) {
                const w = j.weapons[def];
                if (!w.paints) continue;
                const isRare = /Knives|Gloves/i.test(w.type || "");
                for (const pi in w.paints) {
                    const p = w.paints[pi];
                    (p.collections || []).forEach((ck) => {
                        if (isRare) {
                            collHasRare[ck] = true;
                        } else {
                            if (collWeaponMaxRarity[ck] === undefined || p.rarity > collWeaponMaxRarity[ck]) {
                                collWeaponMaxRarity[ck] = p.rarity;
                            }
                        }
                    });
                }
            }

            // Eligibility: a weapon skin is a usable trade-up filler if at least one of
            // its collections has something above it — either a higher-rarity weapon,
            // or a knife/glove tier (which sits above all weapon rarities).
            function isEligible(rarity, colls) {
                return (colls || []).some(
                    (ck) => collWeaponMaxRarity[ck] > rarity || collHasRare[ck] === true
                );
            }

            // Pass 2: build the name map for WEAPONS only
            const map = {};
            for (const def in j.weapons) {
                const w = j.weapons[def];
                if (!w.paints) continue;
                if (/Knives|Gloves/i.test(w.type || "")) continue; // skip knives & gloves entirely
                for (const pi in w.paints) {
                    const p = w.paints[pi];
                    const elig = isEligible(p.rarity, p.collections) ? 1 : 0;
                    map[w.name + " | " + p.name] = [parseInt(def, 10), p.index, p.min, p.max, elig];
                }
            }

            NAME_MAP = map;
            try {
                localStorage.setItem(SCHEMA_KEY, JSON.stringify(map));
                localStorage.setItem(SCHEMA_TS_KEY, String(Date.now()));
            } catch (e) { /* storage full: memory only */ }
        } catch (e) {
            console.warn("[TradeUpHelper] schema fetch failed", e);
        }
    }

    const WEARS = "Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred";

    function cleanName(raw) {
        if (!raw) return null;
        let n = raw.replace(new RegExp("\\s*\\((" + WEARS + ")\\)\\s*$", "i"), "");
        n = n.replace(/^(StatTrak™?|Souvenir)\s+/i, "");
        return n.trim();
    }

    function lookup(name) {
        return NAME_MAP ? NAME_MAP[name] || null : null;
    }

    function fmtFloat(x) {
        return (Math.round(x * 1e6) / 1e6).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    }

    // ---------- Feature 1: adjusted float on search listings ----------
    function annotateCard(card) {
        if (card.dataset.cftuhDone === "1") return;
        const nameEl = card.querySelector(".item-name");
        const wearEl = card.querySelector(".wear");
        if (!nameEl || !wearEl) return;
        const actual = parseFloat(wearEl.textContent.trim());
        if (isNaN(actual)) return;

        const entry = lookup(cleanName(nameEl.textContent.trim()));
        // Mark done regardless, so we don't reprocess. Skip if not an eligible filler.
        card.dataset.cftuhDone = "1";
        if (!entry) return;                 // not a weapon skin in schema
        const [, , min, max, elig] = entry;
        if (!elig) return;                  // top-rarity / non-tradeable: no TU field
        if (max === min) return;

        let adj = (actual - min) / (max - min);
        if (adj < 0) adj = 0;
        if (adj > 1) adj = 1;

        // Insert as a block directly BELOW the .text-info row (so it sits under the
        // float value without displacing the paint-seed / pattern id beside it).
        const textInfo = wearEl.closest(".text-info") || wearEl.parentElement;
        if (!textInfo || textInfo.parentElement.querySelector(":scope > .cftuh-adj")) return;
        const div = document.createElement("div");
        div.className = "cftuh-adj";
        div.title = "Trade-up adjusted float = (actual − low cap) / (high cap − low cap)";
        div.textContent = "TU: " + fmtFloat(adj);
        textInfo.insertAdjacentElement("afterend", div);
    }

    function scanCards() {
        if (!NAME_MAP) return;
        document.querySelectorAll("item-card").forEach(annotateCard);
    }

    // ---------- Feature 2: link trade-up item titles to prefilled search ----------
    function buildSearchUrl(def, paint, maxFloat) {
        return (
            "https://csfloat.com/search?sort_by=lowest_price&type=buy_now" +
            "&max_float=" + encodeURIComponent(maxFloat) +
            "&def_index=" + def + "&paint_index=" + paint
        );
    }

    function annotateTradeUpItem(item) {
        const input = item.querySelector("input.mat-mdc-input-element, input[type='text']");
        if (!input) return; // only added items have a float input

        let titleEl = null;
        item.querySelectorAll("div").forEach((d) => {
            if (titleEl) return;
            const t = d.textContent.trim();
            if (
                /\|/.test(t) &&
                new RegExp("\\((" + WEARS + ")\\)").test(t) &&
                t.length < 80
            ) {
                titleEl = d;
            }
        });
        if (!titleEl) return;

        const entry = lookup(cleanName(titleEl.textContent.trim()));
        if (!entry) return;
        const [def, paint, , , elig] = entry;
        if (!elig) return; // shouldn't normally be addable, but guard anyway

        const currentFloat = () => {
            const v = parseFloat(input.value);
            return isNaN(v) ? 0 : v;
        };

        const apply = () => {
            let link = titleEl.querySelector("a.cftuh-link");
            if (!link) {
                const text = titleEl.textContent;
                titleEl.textContent = "";
                link = document.createElement("a");
                link.className = "cftuh-link";
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = text;
                titleEl.appendChild(link);
            }
            link.href = buildSearchUrl(def, paint, currentFloat());
        };

        apply();
        if (input.dataset.cftuhBound !== "1") {
            input.addEventListener("input", apply);
            input.addEventListener("change", apply);
            input.dataset.cftuhBound = "1";
        }
    }

    function scanTradeUp() {
        if (!NAME_MAP) return;
        document.querySelectorAll("app-trade-up-item").forEach(annotateTradeUpItem);
    }

    // ---------- Routing + observers ----------
    function scan() {
        if (location.pathname.startsWith("/search")) scanCards();
        else if (location.pathname.startsWith("/trade-up")) scanTradeUp();
    }

    let scheduled = false;
    function scheduleScan() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            scan();
        });
    }

    async function init() {
        await loadSchema();
        new MutationObserver(scheduleScan).observe(document.body, {
            childList: true,
            subtree: true,
        });
        scan();
        let lastPath = location.pathname;
        setInterval(() => {
            if (location.pathname !== lastPath) {
                lastPath = location.pathname;
                scheduleScan();
            }
        }, 500);
    }

    init();
})();