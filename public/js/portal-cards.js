/* ============================================================
   CHIDY PRIME — PORTAL CARDS
   Replaces the home-page category rows with big stacked portal
   cards (one per category). Clicking a card:
     - if visitor is signed up → runs the app's own filter that
       shows games grid + back button (untouched)
     - if not signed up → opens the existing signup modal, then
       opens the tapped category after signup completes.
   No backend or auth changes.
   ============================================================ */

(function () {
    'use strict';
    if (typeof window === 'undefined') return;

    const STORAGE_KEY   = 'chidy_visitor';
    const THUMB_STORAGE = 'chidy_portal_thumbs_v1';

    // ── helpers ────────────────────────────────────────────
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
        }[c]));
    }

    function isSignedUp() {
        try {
            const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            return !!(v && (v.name || v.id));
        } catch (_) { return false; }
    }

    // Pick a thumbnail for a category:
    //  1. admin-uploaded thumb (cache filled by /api/portal-thumbs later)
    //  2. poster of the first game in that category
    //  3. empty placeholder
    function pickThumb(category, games) {
        try {
            const cache = JSON.parse(localStorage.getItem(THUMB_STORAGE) || '{}');
            if (cache[category]) return cache[category];
        } catch (_) {}
        const first = (games || []).find(g => g.image_url || g.poster_url || g.image);
        if (first) return first.image_url || first.poster_url || first.image;
        return '';
    }

    // Category icons — matches the app's own map
    const ICON_MAP = {
        'HOT POST':       'fa-fire',
        'TANZANIA GAMES': 'fa-globe-africa',
        'FREE GAMES':     'fa-gift',
        'PPSSPP GAMES':   'fa-gamepad',
        'ANDROID GAMES':  'fa-mobile-alt',
        'PC GAMES':       'fa-desktop'
    };
    function iconFor(cat) { return ICON_MAP[cat] || 'fa-folder'; }

    // ── navigation ─────────────────────────────────────────
    let _pendingCategory = null;

    function openCategory(catName) {
        if (typeof window.filterByCategory === 'function') {
            window.filterByCategory(catName);
        } else {
            window.currentCategory = catName;
            if (typeof window.renderCategories === 'function' && Array.isArray(window.allGames)) {
                window.renderCategories(window.allGames);
            }
        }
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
    }

    function openSignupForCategory(catName) {
        _pendingCategory = catName;

        // Add a small hint above the signup subtitle so the user knows why
        // the modal appeared. Idempotent.
        const subtitle = document.querySelector('.signup-subtitle');
        if (subtitle && !document.getElementById('signup-gate-hint')) {
            const hint = document.createElement('div');
            hint.id = 'signup-gate-hint';
            hint.className = 'signup-gate-hint';
            hint.innerHTML = `<i class="fas fa-lock"></i> Jisajili kwanza kufungua <b>${esc(catName)}</b>`;
            subtitle.parentNode.insertBefore(hint, subtitle.nextSibling);
        } else if (document.getElementById('signup-gate-hint')) {
            document.getElementById('signup-gate-hint').innerHTML =
                `<i class="fas fa-lock"></i> Jisajili kwanza kufungua <b>${esc(catName)}</b>`;
        }

        // Open the app's existing signup modal
        if (typeof window.openSignupModal === 'function') {
            window.openSignupModal();
        } else {
            const modal = document.getElementById('signupOverlay') ||
                          document.querySelector('[id*="signup"][class*="overlay"]');
            if (modal) {
                modal.classList.add('show');
                modal.style.display = 'flex';
            }
        }
    }

    // Poll for signup completion; when the cookie shows up, open the pending
    // category (after the welcome modal has a moment to close).
    function watchForSignup() {
        if (!_pendingCategory) return;
        const start = Date.now();
        const iv = setInterval(() => {
            if (isSignedUp()) {
                clearInterval(iv);
                const cat = _pendingCategory;
                _pendingCategory = null;
                setTimeout(() => {
                    // Re-render portal so buttons flip to "FUNGUA GAMES"
                    if (Array.isArray(window.allGames)) {
                        try { renderPortal(window.allGames); } catch (_) {}
                    }
                    openCategory(cat);
                }, 900);
            } else if (Date.now() - start > 120000) {
                clearInterval(iv);
                _pendingCategory = null;
            }
        }, 500);
    }

    // ── rendering ──────────────────────────────────────────
    function renderPortalCard(cat, games) {
        const thumb   = pickThumb(cat, games);
        const count   = games.length;
        const signed  = isSignedUp();
        const btnCls  = signed ? '' : 'is-signup';
        const btnIcon = signed ? 'fa-gamepad'   : 'fa-user-plus';
        const btnText = signed ? 'FUNGUA GAMES' : 'SIGNUP';

        return `
        <div class="chidy-portal-card" data-portal-category="${esc(cat)}"
             role="button" tabindex="0" aria-label="${esc(cat)}">
          <div class="chidy-portal-inner">
            <div class="chidy-portal-head">
              <span class="chidy-portal-icon"><i class="fas ${iconFor(cat)}"></i></span>
              <div class="chidy-portal-name">${esc(cat)}</div>
              <span class="chidy-portal-count">${count} ${count === 1 ? 'game' : 'games'}</span>
            </div>
            <div class="chidy-portal-thumb">
              ${thumb
                ? `<img src="${esc(thumb)}" alt="${esc(cat)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('is-empty');this.remove();">`
                : `<div class="chidy-portal-thumb-empty"><i class="fas ${iconFor(cat)}"></i>${esc(cat)}</div>`
              }
            </div>
            <button type="button" class="chidy-portal-btn ${btnCls}"
                    data-portal-cta="${esc(cat)}">
              <i class="fas ${btnIcon}"></i> ${btnText}
            </button>
          </div>
        </div>`;
    }

    function renderPortal(games) {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;

        const grouped = {};
        (games || []).forEach(g => {
            const c = g.category || 'HOT POST';
            if (!grouped[c]) grouped[c] = [];
            grouped[c].push(g);
        });

        const orderSrc = Array.isArray(window.categoryOrder) && window.categoryOrder.length
            ? window.categoryOrder
            : Object.keys(ICON_MAP);
        const keys = [];
        orderSrc.forEach(k => { if (grouped[k]) keys.push(k); });
        Object.keys(grouped).forEach(k => { if (!keys.includes(k)) keys.push(k); });

        if (!keys.length) {
            container.innerHTML = `
              <div class="no-results">
                <i class="fas fa-ghost"></i>
                <p>Hakuna games bado. Rudi baadaye!</p>
              </div>`;
            container.classList.remove('chidy-portal');
            return;
        }

        container.classList.add('chidy-portal');
        container.innerHTML = keys.map(k => renderPortalCard(k, grouped[k])).join('');
    }

    // Monkey-patch: home view → portal cards, category view → app's grid
    function patchRenderCategories() {
        if (typeof window.renderCategories !== 'function') return false;
        if (window.renderCategories.__chidyPortalPatched) return true;

        const original = window.renderCategories;
        window.renderCategories = function patchedRender(games) {
            const inCatView = !!window.currentCategory;
            if (inCatView) {
                // Category view — untouched
                const c = document.getElementById('categoriesContainer');
                if (c) c.classList.remove('chidy-portal');
                return original.call(this, games);
            }
            renderPortal(games);
        };
        window.renderCategories.__chidyPortalPatched = true;
        return true;
    }

    // ── event delegation ───────────────────────────────────
    document.addEventListener('click', function (e) {
        // CTA button click has priority
        const cta = e.target.closest('[data-portal-cta]');
        if (cta) {
            e.preventDefault();
            e.stopPropagation();
            const cat = cta.getAttribute('data-portal-cta');
            if (isSignedUp()) openCategory(cat);
            else { openSignupForCategory(cat); watchForSignup(); }
            return;
        }
        // Whole-card click
        const card = e.target.closest('[data-portal-category]');
        if (card) {
            const cat = card.getAttribute('data-portal-category');
            if (isSignedUp()) openCategory(cat);
            else { openSignupForCategory(cat); watchForSignup(); }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('[data-portal-category]');
        if (!card) return;
        e.preventDefault();
        const cat = card.getAttribute('data-portal-category');
        if (isSignedUp()) openCategory(cat);
        else { openSignupForCategory(cat); watchForSignup(); }
    });

    // ── boot ───────────────────────────────────────────────
    function boot() {
        if (patchRenderCategories()) {
            if (Array.isArray(window.allGames) && !window.currentCategory) {
                try { window.renderCategories(window.allGames); } catch (_) {}
            }
            return;
        }
        // App hasn't defined renderCategories yet — retry
        setTimeout(boot, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
