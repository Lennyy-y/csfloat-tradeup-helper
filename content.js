(() => {
    'use strict';
    const SCHEMA_KEY = 'cftuh_schema_v5';
    const SCHEMA_TTL = 24 * 60 * 60 * 1000;

    let NAME_MAP = null, CAP_INDEX = null;

    // ---------- schema ----------
    async function loadSchema() {
        try {
            const c = JSON.parse(localStorage.getItem(SCHEMA_KEY) || 'null');
            const ts = Number(localStorage.getItem(SCHEMA_KEY + '_ts') || 0);
            if (c && Date.now() - ts < SCHEMA_TTL) NAME_MAP = c;
        } catch (_) {}
        if (!NAME_MAP) {
            const s = await (await fetch('/api/v1/schema')).json();
            // Knives/gloves are never trade-up inputs and carry off-ladder rarities, so
            // they're excluded as candidates and from the per-collection weapon-grade ladder
            // — but the collections they appear in mark a case/terminal set (one with a
            // "gold" rare-item slot), which is exactly what makes a Covert tradeable.
            const isKG = name => /knife|bayonet|karambit|daggers|glove|wraps/i.test(name);
            // pass 1: per collection, the weapon grades present, and whether it has a gold.
            const colRarities = Object.create(null); // collection -> Set of weapon rarities
            const goldCols = new Set();               // collections that contain a knife/glove
            for (const def in s.weapons) {
                const w = s.weapons[def]; if (!w.paints) continue;
                const kg = isKG(w.name);
                for (const p in w.paints)
                    for (const c of (w.paints[p].collections || [])) {
                        if (kg) goldCols.add(c);
                        else (colRarities[c] || (colRarities[c] = new Set())).add(w.paints[p].rarity);
                    }
            }
            // CSFloat's schema has no "eligible" flag, so we derive it. Two collection kinds:
            //  • Case/terminal sets (a "gold" knife/glove slot sits above Covert): every grade
            //    Mil-Spec..Covert can trade up — Covert → gold — so all are eligible.
            //  • Map / operation / armory / novelty sets (no gold): a skin is only tradeable if
            //    its collection actually holds the next grade up, so top-of-collection skins
            //    (incl. a Classified/Restricted that caps its set) and single-skin novelty
            //    sets are excluded.
            const tradeable = (rarity, collections) =>
                (collections || []).some(c => goldCols.has(c)
                    ? (rarity >= 3 && rarity <= 6)
                    : (colRarities[c] && colRarities[c].has(rarity + 1)));
            // pass 2: name -> [def, paint, min, max, eligible]
            NAME_MAP = {};
            for (const def in s.weapons) {
                const w = s.weapons[def]; if (!w.paints) continue;
                for (const p in w.paints) {
                    const pp = w.paints[p];
                    const elig = !isKG(w.name) && tradeable(pp.rarity, pp.collections) ? 1 : 0;
                    NAME_MAP[`${w.name} | ${pp.name}`] = [+def, +p, pp.min, pp.max, elig];
                }
            }
            try { localStorage.setItem(SCHEMA_KEY, JSON.stringify(NAME_MAP));
                localStorage.setItem(SCHEMA_KEY + '_ts', String(Date.now())); } catch (_) {}
        }
        CAP_INDEX = Object.create(null);
        for (const n in NAME_MAP) { const [d, p, mn, mx, elig] = NAME_MAP[n]; CAP_INDEX[d + ':' + p] = [mn, mx, elig]; }
    }
    const caps = (d, p) => CAP_INDEX ? CAP_INDEX[d + ':' + p] || null : null;
    // is this specific skin a valid trade-up input? (eligibility flag baked into the map)
    const isEligible = (d, p) => { const c = caps(d, p); return !!(c && c[2]); };

    // ---------- math ----------
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const adjToActual = (a, mn, mx) => clamp(a * (mx - mn) + mn, mn, mx);
    const actualToAdj = (x, mn, mx) => (mx === mn ? 0 : (x - mn) / (mx - mn));

    // ---------- mode ----------
    const isAdj = () => localStorage.getItem('cftuh_adjusted_on') === '1';
    const setAdj = v => localStorage.setItem('cftuh_adjusted_on', v ? '1' : '0');

    // The adjusted overlay only makes sense when the search targets one specific skin that
    // is itself a valid trade-up input. An ineligible skin (top-of-collection, a Covert with
    // no gold above it, a knife/glove) has nothing to trade up to, so we treat it like a
    // multi-skin search and keep the checkbox greyed out.
    function singleSkin() {
        const u = new URL(location.href);
        const d = u.searchParams.get('def_index'), p = u.searchParams.get('paint_index');
        return (d && p && caps(d, p) && isEligible(d, p)) ? { d, p, c: caps(d, p) } : null;
    }

    // CSFloat's real controls
    const realMin = () => document.querySelector('input[formcontrolname="min_float"]');
    const realMax = () => document.querySelector('input[formcontrolname="max_float"]');

    // CSFloat keeps the float filter in Angular state seeded from the URL query params —
    // writing to the (hidden) native <input> does NOT update it, and the Refresh button
    // reads that state, so it would query without our floats. Driving the URL is the only
    // reliable path: push min_float/max_float and fire popstate so CSFloat's router
    // refetches. This also makes the browser URL reflect the real floats, as expected.
    function navFloat(minV, maxV) {
        const u = new URL(location.href);
        if (minV == null) u.searchParams.delete('min_float'); else u.searchParams.set('min_float', minV);
        if (maxV == null) u.searchParams.delete('max_float'); else u.searchParams.set('max_float', maxV);
        history.pushState(history.state, '', u.toString());
        window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    }

    // ---------- the adjusted overlay inputs (the values the USER edits) ----------
    // Instead of a separate, visually-distinct field, we drop an input *inside*
    // CSFloat's own Material form-field box (the .mat-mdc-form-field-infix) and hide
    // the real <input>. Because it inherits the surrounding box's border/background/
    // font, it looks identical to the native float field — the user just types an
    // adjusted (0..1) value and we translate it before CSFloat ever reads it.
    const adjMinEl = () => document.querySelector('.cftuh-adj-input[data-cftuh-k="min"]');
    const adjMaxEl = () => document.querySelector('.cftuh-adj-input[data-cftuh-k="max"]');

    function buildOverlay() {
        const min = realMin(), max = realMax();
        if (!min || !max) return;
        const on = isAdj();

        [['min', min], ['max', max]].forEach(([k, real]) => {
            const infix = real.closest('.mat-mdc-form-field-infix') || real.parentElement;
            let ov = infix.querySelector('.cftuh-adj-input');
            if (!ov) {
                ov = document.createElement('input');
                ov.type = 'number'; ov.step = '0.0001'; ov.min = '0'; ov.max = '1';
                ov.className = 'cftuh-adj-input';
                ov.dataset.cftuhK = k;
                ov.setAttribute('placeholder', real.getAttribute('placeholder') || '');
                ov.addEventListener('change', applyAdjusted);
                ov.addEventListener('keydown', e => { if (e.key === 'Enter') applyAdjusted(); });
                infix.appendChild(ov);
            }
            // swap which input is visible: real hidden in adjusted mode, our overlay shown
            real.style.display = on ? 'none' : '';
            ov.style.display = on ? '' : 'none';
        });
    }

    // translate the user's adjusted values -> actual float, then refetch via the URL.
    // Adjusted mode only applies to a single specific skin — a multi-skin search would
    // need per-skin client filtering, which burned through the API rate limit, so it's
    // disabled (the checkbox is greyed out unless the search targets one skin).
    function applyAdjusted() {
        if (!isAdj()) return;
        const skin = singleSkin();
        if (!skin) return;
        const aMinEl = adjMinEl(), aMaxEl = adjMaxEl();
        if (!aMinEl || !aMaxEl) return;
        const aMin = aMinEl.value !== '' ? parseFloat(aMinEl.value) : 0;
        const aMax = aMaxEl.value !== '' ? parseFloat(aMaxEl.value) : 1;
        if (!Number.isFinite(aMin) || !Number.isFinite(aMax)) return;

        const [mn, mx] = skin.c;
        navFloat(adjToActual(aMin, mn, mx).toFixed(6), adjToActual(aMax, mn, mx).toFixed(6));
    }

    // ---------- checkbox inside the Wear panel ----------
    function injectToggle() {
        if (document.querySelector('#cftuh-adjusted')) return;
        // Put the toggle INSIDE the Wear panel's expandable body (.inner), not in its
        // header row — the header is the collapse trigger, so a click there closed the
        // whole Wear filter. The body holds the float inputs anyway, so it belongs here.
        const inner = document.querySelector('app-search-row.wear .inner');
        if (!inner) return;
        const lbl = document.createElement('label');
        lbl.className = 'cftuh-adjusted-toggle';
        lbl.innerHTML = `<input type="checkbox" id="cftuh-adjusted"><span>Tradeup Input Adjusted</span>`;
        inner.insertBefore(lbl, inner.firstChild);
        // belt-and-suspenders: never let a click here bubble to a collapse handler
        lbl.addEventListener('click', e => e.stopPropagation());

        const cb = lbl.querySelector('#cftuh-adjusted');
        cb.checked = isAdj();
        cb.addEventListener('change', () => {
            setAdj(cb.checked);
            buildOverlay();
            syncBanner();
            if (cb.checked) {
                // Remember the raw floats currently in the native fields so disabling can
                // put them back (otherwise the user is left looking at the translated
                // actual floats we pushed to the URL).
                localStorage.setItem('cftuh_raw_min', realMin().value || '');
                localStorage.setItem('cftuh_raw_max', realMax().value || '');
                // Carry the numbers the user already sees straight across: the displayed
                // value stays the same, it's just now read as an ADJUSTED (0..1) value.
                // (No actual->adjusted conversion — that's what produced the bogus
                // negative minimum.) Then translate+refetch.
                const aMinEl = adjMinEl(), aMaxEl = adjMaxEl();
                if (aMinEl) aMinEl.value = realMin().value;
                if (aMaxEl) aMaxEl.value = realMax().value;
                applyAdjusted();      // <-- run the current query immediately on enable
            } else {
                // Back to native wear: restore the raw floats that were active before
                // adjusted mode, replacing the translated actual values now in the URL.
                const rm = localStorage.getItem('cftuh_raw_min') || '';
                const rx = localStorage.getItem('cftuh_raw_max') || '';
                navFloat(rm === '' ? null : rm, rx === '' ? null : rx);
            }
        });
    }

    // Keep the checkbox's enabled state in sync with the current search: adjusted mode only
    // works for a single eligible trade-up input skin, so grey it out otherwise and explain
    // why on hover. If the user navigates away from such a search while it's on, turn it back
    // off so the overlay doesn't linger.
    const INELIGIBLE_HINT =
        'Adjusted floats only work when the search is filtered to one eligible trade-up ' +
        'input skin (a specific skin that trades up to a higher rarity within its ' +
        'collection). Pick an eligible skin to enable this.';
    function refreshToggle() {
        const cb = document.querySelector('#cftuh-adjusted');
        if (!cb) return;
        const lbl = cb.closest('.cftuh-adjusted-toggle');
        const skin = singleSkin();
        cb.disabled = !skin;
        if (lbl) {
            lbl.classList.toggle('cftuh-disabled', !skin);
            lbl.title = skin ? '' : INELIGIBLE_HINT;
        }
        if (!skin && isAdj()) {
            setAdj(false);
            cb.checked = false;
            buildOverlay();
            syncBanner();
        }
    }

    function syncBanner() {
        let b = document.querySelector('#cftuh-banner');
        if (isAdj()) {
            if (!b) {
                b = document.createElement('div'); b.id = 'cftuh-banner'; b.className = 'cftuh-banner';
                const host = document.querySelector('.results, .listing-grid, main') || document.body;
                host.parentElement ? host.parentElement.insertBefore(b, host) : document.body.prepend(b);
            }
            b.textContent = 'Adjusted-float mode: results filtered to your adjusted-float range for this skin.';
            b.style.display = '';
        } else if (b) b.style.display = 'none';
    }

    // ---------- adjusted-float display + trade-up links ----------
    function decorateCards() {
        // Only the <item-card> element — each one contains a nested .item-card, so
        // selecting both tag AND class matched every card twice and inserted the
        // adjusted-float line twice.
        document.querySelectorAll('item-card').forEach(card => {
            if (card.dataset.cftuhDone || card.querySelector('.cftuh-tu-float')) return;
            const wear = card.querySelector('.wear'), ti = card.querySelector('.text-info');
            const nm = (card.querySelector('.item-name') || {}).textContent;
            const fv = parseFloat(wear && wear.textContent);
            const e = nm && NAME_MAP[nm.trim()];
            if (!wear || !ti || !e || !Number.isFinite(fv)) return;
            const [, , mn, mx, elig] = e;
            if (!elig) { card.dataset.cftuhDone = '1'; return; }
            const d = document.createElement('div');
            d.className = 'cftuh-tu-float'; d.textContent = 'TU: ' + actualToAdj(fv, mn, mx).toFixed(4);
            ti.insertAdjacentElement('afterend', d);
            card.dataset.cftuhDone = '1';
        });
    }
    function linkTradeupTitles() {
        // Only the items actually added to the contract have an editable float <input>;
        // the left-pane picker cards (also <app-trade-up-item>) don't, so they're skipped.
        document.querySelectorAll('app-trade-up-item').forEach(item => {
            const fi = item.querySelector('input');
            if (!fi) return;
            // Pick the SMALLEST element whose text contains "|" — that's the skin title.
            // (CSFloat restructured these cards; the old "first element with | and (" now
            // matches a big wrapper whose text is the whole card, breaking name lookup.)
            const titleEl = Array.from(item.querySelectorAll('div, span'))
                .filter(d => /\|/.test(d.textContent))
                .sort((a, b) => a.textContent.length - b.textContent.length)[0];
            if (!titleEl || titleEl.dataset.cftuhLinked) return;
            const raw = titleEl.textContent
                .replace(/\s+/g, ' ')
                .replace(/^(StatTrak™|Souvenir)\s+/i, '')   // NAME_MAP keys have no quality prefix
                .replace(/\s*\([^)]*\)\s*$/, '')            // drop trailing "(Factory New)" wear
                .trim();
            const e = NAME_MAP[raw]; if (!e) return;
            titleEl.style.cursor = 'pointer';
            titleEl.classList.add('cftuh-link');
            titleEl.addEventListener('click', () => {
                // read the float live — the user can edit it after the link is attached
                const f = parseFloat(fi.value);
                const url = 'https://csfloat.com/search?sort_by=lowest_price&type=buy_now' +
                    (Number.isFinite(f) ? '&max_float=' + f : '') +
                    '&def_index=' + e[0] + '&paint_index=' + e[1];
                window.open(url, '_blank');
            });
            titleEl.dataset.cftuhLinked = '1';
        });
    }

    async function boot() {
        await loadSchema();
        const tick = () => {
            injectToggle(); refreshToggle(); buildOverlay();
            decorateCards(); linkTradeupTitles(); syncBanner();
        };
        tick();
        new MutationObserver(() => tick()).observe(document.body, { childList: true, subtree: true });
    }
    boot();
})();