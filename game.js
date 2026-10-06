(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const CX = W / 2;
  const CY = H / 2;

  const overlay = document.getElementById("overlay");
  const startPanel = document.getElementById("start-panel");
  const overPanel = document.getElementById("over-panel");
  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const finalScoreEl = document.getElementById("final-score");
  const finalBestEl = document.getElementById("final-best");

  const HS_KEY = "orbit-dodge-highscore";

  const PLANET_R = 48;
  const MIN_ORBIT = 78;
  const MAX_ORBIT = 250;
  const BASE_ORBIT = 130;
  const SHIP_R = 9;

  let state = "start"; // start | playing | over
  let keys = Object.create(null);
  let stars = [];
  let asteroids = [];
  let orbs = [];
  let particles = [];
  let ship = null;
  let score = 0;
  let highScore = Number(localStorage.getItem(HS_KEY) || 0);
  let startTime = 0;
  let lastSpawn = 0;
  let lastOrb = 0;
  let spawnInterval = 1400;
  let animId = 0;
  let lastTs = 0;

  bestEl.textContent = String(highScore);

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.hypot(dx, dy);
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.3,
        a: Math.random() * 0.6 + 0.25,
        tw: Math.random() * Math.PI * 2,
        sp: rand(0.8, 2.2),
      });
    }
  }

  function resetShip() {
    ship = {
      angle: -Math.PI / 2,
      radius: BASE_ORBIT,
      dir: 1,
      angVel: 1.55,
      boost: 0,
      pull: 0,
      trail: [],
    };
  }

  function spawnAsteroid() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) {
      x = rand(-20, W + 20);
      y = -30;
    } else if (edge === 1) {
      x = W + 30;
      y = rand(-20, H + 20);
    } else if (edge === 2) {
      x = rand(-20, W + 20);
      y = H + 30;
    } else {
      x = -30;
      y = rand(-20, H + 20);
    }

    // Drift toward a point near the planet with some spread
    const tx = CX + rand(-90, 90);
    const ty = CY + rand(-90, 90);
    const dx = tx - x;
    const dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = rand(55, 110) + Math.min(score / 40, 70);

    asteroids.push({
      x,
      y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      r: rand(10, 22),
      rot: rand(0, Math.PI * 2),
      rotSp: rand(-2.5, 2.5),
      sides: 5 + Math.floor(Math.random() * 4),
      jagged: Array.from({ length: 8 }, () => rand(0.75, 1.15)),
    });
  }

  function spawnOrb() {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(MIN_ORBIT + 20, MAX_ORBIT - 20);
    orbs.push({
      x: CX + Math.cos(angle) * radius,
      y: CY + Math.sin(angle) * radius,
      r: 7,
      life: 9000,
      pulse: rand(0, Math.PI * 2),
      value: 50,
    });
  }

  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 160);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.3, 0.8),
        max: 0.8,
        r: rand(1.5, 3.5),
        color,
      });
    }
  }

  function startGame() {
    asteroids = [];
    orbs = [];
    particles = [];
    score = 0;
    spawnInterval = 1400;
    resetShip();
    startTime = performance.now();
    lastSpawn = startTime;
    lastOrb = startTime;
    lastTs = startTime;
    scoreEl.textContent = "0";
    bestEl.textContent = String(highScore);
    state = "playing";
    overlay.classList.add("hidden");
    startPanel.classList.add("hidden");
    overPanel.classList.add("hidden");
    hud.classList.remove("hidden");
    spawnAsteroid();
    spawnAsteroid();
  }

  function gameOver() {
    state = "over";
    const sx = CX + Math.cos(ship.angle) * ship.radius;
    const sy = CY + Math.sin(ship.angle) * ship.radius;
    burst(sx, sy, "#ff4d9a", 28);
    burst(sx, sy, "#4de8ff", 12);

    if (score > highScore) {
      highScore = score;
      localStorage.setItem(HS_KEY, String(highScore));
    }

    finalScoreEl.textContent = String(score);
    finalBestEl.textContent = String(highScore);
    bestEl.textContent = String(highScore);

    overlay.classList.remove("hidden");
    startPanel.classList.add("hidden");
    overPanel.classList.remove("hidden");
  }

  function update(dt, now) {
    if (state !== "playing") {
      updateParticles(dt);
      return;
    }

    // Score from survival
    score = Math.floor((now - startTime) / 100);

    // Difficulty ramp
    spawnInterval = Math.max(480, 1400 - score * 1.2);

    // Controls
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) ship.dir = -1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) ship.dir = 1;

    const boosting = keys[" "] || keys["ArrowUp"] || keys["w"] || keys["W"];
    const pulling = keys["ArrowDown"] || keys["s"] || keys["S"];

    if (boosting) {
      ship.boost = Math.min(1, ship.boost + dt * 3.5);
    } else {
      ship.boost = Math.max(0, ship.boost - dt * 2.2);
    }
    if (pulling) {
      ship.pull = Math.min(1, ship.pull + dt * 4);
    } else {
      ship.pull = Math.max(0, ship.pull - dt * 3);
    }

    // Orbit radius: boost out, gravity pulls back, down pulls in
    const target =
      BASE_ORBIT +
      ship.boost * (MAX_ORBIT - BASE_ORBIT) * 0.85 -
      ship.pull * (BASE_ORBIT - MIN_ORBIT) * 0.9;

    // Soft spring toward target, plus constant gentle fall toward base when not boosting
    const gravity = boosting ? 0 : 55;
    ship.radius += (target - ship.radius) * Math.min(1, dt * 4);
    if (!boosting && !pulling) {
      ship.radius -= gravity * dt * ((ship.radius - BASE_ORBIT) / 80);
    }
    ship.radius = Math.max(MIN_ORBIT, Math.min(MAX_ORBIT, ship.radius));

    const speedMul = 1 + ship.boost * 0.25 - ship.pull * 0.15;
    ship.angle += ship.dir * ship.angVel * speedMul * dt;

    const sx = CX + Math.cos(ship.angle) * ship.radius;
    const sy = CY + Math.sin(ship.angle) * ship.radius;

    ship.trail.push({ x: sx, y: sy, life: 0.35 });
    if (ship.trail.length > 18) ship.trail.shift();
    for (const t of ship.trail) t.life -= dt;

    // Asteroids
    if (now - lastSpawn > spawnInterval) {
      spawnAsteroid();
      lastSpawn = now;
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.rotSp * dt;

      // Soft gravity toward planet (gentle curve)
      const dx = CX - a.x;
      const dy = CY - a.y;
      const d = Math.hypot(dx, dy) || 1;
      a.vx += (dx / d) * 18 * dt;
      a.vy += (dy / d) * 18 * dt;

      if (a.x < -80 || a.x > W + 80 || a.y < -80 || a.y > H + 80) {
        asteroids.splice(i, 1);
        continue;
      }

      // Collision with planet — bounce / destroy
      if (d < PLANET_R + a.r * 0.7) {
        burst(a.x, a.y, "#8a9bb8", 8);
        asteroids.splice(i, 1);
        continue;
      }

      if (dist(sx, sy, a.x, a.y) < SHIP_R + a.r * 0.85) {
        gameOver();
        return;
      }
    }

    // Orbs
    if (now - lastOrb > 3200 && orbs.length < 3) {
      spawnOrb();
      lastOrb = now;
    }

    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.life -= dt * 1000;
      o.pulse += dt * 4;
      if (o.life <= 0) {
        orbs.splice(i, 1);
        continue;
      }
      if (dist(sx, sy, o.x, o.y) < SHIP_R + o.r + 4) {
        score += o.value;
        startTime -= o.value * 100; // bake bonus into survival clock display
        burst(o.x, o.y, "#ffd166", 16);
        orbs.splice(i, 1);
      }
    }

    scoreEl.textContent = String(score);
    updateParticles(dt);
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawBackground(now) {
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, W, H);

    // Nebula wash
    const g = ctx.createRadialGradient(CX, CY, 40, CX, CY, 380);
    g.addColorStop(0, "rgba(40, 60, 140, 0.22)");
    g.addColorStop(0.45, "rgba(80, 30, 100, 0.1)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(now * 0.001 * s.sp + s.tw);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 235, 255, ${s.a * tw})`;
      ctx.fill();
    }
  }

  function drawPlanet(now) {
    // Atmosphere glow
    const ag = ctx.createRadialGradient(CX, CY, PLANET_R * 0.6, CX, CY, PLANET_R * 1.85);
    ag.addColorStop(0, "rgba(60, 180, 255, 0.35)");
    ag.addColorStop(0.55, "rgba(40, 100, 200, 0.12)");
    ag.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(CX, CY, PLANET_R * 1.85, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const pg = ctx.createRadialGradient(
      CX - 14,
      CY - 16,
      8,
      CX,
      CY,
      PLANET_R
    );
    pg.addColorStop(0, "#6ec8ff");
    pg.addColorStop(0.4, "#2a6ec8");
    pg.addColorStop(0.8, "#143a78");
    pg.addColorStop(1, "#0a1a40");
    ctx.beginPath();
    ctx.arc(CX, CY, PLANET_R, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();

    // Soft bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, PLANET_R, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.18;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(CX, CY + i * 14 + Math.sin(now * 0.0004 + i) * 2, PLANET_R * 1.1, 7, 0.15, 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? "#9fe8ff" : "#1a3a80";
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.restore();

    // Orbit guide rings
    ctx.strokeStyle = "rgba(77, 232, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CX, CY, BASE_ORBIT, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(77, 232, 255, 0.04)";
    ctx.beginPath();
    ctx.arc(CX, CY, MIN_ORBIT, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX, CY, MAX_ORBIT, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.beginPath();
    const n = a.sides;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const rr = a.r * a.jagged[i % a.jagged.length];
      const x = Math.cos(ang) * rr;
      const y = Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const ag = ctx.createRadialGradient(-a.r * 0.3, -a.r * 0.3, 2, 0, 0, a.r);
    ag.addColorStop(0, "#6a7388");
    ag.addColorStop(1, "#2a303c");
    ctx.fillStyle = ag;
    ctx.fill();
    ctx.strokeStyle = "rgba(180, 200, 220, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawOrb(o) {
    const pulse = 1 + Math.sin(o.pulse) * 0.18;
    const alpha = Math.min(1, o.life / 1500);
    ctx.save();
    ctx.globalAlpha = alpha;
    const glow = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3.5 * pulse);
    glow.addColorStop(0, "rgba(255, 209, 102, 0.85)");
    glow.addColorStop(0.4, "rgba(255, 180, 60, 0.35)");
    glow.addColorStop(1, "rgba(255, 180, 60, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * 3.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#fff6c8";
    ctx.fill();
    ctx.restore();
  }

  function drawShip() {
    if (!ship) return;
    const sx = CX + Math.cos(ship.angle) * ship.radius;
    const sy = CY + Math.sin(ship.angle) * ship.radius;
    const heading = ship.angle + (ship.dir > 0 ? Math.PI / 2 : -Math.PI / 2);

    // Trail
    for (let i = 0; i < ship.trail.length; i++) {
      const t = ship.trail[i];
      if (t.life <= 0) continue;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2.2 * (t.life / 0.35), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(77, 232, 255, ${t.life * 1.4})`;
      ctx.fill();
    }

    // Boost flame
    if (ship.boost > 0.05) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ship.angle); // outward = away from planet along radius
      const fl = 10 + ship.boost * 16;
      const fg = ctx.createLinearGradient(0, 0, fl, 0);
      fg.addColorStop(0, "rgba(255, 200, 80, 0.9)");
      fg.addColorStop(1, "rgba(255, 80, 40, 0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(SHIP_R * 0.2, -4);
      ctx.lineTo(SHIP_R + fl, 0);
      ctx.lineTo(SHIP_R * 0.2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(heading);

    // Glow
    ctx.shadowColor = "#4de8ff";
    ctx.shadowBlur = 14;

    // Hull
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-9, 8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-9, -8);
    ctx.closePath();
    const hg = ctx.createLinearGradient(-9, 0, 14, 0);
    hg.addColorStop(0, "#1a4060");
    hg.addColorStop(0.5, "#4de8ff");
    hg.addColorStop(1, "#e8ffff");
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawIdleDecor(now) {
    // Soft orbiting ghost ship on start/over for polish
    const ang = now * 0.0006;
    const r = 150;
    const x = CX + Math.cos(ang) * r;
    const y = CY + Math.sin(ang) * r;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(77, 232, 255, 0.45)";
    ctx.fill();
  }

  function render(now) {
    drawBackground(now);
    drawPlanet(now);

    for (const a of asteroids) drawAsteroid(a);
    for (const o of orbs) drawOrb(o);
    drawParticles();

    if (state === "playing") {
      drawShip();
    } else {
      drawIdleDecor(now);
      // Still show leftover particles after crash
      if (ship && state === "over") {
        // faint wreck position sparkle already in particles
      }
    }
  }

  function loop(ts) {
    const now = ts || performance.now();
    const dt = Math.min(0.033, (now - lastTs) / 1000) || 0.016;
    lastTs = now;
    update(dt, now);
    render(now);
    animId = requestAnimationFrame(loop);
  }

  // Input
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
    if (e.key === "Enter" || e.key === " ") {
      if (state === "start") startGame();
      else if (state === "over" && e.key === "Enter") startGame();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("restart-btn").addEventListener("click", startGame);

  // Boot
  initStars();
  resetShip();
  lastTs = performance.now();
  animId = requestAnimationFrame(loop);
})();
