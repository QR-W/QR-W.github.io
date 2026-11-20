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
  let skyTime = 0;
  let nextMeteor = 1800;
  let meteors = [];
  let sparks = [];
  let amber = body.dataset.world === 'amber';

  function sizeSky() {
    if (!context) return;
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = Array.from({ length: Math.min(140, Math.round(width * height / 9500)) }, () => ({
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
    skyTime += delta;
    if (delta && skyTime > nextMeteor) {
      meteors.push({ x: width * (.3 + Math.random() * .7), y: Math.random() * height * .35, life: 1 });
      nextMeteor = skyTime + 4500 + Math.random() * 5000;
    }
    for (const meteor of meteors) {
      meteor.x -= delta * .45;
      meteor.y += delta * .24;
      meteor.life -= delta / 1300;
      const glow = context.createLinearGradient(meteor.x, meteor.y, meteor.x + 140, meteor.y - 75);
      glow.addColorStop(0, `rgba(${color},${Math.max(0, meteor.life) * .8})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      context.strokeStyle = glow;
      context.lineWidth = 1.5;
      context.beginPath(); context.moveTo(meteor.x, meteor.y); context.lineTo(meteor.x + 140, meteor.y - 75); context.stroke();
    }
    meteors = meteors.filter(item => item.life > 0);
    for (const spark of sparks) {
      spark.life -= delta / 650;
      spark.y -= delta * .018;
      context.fillStyle = `rgba(${color},${Math.max(0, spark.life) * .5})`;
      context.beginPath(); context.arc(spark.x, spark.y, Math.max(0, spark.life) * 2, 0, Math.PI * 2); context.fill();
    }
    sparks = sparks.filter(item => item.life > 0);
    for (const star of stars) {
      star.y -= star.speed * delta;
      star.x += Math.sin(star.phase) * delta * .003;
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
    else { meteors = []; sparks = []; paintSky(0); }
    if (!moving) revealAll();
    scheduleScroll();
  }
  const revealItems = [...document.querySelectorAll('.hero-copy, .section-heading, .book-card, .fragment-art, .fragment-copy, .about, .detail-copy, .contents')];
  let revealObserver;
  function revealAll() {
    revealItems.forEach(item => { item.dataset.reveal = 'shown'; });
    revealObserver?.disconnect();
  }
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.reveal = 'shown';
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach(item => {
      item.dataset.reveal = 'waiting';
      if (item.matches('.book-card:nth-child(2)')) item.style.setProperty('--reveal-delay', '130ms');
      revealObserver.observe(item);
    });
  }
  const fragment = document.querySelector('.fragment-art');
  let scrollFrame = 0;
  let scrollRange = 1;
  let fragmentCenter = 0;
  function measurePage() {
    scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (fragment) fragmentCenter = fragment.getBoundingClientRect().top + scrollY + fragment.offsetHeight / 2;
    scheduleScroll();
  }
  function scheduleScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const y = Math.max(0, scrollY);
      body.classList.toggle('is-scrolled', y > 40);
      body.style.setProperty('--journey', String(Math.min(1, y / scrollRange)));
      if (!moving) return;
      const strength = finePointer.matches ? 1 : .45;
      body.style.setProperty('--sky-y', `${-Math.min(y * .025, 55)}px`);
      body.style.setProperty('--portal-y', `${Math.min(y, innerHeight) * .12 * strength}px`);
      body.style.setProperty('--copy-y', `${Math.min(y, innerHeight) * -.045 * strength}px`);
      body.style.setProperty('--fragment-y', `${Math.max(-24, Math.min(24, (y + innerHeight / 2 - fragmentCenter) * .065))}px`);
    });
  }
  addEventListener('scroll', scheduleScroll, { passive: true });
  addEventListener('resize', measurePage);
  addEventListener('load', measurePage);
  if ('ResizeObserver' in window) new ResizeObserver(measurePage).observe(document.querySelector('main'));
  measurePage();

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
    ice: { title: '永逝之日', subtitle: 'ORIGINAL FANTASY', detail: '时间、生命与永恒。', href: '/novels/yongshi/', button: '进入《永逝之日》' },
    amber: { title: 'An Unfinished Hero Story', subtitle: 'SUPERNATURAL FAN FICTION', detail: '尚未结束的英雄故事。', href: '/novels/unfinished-hero/', button: '进入未完的英雄故事' },
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
      if (sparks.length < 24) sparks.push({ x: pointerX, y: pointerY, life: 1 });
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
