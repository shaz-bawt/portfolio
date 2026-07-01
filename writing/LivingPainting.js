/* =====================================================================
   Stratum-Break — "Living Painting" menu engine v2  (Canvas2D, no deps)
   ---------------------------------------------------------------------
   Two modes, chosen by the SCENE config:
     • single scene  (scene.layers)          — the original proof
     • day/night cycle (scene.cycle === true) — crossfade two geometry-
       aligned layer sets over a time-of-day driver, with an arcing
       sun/moon, graded ambient light, and day<->night element swaps.

   Patterns: delta-time loop, sine virtual-camera (seamless), per-layer
   parallax + cover-fit + overscan, pooled particles w/ blend modes,
   weighted rare-event scheduler, prefers-reduced-motion, DPR-aware.
   ES-module port (game integration): the original browser IIFE is unwrapped so
   `LivingPainting` is exported directly. Internals still use window/document/rAF
   (browser-only), which is fine inside the Phaser game.
===================================================================== */

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const lerpRGB = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const parseRGB = (s) => s.split(',').map(Number);

  // --- pre-rendered soft radial sprite ------------------------------
  function softSprite(size, color) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(r, r, r, 0, TAU); g.fill();
    return c;
  }
  // soft petal sprite (alpha)
  function petalSprite(color) {
    const s = 32, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    g.fillStyle = color; g.translate(s / 2, s / 2);
    g.beginPath(); g.ellipse(0, 0, 5, 9, 0, 0, TAU); g.fill();
    return c;
  }

  // --- generic pooled particle --------------------------------------
  class Particle {
    constructor() { this.dead = true; }
    reset(o) { Object.assign(this, o); this.age = 0; this.dead = false; }
    step(dt) {
      this.age += dt;
      if (this.age >= this.life) { this.dead = true; return; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx += (this.ax || 0) * dt; this.vy += (this.ay || 0) * dt;
      if (this.wob) this.phase = (this.phase || 0) + dt;
    }
    env() {
      const a = this.age / this.life;
      if (a < 0.15) return a / 0.15;
      if (a > 0.70) return (1 - a) / 0.30;
      return 1;
    }
  }

  class System {
    constructor({ max, blend, spawn, sprite, kind }) {
      this.max = max; this.blend = blend; this.spawn = spawn; this.sprite = sprite; this.kind = kind || 'generic';
      this.pool = Array.from({ length: max }, () => new Particle());
      this.live = max;
    }
    scaleTo(vw, vh) { this.live = Math.max(1, Math.round(this.max * clamp((vw * vh) / (1920 * 1080), 0.35, 1.4))); }
    update(dt, vw, vh, reduced, mult) {
      const target = Math.round(this.live * (reduced ? 0.12 : 1) * clamp(mult == null ? 1 : mult, 0, 1));
      let alive = 0;
      for (const p of this.pool) { if (!p.dead) { p.step(dt); if (!p.dead) alive++; } }
      let need = target - alive;
      for (const p of this.pool) { if (need <= 0) break; if (p.dead) { p.reset(this.spawn(vw, vh)); need--; } }
    }
    draw(ctx, cam) {
      ctx.save();
      ctx.globalCompositeOperation = this.blend;
      for (const p of this.pool) {
        if (p.dead) continue;
        let a = p.env() * (p.maxA || 1);
        if (p.blink) a *= 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((p.phase || 0) * (p.blinkSpd || 3) + (p.seed || 0)));
        if (a <= 0.002) continue;
        ctx.globalAlpha = a;
        let dx = 0;
        if (p.wob) dx = Math.sin((p.phase || 0) * p.wob + (p.seed || 0)) * (p.wobAmp || 0);
        const px = p.x + dx + cam.x * (p.par || 0);
        const py = p.y + cam.y * (p.par || 0);
        const s = p.size, spr = p.tint || this.sprite;
        ctx.drawImage(spr, px - s, py - s, s * 2, s * 2);
      }
      ctx.restore();
    }
  }

  // --- rain: parallax, wind-angled streaks (line-drawn, screen blend) -
  class RainSystem {
    constructor(o) { this.o = o || {}; this.max = this.o.count || 340; this.drops = []; this.live = this.max; this.kind = 'rain'; }
    _mk(vw, vh, any) {
      const n = Math.random();
      return { x: rand(-0.15, 1.15) * vw, y: any ? rand(-vh * 0.2, vh) : -rand(0, vh * 0.4),
        len: lerp(10, 30, n), spd: lerp(760, 1400, n), a: lerp(0.10, 0.34, n), w: lerp(0.7, 1.7, n), par: lerp(0.08, 0.55, n) };
    }
    scaleTo(vw, vh) {
      this.live = Math.max(30, Math.round(this.max * clamp((vw * vh) / (1920 * 1080), 0.4, 1.6)));
      this.drops = []; for (let i = 0; i < this.live; i++) this.drops.push(this._mk(vw, vh, true));
    }
    update(dt, vw, vh, reduced, mult) {
      const wind = this.o.wind != null ? this.o.wind : 150;
      const m = reduced ? 0.25 : clamp(mult == null ? 1 : mult, 0, 1);
      this._active = Math.round(this.drops.length * m); this._wind = wind;
      for (let i = 0; i < this._active; i++) {
        const d = this.drops[i]; d.y += d.spd * dt; d.x += wind * dt;
        if (d.y > vh + d.len) { const nd = this._mk(vw, vh, false); Object.assign(d, nd); }
      }
    }
    draw(ctx, cam) {
      const col = this.o.color || '200,222,255', wind = this._wind || 150;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
      const n = this._active != null ? this._active : this.drops.length;
      for (let i = 0; i < n; i++) {
        const d = this.drops[i], slope = (wind / d.spd) * d.len;
        const x = d.x + cam.x * d.par, y = d.y + cam.y * d.par;
        ctx.globalAlpha = d.a; ctx.strokeStyle = `rgba(${col},1)`; ctx.lineWidth = d.w;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + slope, y + d.len); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // --- weighted rare-event scheduler --------------------------------
  class Scheduler {
    constructor(events, gapMin, gapMax) {
      this.events = events; this.gapMin = gapMin; this.gapMax = gapMax;
      this.nextAt = rand(gapMin * 0.4, gapMax * 0.6);
    }
    update(t, oneShots) {
      if (t < this.nextAt) return;
      const ready = this.events.filter(e => t - (e._last || -1e9) >= e.cooldown);
      const total = ready.reduce((s, e) => s + e.weight, 0);
      if (total > 0) {
        let r = Math.random() * total, pick = ready[ready.length - 1];
        for (const e of ready) { if ((r -= e.weight) <= 0) { pick = e; break; } }
        pick._last = t; oneShots.push(pick.make(t));
      }
      this.nextAt = t + rand(this.gapMin, this.gapMax);
    }
  }

  // build a list of particle systems from an fx config block
  function buildFX(fx) {
    const out = [];
    if (!fx) return out;
    if (fx.fog) out.push(new System({ max: fx.fog.count || 7, blend: 'screen', kind: 'fog',
      sprite: softSprite(256, fx.fog.color || 'rgba(220,235,255,1)'),
      spawn: (vw, vh) => ({ x: rand(-0.1, 1.1) * vw, y: rand(0.45, 1.0) * vh, vx: rand(4, 11) * (Math.random() < .5 ? 1 : -1), vy: rand(-1, 1), size: rand(160, 320), life: rand(28, 50), maxA: rand(0.05, 0.13), par: 0.05 }) }));
    if (fx.dust) out.push(new System({ max: fx.dust.count || 100, blend: 'lighter', kind: 'dust',
      sprite: softSprite(24, fx.dust.color || 'rgba(255,246,216,1)'),
      spawn: (vw, vh) => ({ x: rand(0, vw), y: rand(0, vh), vx: rand(-6, 6), vy: rand(-4, 2), size: rand(1, 3), life: rand(8, 20), maxA: rand(0.15, 0.4), par: 0.25 }) }));
    if (fx.petals) { const spr = petalSprite(fx.petals.color || 'rgba(255,200,222,0.95)');
      out.push(new System({ max: fx.petals.count || 40, blend: 'source-over', kind: 'petals',
        sprite: spr,
        spawn: (vw, vh) => ({ x: rand(0, vw), y: rand(-0.1, 1.0) * vh, vx: rand(-14, 6), vy: rand(14, 34), size: rand(5, 9), life: rand(7, 14), maxA: rand(0.5, 0.85), par: 0.45, wob: rand(1.5, 3), wobAmp: rand(8, 18), seed: rand(0, 6) }) })); }
    if (fx.embers) { const sprites = ['#fff1b8', '#ffb347', '#ff8a2a', '#d64a1f'].map(c => softSprite(32, c));
      const sys = new System({ max: fx.embers.count || 46, blend: 'lighter', kind: 'embers', sprite: sprites[1],
        spawn: (vw, vh) => { const band = fx.embers.band || [0.55, 1.0]; return { x: rand(0, vw), y: rand(band[0], band[1]) * vh, vx: rand(-9, 9), vy: rand(-42, -16), ay: -3, size: rand(1.5, 4), life: rand(3, 7), maxA: rand(0.55, 0.9), par: 0.4, _sprites: sprites }; } });
      const base = sys.draw.bind(sys);
      sys.draw = (ctx, cam) => { for (const p of sys.pool) { if (!p.dead && p._sprites) { const a = p.age / p.life; p.tint = a < .25 ? p._sprites[0] : a < .55 ? p._sprites[1] : a < .8 ? p._sprites[2] : p._sprites[3]; } } base(ctx, cam); };
      out.push(sys); }
    if (fx.fireflies) { const spr = softSprite(20, fx.fireflies.color || 'rgba(190,255,150,1)');
      out.push(new System({ max: fx.fireflies.count || 36, blend: 'lighter', kind: 'fireflies', sprite: spr,
        spawn: (vw, vh) => ({ x: rand(0, vw), y: rand(0.4, 1.0) * vh, vx: rand(-10, 10), vy: rand(-8, 8), size: rand(1.5, 3.5), life: rand(6, 14), maxA: rand(0.5, 0.95), par: 0.35, blink: true, blinkSpd: rand(1.5, 4), wob: rand(0.8, 2), wobAmp: rand(6, 16), seed: rand(0, 6), phase: rand(0, 6) }) })); }
    if (fx.rain) out.push(new RainSystem(fx.rain));
    return out;
  }

  function buildEvents(ev, hero) {
    ev = ev || {}; hero = hero || { x: 0.5, y: 0.45, color: '120,200,255' };
    const list = [];
    if (ev.glowPulse !== false) list.push({ weight: 5, cooldown: 22, make: t => new GlowPulse(t, hero, 1.0) });
    if (ev.portalSurge !== false) list.push({ weight: 1.4, cooldown: 80, make: t => new GlowPulse(t, hero, 2.6, true) });
    if (ev.runeFlash !== false) list.push({ weight: 3, cooldown: 30, make: t => new RuneFlash(t, hero) });
    if (ev.birds !== false) list.push({ weight: 2.5, cooldown: 38, make: t => new Crosser(t, 'birds') });
    if (ev.ghost) list.push({ weight: 1.6, cooldown: 70, make: t => new Crosser(t, 'ghost', hero) });
    if (ev.lightning) list.push({ weight: 2, cooldown: 30, make: t => new Lightning(t) });
    return new Scheduler(list, ev.gapMin || 16, ev.gapMax || 40);
  }

  // ===================================================================
  //  MAIN ENGINE
  // ===================================================================
  class LivingPainting {
    constructor(canvas, scene) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.t = 0; this.last = 0; this.fps = 60;
      this.ptr = { x: 0, y: 0 }; this.ptrT = { x: 0, y: 0 };
      this.oneShots = [];
      this.rm = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = this.rm.matches;
      this._onReduced = e => (this.reduced = e.matches);
      this.rm.addEventListener('change', this._onReduced);
      this.setScene(scene);
      this._onResize = () => this._resize();
      this._onPointer = e => {
        this.ptrT.x = (e.clientX / innerWidth - 0.5) * 2;
        this.ptrT.y = (e.clientY / innerHeight - 0.5) * 2;
      };
      addEventListener('resize', this._onResize);
      addEventListener('pointermove', this._onPointer);
    }

    // Stop the rAF loop + remove all window/media listeners (call on scene teardown,
    // so the menu never keeps rendering to a detached canvas — no leaks).
    destroy() {
      this._stopped = true;
      if (this._raf) cancelAnimationFrame(this._raf);
      try { this.rm.removeEventListener('change', this._onReduced); } catch (e) { /* noop */ }
      removeEventListener('resize', this._onResize);
      removeEventListener('pointermove', this._onPointer);
    }

    setScene(scene) {
      this.scene = scene;
      this.cycle = scene.cycle === true;
      this.oneShots = [];
      this.tod = scene.startTod != null ? scene.startTod : 0.5;   // 0.5 = noon
      this.period = scene.cyclePeriod || 110;

      const loadSet = arr => (arr || []).map(L => {
        const img = new Image(); img.src = L.src;
        const layer = { ...L, img, ready: false };
        img.onload = () => (layer.ready = true); img.onerror = () => (layer.ready = false);
        return layer;
      });

      if (this.cycle) {
        this.dayLayers = loadSet(scene.layers.day);
        this.nightLayers = loadSet(scene.layers.night);
        this.dayFX = buildFX(scene.fxDay);
        this.nightFX = buildFX(scene.fxNight);
        this.dayEvents = buildEvents(scene.eventsDay, scene.hero);
        this.nightEvents = buildEvents(scene.eventsNight, scene.hero);
      } else {
        this.layers = loadSet(scene.layers);
        this.systems = buildFX(scene.fx);
        this.scheduler = buildEvents(scene.events, scene.hero);
      }
      this.portalImg = null; this._portalReady = false;
      if (scene.hero && scene.hero.sprite) {
        const im = new Image(); im.src = scene.hero.sprite;
        im.onload = () => (this._portalReady = true); this.portalImg = im;
      }
      this.characters = (scene.characters || []).map(C => {
        const im = new Image(); im.src = C.src; const o = { ...C, img: im, ready: false };
        im.onload = () => (o.ready = true); return o;
      });
      this.props = (scene.props || []).map(P => {
        const im = new Image(); im.src = P.src; const o = { ...P, img: im, ready: false };
        im.onload = () => (o.ready = true);
        if (P.glowSrc) { const gi = new Image(); gi.src = P.glowSrc; o.glowImg = gi; o._glowReady = false; gi.onload = () => (o._glowReady = true); }
        return o;
      });
      this.emissiveImg = null; this._emReady = false;
      if (scene.emissive && scene.emissive.src) { const ei = new Image(); ei.src = scene.emissive.src; this.emissiveImg = ei; ei.onload = () => (this._emReady = true); }
      this.skyMaskImg = null; this._skyReady = false;
      if (scene.skyMask) { const sm = new Image(); sm.src = scene.skyMask; this.skyMaskImg = sm; sm.onload = () => (this._skyReady = true); }
      this._resize();
    }

    _resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.vw = innerWidth; this.vh = innerHeight;
      this.cv.width = Math.round(this.vw * dpr);
      this.cv.height = Math.round(this.vh * dpr);
      this.cv.style.width = this.vw + 'px'; this.cv.style.height = this.vh + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const all = this.cycle ? [...this.dayFX, ...this.nightFX] : this.systems;
      for (const s of all) s.scaleTo(this.vw, this.vh);
    }

    camera(t) {
      if (this.reduced) return { x: 0, y: 0, zoom: 1 };
      const camX = 8 * Math.sin(t * TAU / 60);
      const camY = 5 * Math.sin(t * TAU / 85 + 1.3);
      const zoom = 1 + 0.012 * (1 - Math.cos(t * TAU / 40)) / 2;
      this.ptr.x += (this.ptrT.x - this.ptr.x) * 0.04;
      this.ptr.y += (this.ptrT.y - this.ptr.y) * 0.04;
      return { x: camX + this.ptr.x * 18, y: camY + this.ptr.y * 12, zoom };
    }

    _drawLayers(ctx, layers, cam, alpha) {
      if (alpha <= 0.002) return;
      const vw = this.vw, vh = this.vh;
      ctx.save(); ctx.globalAlpha = alpha;
      for (const L of layers) {
        if (!L.ready) continue;
        const iw = L.img.naturalWidth || 1, ih = L.img.naturalHeight || 1;
        const par = L.parallax, tx = cam.x * par, ty = cam.y * par;
        const zf = 1 + (cam.zoom - 1) * (1 + (L.depth || 0));
        const over = 1 + (L.over || 0.12);
        const s = Math.max(vw / iw, vh / ih) * over * zf;
        const w = iw * s, h = ih * s, x = (vw - w) / 2 + tx, y = (vh - h) / 2 + ty;
        ctx.drawImage(L.img, x, y, w, h);
      }
      ctx.restore();
    }

    // Map an IMAGE-normalized point (u,v) in the base painting to SCREEN space,
    // using the exact same cover-fit + camera transform as the painting. Anything
    // drawn through this (portal, FX) stays locked to the painting under resize+camera.
    _anchor(u, v, cam) {
      const L = this.layers && this.layers[0];
      if (!L || !L.img) return { x: u * this.vw + cam.x * 0.06, y: v * this.vh + cam.y * 0.06, s: 1, w: this.vw, h: this.vh };
      const iw = L.img.naturalWidth || 1, ih = L.img.naturalHeight || 1, vw = this.vw, vh = this.vh;
      const par = L.parallax != null ? L.parallax : 0.06, over = 1 + (L.over || 0.12);
      const zf = 1 + (cam.zoom - 1) * (1 + (L.depth || 0));
      const s = Math.max(vw / iw, vh / ih) * over * zf;
      const w = iw * s, h = ih * s, x = (vw - w) / 2 + cam.x * par, y = (vh - h) / 2 + cam.y * par;
      return { x: x + u * w, y: y + v * h, s, w, h };
    }

    // solar geometry: tod 0=midnight .25=sunrise .5=noon .75=sunset
    _solar(tod) { return Math.sin(TAU * (tod - 0.25)); }            // -1..1, +1 noon
    _night(tod) {                                                   // wide, gradual day<->night
      const dawn = smooth(0.16, 0.38, tod);                         // sky brightens after sunrise
      const dusk = smooth(0.62, 0.84, tod);                         // sky darkens after sunset
      return clamp(1 - dawn * (1 - dusk), 0, 1);                    // 0 midday, 1 midnight, ~40% in transition
    }
    _bodyPos(phaseTod) {
      const a = TAU * (phaseTod - 0.25);                            // 0 at rise, PI at set
      const h = Math.sin(a);                                        // up height (-1..1)
      const x = (0.5 - 0.42 * Math.cos(a)) * this.vw;
      const y = (0.42 - 0.34 * Math.max(h, 0)) * this.vh;
      const vis = smooth(-0.12, 0.12, h);
      return { x, y, vis, h };
    }

    render(t) {
      const ctx = this.ctx, vw = this.vw, vh = this.vh;
      const cam = this.camera(t);
      const sc = this.scene;

      if (!this.cycle) {                       // -------- single scene --------
        ctx.fillStyle = sc.bg || '#05070c'; ctx.fillRect(0, 0, vw, vh);
        this._drawLayers(ctx, this.layers, cam, 1);
        if (this.emissiveImg && this._emReady && sc.groundReflect) this._drawGroundReflect(ctx, t, cam);
        if (this.emissiveImg && this._emReady) this._drawEmissive(ctx, t, cam);
        if (this.scene.signs) this._drawSigns(ctx, t, cam);
        if (this.props) for (const p of this.props) this._drawProp(ctx, t, cam, p);
        if (sc.light && !this.reduced) this._godRays(ctx, t, cam, sc.light, sc.light.color, 1);
        if (sc.hero) { sc.hero._engineColor = sc.hero.color; this._heroGlow(ctx, t, cam, sc.hero, parseRGB(sc.hero.color), sc.hero.intensity || 0.2); }
        if (this.portalImg && this._portalReady) this._drawPortal(ctx, t, cam, sc.hero, 0);
        if (sc.reflection && sc.hero) this._portalReflection(ctx, t, cam, sc.hero, sc.hero._engineColor || sc.hero.color || '150,210,255', (sc.reflection.strength) || 0.6);
        if (this.characters) for (const c of this.characters) this._drawCharacter(ctx, t, cam, c);
        for (const s of this.systems) s.draw(ctx, cam);
        for (const o of this.oneShots) o.draw(ctx, t, vw, vh, cam, this);
        this._vignette(ctx, vw, vh, typeof sc.vignette === 'number' ? sc.vignette : 0.38);
        return;
      }

      // -------------------- day / night cycle --------------------
      const night = this._night(this.tod);
      const day = 1 - night;

      // bg crossfade
      const bgD = parseRGB(sc.bg && sc.bg.day || '150,200,235'), bgN = parseRGB(sc.bg && sc.bg.night || '8,12,24');
      const bg = lerpRGB(bgD, bgN, night); ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`; ctx.fillRect(0, 0, vw, vh);

      // celestial bodies (drawn behind the layers so ruins occlude them)
      const sun = this._bodyPos(this.tod), moon = this._bodyPos((this.tod + 0.5) % 1);
      this._celestial(ctx, sun, sc.sun || { color: '255,244,214', r: 0.07 }, sun.vis * day);
      this._celestial(ctx, moon, sc.moon || { color: '214,226,255', r: 0.055 }, moon.vis * night);

      // aligned layer sets: day base, night crossfaded on top
      this._drawLayers(ctx, this.dayLayers, cam, 1);
      this._drawLayers(ctx, this.nightLayers, cam, night);
      if (this.props) for (const p of this.props) this._drawProp(ctx, t, cam, p);

      // ambient grade overlay (subtle; strongest at dusk/dawn + deep night)
      this._ambient(ctx, vw, vh, this.tod, night, sc.ambient);

      // god rays emanate from whichever luminary is actually higher (no teleport handoff)
      if (!this.reduced) {
        const gr = sc.godray || {};
        const useMoon = moon.h > sun.h;
        const body = useMoon ? moon : sun;
        const origin = { x: body.x / vw, y: body.y / vh, angle: gr.angle != null ? gr.angle : 0.3, count: gr.count || 6 };
        const col = useMoon ? (gr.nightColor || '180,205,255') : (gr.dayColor || '255,240,205');
        const inten = (useMoon ? (gr.nightIntensity != null ? gr.nightIntensity : 0.5) : (gr.dayIntensity != null ? gr.dayIntensity : 1)) * clamp(body.vis, 0, 1);
        this._godRays(ctx, t, cam, origin, col, inten);
      }

      // hero portal glow (color + intensity lerp)
      if (sc.hero) {
        const hc = lerpRGB(parseRGB(sc.hero.dayColor || '150,212,255'), parseRGB(sc.hero.nightColor || '150,120,255'), night);
        const hi = lerp(sc.hero.dayIntensity != null ? sc.hero.dayIntensity : 0.15, sc.hero.nightIntensity != null ? sc.hero.nightIntensity : 0.32, night);
        this._heroGlow(ctx, t, cam, sc.hero, hc, hi);
        sc.hero._engineColor = `${hc[0]},${hc[1]},${hc[2]}`;    // live tint read by one-shots
      }
      if (this.portalImg && this._portalReady) this._drawPortal(ctx, t, cam, sc.hero, night);
      if (sc.reflection && sc.hero) this._portalReflection(ctx, t, cam, sc.hero, sc.hero._engineColor || '150,210,255', (sc.reflection.strength) || 0.6);
      if (this.characters) for (const c of this.characters) this._drawCharacter(ctx, t, cam, c);

      // particle systems
      for (const s of this.dayFX) s.draw(ctx, cam);
      for (const s of this.nightFX) s.draw(ctx, cam);

      // rare events
      for (const o of this.oneShots) o.draw(ctx, t, vw, vh, cam, this);

      this._vignette(ctx, vw, vh, lerp((sc.vignette && sc.vignette.day) || 0.24, (sc.vignette && sc.vignette.night) || 0.46, night));
    }

    _celestial(ctx, pos, cfg, alpha) {
      if (alpha <= 0.01) return;
      const r = (cfg.r || 0.06) * this.vh, col = cfg.color || '255,244,214';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
      const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 4);
      halo.addColorStop(0, `rgba(${col},0.9)`); halo.addColorStop(0.25, `rgba(${col},0.5)`); halo.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(pos.x, pos.y, r * 4, 0, TAU); ctx.fill();
      ctx.globalAlpha = alpha; const disc = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
      disc.addColorStop(0, `rgba(255,255,255,${alpha})`); disc.addColorStop(0.6, `rgba(${col},${alpha})`); disc.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, TAU); ctx.fill();
      ctx.restore();
    }

    _ambient(ctx, vw, vh, tod, night, amb) {
      amb = amb || {};
      // warm golden-hour wash: peaks at mid-crossfade (night~0.5), zero at full day/night
      const golden = 4 * night * (1 - night);
      if (golden > 0.01) {
        const rising = tod < 0.5;                                  // dawn (pink) vs dusk (orange)
        const c = rising ? (amb.dawnColor || '255,178,150') : (amb.duskColor || '255,138,72');
        ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = golden * (amb.duskStrength || 0.5);
        const g = ctx.createLinearGradient(0, vh, 0, 0);
        g.addColorStop(0, `rgba(${c},0.9)`); g.addColorStop(0.5, `rgba(${c},0.25)`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh); ctx.restore();
      }
      if (night > 0.01) {         // cool deepening — gentle so midtones survive
        const c = amb.nightColor || '40,55,95';
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = night * (amb.nightStrength || 0.20);
        ctx.fillStyle = `rgb(${c})`; ctx.fillRect(0, 0, vw, vh); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = night * (amb.moonWashStrength || 0.16);
        ctx.fillStyle = `rgb(${amb.moonWash || '120,150,210'})`; ctx.fillRect(0, 0, vw, vh); ctx.restore();
      }
    }

    _godRays(ctx, t, cam, L, colStr, inten) {
      const ox = L.x * this.vw + cam.x * 0.05, oy = L.y * this.vh + cam.y * 0.05;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const rays = L.count || 6, len = this.vh * 1.5;
      for (let i = 0; i < rays; i++) {
        const breathe = (0.03 + 0.035 * (0.5 + 0.5 * Math.sin(t * 0.3 + i))) * inten;
        const w = 50 + 50 * Math.sin(t * 0.2 + i * 1.7);
        ctx.save(); ctx.translate(ox, oy); ctx.rotate((L.angle || 0.3) + i * 0.07 - rays * 0.035);
        const g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, `rgba(${colStr},${clamp(breathe, 0, 1)})`); g.addColorStop(1, `rgba(${colStr},0)`);
        ctx.fillStyle = g; ctx.fillRect(-w / 2, 0, w, len); ctx.restore();
      }
      ctx.restore();
    }

    _heroGlow(ctx, t, cam, H, rgb, intensity) {
      const a = this._anchor(H.x, H.y, cam); const x = a.x, y = a.y;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);
      const baseR = H.rFrac ? H.rFrac * a.h : (H.r || 150);
      const r = baseR * (0.92 + 0.12 * pulse);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${intensity * (0.7 + 0.5 * pulse)})`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.restore();
    }

    _drawPortal(ctx, t, cam, H, night) {                         // separately-rendered portal asset, animated
      const img = this.portalImg;
      const a = this._anchor(H.x, H.y, cam); const x = a.x, y = a.y;
      const R = (H.rFrac ? H.rFrac * a.h : (H.r || 150));
      const spin = H.spin || 0.12, fast = 1 + night * 1.1;        // spins faster at night
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';       // additive: black drops out, no matte
      const ring = (scale, rot, a) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
        const s = R * 2 * scale; ctx.drawImage(img, -s / 2, -s / 2, s, s); ctx.restore();
      };
      ring(1.05, t * spin * fast, 0.42);                           // outer ring, CW
      ring(0.66, -t * spin * 1.7 * fast, 0.55);                    // inner glyph, CCW
      ring(0.34 * (0.92 + 0.16 * pulse), t * spin * 0.5 * fast, 0.82); // pulsing core
      ctx.restore();
    }

    _portalReflection(ctx, t, cam, H, rgb, strength) {   // wet-road shimmer of the portal glow
      const a = this._anchor(H.x, H.y, cam); const x = a.x;
      const yTop = this.vh * 0.60, yBot = this.vh * 1.04;
      const baseW = (H.rFrac ? H.rFrac * a.h : 120) * 1.7;
      const N = 18, stripH = (yBot - yTop) / N + 1;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < N; i++) {
        const f = i / N, y = yTop + f * (yBot - yTop);
        const wob = Math.sin(t * 1.8 + f * 7) * (6 + f * 18);
        const ww = baseW * (0.55 + f * 0.95);
        const a = strength * 0.5 * (1 - f) * (1 - f);
        const g = ctx.createLinearGradient(x - ww / 2 + wob, 0, x + ww / 2 + wob, 0);
        g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.5, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - ww / 2 + wob, y, ww, stripH);
      }
      ctx.restore();
    }

    _emRect(E, cam) {
      const img = this.emissiveImg, iw = img.naturalWidth || 1, ih = img.naturalHeight || 1, vw = this.vw, vh = this.vh;
      // lock to the base painting's transform (par/over/zoom) so the glow stays on the signs
      const L = (this.layers && this.layers[0]) || {};
      const par = L.parallax != null ? L.parallax : (E.par != null ? E.par : 0.05);
      const over = 1 + (L.over != null ? L.over : (E.over != null ? E.over : 0.13));
      const zf = 1 + (cam.zoom - 1) * (1 + (L.depth || 0));
      const s = Math.max(vw / iw, vh / ih) * over * zf;
      const w = iw * s, h = ih * s;
      return { w, h, x: (vw - w) / 2 + cam.x * par, y: (vh - h) / 2 + cam.y * par };
    }
    _drawEmissive(ctx, t, cam) {                // neon / glow layer (additive): bloom halo + sharp core + pulse/flicker
      const img = this.emissiveImg, E = this.scene.emissive || {};
      const { w, h, x, y } = this._emRect(E, cam);
      const base = E.base != null ? E.base : 0.45, pulse = E.pulse != null ? E.pulse : 0.12, flick = E.flicker != null ? E.flicker : 0.06, sp = E.speed || 1.4;
      const a = clamp(base + pulse * Math.sin(t * sp) + flick * Math.sin(t * 11.0) * Math.sin(t * 6.3), 0, 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const bl = E.bloom != null ? E.bloom : 10;
      ctx.globalAlpha = a * (E.bloomStrength != null ? E.bloomStrength : 0.9);
      ctx.filter = `blur(${bl}px)`; ctx.drawImage(img, x, y, w, h);          // bloom halo = the visible glow
      ctx.filter = 'none'; ctx.globalAlpha = a; ctx.drawImage(img, x, y, w, h);  // sharp core
      ctx.restore();
    }
    _drawSigns(ctx, t, cam) {                    // framed neon signs (polygon or rect), each flickering
      const S = this.scene.signs; if (!S || !S.length) return;
      ctx.save();
      for (let i = 0; i < S.length; i++) {
        const s = S[i];
        const ph = s.phase != null ? s.phase : i * 2.39, sp = s.speed || 2.2;
        let f = 0.84 + 0.09 * Math.sin(t * sp + ph);          // gentle breathing
        const n = Math.sin(t * 9.1 + ph * 3.0) * Math.sin(t * 5.7 + ph * 1.3);
        if (n > 0.86) f *= 0.38;                               // brief flicker-off
        else if (n > 0.80) f *= 0.70;                          // small stutter
        f = clamp(f, 0.08, 1.15);
        const c = (s.color || '150,210,255').split(',').map(Number);
        const k = 235 / Math.max(c[0], c[1], c[2], 1);        // brighten dim samples, keep hue
        const col = `${Math.min(255, c[0]*k)|0},${Math.min(255, c[1]*k)|0},${Math.min(255, c[2]*k)|0}`;
        // build path from polygon points (preferred) or a rect fallback
        let pts;
        if (s.points && s.points.length >= 3) pts = s.points.map(p => this._anchor(p[0], p[1], cam));
        else pts = [this._anchor(s.x, s.y, cam), this._anchor(s.x+s.w, s.y, cam),
                    this._anchor(s.x+s.w, s.y+s.h, cam), this._anchor(s.x, s.y+s.h, cam)];
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
        ctx.closePath();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.08 * f; ctx.fillStyle = `rgba(${col},1)`; ctx.fill();   // glow fill
        ctx.globalAlpha = 0.5 * f;                                                  // frame
        ctx.lineWidth = Math.max(1, this.vh * 0.0022); ctx.lineJoin = 'round';
        ctx.strokeStyle = `rgba(${col},1)`; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 10 * f;
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
    _drawGroundReflect(ctx, t, cam) {           // wet-road reflection of the neon (mirrored, blurred, rippling)
      const img = this.emissiveImg; if (!img) return;
      const R = this.scene.groundReflect || {}, E = this.scene.emissive || {}, vw = this.vw, vh = this.vh;
      const horizon = (R.horizon != null ? R.horizon : 0.60) * vh;
      const { w, h, x, y } = this._emRect(E, cam);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, horizon, vw, vh - horizon); ctx.clip();   // road band only
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(0, horizon * 2); ctx.scale(1, -1);                       // mirror about the horizon
      ctx.filter = `blur(${R.blur != null ? R.blur : 6}px)`;
      ctx.globalAlpha = (R.strength != null ? R.strength : 0.30) * (0.82 + 0.18 * Math.sin(t * 1.2));
      ctx.drawImage(img, x + Math.sin(t * 1.4) * 8, y, w, h);
      ctx.filter = 'none'; ctx.restore();
    }

    _drawProp(ctx, t, cam, P) {                 // positioned cutout (stairs) + float-bob + animated glow layer
      const img = P.img; if (!P || !P.ready) return;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const dh = (P.scaleH || 0.6) * this.vh, dw = dh * (iw / ih) * (P.aspectX || 1);
      const par = P.par != null ? P.par : 0.4;
      const bob = P.bob ? (P.bob.amp || 6) * Math.sin(t * TAU / (P.bob.period || 6)) : 0;
      const cx = P.x * this.vw + cam.x * par;
      const cy = (P.anchor === 'center' ? P.y * this.vh : P.y * this.vh - dh / 2) + cam.y * par + bob;
      ctx.save();
      ctx.translate(cx, cy);
      if (P.rot) ctx.rotate(P.rot * Math.PI / 180);
      ctx.scale(P.flipX ? -1 : 1, 1);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      if (P.glowImg && P._glowReady) {           // additive glow layer, pulsing energy
        const gp = P.glowPulse || {};
        const lo = gp.min != null ? gp.min : 0.4, hi = gp.max != null ? gp.max : 1;
        const a = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * (gp.speed || 1.2)));
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
        ctx.drawImage(P.glowImg, -dw / 2, -dh / 2, dw, dh);
      }
      ctx.restore();
    }

    _drawCharacter(ctx, t, cam, C) {            // still -> subtle idle animation (breath / sway / flutter)
      const img = C.img; if (!C || !C.ready) return;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const drawH = (C.scaleH || 0.42) * this.vh, drawW = drawH * iw / ih;
      const par = C.par != null ? C.par : 0.6;
      const feetX = C.x * this.vw + cam.x * par, feetY = C.y * this.vh + cam.y * par;
      const topX = feetX - drawW / 2, topY = feetY - drawH;
      // portal backlight bloom (drawn behind the figure)
      if (C.rim) {
        const rc = C._engineRim || C.rim.color || '150,210,255';
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (C.rim.strength || 0.22) * (0.72 + 0.28 * Math.sin(t * 0.8));
        const gx = feetX, gy = feetY - drawH * 0.62, r = drawW * 0.8;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        g.addColorStop(0, `rgba(${rc},0.5)`); g.addColorStop(1, `rgba(${rc},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill(); ctx.restore();
      }
      // feet-anchored sway + breathing
      const breath = 1 + ((C.breath && C.breath.amp) || 0.012) * Math.sin(t * TAU / ((C.breath && C.breath.period) || 4));
      const sway = ((C.sway && C.sway.amp) || 0.012) * Math.sin(t * TAU / ((C.sway && C.sway.period) || 7));
      ctx.save();
      ctx.translate(feetX, feetY); ctx.rotate(sway); ctx.scale(1, breath); ctx.translate(-feetX, -feetY);
      const fl = C.flutter;
      if (fl) {                                  // strip-wave: amplitude ramps from 0 at feet to max at hair
        const N = fl.strips || 44, amp = fl.amp || 9, freq = fl.freq || 1.6, wl = fl.wavelength || 6;
        const stepH = drawH / N + 1;
        for (let i = 0; i < N; i++) {
          const v0 = i / N, hf = 1 - v0;
          const dx = amp * hf * hf * Math.sin(t * freq + v0 * wl);
          ctx.drawImage(img, 0, v0 * ih, iw, ih / N + 1, topX + dx, topY + v0 * drawH, drawW, stepH);
        }
      } else {
        ctx.drawImage(img, topX, topY, drawW, drawH);
      }
      ctx.restore();
    }

    _vignette(ctx, vw, vh, s) {
      const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.35, vw / 2, vh / 2, vh * 0.9);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${s})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
    }

    frame(now) {
      if (this._stopped) return;
      if (!this.last) this.last = now;
      let dt = (now - this.last) / 1000; this.last = now;
      if (dt > 0.25) dt = 0.25;
      this.t += dt; this.fps = lerp(this.fps, 1 / Math.max(dt, 1e-4), 0.05);

      if (this.cycle && !this.reduced) this.tod = (this.tod + dt / this.period) % 1;
      const night = this.cycle ? this._night(this.tod) : 0;

      if (this.cycle) {
        for (const s of this.dayFX) s.update(dt, this.vw, this.vh, this.reduced, 1 - night);
        for (const s of this.nightFX) s.update(dt, this.vw, this.vh, this.reduced, night);
        if (!this.reduced) (night > 0.5 ? this.nightEvents : this.dayEvents).update(this.t, this.oneShots);
      } else {
        for (const s of this.systems) s.update(dt, this.vw, this.vh, this.reduced, 1);
        if (!this.reduced) this.scheduler.update(this.t, this.oneShots);
      }
      this.render(this.t);
      this.oneShots = this.oneShots.filter(o => !o.dead);
      this._raf = requestAnimationFrame(this.frame.bind(this));
    }
    start() { this._stopped = false; this._raf = requestAnimationFrame(this.frame.bind(this)); return this; }

    // fire a named scene event ON DEMAND (e.g. timed to music): 'portalSurge' | 'lightning' | 'glowPulse' | 'runeFlash'
    fireEvent(name) {
      const hero = this.scene.hero || { x: 0.5, y: 0.45, color: '120,200,255' };
      if (hero && !hero._engineColor) hero._engineColor = hero.color;
      let o = null;
      if (name === 'portalSurge') o = new GlowPulse(this.t, hero, 2.6, true);
      else if (name === 'lightning') o = new Lightning(this.t);
      else if (name === 'glowPulse') o = new GlowPulse(this.t, hero, 1.0);
      else if (name === 'runeFlash') o = new RuneFlash(this.t, hero);
      if (o) this.oneShots.push(o);
      return !!o;
    }

    // expose tod for external HUD / scrubbing
    setTod(v) { this.tod = ((v % 1) + 1) % 1; }
  }

  // --- one-shot rare events -----------------------------------------
  function heroRGB(hero, fallback) { return hero._engineColor || fallback || hero.dayColor || hero.color || '150,200,255'; }

  class GlowPulse {
    constructor(t, hero, scale, ring) { this.start = t; this.dur = ring ? 3.2 : 2.2; this.dead = false; this.hero = hero; this.scale = scale; this.ring = ring; }
    draw(ctx, t, vw, vh, cam) {
      const p = (t - this.start) / this.dur; if (p >= 1) { this.dead = true; return; }
      const e = Math.sin(p * Math.PI);
      const x = this.hero.x * vw + cam.x * (this.hero.par || 0.3), y = this.hero.y * vh + cam.y * (this.hero.par || 0.3);
      const col = this.hero._engineColor || this.hero.dayColor || this.hero.color || '150,200,255';
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const baseR = this.hero.rFrac ? this.hero.rFrac * vh : (this.hero.r || 150);
      const r = baseR * this.scale * (0.6 + e);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col},${0.5 * e})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (this.ring) { ctx.globalAlpha = (1 - p) * 0.6; ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${col},1)`; ctx.beginPath(); ctx.arc(x, y, r * 1.3 * p + 20, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
  }
  class RuneFlash {
    constructor(t, hero) { this.start = t; this.dur = 1.6; this.dead = false; this.hero = hero; }
    draw(ctx, t, vw, vh, cam) {
      const p = (t - this.start) / this.dur; if (p >= 1) { this.dead = true; return; }
      const e = Math.sin(p * Math.PI);
      const x = this.hero.x * vw + cam.x * (this.hero.par || 0.3), y = this.hero.y * vh + cam.y * (this.hero.par || 0.3);
      const col = this.hero._engineColor || this.hero.dayColor || this.hero.color || '150,200,255';
      const R = (this.hero.rFrac ? this.hero.rFrac * vh : (this.hero.r || 150)) * 0.9;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(t * 0.2);
      ctx.strokeStyle = `rgba(${col},${0.8 * e})`; ctx.lineWidth = 2; const n = 8;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = R * (i % 2 ? 0.6 : 1); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.stroke();
      ctx.globalAlpha = e; ctx.fillStyle = `rgba(${col},0.15)`; ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  class Crosser {
    constructor(t, kind, hero) {
      this.start = t; this.dur = kind === 'ghost' ? 9 : 6; this.dead = false; this.kind = kind;
      this.y = kind === 'ghost' ? rand(0.3, 0.6) : rand(0.10, 0.34);
      this.dir = Math.random() < 0.5 ? 1 : -1; this.n = kind === 'birds' ? 5 : 1; this.hero = hero;
    }
    draw(ctx, t, vw, vh, cam) {
      const p = (t - this.start) / this.dur; if (p >= 1) { this.dead = true; return; }
      const fade = clamp(Math.min(p, 1 - p) * 4, 0, 1);
      const baseX = this.dir > 0 ? -80 + p * (vw + 160) : vw + 80 - p * (vw + 160);
      const y0 = this.y * vh;
      ctx.save();
      if (this.kind === 'ghost') {
        const x = baseX, y = y0 + Math.sin(t * 0.8) * 14;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * 0.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 60);
        g.addColorStop(0, 'rgba(170,210,255,0.9)'); g.addColorStop(1, 'rgba(170,210,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 26, 46, 0, 0, TAU); ctx.fill();
      } else {
        ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = 'rgba(25,30,42,0.85)'; ctx.lineWidth = 2.5;
        for (let i = 0; i < this.n; i++) {
          const x = baseX + i * 26 * -this.dir, y = y0 + Math.sin(t * 3 + i) * 10 + i * 6, flap = 6 + 5 * Math.sin(t * 12 + i);
          ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.quadraticCurveTo(x - 4, y - flap, x, y); ctx.quadraticCurveTo(x + 4, y - flap, x + 9, y); ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  class Lightning {                            // rare storm flash, MASKED to the sky (distant, not full-screen)
    constructor(t) { this.start = t; this.dur = 0.7; this.dead = false; }
    draw(ctx, t, vw, vh, cam, eng) {
      const p = (t - this.start) / this.dur; if (p >= 1) { this.dead = true; return; }
      const f = clamp(Math.max(Math.exp(-p * 12), Math.exp(-Math.abs(p - 0.24) * 16)), 0, 1);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      if (eng && eng.skyMaskImg && eng._skyReady) {
        const img = eng.skyMaskImg, iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
        const s = Math.max(vw / iw, vh / ih), w = iw * s, h = ih * s;
        ctx.globalAlpha = f;                                   // bright flash, sky only
        ctx.drawImage(img, (vw - w) / 2 + (cam ? cam.x * 0.03 : 0), (vh - h) / 2, w, h);
        ctx.globalAlpha = f * 0.10;                            // faint whole-scene lift (distant storm)
        ctx.fillStyle = 'rgba(180,200,255,1)'; ctx.fillRect(0, 0, vw, vh);
      } else {
        ctx.globalAlpha = f * 0.5; ctx.fillStyle = 'rgba(205,222,255,1)'; ctx.fillRect(0, 0, vw, vh);
      }
      ctx.restore();
    }
  }

  // Expose globally so the page can load this as a CLASSIC script (works over file://
  // and http alike; ES-module <script type=module> is blocked on file:// origins).
  if (typeof window !== 'undefined') window.LivingPainting = LivingPainting;
