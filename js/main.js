/* RealShine — interactions & motion. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------------------
     1. Water wash — a wave rises over the screen, runs `mid` while the
        screen is covered, then carries on up and away.
     ------------------------------------------------------------------ */
  const wash = $('#wash');
  let washing = false;
  const runWash = mid => {
    if (reduced || !wash || washing) { mid(); return; }
    washing = true;
    wash.classList.remove('is-out');
    void wash.offsetWidth;
    wash.classList.add('is-in');
    setTimeout(() => {
      mid();
      requestAnimationFrame(() => {
        wash.classList.add('is-out');
        wash.classList.remove('is-in');
        setTimeout(() => {
          wash.style.transition = 'none';
          wash.classList.remove('is-out');
          void wash.offsetWidth;
          wash.style.transition = '';
          washing = false;
        }, 800);
      });
    }, 620);
  };

  /* Intro: logo pops in on foam with bubbles, then the wave washes it away */
  const intro = $('#intro');
  let seen = false;
  try { seen = sessionStorage.getItem('rs-intro') === '1'; sessionStorage.setItem('rs-intro', '1'); } catch (e) {}
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    runWash(() => {
      intro && intro.classList.add('is-gone');
      root.classList.add('is-loaded');
    });
  };
  if (reduced || !intro) {
    root.classList.add('is-loaded');
    intro && intro.classList.add('is-gone');
  } else {
    setTimeout(reveal, seen ? 600 : 2100);
    intro.addEventListener('click', reveal);
  }

  /* ------------------------------------------------------------------
     2. Split headings into words for a staggered rise
     ------------------------------------------------------------------ */
  $$('.split').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--wi:${i}"><span>${w}</span></span>`).join(' ');
  });

  /* ------------------------------------------------------------------
     3. Reveal on scroll
     ------------------------------------------------------------------ */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  $$('.reveal, .split').forEach(el => io.observe(el));

  /* ------------------------------------------------------------------
     4. Count-up stats
     ------------------------------------------------------------------ */
  const countUp = el => {
    const target = +el.dataset.count;
    if (reduced) { el.textContent = target; return; }
    const t0 = performance.now(), dur = 1400;
    const step = t => {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const statsIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      // wait for the intro to lift before counting
      setTimeout(() => countUp(e.target), root.classList.contains('is-loaded') ? 300 : 2400);
      statsIO.unobserve(e.target);
    });
  });
  $$('[data-count]').forEach(el => statsIO.observe(el));

  /* ------------------------------------------------------------------
     5. Before / after sliders — the "shine" wipes left → right
     ------------------------------------------------------------------ */
  $$('[data-ba]').forEach(fig => {
    const stage = $('.ba__stage', fig);
    const range = $('.ba__range', fig);
    let pos = 0, anim = null, dragging = false;

    const set = v => {
      pos = clamp(v, 0, 100);
      stage.style.setProperty('--pos', pos.toFixed(2));
      range.value = Math.round(pos);
    };
    const stop = () => { if (anim) cancelAnimationFrame(anim); anim = null; };

    // animate through a list of [position, duration] keyframes
    const tween = (frames) => {
      stop();
      let i = 0, from = pos, t0 = performance.now();
      const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const tick = t => {
        const [to, dur] = frames[i];
        const p = clamp((t - t0) / dur, 0, 1);
        set(from + (to - from) * ease(p));
        if (p === 1) {
          i++; if (i >= frames.length) { anim = null; return; }
          from = pos; t0 = t;
        }
        anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
    };

    const fromEvent = e => {
      const r = stage.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    };

    stage.addEventListener('pointerdown', e => {
      stop(); dragging = true;
      stage.classList.add('is-dragging');
      stage.setPointerCapture(e.pointerId);
      tween([[fromEvent(e), 260]]);
    });
    stage.addEventListener('pointermove', e => {
      if (!dragging) return;
      stop(); set(fromEvent(e));
    });
    const end = () => { dragging = false; stage.classList.remove('is-dragging'); };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    range.addEventListener('input', () => { stop(); set(+range.value); });

    // First time it scrolls into view: sweep the clean side across, then settle.
    if (reduced) { set(50); return; }
    set(0);
    const sweepIO = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      sweepIO.disconnect();
      setTimeout(() => { if (!dragging) tween([[100, 1500], [50, 900]]); }, 350);
    }, { threshold: 0.55 });
    sweepIO.observe(stage);
  });

  /* ------------------------------------------------------------------
     6. Pricing toggle (car / SUV)
     ------------------------------------------------------------------ */
  const toggle = $('.toggle');
  if (toggle) {
    const pill = $('.toggle__pill', toggle);
    const btns = $$('.toggle__btn', toggle);
    const place = btn => {
      pill.style.width = btn.offsetWidth + 'px';
      pill.style.transform = `translateX(${btn.offsetLeft}px)`;
    };
    btns.forEach(btn => btn.addEventListener('click', () => {
      btns.forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', b === btn); });
      place(btn);
      $$('.price').forEach(p => {
        const v = p.dataset[btn.dataset.size];
        if (p.textContent === v) return;
        p.classList.remove('is-flip'); void p.offsetWidth; p.classList.add('is-flip');
        setTimeout(() => { p.textContent = v; }, reduced ? 0 : 230);
      });
    }));
    const init = () => place($('.toggle__btn.is-active', toggle));
    init();
    window.addEventListener('resize', init);
    document.fonts && document.fonts.ready.then(init);
  }

  /* ------------------------------------------------------------------
     7. Header hides on scroll-down, returns on scroll-up
     ------------------------------------------------------------------ */
  const header = $('#header');
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-hidden', y > lastY && y > 500 && !$('#nav').classList.contains('is-open'));
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* "Our work" — swipe left/right carousel with arrow buttons */
  const track = $('#workTrack');
  if (track) {
    const step = () => ($('.shot', track).offsetWidth + 18) * (window.innerWidth >= 900 ? 2 : 1);
    const prev = $('.work__prev'), next = $('.work__next');
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 4;
      prev && (prev.disabled = track.scrollLeft <= 4);
      next && (next.disabled = track.scrollLeft >= max);
    };
    prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // one gentle nudge when it first comes into view, to show it swipes
    if (!reduced) {
      const nudgeIO = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        nudgeIO.disconnect();
        track.classList.add('is-nudging');
        setTimeout(() => track.classList.remove('is-nudging'), 1400);
      }, { threshold: 0.6 });
      nudgeIO.observe(track);
    }
  }

  /* current-section highlight in nav */
  const navLinks = $$('.nav a[href^="#"]:not(.btn)');
  const secIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); s && secIO.observe(s); });

  /* ------------------------------------------------------------------
     8. Mobile menu
     ------------------------------------------------------------------ */
  const burger = $('#burger'), nav = $('#nav');
  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
    header.classList.toggle('menu-open', open);
    if (open) header.classList.remove('is-hidden');
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeLightbox(); } });

  /* ------------------------------------------------------------------
     9. Water-wash transition for in-page links
     ------------------------------------------------------------------ */
  $$('a[data-wipe]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();

    // pre-select a package in the form when a "Book X" button was used
    if (a.dataset.package) { const sel = $('#f-package'); if (sel) sel.value = a.dataset.package; }

    runWash(() => {
      setMenu(false);
      const y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'auto' });
      history.replaceState(null, '', id === '#top' ? location.pathname : id);
      header.classList.remove('is-hidden');
    });
  }));

  /* ------------------------------------------------------------------
     10. FAQ — animate open & close of <details>
     ------------------------------------------------------------------ */
  $$('.qa').forEach(d => {
    const sum = $('summary', d);
    sum.addEventListener('click', e => {
      if (reduced) return;
      e.preventDefault();
      if (d.open) {
        d.classList.add('is-closing');
        setTimeout(() => { d.open = false; d.classList.remove('is-closing'); }, 480);
      } else {
        d.open = true;
        d.classList.remove('is-opening');
        // force the 0fr → 1fr transition
        const body = $('.qa__body', d);
        body.style.gridTemplateRows = '0fr';
        void body.offsetHeight;
        body.style.gridTemplateRows = '';
      }
    });
  });

  /* ------------------------------------------------------------------
     11. Gallery lightbox
     ------------------------------------------------------------------ */
  const lb = $('#lightbox');
  const lbImg = $('img', lb);
  let lastFocus = null;
  function closeLightbox() {
    if (lb.hidden) return;
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; document.body.classList.remove('is-locked'); }, reduced ? 0 : 400);
    lastFocus && lastFocus.focus();
  }
  $$('.shot').forEach(btn => btn.addEventListener('click', () => {
    lastFocus = btn;
    const img = $('img', btn);
    lbImg.src = btn.dataset.full;
    lbImg.alt = img.alt;
    lb.hidden = false;
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
    $('.lightbox__close', lb).focus();
  }));
  lb.addEventListener('click', e => { if (e.target !== lbImg) closeLightbox(); });

  /* ------------------------------------------------------------------
     12. Booking form → pre-filled WhatsApp message
     ------------------------------------------------------------------ */
  const form = $('#bookForm');
  const err = $('#formError');
  const dateInput = $('#f-date');
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = $$('[required]', form).filter(f => !f.value.trim());
    $$('.field', form).forEach(f => f.classList.remove('is-invalid'));
    if (bad.length) {
      bad.forEach(f => f.closest('.field').classList.add('is-invalid'));
      err.textContent = 'Please fill in: ' + bad.map(f => $(`label[for="${f.id}"]`).childNodes[0].textContent.trim()).join(', ') + '.';
      bad[0].focus();
      return;
    }
    err.textContent = '';
    const d = Object.fromEntries(new FormData(form));
    const date = d.date ? new Date(d.date + 'T12:00').toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Flexible';
    const msg = [
      'Hi RealShine! I\'d like to book a valet.',
      '',
      `Name: ${d.name}`,
      `Phone: ${d.phone}`,
      `Area: ${d.area}`,
      `Vehicle: ${d.vehicle}`,
      `Package: ${d.package}`,
      `Preferred date: ${date}`,
      d.notes ? `Notes: ${d.notes}` : ''
    ].filter(Boolean).join('\n');
    window.open('https://wa.me/353852724902?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

  // placeholder "Pay online" button
  const pay = $('.pay-online');
  pay && pay.addEventListener('click', e => e.preventDefault());

  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
})();
