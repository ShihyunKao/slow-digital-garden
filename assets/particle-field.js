(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  function mulberry32(seed) {
    return () => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function fit(canvas) {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const width = Math.max(1, Math.round(box.width));
    const height = Math.max(1, Math.round(box.height));
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  function pointFor(type, u, lane, time, width, height, randomPhase) {
    const drift = reduceMotion ? 0 : time;
    const x0 = u * width;
    if (type === "home") {
      const x = width * (.03 + u * .92);
      const centre = height * (.55 - .12 * Math.sin(u * Math.PI * 2.2 + .4));
      const wave = Math.sin(u * 12 + lane * .14 + drift * .22) * height * (.035 + .02 * Math.sin(u * Math.PI));
      const envelope = Math.sin(Math.PI * u) * height * .27;
      return [x, centre + lane * envelope / 32 + wave];
    }
    if (type === "open") {
      const x = width * (.04 + u * .92);
      const centre = height * (.53 + .13 * Math.sin(u * 6.3 + drift * .08));
      const spread = Math.sin(Math.PI * u) * height * .26;
      return [x, centre + lane * spread / 34 + Math.sin(u * 17 + randomPhase + drift * .11) * 5];
    }
    if (type === "trail") {
      const angle = u * TAU * 1.2 + lane * .018 + drift * .065;
      const radius = (Math.pow(u, .78) * Math.min(width, height) * .46) + lane * .28;
      return [width * .52 + Math.cos(angle) * radius * 1.35, height * .48 + Math.sin(angle) * radius * .72];
    }
    if (type === "both") {
      const x = x0;
      const side = u < .5 ? -1 : 1;
      const distance = Math.abs(u - .5) * 2;
      const centre = height * (.51 - .22 * Math.sin(distance * Math.PI * .82) * side);
      const widthEnvelope = (1 - Math.pow(1 - distance, 2)) * height * .21;
      const breathing = 1 + Math.sin(drift * .08) * .035;
      return [x, centre + lane * widthEnvelope / 34 * breathing + Math.sin(u * 15 + randomPhase) * 3];
    }
    if (type === "gesture-open") {
      const angle = (-.7 + u * 1.4) + lane * .035;
      const radius = Math.min(width, height) * (.09 + u * .33);
      return [width * .5 + Math.cos(angle) * radius, height * .7 - Math.sin(angle) * radius + Math.sin(drift * .15) * 3];
    }
    if (type === "gesture-trail") {
      return [width * (.15 + .7 * u), height * (.5 + Math.sin(u * 7 + drift * .18) * .2 + lane * .012)];
    }
    if (type === "gesture-both") {
      const x = width * (.08 + .84 * u);
      const arch = Math.sin(u * Math.PI) * height * .27;
      return [x, height * .62 - arch + lane * 1.2];
    }
    return [x0, height / 2];
  }

  function drawField(canvas, time) {
    const { ctx, width, height } = fit(canvas);
    const type = canvas.dataset.field || "home";
    const compact = canvas.classList.contains("material-canvas");
    const seed = Number(canvas.dataset.seed || [...type].reduce((sum, c) => sum + c.charCodeAt(0), 11));
    const rand = mulberry32(seed);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    const lineCount = compact ? 22 : Math.min(68, Math.max(34, Math.round(width / 22)));
    const samples = compact ? 54 : 84;
    for (let laneIndex = 0; laneIndex < lineCount; laneIndex++) {
      const lane = laneIndex - (lineCount - 1) / 2;
      const phase = rand() * TAU;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const [x, y] = pointFor(type, u, lane, time, width, height, phase);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const alpha = compact ? .08 + rand() * .14 : .035 + rand() * .12;
      const warm = compact && laneIndex % 7 === 0;
      ctx.strokeStyle = warm ? `rgba(144,140,86,${alpha})` : `rgba(101,215,196,${alpha})`;
      ctx.lineWidth = rand() > .86 ? 1 : .45;
      ctx.stroke();
    }

    const count = compact ? 105 : Math.min(460, Math.max(190, Math.round(width * height / 2800)));
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      const u = rand();
      const lane = (rand() - .5) * (type === "trail" ? 36 : 42);
      const phase = rand() * TAU;
      const [x, y] = pointFor(type, u, lane, time, width, height, phase);
      const flicker = reduceMotion ? .7 : .45 + .55 * Math.sin(time * .38 + phase) ** 2;
      const radius = rand() > .92 ? 1.6 : .35 + rand() * .75;
      ctx.fillStyle = `rgba(${rand() > .84 ? "232,225,216" : "101,215,196"},${(.18 + rand() * .62) * flicker})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }

    if (compact && type.includes("gesture")) drawSkeleton(ctx, type, time, width, height);
  }

  function drawSkeleton(ctx, type, time, width, height) {
    const sway = reduceMotion ? 0 : Math.sin(time * .22) * width * .02;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(199,189,179,.4)";
    ctx.fillStyle = "rgba(101,215,196,.75)";
    ctx.lineWidth = .8;
    const palms = type === "gesture-both" ? [[width * .31 + sway, height * .62], [width * .69 - sway, height * .62]] : [[width * .5 + sway, height * .65]];
    palms.forEach(([px, py], palmIndex) => {
      const direction = palmIndex === 0 ? -1 : 1;
      ctx.beginPath();
      ctx.ellipse(px, py, width * .045, height * .07, 0, 0, TAU);
      ctx.stroke();
      for (let finger = 0; finger < 5; finger++) {
        const angle = (-1.9 + finger * .34) * (type === "gesture-both" ? direction : 1);
        const jointX = px + Math.cos(angle) * width * .07;
        const jointY = py + Math.sin(angle) * height * .14;
        const tipX = px + Math.cos(angle) * width * (.12 + finger * .008);
        const tipY = py + Math.sin(angle) * height * (.24 + finger * .012);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(jointX, jointY); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.beginPath(); ctx.arc(tipX, tipY, 1.7, 0, TAU); ctx.fill();
      }
    });
  }

  const canvases = [...document.querySelectorAll("canvas[data-field]")];
  if (!canvases.length) return;
  let frame = 0;
  let start = performance.now();
  function render(now) {
    const time = (now - start) / 1000;
    canvases.forEach(canvas => drawField(canvas, time));
    if (!reduceMotion) frame = requestAnimationFrame(render);
  }
  render(start);
  addEventListener("resize", () => canvases.forEach(canvas => drawField(canvas, (performance.now() - start) / 1000)), { passive: true });
  addEventListener("pagehide", () => cancelAnimationFrame(frame), { once: true });
})();
