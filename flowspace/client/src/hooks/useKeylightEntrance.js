import { useEffect, useRef } from 'react';

/**
 * useKeylightEntrance
 * Orchestrates the exact Web Animations API master timeline on mount.
 */
export function useKeylightEntrance() {
  const containerRef = useRef(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Check motion preference & WAAPI support
    if (
      !('animate' in document.documentElement) ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ) {
      return;
    }

    root.classList.add('is-entering');

    let started = false;
    let anims = [];
    let restores = [];

    const EXPO = 'cubic-bezier(.16,1,.3,1)';
    const QUINT = 'cubic-bezier(.22,1,.36,1)';
    const DRAW = 'cubic-bezier(.65,0,.35,1)';
    const SOFT = 'cubic-bezier(.33,1,.68,1)';

    const failsafe = setTimeout(() => {
      root.classList.remove('is-entering');
    }, 3000);

    const start = () => {
      if (started) return;
      started = true;
      clearTimeout(failsafe);
      try {
        run();
      } catch (e) {
        root.classList.remove('is-entering');
      }
    };

    // Wait for fonts or max 250ms
    Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => setTimeout(r, 250)),
    ]).then(() => requestAnimationFrame(start));

    function run() {
      const $ = (s, c = root) => c.querySelector(s);
      const $$ = (s, c = root) => [...c.querySelectorAll(s)];
      const W = window.innerWidth;
      const H = window.innerHeight;

      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;width:calc(100 * var(--u))';
      document.body.appendChild(probe);
      const u = probe.getBoundingClientRect().width / 100 || 1;
      probe.remove();
      const k = window.matchMedia('(max-width:739.98px)').matches ? 0.75 : 1;
      const d = (px) => +(px * u * k).toFixed(2);

      const inView = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
      };

      const play = (el, frames, delay, duration, easing, pseudoElement) => {
        if (!el) return;
        const opts = { delay, duration, easing, fill: 'both' };
        if (pseudoElement) opts.pseudoElement = pseudoElement;
        anims.push(el.animate(frames, opts));
      };

      const RISE = (el, t, dur = 950, stagger = 90) => {
        if (!el || !inView(el)) return t;
        splitLines(el).forEach((line, i) =>
          play(
            line,
            [{ transform: 'translateY(125%)' }, { transform: 'none' }],
            t + i * stagger,
            dur,
            EXPO
          )
        );
      };

      const SETTLE = (el, t, y = 10, dur = 640, scale) => {
        if (!el || !inView(el)) return;
        const from = `translate3d(0,${d(y)}px,0)` + (scale ? ` scale(${scale})` : '');
        play(el, [{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], t, dur, QUINT);
      };

      const LIFT = (el, t) => {
        if (!el || !inView(el)) return;
        play(
          el,
          [
            { opacity: 0, transform: `translate3d(0,${d(28)}px,0) scale(.985)` },
            { opacity: 1, transform: 'none' },
          ],
          t,
          1050,
          EXPO
        );
      };

      const DRAWN = (el, pseudo, t, origin) => {
        if (!el || !inView(el)) return;
        const base = window.getComputedStyle(el, pseudo).transform;
        const b = base && base !== 'none' ? base + ' ' : '';
        play(
          el,
          [
            { opacity: 1, transformOrigin: origin, transform: b + 'scaleX(0)' },
            { opacity: 1, transformOrigin: origin, transform: b + 'scaleX(1)' },
          ],
          t,
          760,
          DRAW,
          pseudo
        );
      };

      const PRESENCE = (el, t, dur = 520) => {
        if (!el || !inView(el)) return;
        play(el, [{ opacity: 0 }, { opacity: 1 }], t, dur, SOFT);
      };

      function splitLines(el) {
        const original = el.innerHTML;
        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const words = el.textContent.trim().split(/\s+/);
        el.innerHTML = words.map((w) => `<span class="e-w">${esc(w)}</span>`).join(' ');
        const lines = [];
        let top = null;
        $$('.e-w', el).forEach((s) => {
          if (s.offsetTop !== top) {
            top = s.offsetTop;
            lines.push([]);
          }
          lines[lines.length - 1].push(s.textContent);
        });
        el.innerHTML = lines
          .map((l) => `<span class="e-line"><span class="e-in">${l.map(esc).join(' ')}</span></span>`)
          .join('');
        restores.push(() => {
          el.innerHTML = original;
        });
        return $$('.e-in', el);
      }

      // Master Timeline orchestration
      SETTLE($('.logo__mark'), 0, 0, 760, 0.86);
      if (inView($('.logo__word'))) {
        play(
          $('.logo__word'),
          [
            { opacity: 1, clipPath: 'inset(-30% 100% -30% 0)', transform: `translate3d(${-d(8)}px,0,0)` },
            { opacity: 1, clipPath: 'inset(-30% -6% -30% 0)', transform: 'none' },
          ],
          90,
          860,
          EXPO
        );
      }

      RISE($('.hero__title'), 160);
      RISE($('.panel__title'), 320, 860);
      SETTLE($('.panel__sub'), 430, 8, 600);
      SETTLE($('.passkey-slot'), 500, 10, 680, 0.985);
      SETTLE($('.demo-pills'), 530, 8, 600);

      const orTop = $('.or--top');
      if (orTop) {
        DRAWN(orTop, '::before', 560, 'right center');
        DRAWN(orTop, '::after', 560, 'left center');
        PRESENCE($('.or--top span'), 600, 480);
      }

      SETTLE($('.hero__copy'), 470, 12, 720);

      $$('.form .field, .form .row').forEach((el, i) => SETTLE(el, 620 + i * 70, 10, 620));
      SETTLE($('.cta-slot'), 840, 10, 680, 0.985);

      $$('.card')
        .filter(inView)
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
        .forEach((c, i) => LIFT(c, 620 + i * 90));

      const or = $('.or:not(.or--top)');
      if (or) {
        DRAWN(or, '::before', 900, 'right center');
        DRAWN(or, '::after', 900, 'left center');
        PRESENCE($('.or:not(.or--top) span'), 940, 480);
      }

      $$('.provider').forEach((el, i) => SETTLE(el, 960 + i * 60, 8, 560));

      const rule = $('.trust__rule');
      if (rule) {
        DRAWN(rule, '::before', 1000, 'right center');
        DRAWN(rule, '::after', 1000, 'left center');
        PRESENCE($('.trust__label'), 1060);
      }
      PRESENCE($('.switch'), 1080);
      $$('.marks__row').forEach((el, i) => PRESENCE(el, 1140 + i * 80, 600));
      $$('.auth__foot a').forEach((el, i) => PRESENCE(el, 1160 + i * 40, 480));
      PRESENCE($('.legal'), 1280, 520);

      // Lift pre-roll veil
      root.classList.remove('is-entering');

      // Stillness: cancel and clean up when timeline resolves
      Promise.all(anims.map((a) => a.finished)).then(
        () => {
          anims.forEach((a) => a.cancel());
          restores.forEach((f) => f());
        },
        () => restores.forEach((f) => f())
      );
    }

    return () => {
      clearTimeout(failsafe);
      anims.forEach((a) => a.cancel());
      restores.forEach((f) => f());
    };
  }, []);

  return containerRef;
}
