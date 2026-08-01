/* =========================================================================
   HealthMate shared theme manager.
   Switches data-theme="light|dark" on <html>, persists to localStorage,
   syncs every [data-theme-toggle] button and [data-theme-icon] icon.
   Include the tiny pre-paint snippet below in each <head> to avoid FOUC:

   <script>(function(){try{var t=localStorage.getItem('hm-theme');if(!t){t=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})();</script>
   ========================================================================= */

window.HMTheme = (function () {
    'use strict';

    var KEY = 'hm-theme';
    var ICONS = { light: '\u263E', dark: '\u2600' }; // ☾ / ☀
    var LABELS = { light: 'Switch to dark mode', dark: 'Switch to light mode' };

    function current() {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function apply(theme, persist) {
        var isDark = theme === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

        if (persist !== false) {
            try { localStorage.setItem(KEY, isDark ? 'dark' : 'light'); } catch (e) { /* noop */ }
        }

        document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
            var icon = btn.querySelector('[data-theme-icon]');
            if (icon) {
                icon.textContent = isDark ? ICONS.light : ICONS.dark;
            } else {
                btn.textContent = isDark ? ICONS.light : ICONS.dark;
            }
            btn.setAttribute('aria-label', isDark ? LABELS.light : LABELS.dark);
            btn.setAttribute('title', isDark ? LABELS.light : LABELS.dark);
        });
    }

    function toggle() {
        apply(current() === 'dark' ? 'light' : 'dark');
    }

    function resolve() {
        var saved = null;
        try { saved = localStorage.getItem(KEY); } catch (e) { /* noop */ }
        if (saved === 'light' || saved === 'dark') return saved;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
    }

    function init() {
        apply(resolve(), false);

        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
            if (btn) toggle();
        });

        window.addEventListener('storage', function (e) {
            if (e.key === KEY) apply(resolve(), false);
        });
    }

    return {
        init: init,
        toggle: toggle,
        apply: apply,
        current: current,
        resolve: resolve
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.HMTheme.init);
} else {
    window.HMTheme.init();
}
