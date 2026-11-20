(() => {
  'use strict';
  const body = document.body;
  if (!body.classList.contains('worlds')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const toggle = document.getElementById('effects-toggle');
  const canvas = document.getElementById('starfield');
  const context = canvas?.getContext('2d');
  let requested = true;
  try { requested = localStorage.getItem('worlds:motion') !== 'off'; } catch { /* Optional preference. */ }
  let moving = false;
  let frame = 0;
  let width = 0;
  let height = 0;
  let previousTime = 0;
  let stars = [];
  let amber = body.dataset.world === 'amber';

  function sizeSky() {
    if (!context) return;
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = Array.from({ length: Math.min(95, Math.round(width * height / 13000)) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      radius: Math.random() * 1.1 + .3, opacity: Math.random() * .45 + .18,
      speed: Math.random() * .009 + .003, phase: Math.random() * Math.PI * 2,
    }));
    paintSky(0);
  }
  function paintSky(delta) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const color = amber ? '239,211,162' : '173,214,239';
    for (const star of stars) {
      star.y -= star.speed * delta;
      if (star.y < -2) star.y = height + 2;
      star.phase += delta * .0004;
      const opacity = star.opacity * (.8 + .2 * Math.sin(star.phase));
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${color},${opacity})`;
      context.fill();
    }
  }
  function animate(time) {
    if (!moving || document.hidden) { frame = 0; return; }
    // Cap paint work to approximately 30 fps; tab resume cannot create a large jump.
    const elapsed = time - previousTime;
    if (elapsed >= 32) {
      paintSky(Math.min(elapsed, 60));
      previousTime = time;
    }
    frame = requestAnimationFrame(animate);
  }
  function syncMotion() {
    moving = requested && !reduced.matches;
    body.dataset.motion = moving ? 'on' : 'off';
    toggle.hidden = false;
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-pressed', String(moving));
    toggle.setAttribute('aria-label', moving ? '关闭页面动效' : '开启页面动效');
    toggle.title = reduced.matches ? '已遵循系统的减少动态效果设置' : (moving ? '关闭页面动效' : '开启页面动效');
    toggle.textContent = moving ? '动效 · 开' : '动效 · 关';
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = performance.now();
    if (moving && !document.hidden) frame = requestAnimationFrame(animate);
    else paintSky(0);
  }
  toggle.addEventListener('click', () => {
    requested = !requested;
    try { localStorage.setItem('worlds:motion', requested ? 'on' : 'off'); } catch { /* Optional preference. */ }
    syncMotion();
  });
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  addEventListener('pageshow', syncMotion);
  addEventListener('resize', sizeSky);
  sizeSky();
  syncMotion();

  const worlds = {
    ice: { title: '永逝之日', subtitle: 'THE CRYSTAL TOWER', detail: '时间之外，极北永夜。', href: '/novels/yongshi/', button: '进入《永逝之日》' },
    amber: { title: 'Eternal Camelot', subtitle: 'AN UNFINISHED HERO STORY', detail: '两座王城，一段未完的传说。', href: '/novels/unfinished-hero/', button: '进入未完的英雄故事' },
  };
  const choices = [...document.querySelectorAll('[data-world-choice]')];
  choices.forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.worldChoice;
    const world = worlds[choice];
    body.dataset.world = choice;
    amber = choice === 'amber';
    choices.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelectorAll('[data-world-image]').forEach(image => {
      const active = image.dataset.worldImage === choice;
      image.classList.toggle('is-active', active);
      image.setAttribute('aria-hidden', String(!active));
    });
    document.getElementById('portal-title').textContent = world.title;
    document.getElementById('portal-subtitle').textContent = world.subtitle;
    document.getElementById('portal-detail').textContent = world.detail;
    const link = document.getElementById('hero-read');
    link.href = world.href;
    link.textContent = world.button;
    paintSky(0);
  }));

  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  addEventListener('pointermove', event => {
    if (!moving || !finePointer.matches) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
      body.style.setProperty('--pointer-x', `${pointerX}px`);
      body.style.setProperty('--pointer-y', `${pointerY}px`);
      pointerFrame = 0;
    });
  }, { passive: true });
  document.querySelectorAll('[data-tilt]').forEach(element => {
    let tiltFrame = 0;
    let x = 0, y = 0;
    element.addEventListener('pointermove', event => {
      if (!moving || !finePointer.matches) return;
      const bounds = element.getBoundingClientRect();
      x = (event.clientX - bounds.left) / bounds.width - .5;
      y = (event.clientY - bounds.top) / bounds.height - .5;
      if (!tiltFrame) tiltFrame = requestAnimationFrame(() => {
        element.style.setProperty('--tilt-x', `${-y * 5}deg`);
        element.style.setProperty('--tilt-y', `${x * 7}deg`);
        tiltFrame = 0;
      });
    }, { passive: true });
    element.addEventListener('pointerleave', () => {
      cancelAnimationFrame(tiltFrame);
      tiltFrame = 0;
      element.style.setProperty('--tilt-x', '0deg');
      element.style.setProperty('--tilt-y', '0deg');
    });
  });
})();
