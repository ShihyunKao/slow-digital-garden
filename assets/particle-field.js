(() => {
  if (!window.__sdgOfflineClientRequested && document.currentScript?.src) {
    window.__sdgOfflineClientRequested = true;
    const offlineClient = document.createElement("script");
    offlineClient.src = new URL("offline-client.js", document.currentScript.src).href;
    offlineClient.defer = true;
    document.head.append(offlineClient);
  }
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const openStageStates = new WeakMap();
  const bothFieldStates = new WeakMap();
  const frozenStageStates = new WeakMap();

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

  function previewBreath(time, phase = 0) {
    if (reduceMotion) return .62;
    const raw = (Math.sin(time * .42 + phase) + 1) * .5;
    return raw * raw * (3 - 2 * raw);
  }

  function drawPreviewSources(ctx, leftX, rightX, y, colour, breath, scale = 1) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    [leftX, rightX].forEach((x, index) => {
      const radius = (8 + breath * 8 + index) * scale;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.2);
      glow.addColorStop(0, colour.replace("ALPHA", ".58"));
      glow.addColorStop(.18, colour.replace("ALPHA", ".2"));
      glow.addColorStop(1, colour.replace("ALPHA", "0"));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = colour.replace("ALPHA", ".82");
      ctx.beginPath();
      ctx.arc(x, y, 1.35 * scale, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawWovenCanopyStage(ctx, time, width, height, seed) {
    const breath = previewBreath(time, -.45);
    const rand = mulberry32(seed * 151 + 31);
    const leftX = width * (.24 - breath * .1);
    const rightX = width * (.76 + breath * .1);
    const baseY = height * .63;

    ctx.fillStyle = "#0b100d";
    ctx.fillRect(0, 0, width, height);
    const halo = ctx.createRadialGradient(width * .5, baseY * .82, 0, width * .5, baseY * .82, width * .48);
    halo.addColorStop(0, "rgba(230,216,184,.065)");
    halo.addColorStop(1, "rgba(11,16,13,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.lineCap = "round";
    const strands = 42;
    for (let strand = 0; strand < strands; strand++) {
      const lane = (strand - (strands - 1) / 2) / ((strands - 1) / 2);
      const lagged = previewBreath(time, -Math.abs(lane) * .55);
      const archHeight = height * (.19 + lagged * .19) * (1 - Math.abs(lane) * .34);
      ctx.beginPath();
      for (let sample = 0; sample <= 64; sample++) {
        const u = sample / 64;
        const envelope = Math.sin(u * Math.PI);
        const x = leftX + (rightX - leftX) * u;
        const weave = Math.sin(u * TAU * 5 + strand * .58 + time * .13) * 2.2 * envelope;
        const y = baseY - archHeight * envelope + lane * height * .13 * envelope + weave;
        if (!sample) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = strand % 7 === 0
        ? `rgba(230,216,184,${.17 + rand() * .1})`
        : `rgba(183,170,138,${.07 + rand() * .1})`;
      ctx.lineWidth = strand % 7 === 0 ? .82 : .38 + rand() * .35;
      ctx.stroke();
    }

    for (let cross = 0; cross < 27; cross++) {
      const u = (cross + .5) / 27;
      const envelope = Math.sin(u * Math.PI);
      const x = leftX + (rightX - leftX) * u + Math.sin(time * .16 + cross) * 1.4;
      const top = baseY - height * (.19 + breath * .19) * envelope - height * .11 * envelope;
      const bottom = baseY - height * (.19 + breath * .19) * envelope + height * .11 * envelope;
      ctx.strokeStyle = `rgba(104,122,104,${.055 + (cross % 4 === 0 ? .08 : 0)})`;
      ctx.lineWidth = cross % 4 === 0 ? .7 : .34;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.bezierCurveTo(x + 4, top + (bottom - top) * .33, x - 4, top + (bottom - top) * .66, x, bottom);
      ctx.stroke();
    }
    ctx.restore();
    drawPreviewSources(ctx, leftX, rightX, baseY, "rgba(230,216,184,ALPHA)", breath, .78);
  }

  function drawPartedVeilStage(ctx, time, width, height) {
    const breath = previewBreath(time, -.25);
    const centreX = width * .5;
    const centreY = height * .52;
    const gap = width * (.035 + breath * .22);

    ctx.fillStyle = "#040811";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      const side = sideIndex ? 1 : -1;
      const edgeX = centreX + side * gap;
      const outerX = centreX + side * width * .49;
      const gradient = ctx.createLinearGradient(edgeX, 0, outerX, 0);
      gradient.addColorStop(0, side < 0 ? "rgba(203,228,234,.2)" : "rgba(203,228,234,.16)");
      gradient.addColorStop(.2, side < 0 ? "rgba(85,75,100,.2)" : "rgba(102,120,140,.2)");
      gradient.addColorStop(1, "rgba(4,8,17,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(outerX, 0);
      for (let sample = 0; sample <= 52; sample++) {
        const u = sample / 52;
        const y = u * height;
        const waist = Math.sin(u * Math.PI);
        const ripple = Math.sin(u * TAU * 2.4 + time * .22 + sideIndex * 1.8) * width * .012 * waist;
        const x = edgeX + side * (width * .035 * waist + ripple);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(outerX, height);
      ctx.closePath();
      ctx.fill();

      for (let echo = 0; echo < 5; echo++) {
        ctx.strokeStyle = side < 0
          ? `rgba(85,75,100,${.1 - echo * .012})`
          : `rgba(102,120,140,${.1 - echo * .012})`;
        ctx.lineWidth = echo === 0 ? 1.05 : .45;
        ctx.beginPath();
        for (let sample = 0; sample <= 52; sample++) {
          const u = sample / 52;
          const y = u * height;
          const waist = Math.sin(u * Math.PI);
          const rebound = Math.sin(time * .32 - echo * .34) * 2.4 * waist;
          const x = edgeX + side * (echo * 8 + width * .035 * waist + rebound);
          if (!sample) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    const voidGlow = ctx.createRadialGradient(centreX, centreY, 0, centreX, centreY, gap * 1.5 + 80);
    voidGlow.addColorStop(0, "rgba(1,3,8,.92)");
    voidGlow.addColorStop(.7, "rgba(1,3,8,.45)");
    voidGlow.addColorStop(1, "rgba(1,3,8,0)");
    ctx.fillStyle = voidGlow;
    ctx.fillRect(centreX - gap * 1.6 - 90, 0, gap * 3.2 + 180, height);
    ctx.restore();
  }

  function drawMercuryBasinStage(ctx, time, width, height, seed) {
    const breath = previewBreath(time, -.65);
    const rand = mulberry32(seed * 163 + 43);
    const cx = width * .5;
    const cy = height * .57;
    const radius = Math.min(width * (.2 + breath * .25), height * .68);

    ctx.fillStyle = "#071013";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, .46);
    const basin = ctx.createRadialGradient(0, 0, radius * .06, 0, 0, radius);
    basin.addColorStop(0, "rgba(221,231,228,.22)");
    basin.addColorStop(.18, "rgba(79,88,89,.2)");
    basin.addColorStop(.62, "rgba(24,34,37,.54)");
    basin.addColorStop(1, "rgba(7,16,19,0)");
    ctx.fillStyle = basin;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();

    for (let ring = 0; ring < 32; ring++) {
      const p = (ring + 1) / 32;
      const echo = Math.sin(time * .54 - p * 8) * radius * .012;
      ctx.strokeStyle = `rgba(${ring % 6 === 0 ? "221,231,228" : "130,155,152"},${.035 + (1 - p) * .08})`;
      ctx.lineWidth = ring % 6 === 0 ? 1.2 : .46;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, radius * p + echo), 0, TAU);
      ctx.stroke();
    }

    for (let arc = 0; arc < 24; arc++) {
      const rr = radius * (.12 + rand() * .82);
      const start = rand() * TAU + time * (.035 + rand() * .07);
      const length = .08 + rand() * .38;
      ctx.strokeStyle = `rgba(221,231,228,${.08 + rand() * .32})`;
      ctx.lineWidth = .6 + rand() * 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, rr, start, start + length);
      ctx.stroke();
    }
    ctx.restore();
    const sourceGap = Math.min(radius * .7, width * .34);
    drawPreviewSources(ctx, cx - sourceGap, cx + sourceGap, cy, "rgba(221,231,228,ALPHA)", breath, .62);
  }

  function drawCloudChamberStage(ctx, time, width, height, seed) {
    const breath = previewBreath(time, -.35);
    const rand = mulberry32(seed * 181 + 71);
    const cx = width * .5;
    const cy = height * .52;
    ctx.fillStyle = "#0d0d0b";
    ctx.fillRect(0, 0, width, height);

    const beamStart = { x: width * .12, y: height * .09 };
    const beamEnd = { x: width * .86, y: height * .86 };
    const beamDx = beamEnd.x - beamStart.x;
    const beamDy = beamEnd.y - beamStart.y;
    const beamLength = Math.hypot(beamDx, beamDy);
    const beamNormalX = -beamDy / beamLength;
    const beamNormalY = beamDx / beamLength;

    // Two tapered, blurred layers keep the oblique amber light present without
    // reading as a hard-edged rectangle behind the archive copy.
    const drawFeatheredBeam = (startWidth, endWidth, blur, peakAlpha) => {
      const beam = ctx.createLinearGradient(beamStart.x, beamStart.y, beamEnd.x, beamEnd.y);
      beam.addColorStop(0, "rgba(213,190,142,0)");
      beam.addColorStop(.16, `rgba(213,190,142,${peakAlpha * .34})`);
      beam.addColorStop(.5, `rgba(213,190,142,${peakAlpha})`);
      beam.addColorStop(.79, `rgba(213,190,142,${peakAlpha * .44})`);
      beam.addColorStop(1, "rgba(213,190,142,0)");

      ctx.save();
      ctx.filter = `blur(${blur}px)`;
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(
        beamStart.x + beamNormalX * startWidth,
        beamStart.y + beamNormalY * startWidth
      );
      ctx.lineTo(
        beamEnd.x + beamNormalX * endWidth,
        beamEnd.y + beamNormalY * endWidth
      );
      ctx.lineTo(
        beamEnd.x - beamNormalX * endWidth,
        beamEnd.y - beamNormalY * endWidth
      );
      ctx.lineTo(
        beamStart.x - beamNormalX * startWidth,
        beamStart.y - beamNormalY * startWidth
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    drawFeatheredBeam(height * .018, height * .13, 34, .1);
    drawFeatheredBeam(height * .006, height * .062, 14, .075);

    const cloudSpread = Math.min(width * .47, height * (.32 + breath * .22));
    const cloudTilt = -.14;
    const driftPhase = time * .024;

    const drawFogVolume = (x, y, radius, scaleX, scaleY, alpha, blur, colour) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(cloudTilt);
      ctx.scale(scaleX, scaleY);
      ctx.filter = `blur(${blur}px)`;
      const fog = ctx.createRadialGradient(-radius * .12, 0, radius * .03, 0, 0, radius);
      fog.addColorStop(0, `rgba(${colour},${alpha})`);
      fog.addColorStop(.42, `rgba(${colour},${alpha * .7})`);
      fog.addColorStop(.78, `rgba(${colour},${alpha * .18})`);
      fog.addColorStop(1, `rgba(${colour},0)`);
      ctx.fillStyle = fog;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
      ctx.restore();
    };

    // A continuous, low horizontal volume makes the chamber read as cloud
    // before the individual particles become visible.
    drawFogVolume(
      cx + Math.sin(driftPhase) * cloudSpread * .035,
      cy + cloudSpread * .03,
      cloudSpread,
      1.36,
      .53,
      .18,
      22,
      "58,51,43"
    );
    ctx.globalCompositeOperation = "screen";
    drawFogVolume(
      cx - cloudSpread * .05,
      cy - cloudSpread * .015,
      cloudSpread * .9,
      1.4,
      .48,
      .13 + breath * .035,
      17,
      "161,157,145"
    );
    drawFogVolume(
      cx + cloudSpread * .18,
      cy - cloudSpread * .05,
      cloudSpread * .64,
      1.25,
      .43,
      .105,
      13,
      "113,132,122"
    );

    // Overlapping mid-scale cells supply the uneven depth and curled edges
    // found in the live Cloud Chamber rather than a uniform fog ellipse.
    for (let cloud = 0; cloud < 42; cloud++) {
      const angle = rand() * TAU;
      const distance = Math.sqrt(rand());
      const localX = Math.cos(angle) * distance * cloudSpread * 1.08;
      const localY = Math.sin(angle) * distance * cloudSpread * .39;
      const flow = Math.sin(driftPhase + cloud * .73) * cloudSpread * (.012 + rand() * .026);
      const x = cx + localX * Math.cos(cloudTilt) - localY * Math.sin(cloudTilt) + flow;
      const y = cy + localX * Math.sin(cloudTilt) + localY * Math.cos(cloudTilt) - flow * .28;
      const radius = cloudSpread * (.09 + rand() * .19);
      const edgeFade = Math.pow(1 - distance, .45);
      const isCool = cloud % 6 === 0;
      drawFogVolume(
        x,
        y,
        radius,
        1.05 + rand() * .7,
        .55 + rand() * .38,
        (.075 + rand() * .085) * (.42 + edgeFade * .7),
        5 + rand() * 8,
        isCool ? "113,132,122" : "161,157,145"
      );
    }

    // Dense suspended matter catches the beam; most motes stay dim and soft,
    // with only a small warm subset sparkling in the amber light.
    ctx.filter = "none";
    for (let mote = 0; mote < 720; mote++) {
      const angle = rand() * TAU;
      const distance = Math.sqrt(rand());
      const localX = Math.cos(angle) * distance * cloudSpread * 1.25;
      const localY = Math.sin(angle) * distance * cloudSpread * .46;
      const speed = 2 + rand() * 6;
      const flow = Math.sin(time * .02 + mote * .41) * cloudSpread * .025
        + ((time * speed + mote * 13) % 58) - 29;
      const x = cx + localX * Math.cos(cloudTilt) - localY * Math.sin(cloudTilt) + flow;
      const y = cy + localX * Math.sin(cloudTilt) + localY * Math.cos(cloudTilt) - flow * .18;
      const beamProgress = Math.max(0, Math.min(1, (
        (x - beamStart.x) * beamDx + (y - beamStart.y) * beamDy
      ) / (beamLength * beamLength)));
      const beamX = beamStart.x + beamDx * beamProgress;
      const beamY = beamStart.y + beamDy * beamProgress;
      const beamDistance = Math.hypot(x - beamX, y - beamY);
      const beamWidth = height * (.025 + beamProgress * .14);
      const beamAmount = Math.max(0, 1 - beamDistance / beamWidth);
      const edgeFade = Math.pow(1 - distance, .55);
      const warm = beamAmount > .18 && mote % 7 === 0;
      const alpha = edgeFade * (warm
        ? .34 + rand() * .38 + beamAmount * .16
        : .09 + rand() * .22 + beamAmount * .17);
      const size = warm ? 1.1 + rand() * 1.35 : .55 + rand() * .9;

      ctx.fillStyle = warm
        ? `rgba(213,190,142,${alpha})`
        : `rgba(${mote % 8 === 0 ? "113,132,122" : "216,213,200"},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawCosmicMemoryStage(ctx, time, width, height, seed, mode) {
    const rand = mulberry32(seed * 193 + 89);
    const breath = previewBreath(time, -.72);
    const cx = width * .5;
    const cy = height * .52;
    const maxRadius = Math.min(width * .42, height * .72);

    if (mode === "lacquer") {
      ctx.fillStyle = "#170a0b";
      ctx.fillRect(0, 0, width, height);

      const surfaceGrain = (progress, surfaceSeed, flow, octave = 1) => (
        Math.sin(progress * TAU * (1.15 + octave * .23) + surfaceSeed * .013 + flow * 19) * .58
        + Math.sin(progress * TAU * (2.35 + octave * .41) + surfaceSeed * .031 - flow * 13) * .27
        + Math.sin(progress * TAU * (4.1 + octave * .17) + surfaceSeed * .007 + flow * 7) * .15
      );

      const lacquerEdgeY = (progress, halfHeight, surfaceSeed, flow, irregularity, side = -1) => {
        const envelope = Math.pow(Math.max(0, Math.sin(progress * Math.PI)), side < 0 ? .46 : .5);
        const grain = surfaceGrain(progress, surfaceSeed + (side > 0 ? 9.3 : 0), flow, side > 0 ? 2 : 1);
        const drift = Math.sin(progress * TAU * (side < 0 ? 1.35 : 1.1)
          + surfaceSeed * (side < 0 ? .013 : .009)
          + flow * (side < 0 ? 19 : -17)) * (side < 0 ? .24 : .2);
        return side * halfHeight * envelope * (
          (side < 0 ? 1 : .92) + (grain + drift) * irregularity
        );
      };

      const buildSlice = (x, y, radius, halfHeight, surfaceSeed, flow, irregularity) => {
        ctx.beginPath();
        for (let sample = 0; sample <= 84; sample++) {
          const progress = sample / 84;
          const px = x - radius + radius * 2 * progress;
          const py = y + lacquerEdgeY(progress, halfHeight, surfaceSeed, flow, irregularity, -1);
          if (!sample) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        for (let sample = 84; sample >= 0; sample--) {
          const progress = sample / 84;
          ctx.lineTo(
            x - radius + radius * 2 * progress,
            y + lacquerEdgeY(progress, halfHeight, surfaceSeed, flow, irregularity, 1)
          );
        }
        ctx.closePath();
      };

      const ribbonGeometry = (progress, halfHeight, surfaceSeed, flow, irregularity) => {
        const envelope = Math.pow(Math.max(0, Math.sin(progress * Math.PI)), .42);
        const centre = Math.sin(progress * TAU * 1.15 + surfaceSeed * .01) * halfHeight * .7
          + surfaceGrain(progress, surfaceSeed, flow, 3) * halfHeight * .46;
        const thicknessNoise = .5 + surfaceGrain(progress, surfaceSeed + 4.1, flow, 4) * .5;
        const thickness = halfHeight * envelope * (.72 + thicknessNoise * irregularity * 2.3);
        return { centre, thickness };
      };

      const buildRibbon = (x, y, radius, halfHeight, surfaceSeed, flow, irregularity) => {
        ctx.beginPath();
        for (let sample = 0; sample <= 72; sample++) {
          const progress = sample / 72;
          const geometry = ribbonGeometry(progress, halfHeight, surfaceSeed, flow, irregularity);
          const px = x - radius + radius * 2 * progress;
          const py = y + geometry.centre - geometry.thickness;
          if (!sample) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        for (let sample = 72; sample >= 0; sample--) {
          const progress = sample / 72;
          const geometry = ribbonGeometry(progress, halfHeight, surfaceSeed, flow, irregularity);
          ctx.lineTo(
            x - radius + radius * 2 * progress,
            y + geometry.centre + geometry.thickness
          );
        }
        ctx.closePath();
      };

      const drawTopEdge = (x, y, radius, halfHeight, surfaceSeed, flow, irregularity, alpha, widthValue) => {
        ctx.strokeStyle = `rgba(169,87,55,${alpha})`;
        ctx.lineWidth = widthValue;
        ctx.beginPath();
        for (let sample = 2; sample <= 72; sample++) {
          const progress = sample / 74;
          const px = x - radius + radius * 2 * progress;
          const py = y + lacquerEdgeY(progress, halfHeight, surfaceSeed, flow, irregularity, -1);
          if (sample === 2) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      };

      const drawSpecularSweep = (x, y, radius, halfHeight, surfaceSeed, flow, phase, alpha, widthValue) => {
        const centre = .5 + Math.sin(phase + surfaceSeed * .017) * .27;
        const span = .115;
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(232,197,162,.34)";
        ctx.strokeStyle = `rgba(232,197,162,${alpha})`;
        ctx.lineWidth = widthValue;
        ctx.beginPath();
        for (let sample = 0; sample <= 24; sample++) {
          const local = sample / 24;
          const progress = Math.max(.035, Math.min(.965, centre - span / 2 + span * local));
          const px = x - radius + radius * 2 * progress;
          const taper = Math.sin(local * Math.PI);
          const py = y + lacquerEdgeY(progress, halfHeight, surfaceSeed, flow, .055, -1)
            - taper * widthValue * .35;
          if (!sample) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      };

      const fieldRadius = maxRadius * (.31 + breath * .67);
      const fieldHalfHeight = fieldRadius * (.17 + breath * .12);
      const flow = time * .014;

      // Live wet field: one breathing, flowing black-lacquer slice with an
      // inner resin body, a narrow memory streak, and a traveling reflection.
      ctx.save();
      ctx.filter = "blur(18px)";
      ctx.fillStyle = `rgba(104,25,30,${.09 + breath * .08})`;
      buildSlice(cx, cy, fieldRadius * 1.04, fieldHalfHeight * 1.1, 331, flow, .09);
      ctx.fill();
      ctx.restore();

      const wetField = ctx.createLinearGradient(cx - fieldRadius, cy, cx + fieldRadius, cy);
      wetField.addColorStop(0, "rgba(23,10,11,.94)");
      wetField.addColorStop(.48, "rgba(59,17,20,.82)");
      wetField.addColorStop(.7, "rgba(104,25,30,.48)");
      wetField.addColorStop(1, "rgba(8,3,4,.94)");
      ctx.fillStyle = wetField;
      buildSlice(cx, cy, fieldRadius, fieldHalfHeight, 401, flow, .072);
      ctx.fill();

      ctx.fillStyle = "rgba(59,17,20,.5)";
      buildSlice(
        cx + fieldRadius * .035,
        cy + fieldHalfHeight * .12,
        fieldRadius * .92,
        fieldHalfHeight * .74,
        457,
        flow + .017,
        .085
      );
      ctx.fill();
      ctx.fillStyle = `rgba(104,25,30,${.18 + breath * .11})`;
      buildRibbon(
        cx - fieldRadius * .045,
        cy - fieldHalfHeight * .18,
        fieldRadius * .91,
        fieldHalfHeight * .16,
        509,
        flow + .031,
        .11
      );
      ctx.fill();
      drawTopEdge(cx, cy, fieldRadius * .98, fieldHalfHeight * .88, 401, flow, .072, .34 + breath * .2, 1.05 + breath * .55);
      drawSpecularSweep(cx, cy, fieldRadius * .94, fieldHalfHeight * .86, 401, flow, time * .22, .55 + breath * .18, 2.05);

      // Eight completed breaths cure into the same offset horizontal ribbons
      // used by drawLacquerMemories(), instead of unrelated nested ellipses.
      const horizontalOffsets = [0, .034, -.028, .022, -.034, .03, -.018, .012];
      const verticalOrder = [0, -1, 1, -2, 2, -3, 3, -4];
      const layerSpacing = maxRadius * .074;
      for (let layer = 7; layer >= 0; layer--) {
        const step = layer / 7;
        const radius = maxRadius * (1 - step * .66);
        const halfHeight = Math.max(8, radius * (.055 + step * .03));
        const x = cx + maxRadius * horizontalOffsets[layer] * 1.08;
        const y = cy + verticalOrder[layer] * layerSpacing * 1.08;
        const surfaceSeed = 503 + layer * 71;
        const frozenFlow = .268 + layer * .013;
        const layerColour = layer % 2 === 0 ? "104,25,30" : "59,17,20";

        ctx.fillStyle = "rgba(23,10,11,.86)";
        buildRibbon(x, y, radius * 1.015, halfHeight * 1.18, surfaceSeed + 3, frozenFlow, .045);
        ctx.fill();
        ctx.fillStyle = `rgba(${layerColour},${.5 + (1 - step) * .16})`;
        buildRibbon(x, y, radius, halfHeight, surfaceSeed + 19, frozenFlow + .013, .04);
        ctx.fill();
        drawTopEdge(x, y, radius * .985, halfHeight * .9, surfaceSeed + 19, frozenFlow, .04, .22 + (1 - step) * .15, .72);
        drawSpecularSweep(
          x,
          y,
          radius * .965,
          halfHeight * .88,
          surfaceSeed + 19,
          frozenFlow,
          time * .19 + surfaceSeed * .001,
          .34 + (1 - step) * .22,
          1.05
        );
      }
      return;
    }

    if (mode === "paper") {
      ctx.fillStyle = "#171510";
      ctx.fillRect(0, 0, width, height);

      const clamp01 = value => Math.max(0, Math.min(1, value));
      const easeOut = value => 1 - Math.pow(1 - clamp01(value), 3);
      const paperWarp = (angle, paperSeed, detailOffset = 0) => (
        Math.sin(angle * 3 + paperSeed * .071) * .018
        + Math.sin(angle * 7.1 + paperSeed * .113 + detailOffset) * .015
        + Math.sin(angle * 13.7 - paperSeed * .047 + detailOffset * 1.7) * .011
      );

      const buildPaperContour = (radius, aspect, paperSeed, detailOffset = 0) => {
        ctx.beginPath();
        for (let point = 0; point <= 68; point++) {
          const angle = point / 68 * TAU;
          const localRadius = radius * (1 + paperWarp(angle, paperSeed, detailOffset));
          const x = Math.cos(angle) * localRadius;
          const y = Math.sin(angle) * localRadius * aspect;
          if (!point) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      const drawPaperDisc = (radius, aspect, paperSeed, paperColour, alpha, embossStrength, detailIndex) => {
        const detailVisibility = Math.min(1, alpha * .92);
        ctx.save();
        ctx.translate(10, 12);
        ctx.fillStyle = `rgba(81,74,63,${alpha * .34})`;
        buildPaperContour(radius * 1.012, aspect, paperSeed);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = `rgba(42,41,37,${alpha * .9})`;
        buildPaperContour(radius * 1.025, aspect * 1.018, paperSeed);
        ctx.fill();

        ctx.fillStyle = `rgba(${paperColour},${alpha})`;
        buildPaperContour(radius, aspect, paperSeed);
        ctx.fill();

        ctx.save();
        ctx.translate(-radius * .018, -radius * .018);
        ctx.fillStyle = `rgba(216,208,187,${alpha * .16})`;
        buildPaperContour(radius * .962, aspect * .975, paperSeed + 11, .8);
        ctx.fill();
        ctx.restore();

        // Three shallow paired curves reproduce the version's pressed relief.
        ctx.lineCap = "round";
        for (let line = 0; line < 3; line++) {
          const y = radius * aspect * (-.26 + line * .25);
          const span = radius * (.33 + line * .075);
          const drift = Math.sin(paperSeed * .023 + line * 1.9) * radius * .09;
          const bend = radius * (.045 + line * .012) * (line % 2 === 0 ? 1 : -1);
          ctx.strokeStyle = `rgba(81,74,63,${(.2 + embossStrength * .23) * detailVisibility})`;
          ctx.lineWidth = 1.4 + embossStrength * .8;
          ctx.beginPath();
          ctx.moveTo(-span + drift + 2.5, y + 3.5);
          ctx.bezierCurveTo(
            -span * .35 + drift, y + bend + 4,
            span * .3 + drift, y - bend + 4,
            span + drift + 2.5, y + 3.5
          );
          ctx.stroke();
          ctx.strokeStyle = `rgba(216,208,187,${(.15 + embossStrength * .19) * detailVisibility})`;
          ctx.lineWidth = .72 + embossStrength * .35;
          ctx.beginPath();
          ctx.moveTo(-span + drift - 1.5, y - 2);
          ctx.bezierCurveTo(
            -span * .35 + drift, y + bend - 2,
            span * .3 + drift, y - bend - 2,
            span + drift - 1.5, y - 2
          );
          ctx.stroke();
        }

        const markX = radius * .54;
        const markY = radius * aspect * .31;
        ctx.strokeStyle = `rgba(155,144,98,${(.42 + embossStrength * .18) * detailVisibility})`;
        ctx.lineWidth = .9;
        ctx.beginPath();
        ctx.moveTo(markX - radius * .035, markY);
        ctx.lineTo(markX + radius * .035, markY);
        ctx.stroke();
        ctx.fillStyle = `rgba(155,144,98,${(.46 + embossStrength * .2) * detailVisibility})`;
        ctx.beginPath();
        ctx.arc(markX + radius * .055, markY, Math.max(1.1, radius * .006), 0, TAU);
        ctx.fill();

        // Short fibres project from the irregular cut edge just as they do in
        // drawPaperFibres(); their deterministic placement stays stable.
        const fibreRand = mulberry32(Math.floor(paperSeed * 17 + detailIndex * 97));
        ctx.lineCap = "round";
        for (let fibre = 0; fibre < 42; fibre++) {
          const angle = fibreRand() * TAU;
          const length = 2.2 + fibreRand() * 6.3;
          const warp = 1 + paperWarp(angle, paperSeed);
          const x = Math.cos(angle) * radius * warp;
          const y = Math.sin(angle) * radius * aspect * warp;
          ctx.strokeStyle = `rgba(155,144,98,${alpha * (.12 + fibreRand() * .22)})`;
          ctx.lineWidth = .35 + fibreRand() * .5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * aspect * length);
          ctx.stroke();
        }
      };

      const fieldUnit = Math.min(width * .44, height * .7);

      // Only two incomplete material hints breathe in the preview. The full
      // five-sheet reveal remains reserved for the live experience.
      for (const layer of [2, 1]) {
        const delay = layer * .095;
        const reveal = easeOut((breath - delay) / Math.max(.001, 1 - delay));
        if (reveal <= .002) continue;
        const spread = (layer - 1.5) * fieldUnit * .022;
        const lift = Math.abs(layer - 2) * fieldUnit * .014;
        const pressScale = .94 + reveal * .06;
        const radius = fieldUnit * (.1 + reveal * .13) * (1 - layer * .018);
        const aspect = .62 + layer * .025;
        const paperSeed = 803 + layer * 47;
        const colour = layer % 2 === 0 ? "216,208,187" : "166,156,137";
        ctx.save();
        ctx.translate(cx + spread, cy - lift);
        ctx.rotate(-.075 + layer * .031);
        ctx.scale(pressScale, pressScale);
        drawPaperDisc(
          radius,
          aspect,
          paperSeed,
          colour,
          .18 + reveal * .2,
          .12 + reveal * .16,
          layer
        );
        ctx.restore();
      }

      // Three overlapping fragments hint at compression, but neither disclose
      // the eight-step diagonal archive nor show a finished emboss pattern.
      const hintOffsets = [
        { x: -.052, y: .032, scale: .86, alpha: .13 },
        { x: .006, y: -.006, scale: .93, alpha: .18 },
        { x: .062, y: -.038, scale: 1, alpha: .32 }
      ];
      const pressProgress = reduceMotion ? .5 : (time * .19) % 1;
      const press = Math.sin(pressProgress * Math.PI);
      hintOffsets.forEach((hint, memory) => {
        const active = memory === hintOffsets.length - 1;
        const x = cx + fieldUnit * hint.x;
        const baseY = cy + fieldUnit * hint.y;
        const radius = fieldUnit * .205 * hint.scale;
        const aspect = .67 + memory * .018;
        const localPress = active ? press : 0;
        const paperSeed = 1201 + memory * 61;
        const colour = memory % 2 === 0 ? "216,208,187" : "166,156,137";
        ctx.save();
        ctx.translate(x, baseY + localPress * 9);
        ctx.rotate(-.095 + memory * .026 + localPress * .014);
        const scale = 1 - localPress * .065;
        ctx.scale(scale, scale);
        if (active && localPress > .01) {
          ctx.save();
          ctx.translate(10 + localPress * 6, 12 + localPress * 7);
          ctx.fillStyle = `rgba(81,74,63,${.08 + localPress * .11})`;
          buildPaperContour(radius * 1.018, aspect * 1.01, paperSeed);
          ctx.fill();
          ctx.restore();
        }
        drawPaperDisc(
          radius,
          aspect,
          paperSeed,
          colour,
          hint.alpha + localPress * .08,
          .1 + localPress * .22,
          memory
        );
        ctx.restore();
      });
      return;
    }

    const amber = mode === "amber";
    const frozen = mode === "frozen";
    ctx.fillStyle = amber ? "#120506" : frozen ? "#111018" : "#101917";
    ctx.fillRect(0, 0, width, height);

    if (amber) {
      const volume = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      volume.addColorStop(0, "rgba(239,168,61,.1)");
      volume.addColorStop(.38, "rgba(110,25,30,.16)");
      volume.addColorStop(.72, "rgba(126,25,27,.06)");
      volume.addColorStop(1, "rgba(18,5,6,0)");
      ctx.fillStyle = volume;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius, 0, TAU);
      ctx.fill();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const orbitExtent = .34 + breath * .24;
      const sectorDrift = Math.sin(time * .045) * .14;

      // Keep the material dense, but reveal only broken orbital sectors. The
      // complete bilateral field and its two gravitational sources remain
      // reserved for the live experience.
      for (let particle = 0; particle < 820; particle++) {
        const baseAngle = rand() * TAU;
        const belt = particle % 9 === 0;
        const radialSeed = belt
          ? .48 + rand() * .44
          : Math.pow(rand(), .68);
        const radius = radialSeed * maxRadius * orbitExtent;
        const direction = particle % 7 === 0 ? -1 : 1;
        const speed = (.018 + rand() * .062) * direction;
        const angle = baseAngle + time * speed;
        const sectorA = Math.pow(Math.max(0, Math.cos(angle + .58 + sectorDrift)), 5);
        const sectorB = Math.pow(Math.max(0, Math.cos(angle - 2.32 - sectorDrift)), 7) * .62;
        const sectorVisibility = .1 + Math.max(sectorA, sectorB) * .9;
        const flutter = Math.sin(time * .11 + particle * .83) * maxRadius * .007;
        const x = cx + maxRadius * .035 + Math.cos(angle) * (radius + flutter) * 1.18;
        const y = cy + maxRadius * .02 + Math.sin(angle) * (radius + flutter) * (.5 + radialSeed * .09);
        const tone = rand();
        const sparkle = .5 + Math.sin(time * .42 + particle * 1.37) * .5;
        const edgeFade = Math.pow(1 - radialSeed * .68, .52);
        const alpha = edgeFade * sectorVisibility * (
          tone < .34
            ? .16 + rand() * .34
            : tone < .9
              ? .28 + rand() * .5 + sparkle * .12
              : .48 + rand() * .42 + sparkle * .16
        );
        const size = tone > .92 || particle % 37 === 0
          ? 1.35 + rand() * 1.15
          : .55 + rand() * .78;

        ctx.fillStyle = tone < .34
          ? `rgba(132,29,29,${alpha})`
          : tone < .9
            ? `rgba(255,186,62,${alpha})`
            : `rgba(255,226,142,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
        if (tone > .955) {
          const halo = ctx.createRadialGradient(x, y, 0, x, y, size * 5.5);
          halo.addColorStop(0, `rgba(255,205,95,${sectorVisibility * .22})`);
          halo.addColorStop(1, "rgba(239,168,61,0)");
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(x, y, size * 5.5, 0, TAU);
          ctx.fill();
        }
      }

      // Only a subdued, offset fragment of the dense core is shown; its full
      // symmetry and relationship to the two hands stay concealed.
      const coreX = cx + maxRadius * .065;
      const coreY = cy - maxRadius * .018;
      const coreRadius = maxRadius * (.045 + breath * .045);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let core = 0; core < 120; core++) {
        const normalized = (core + .5) / 120;
        const depth = 1 - normalized;
        const radius = Math.sqrt(normalized) * coreRadius;
        const direction = core % 9 === 0 ? -1 : 1;
        const angle = core * goldenAngle + time * .07 * direction * (.45 + depth * 1.4);
        const flutter = Math.sin(time * .18 + core * .73) * (1.2 + breath * 2.4);
        const x = coreX + Math.cos(angle) * (radius + flutter);
        const y = coreY + Math.sin(angle) * (radius + flutter) * (.58 + breath * .16);
        const sparkle = .5 + Math.sin(time * .52 + core * 1.31) * .5;
        const alpha = .18 + depth * .28 + sparkle * .12;

        ctx.fillStyle = core % 7 === 0
          ? `rgba(104,30,19,${alpha * .72})`
          : core % 11 === 0
            ? `rgba(255,221,137,${alpha})`
            : `rgba(255,208,105,${alpha * .92})`;
        ctx.beginPath();
        ctx.arc(x, y, .48 + sparkle * .65, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (frozen) {
      const fieldRadius = maxRadius * (.34 + breath * .66);
      const fieldAspect = .36 + breath * .28;

      const drawFacetedLoop = (radius, aspect, rotation, samples, colour, alpha, lineWidth) => {
        ctx.strokeStyle = `rgba(${colour},${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        for (let sample = 0; sample <= samples; sample++) {
          const angle = sample / samples * TAU;
          const wobble = 1
            + Math.sin(angle * 3 + rotation * 9) * .012
            + Math.sin(angle * 7 - rotation * 5) * .007;
          const x = cx + Math.cos(angle + rotation) * radius * wobble;
          const y = cy + Math.sin(angle + rotation) * radius * aspect * wobble;
          if (!sample) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      };

      // Central glow and ten translucent bodies mirror drawCentralGlow() and
      // drawOrbitBody() from the live variant.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, fieldAspect);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, fieldRadius * 1.08);
      glow.addColorStop(0, `rgba(205,197,216,${.09 + breath * .045})`);
      glow.addColorStop(.46, `rgba(118,105,137,${.075 + breath * .035})`);
      glow.addColorStop(1, "rgba(17,16,24,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, fieldRadius * 1.08, 0, TAU);
      ctx.fill();
      for (let body = 0; body < 10; body++) {
        const bodyRadius = fieldRadius * (1 - body / 9 * .78);
        ctx.fillStyle = `rgba(72,65,83,${.03 - body * .0012})`;
        ctx.beginPath();
        ctx.arc(0, 0, bodyRadius, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // The version uses 15 slowly moving 34-point faceted orbit lines.
      for (let orbit = 0; orbit < 15; orbit++) {
        const progress = orbit / 14;
        const radius = fieldRadius * (.16 + progress * .94);
        const pulse = Math.sin(time * .027 + orbit * .5) * breath * 2.8;
        drawFacetedLoop(
          radius + pulse,
          fieldAspect,
          time * .0032 + orbit * .002,
          34,
          "184,174,199",
          (1 - progress * .45) * (.13 + breath * .16),
          1.05 - progress * .58
        );
      }

      // Retain the live variation's 224 ambient dust particles.
      for (let dust = 0; dust < 224; dust++) {
        const angle = rand() * TAU + time * (.001 + rand() * .0045);
        const radius = (20 + rand() * (fieldRadius - 20)) * breath;
        const depth = .4 + rand() * .6;
        const x = cx + Math.cos(angle) * radius * depth;
        const y = cy + Math.sin(angle) * radius * fieldAspect * depth;
        const size = (.8 + rand() * 2.4) * depth * .72;
        ctx.fillStyle = `rgba(211,203,220,${(.08 + rand() * .2) * (.42 + breath * .58)})`;
        ctx.beginPath();
        ctx.arc(x, y, size * .5, 0, TAU);
        ctx.fill();
      }

      // Three completed breaths remain as four-layer, 28-point polygonal
      // memory rings with dust points, matching drawMemoryRings().
      const memoryRadii = [.84, .61, .4];
      memoryRadii.forEach((memoryScale, memoryIndex) => {
        const memoryRadius = maxRadius * memoryScale;
        const memoryAspect = .5 + memoryIndex * .055;
        const rotation = -.035 + memoryIndex * .028;
        for (let layer = 0; layer < 4; layer++) {
          drawFacetedLoop(
            memoryRadius * (.9 + layer / 3 * .18),
            memoryAspect,
            rotation,
            28,
            "203,194,213",
            .13 - layer * .018,
            .62
          );
        }
        for (let point = 0; point < 48; point++) {
          const angle = point / 48 * TAU + memoryIndex * .37;
          const radius = memoryRadius * (.83 + rand() * .3);
          const sparkle = .5 + Math.sin(time * .056 + point * 1.7) * .5;
          ctx.fillStyle = `rgba(221,214,228,${.12 + sparkle * .13})`;
          ctx.beginPath();
          ctx.arc(
            cx + Math.cos(angle) * radius,
            cy + Math.sin(angle) * radius * memoryAspect,
            .42 + rand() * .48,
            0,
            TAU
          );
          ctx.fill();
        }
      });

      // Recreate captureCrystalConnections(): each captured group adds three
      // straight links between fixed left/right fingertip indices. Eight
      // accumulated groups show persistence without inventing a new mesh type.
      const fingertipY = [-.48, -.26, 0, .26, .48];
      const connectionSpan = maxRadius * .72;
      const connections = [];
      for (let capture = 0; capture < 8; capture++) {
        for (let link = 0; link < 3; link++) {
          const leftIndex = (capture * 2 + link) % 5;
          const rightIndex = (capture * 3 + link * 2 + 1) % 5;
          const captureDrift = (capture - 3.5) * maxRadius * .018;
          const left = {
            x: cx - connectionSpan * (.5 + leftIndex * .025) + captureDrift,
            y: cy + fingertipY[leftIndex] * connectionSpan * .92
              + Math.sin(capture * 1.3 + leftIndex) * maxRadius * .018
          };
          const right = {
            x: cx + connectionSpan * (.5 + rightIndex * .025) - captureDrift,
            y: cy + fingertipY[rightIndex] * connectionSpan * .92
              + Math.cos(capture * 1.17 + rightIndex) * maxRadius * .018
          };
          connections.push({ left, right, capture, link });
        }
      }

      const activeCapture = reduceMotion ? 7 : Math.floor(time * .16) % 8;
      const growth = reduceMotion ? 1 : (time * .16) % 1;
      ctx.save();
      ctx.lineCap = "round";
      connections.forEach(connection => {
        const isGrowing = connection.capture === activeCapture;
        const reveal = isGrowing ? growth : 1;
        const endX = connection.left.x + (connection.right.x - connection.left.x) * reveal;
        const endY = connection.left.y + (connection.right.y - connection.left.y) * reveal;
        ctx.strokeStyle = isGrowing
          ? "rgba(221,214,228,.44)"
          : "rgba(203,194,213,.23)";
        ctx.lineWidth = isGrowing ? .88 : .62;
        ctx.beginPath();
        ctx.moveTo(connection.left.x, connection.left.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        if (reveal >= 1) {
          ctx.fillStyle = isGrowing
            ? "rgba(221,214,228,.62)"
            : "rgba(221,214,228,.3)";
          ctx.beginPath();
          ctx.arc(connection.left.x, connection.left.y, .82, 0, TAU);
          ctx.arc(connection.right.x, connection.right.y, .82, 0, TAU);
          ctx.fill();
        }
      });
      ctx.restore();
      return;
    }

    const anchors = [];
    for (let star = 0; star < 190; star++) {
      const angle = rand() * TAU;
      const radius = Math.sqrt(rand()) * maxRadius;
      const x = cx + Math.cos(angle) * radius * 1.22;
      const y = cy + Math.sin(angle) * radius * .63;
      anchors.push([x, y]);
      ctx.fillStyle = `rgba(238,231,198,${.05 + rand() * .34})`;
      ctx.fillRect(x, y, rand() > .92 ? 1.8 : .8, rand() > .92 ? 1.8 : .8);
    }

    for (let ring = 0; ring < 8; ring++) {
      const p = ring / 7;
      const radius = maxRadius * (1 - p * .78);
      const pulse = Math.sin(time * .22 - ring * .55) * 2.4;
      ctx.strokeStyle = `rgba(238,232,198,${.075 + (1 - p) * .07})`;
      ctx.lineWidth = ring === Math.floor((time * .18) % 8) ? 1.15 : .48;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius + pulse, (radius + pulse) * .52, ring * .025, 0, TAU);
      ctx.stroke();
    }
    const sourceGap = maxRadius * (.18 + breath * .62);
    drawPreviewSources(ctx, cx - sourceGap, cx + sourceGap, cy, "rgba(231,219,181,ALPHA)", breath, .55);
  }

  function drawSessionArchiveStage(ctx, time, width, height, seed, palette) {
    const rand = mulberry32(seed * 227 + 101);
    const cx = width * .5;
    const cy = height * .52;
    const maxRadius = Math.min(width * .39, height * .62);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    const anchors = [];
    for (let ring = 0; ring < 8; ring++) {
      const p = ring / 7;
      const radius = maxRadius * (1 - p * .78);
      const rotation = ring * 2.39996 + (rand() - .5) * .18;
      const aspect = .5 + rand() * .12;
      ctx.strokeStyle = palette.contour.replace("ALPHA", String(.09 + (1 - p) * .08));
      ctx.lineWidth = .45 + (ring % 3 === 0 ? .3 : 0);
      ctx.beginPath();
      for (let sample = 0; sample <= 72; sample++) {
        const u = sample / 72;
        const angle = u * TAU;
        const irregularity = 1 + Math.sin(angle * (3 + ring % 3) + ring) * .035 + Math.sin(time * .07 + ring) * .008;
        const localX = Math.cos(angle) * radius * irregularity;
        const localY = Math.sin(angle) * radius * aspect * irregularity;
        const x = cx + localX * Math.cos(rotation) - localY * Math.sin(rotation);
        const y = cy + localX * Math.sin(rotation) + localY * Math.cos(rotation);
        if (!sample) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const anchorAngle = -Math.PI / 2 + rotation;
      const anchor = [cx + Math.cos(anchorAngle) * radius, cy + Math.sin(anchorAngle) * radius * aspect];
      anchors.push(anchor);
    }

    ctx.strokeStyle = palette.path.replace("ALPHA", ".27");
    ctx.lineWidth = .72;
    ctx.beginPath();
    anchors.forEach((anchor, index) => {
      if (!index) ctx.moveTo(anchor[0], anchor[1]);
      else ctx.lineTo(anchor[0], anchor[1]);
    });
    ctx.stroke();
    anchors.forEach((anchor, index) => {
      const pulse = 1 + Math.sin(time * .7 - index * .6) * .35;
      const glow = ctx.createRadialGradient(anchor[0], anchor[1], 0, anchor[0], anchor[1], 13 * pulse);
      glow.addColorStop(0, palette.star.replace("ALPHA", ".72"));
      glow.addColorStop(1, palette.star.replace("ALPHA", "0"));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(anchor[0], anchor[1], 13 * pulse, 0, TAU);
      ctx.fill();
      ctx.fillStyle = palette.star.replace("ALPHA", ".86");
      ctx.fillRect(anchor[0] - 1, anchor[1] - 1, 2, 2);
    });
  }

  function drawPressedHerbariumStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 239 + 113);
    const drift = reduceMotion ? 0 : time;
    const left = width * .055;
    const right = width * .945;
    const top = height * .08;
    const bottom = height * .92;

    ctx.fillStyle = "#d2c9b3";
    ctx.fillRect(0, 0, width, height);

    const paperShade = ctx.createLinearGradient(left, top, right, bottom);
    paperShade.addColorStop(0, "rgba(239,234,218,.1)");
    paperShade.addColorStop(.48, "rgba(140,151,128,.025)");
    paperShade.addColorStop(1, "rgba(74,82,63,.075)");
    ctx.fillStyle = paperShade;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let fibre = 0; fibre < 310; fibre++) {
      const x = rand() * width;
      const y = rand() * height;
      const length = 5 + rand() * 27;
      ctx.strokeStyle = rand() > .58 ? "rgba(244,238,218,.085)" : "rgba(78,91,70,.055)";
      ctx.lineWidth = .3 + rand() * .42;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y + (rand() - .5) * 2.2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(47,59,46,.16)";
    ctx.lineWidth = .65;
    const corner = Math.min(width, height) * .018;
    [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]].forEach(mark => {
      ctx.beginPath();
      ctx.moveTo(mark[0], mark[1] + mark[3] * corner);
      ctx.lineTo(mark[0], mark[1]);
      ctx.lineTo(mark[0] + mark[2] * corner, mark[1]);
      ctx.stroke();
    });

    const unit = Math.min(width, height);
    const fragments = [
      { x: width * .14, y: height * .34, size: unit * .11, rotation: -.24, leaves: 5, completion: .82, dry: .84 },
      { x: width * .35, y: height * .7, size: unit * .135, rotation: .17, leaves: 7, completion: .58, dry: .45 },
      { x: width * .56, y: height * .31, size: unit * .12, rotation: -.1, leaves: 6, completion: .94, dry: .92 },
      { x: width * .74, y: height * .66, size: unit * .14, rotation: .25, leaves: 8, completion: .48, dry: .3, scanning: true },
      { x: width * .9, y: height * .4, size: unit * .105, rotation: -.2, leaves: 5, completion: .7, dry: .66 }
    ];

    fragments.forEach((fragment, fragmentIndex) => {
      const fragmentRand = mulberry32(seed * 613 + fragmentIndex * 199);
      const wet = 1 - fragment.dry;
      const settle = Math.sin(drift * .18 + fragmentIndex * 1.7) * wet;
      ctx.save();
      ctx.translate(fragment.x + settle * 2.2, fragment.y + Math.cos(drift * .15 + fragmentIndex) * wet * 1.4);
      ctx.rotate(fragment.rotation + settle * .022);

      for (let fibre = 0; fibre < 10 + fragmentIndex * 3; fibre++) {
        const x = (fragmentRand() - .5) * fragment.size * .8;
        const y = (fragmentRand() - .5) * fragment.size * 1.05;
        const length = fragment.size * (.04 + fragmentRand() * .1);
        const angle = (fragmentRand() - .5) * 1.5;
        ctx.strokeStyle = `rgba(132,103,74,${.09 + fragment.dry * .13})`;
        ctx.lineWidth = .42;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      }

      ctx.strokeStyle = `rgba(132,103,74,${.32 + fragment.dry * .3})`;
      ctx.lineWidth = 2.15 - fragment.dry * .55;
      ctx.beginPath();
      ctx.moveTo(0, fragment.size * .5);
      ctx.bezierCurveTo(
        fragment.size * (.05 + fragmentIndex * .008), fragment.size * .2,
        -fragment.size * (.06 - fragmentIndex * .006), -fragment.size * .18,
        fragment.size * .015, -fragment.size * .5
      );
      ctx.stroke();

      ctx.strokeStyle = `rgba(${fragment.dry > .72 ? "140,151,128" : "88,99,72"},${.62 - fragment.dry * .12})`;
      ctx.lineWidth = 1.18 - fragment.dry * .3;
      ctx.stroke();

      const visibleLeaves = Math.max(2, Math.ceil(fragment.leaves * fragment.completion));
      for (let leaf = 0; leaf < visibleLeaves; leaf++) {
        const p = (leaf + 1) / (fragment.leaves + 1);
        const side = (leaf + fragmentIndex) % 2 ? 1 : -1;
        const anchorY = fragment.size * (.46 - p * .92);
        const leafLength = fragment.size * (.19 + fragmentRand() * .07) * (1 - p * .2);
        const leafWidth = leafLength * (.32 + fragmentRand() * .13);
        const leafAngle = side * (-.52 - fragmentRand() * .28);
        const localSway = Math.sin(drift * .21 + leaf * .8 + fragmentIndex) * wet * .04;

        ctx.save();
        ctx.translate(0, anchorY);
        ctx.rotate(leafAngle + localSway);

        const faded = fragment.dry > .7;
        ctx.fillStyle = faded
          ? `rgba(140,151,128,${.38 + fragment.dry * .2})`
          : `rgba(88,99,72,${.48 + wet * .18})`;
        ctx.strokeStyle = `rgba(132,103,74,${.28 + fragment.dry * .32})`;
        ctx.lineWidth = .82;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(leafLength * .47, -leafWidth, leafLength, 0);
        ctx.quadraticCurveTo(leafLength * .5, leafWidth * .88, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = `rgba(47,59,46,${.36 + fragment.dry * .22})`;
        ctx.lineWidth = .52;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(leafLength * .45, 0, leafLength * .9, localSway * leafWidth * .4);
        ctx.stroke();

        for (let vein = 1; vein <= 2 + Math.round(fragment.dry * 2); vein++) {
          const veinX = leafLength * vein / 4;
          ctx.strokeStyle = `rgba(47,59,46,${.16 + fragment.dry * .18})`;
          ctx.lineWidth = .38;
          ctx.beginPath();
          ctx.moveTo(veinX, 0);
          ctx.lineTo(veinX + leafLength * .12, (vein % 2 ? -1 : 1) * leafWidth * .34);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (fragment.scanning) {
        const scanProgress = (drift * .055) % 1;
        const scanY = -fragment.size * .62 + scanProgress * fragment.size * 1.24;
        const localScan = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
        localScan.addColorStop(0, "rgba(239,226,190,0)");
        localScan.addColorStop(.5, "rgba(239,226,190,.3)");
        localScan.addColorStop(1, "rgba(239,226,190,0)");
        ctx.fillStyle = localScan;
        ctx.fillRect(-fragment.size * .65, scanY - 8, fragment.size * 1.3, 16);
        ctx.strokeStyle = "rgba(132,103,74,.24)";
        ctx.lineWidth = .55;
        ctx.beginPath();
        ctx.moveTo(-fragment.size * .65, scanY);
        ctx.lineTo(fragment.size * .65, scanY);
        ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  function drawKineticMobileStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 251 + 127);
    ctx.fillStyle = "#100f0d";
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * .5, height * .2, 0, width * .5, height * .2, width * .54);
    glow.addColorStop(0, "rgba(233,220,192,.1)");
    glow.addColorStop(1, "rgba(16,15,13,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const root = [width * .5, height * .08];
    const tiers = [
      { y: .2, span: .25, count: 2 },
      { y: .39, span: .48, count: 4 },
      { y: .62, span: .7, count: 6 }
    ];
    let parents = [root];
    tiers.forEach((tier, tierIndex) => {
      const nodes = [];
      for (let i = 0; i < tier.count; i++) {
        const u = tier.count === 1 ? .5 : i / (tier.count - 1);
        const baseX = width * (.5 - tier.span / 2 + tier.span * u);
        const swing = Math.sin(time * (.18 + tierIndex * .025) + i * 1.8 + tierIndex) * width * (.009 + tierIndex * .004);
        const node = [baseX + swing, height * tier.y + Math.sin(time * .15 + i) * 4];
        nodes.push(node);
        const parent = parents[Math.min(parents.length - 1, Math.floor(i * parents.length / tier.count))];
        ctx.strokeStyle = "rgba(169,154,121,.38)";
        ctx.lineWidth = .64;
        ctx.beginPath();
        ctx.moveTo(parent[0], parent[1]);
        ctx.lineTo(node[0], node[1]);
        ctx.stroke();
      }
      for (let i = 0; i < nodes.length - 1; i += 2) {
        ctx.strokeStyle = "rgba(169,154,121,.58)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodes[i][0], nodes[i][1]);
        ctx.lineTo(nodes[i + 1][0], nodes[i + 1][1]);
        ctx.stroke();
      }
      parents = nodes;
    });

    parents.forEach((node, index) => {
      const plateY = height * (.75 + (index % 2) * .07);
      ctx.strokeStyle = "rgba(169,154,121,.3)";
      ctx.beginPath();
      ctx.moveTo(node[0], node[1]);
      ctx.lineTo(node[0], plateY);
      ctx.stroke();
      const colours = ["rgba(84,123,118,.76)", "rgba(154,87,61,.72)", "rgba(101,123,133,.7)", "rgba(169,154,121,.74)"];
      const w = 18 + rand() * 34;
      const h = 6 + rand() * 12;
      ctx.fillStyle = colours[index % colours.length];
      ctx.strokeStyle = "rgba(233,220,192,.26)";
      ctx.beginPath();
      ctx.ellipse(node[0], plateY, w, h, Math.sin(time * .22 + index) * .18, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });
  }

  function drawCeramicFaultlineStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 263 + 139);
    ctx.fillStyle = "#4e4439";
    ctx.fillRect(0, 0, width, height);
    const marginX = width * .055;
    const marginY = height * .08;
    const edge = [
      [marginX, marginY + 8], [width - marginX - 10, marginY],
      [width - marginX, height - marginY - 12], [marginX + 8, height - marginY]
    ];
    const slab = ctx.createLinearGradient(marginX, marginY, width - marginX, height - marginY);
    slab.addColorStop(0, "#d0bda3");
    slab.addColorStop(.35, "#b7a48d");
    slab.addColorStop(1, "#766554");
    ctx.fillStyle = slab;
    ctx.beginPath();
    ctx.moveTo(edge[0][0], edge[0][1]);
    edge.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
    ctx.fill();

    for (let grain = 0; grain < 420; grain++) {
      const x = marginX + rand() * (width - marginX * 2);
      const y = marginY + rand() * (height - marginY * 2);
      ctx.fillStyle = rand() > .5 ? "rgba(228,209,180,.08)" : "rgba(54,46,41,.055)";
      ctx.fillRect(x, y, .5 + rand() * 1.4, .5 + rand());
    }

    const points = [];
    for (let point = 0; point < 11; point++) {
      const u = point / 10;
      points.push([
        width * (.12 + u * .76) + Math.sin(point * 1.7) * width * .018,
        height * (.26 + u * .48) + Math.sin(point * 2.31) * height * .08
      ]);
    }
    ctx.strokeStyle = "rgba(54,46,41,.92)";
    ctx.lineWidth = 7.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
    ctx.stroke();
    ctx.strokeStyle = "rgba(45,103,98,.9)";
    ctx.lineWidth = 3.7;
    ctx.stroke();
    ctx.strokeStyle = "rgba(168,195,184,.68)";
    ctx.lineWidth = .75;
    ctx.stroke();
    points.forEach((point, index) => {
      if (index % 2) return;
      const pulse = 1 + Math.sin(time * .4 - index) * .18;
      ctx.fillStyle = "rgba(45,103,98,.9)";
      ctx.beginPath();
      ctx.ellipse(point[0], point[1], 5 * pulse, 3 * pulse, 0, 0, TAU);
      ctx.fill();
    });
    const scanX = marginX + ((reduceMotion ? .45 : (time * .035) % 1)) * (width - marginX * 2);
    const rake = ctx.createLinearGradient(scanX - 70, 0, scanX + 70, 0);
    rake.addColorStop(0, "rgba(228,209,180,0)");
    rake.addColorStop(.5, "rgba(228,209,180,.09)");
    rake.addColorStop(1, "rgba(228,209,180,0)");
    ctx.fillStyle = rake;
    ctx.fillRect(scanX - 70, marginY, 140, height - marginY * 2);
  }

  function drawAfterimageCorridorStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 277 + 151);
    ctx.fillStyle = "#030509";
    ctx.fillRect(0, 0, width, height);
    const vanishX = width * .5;
    const vanishY = height * .43;
    const farGlow = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, Math.min(width, height) * .42);
    farGlow.addColorStop(0, "rgba(196,213,212,.25)");
    farGlow.addColorStop(.13, "rgba(100,127,152,.12)");
    farGlow.addColorStop(1, "rgba(3,5,9,0)");
    ctx.fillStyle = farGlow;
    ctx.fillRect(0, 0, width, height);

    const anchors = [];
    for (let pane = 9; pane >= 0; pane--) {
      const depth = pane / 9;
      const scale = .16 + depth * .76;
      const paneW = width * .62 * scale;
      const paneH = height * .68 * scale;
      const driftX = Math.sin(pane * 1.31) * width * .018 * depth;
      const driftY = Math.cos(pane * 1.67) * height * .025 * depth;
      const cx = vanishX + driftX;
      const cy = vanishY + driftY;
      const glass = ctx.createLinearGradient(cx - paneW / 2, cy - paneH / 2, cx + paneW / 2, cy + paneH / 2);
      glass.addColorStop(0, `rgba(159,197,199,${.016 + depth * .035})`);
      glass.addColorStop(.5, `rgba(100,127,152,${.012 + depth * .025})`);
      glass.addColorStop(1, `rgba(103,85,111,${.02 + depth * .035})`);
      ctx.fillStyle = glass;
      ctx.strokeStyle = `rgba(159,197,199,${.08 + depth * .2})`;
      ctx.lineWidth = .45 + depth * .55;
      ctx.fillRect(cx - paneW / 2, cy - paneH / 2, paneW, paneH);
      ctx.strokeRect(cx - paneW / 2, cy - paneH / 2, paneW, paneH);
      anchors.push([
        cx + (rand() - .5) * paneW * .56,
        cy + (rand() - .5) * paneH * .46,
        depth
      ]);
    }
    ctx.lineWidth = 1;
    ctx.beginPath();
    anchors.forEach((anchor, index) => index ? ctx.lineTo(anchor[0], anchor[1]) : ctx.moveTo(anchor[0], anchor[1]));
    const path = ctx.createLinearGradient(vanishX, vanishY, width * .8, height * .78);
    path.addColorStop(0, "rgba(196,213,212,.15)");
    path.addColorStop(1, "rgba(159,197,199,.62)");
    ctx.strokeStyle = path;
    ctx.stroke();
    anchors.forEach((anchor, index) => {
      const pulse = 1 + Math.sin(time * .45 - index * .48) * .22;
      ctx.fillStyle = `rgba(196,213,212,${.18 + anchor[2] * .55})`;
      ctx.beginPath();
      ctx.arc(anchor[0], anchor[1], (1.2 + anchor[2] * 2.1) * pulse, 0, TAU);
      ctx.fill();
    });
  }

  function drawBothVariantStage(ctx, time, width, height, seed, canvas) {
    const variant = canvas.dataset.variant || "";
    const motionTime = reduceMotion ? 0 : time;
    if (!variant) return false;
    if (variant === "woven-canopy") drawWovenCanopyStage(ctx, motionTime, width, height, seed);
    else if (variant === "parted-veil") drawPartedVeilStage(ctx, motionTime, width, height);
    else if (variant === "mercury-basin") drawMercuryBasinStage(ctx, motionTime, width, height, seed);
    else if (variant === "cloud-chamber") drawCloudChamberStage(ctx, motionTime, width, height, seed);
    else if (variant === "amber-orbit") drawCosmicMemoryStage(ctx, motionTime, width, height, seed, "amber");
    else if (variant === "frozen-constellation") drawCosmicMemoryStage(ctx, motionTime, width, height, seed, "frozen");
    else if (variant === "lacquer-echo") drawCosmicMemoryStage(ctx, motionTime, width, height, seed, "lacquer");
    else if (variant === "paper-eclipse") drawCosmicMemoryStage(ctx, motionTime, width, height, seed, "paper");
    else if (variant === "seismograph-skin") drawSeismographStage(ctx, motionTime, width, height, seed);
    else if (variant === "glass-strain") drawGlassStrainStage(ctx, motionTime, width, height, seed);
    else if (variant === "session-archive-warm") drawSessionArchiveStage(ctx, motionTime, width, height, seed, {
      background: "#120b0d", contour: "rgba(143,61,70,ALPHA)", path: "rgba(182,92,85,ALPHA)", star: "rgba(242,214,179,ALPHA)"
    });
    else if (variant === "pressed-herbarium") drawPressedHerbariumStage(ctx, motionTime, width, height, seed);
    else if (variant === "kinetic-mobile") drawKineticMobileStage(ctx, motionTime, width, height, seed);
    else if (variant === "ceramic-faultline") drawCeramicFaultlineStage(ctx, motionTime, width, height, seed);
    else if (variant === "afterimage-corridor") drawAfterimageCorridorStage(ctx, motionTime, width, height, seed);
    else return false;
    return true;
  }

  function drawBothStageField(ctx, time, width, height, seed, canvas) {
    if (drawBothVariantStage(ctx, time, width, height, seed, canvas)) return;

    const rand = mulberry32(seed * 83 + 29);
    const mercuryBasin = canvas.dataset.variant === "mercury-basin";
    const cloudChamber = canvas.dataset.variant === "cloud-chamber";
    const wovenCanopy = canvas.dataset.variant === "woven-canopy";
    const partedVeil = canvas.dataset.variant === "parted-veil";
    const amberOrbit = canvas.dataset.variant === "amber-orbit";
    const warmSessionArchive = canvas.dataset.variant === "session-archive-warm";
    const coolSessionArchive = canvas.dataset.variant === "session-archive-refined-cool";
    const frozenConstellation = canvas.dataset.variant === "frozen-constellation";
    const rawBreath = reduceMotion ? .62 : (Math.sin(time * .42 - .7) + 1) * .5;
    const breath = rawBreath * rawBreath * (3 - 2 * rawBreath);
    const centreY = height * .5;
    const halfGap = width * (.15 + breath * .28);
    const leftX = width * .5 - halfGap;
    const rightX = width * .5 + halfGap;
    const lineCount = 42;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // A magnetic-looking bridge grows and relaxes between two moving poles.
    // Unlike Open's single spiral and Trail's directional wake, this field is
    // explicitly bilateral and makes the space between two hands the subject.
    for (let line = 0; line < lineCount; line++) {
      const lane = (line - (lineCount - 1) / 2) / ((lineCount - 1) / 2);
      const direction = Math.sign(lane) || 1;
      const arch = direction * Math.pow(Math.abs(lane), .72) * height * (.42 - breath * .055);
      const phase = rand() * TAU;
      ctx.beginPath();
      for (let sample = 0; sample <= 72; sample++) {
        const progress = sample / 72;
        const envelope = Math.sin(progress * Math.PI);
        const x = leftX + (rightX - leftX) * progress;
        const y = centreY
          + arch * envelope
          + Math.sin(progress * TAU * 1.4 + phase + (reduceMotion ? 0 : time * .16)) * height * .008 * envelope;
        if (sample === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const centreLight = 1 - Math.abs(lane);
      const lineAlpha = .025 + centreLight * .075 + rand() * .035;
      const contourGradient = ctx.createLinearGradient(leftX, centreY, rightX, centreY);
      if (cloudChamber) {
        contourGradient.addColorStop(0, `rgba(58,51,43,${lineAlpha * .4})`);
        contourGradient.addColorStop(.18, `rgba(113,132,122,${lineAlpha * .68})`);
        contourGradient.addColorStop(.5, `rgba(213,190,142,${lineAlpha * .9})`);
        contourGradient.addColorStop(.82, `rgba(161,157,145,${lineAlpha * .66})`);
        contourGradient.addColorStop(1, `rgba(58,51,43,${lineAlpha * .4})`);
      } else if (mercuryBasin) {
        contourGradient.addColorStop(0, `rgba(24,34,37,${lineAlpha * .44})`);
        contourGradient.addColorStop(.18, `rgba(79,88,89,${lineAlpha * .66})`);
        contourGradient.addColorStop(.5, `rgba(221,231,228,${lineAlpha * .84})`);
        contourGradient.addColorStop(.82, `rgba(130,155,152,${lineAlpha * .6})`);
        contourGradient.addColorStop(1, `rgba(24,34,37,${lineAlpha * .44})`);
      } else if (partedVeil) {
        contourGradient.addColorStop(0, `rgba(64,75,104,${lineAlpha * .36})`);
        contourGradient.addColorStop(.18, `rgba(85,75,100,${lineAlpha * .58})`);
        contourGradient.addColorStop(.5, `rgba(203,228,234,${lineAlpha * .96})`);
        contourGradient.addColorStop(.82, `rgba(102,120,140,${lineAlpha * .58})`);
        contourGradient.addColorStop(1, `rgba(64,75,104,${lineAlpha * .36})`);
      } else if (wovenCanopy) {
        contourGradient.addColorStop(0, `rgba(41,51,45,${lineAlpha * .48})`);
        contourGradient.addColorStop(.18, `rgba(104,122,104,${lineAlpha * .75})`);
        contourGradient.addColorStop(.5, `rgba(183,170,138,${lineAlpha * 1.24})`);
        contourGradient.addColorStop(.82, `rgba(104,122,104,${lineAlpha * .75})`);
        contourGradient.addColorStop(1, `rgba(41,51,45,${lineAlpha * .48})`);
      } else if (amberOrbit) {
        contourGradient.addColorStop(0, `rgba(104,25,30,${lineAlpha * .68})`);
        contourGradient.addColorStop(.18, `rgba(168,66,35,${lineAlpha * .88})`);
        contourGradient.addColorStop(.5, `rgba(240,169,61,${lineAlpha * 1.3})`);
        contourGradient.addColorStop(.82, `rgba(168,66,35,${lineAlpha * .88})`);
        contourGradient.addColorStop(1, `rgba(104,25,30,${lineAlpha * .68})`);
      } else if (warmSessionArchive) {
        contourGradient.addColorStop(0, `rgba(62,35,39,${lineAlpha * .58})`);
        contourGradient.addColorStop(.18, `rgba(143,61,70,${lineAlpha * .85})`);
        contourGradient.addColorStop(.5, `rgba(182,92,85,${lineAlpha * 1.2})`);
        contourGradient.addColorStop(.82, `rgba(217,149,104,${lineAlpha * .82})`);
        contourGradient.addColorStop(1, `rgba(62,35,39,${lineAlpha * .58})`);
      } else if (coolSessionArchive) {
        contourGradient.addColorStop(0, `rgba(32,41,67,${lineAlpha * .56})`);
        contourGradient.addColorStop(.18, `rgba(73,103,141,${lineAlpha * .85})`);
        contourGradient.addColorStop(.5, `rgba(119,115,181,${lineAlpha * 1.15})`);
        contourGradient.addColorStop(.82, `rgba(120,183,202,${lineAlpha * .85})`);
        contourGradient.addColorStop(1, `rgba(32,41,67,${lineAlpha * .56})`);
      } else if (frozenConstellation) {
        contourGradient.addColorStop(0, `rgba(105,96,121,${lineAlpha * .28})`);
        contourGradient.addColorStop(.18, `rgba(142,130,160,${lineAlpha * .46})`);
        contourGradient.addColorStop(.5, `rgba(194,184,207,${lineAlpha * .68})`);
        contourGradient.addColorStop(.82, `rgba(142,130,160,${lineAlpha * .46})`);
        contourGradient.addColorStop(1, `rgba(105,96,121,${lineAlpha * .28})`);
      } else {
        contourGradient.addColorStop(0, `rgba(101,215,196,${lineAlpha * .42})`);
        contourGradient.addColorStop(.18, `rgba(101,215,196,${lineAlpha * .78})`);
        contourGradient.addColorStop(.5, `rgba(101,215,196,${lineAlpha * 1.22})`);
        contourGradient.addColorStop(.82, `rgba(101,215,196,${lineAlpha * .78})`);
        contourGradient.addColorStop(1, `rgba(101,215,196,${lineAlpha * .42})`);
      }
      ctx.strokeStyle = contourGradient;
      ctx.lineWidth = rand() > .86 ? .95 : .4 + rand() * .35;
      ctx.stroke();
    }

    // A finer woven layer appears when the two sources gather, giving the
    // centre a quiet material density without becoming a solid bright band.
    const gatherStrength = 1 - breath;
    for (let filament = 0; filament < 17; filament++) {
      const offset = (filament - 8) * height * .0065;
      ctx.beginPath();
      for (let sample = 0; sample <= 52; sample++) {
        const progress = sample / 52;
        const envelope = Math.sin(progress * Math.PI);
        const x = leftX + (rightX - leftX) * progress;
        const y = centreY
          + offset * envelope
          + Math.sin(progress * TAU * 2.2 + filament * .46 + (reduceMotion ? 0 : time * .24))
            * height * .007 * envelope;
        if (sample === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = cloudChamber
        ? `rgba(58,51,43,${.02 + gatherStrength * .045})`
        : mercuryBasin
        ? `rgba(79,88,89,${.022 + gatherStrength * .05})`
        : partedVeil
        ? `rgba(85,75,100,${.018 + gatherStrength * .045})`
        : wovenCanopy
        ? `rgba(128,110,80,${.025 + gatherStrength * .06})`
        : amberOrbit
        ? `rgba(139,45,32,${.035 + gatherStrength * .07})`
        : warmSessionArchive
        ? `rgba(143,61,70,${.028 + gatherStrength * .065})`
        : coolSessionArchive
        ? `rgba(73,103,141,${.028 + gatherStrength * .065})`
        : frozenConstellation
          ? `rgba(158,145,177,${.018 + gatherStrength * .032})`
          : `rgba(101,215,196,${.025 + gatherStrength * .055})`;
      ctx.lineWidth = filament % 5 === 0 ? .72 : .38;
      ctx.stroke();
    }

    // Fine particles travel independently along the shared bridge, reversing
    // direction on alternating contours so the field feels exchanged, not swept.
    ctx.globalCompositeOperation = "lighter";
    for (let particle = 0; particle < 260; particle++) {
      const lane = rand() * 2 - 1;
      const direction = particle % 2 === 0 ? 1 : -1;
      const speed = .025 + rand() * .035;
      const origin = rand();
      const travel = reduceMotion ? origin : ((origin + time * speed * direction) % 1 + 1) % 1;
      const previousTravel = Math.max(0, Math.min(1, travel - .009 * direction));
      const arch = (Math.sign(lane) || 1) * Math.pow(Math.abs(lane), .72) * height * (.42 - breath * .055);
      const particlePoint = progress => {
        const envelope = Math.sin(progress * Math.PI);
        return [
          leftX + (rightX - leftX) * progress,
          centreY + arch * envelope + Math.sin(progress * TAU * 1.35 + particle * .27) * height * .008 * envelope
        ];
      };
      const [x, y] = particlePoint(travel);
      const [previousX, previousY] = particlePoint(previousTravel);
      const centrePresence = .42 + Math.sin(travel * Math.PI) * .58;
      const bright = (.13 + rand() * .45) * centrePresence;
      ctx.strokeStyle = cloudChamber
        ? `rgba(58,51,43,${bright * .09})`
        : mercuryBasin
        ? `rgba(79,88,89,${bright * .1})`
        : partedVeil
        ? `rgba(64,75,104,${bright * .085})`
        : wovenCanopy
        ? `rgba(104,122,104,${bright * .13})`
        : amberOrbit
        ? `rgba(215,109,38,${bright * .15})`
        : warmSessionArchive
        ? `rgba(143,61,70,${bright * .14})`
        : coolSessionArchive
        ? `rgba(73,103,141,${bright * .14})`
        : frozenConstellation
          ? `rgba(168,155,186,${bright * .07})`
          : `rgba(101,215,196,${bright * .12})`;
      ctx.lineWidth = 2.4 + rand() * 1.3;
      ctx.beginPath();
      ctx.moveTo(previousX, previousY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.strokeStyle = cloudChamber
        ? `rgba(161,157,145,${bright * .72})`
        : mercuryBasin
        ? `rgba(130,155,152,${bright * .68})`
        : partedVeil
        ? `rgba(102,120,140,${bright * .62})`
        : wovenCanopy
        ? `rgba(183,170,138,${bright * .86})`
        : amberOrbit
        ? `rgba(244,178,68,${bright})`
        : warmSessionArchive
        ? `rgba(210,123,98,${bright * .92})`
        : coolSessionArchive
        ? `rgba(120,183,202,${bright * .92})`
        : frozenConstellation
          ? `rgba(194,184,207,${bright * .58})`
          : `rgba(101,215,196,${bright})`;
      ctx.lineWidth = .35 + rand() * .65;
      ctx.beginPath();
      ctx.moveTo(previousX, previousY);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (particle % 11 === 0) {
        ctx.fillStyle = cloudChamber
          ? `rgba(216,213,200,${.2 + rand() * .36})`
          : mercuryBasin
          ? `rgba(221,231,228,${.18 + rand() * .38})`
          : partedVeil
          ? `rgba(203,228,234,${.18 + rand() * .34})`
          : wovenCanopy
          ? `rgba(230,216,184,${.25 + rand() * .42})`
          : amberOrbit
          ? `rgba(255,218,125,${.32 + rand() * .5})`
          : warmSessionArchive
          ? `rgba(242,214,179,${.28 + rand() * .45})`
          : coolSessionArchive
          ? `rgba(227,236,243,${.28 + rand() * .45})`
          : frozenConstellation
            ? `rgba(216,207,225,${.17 + rand() * .28})`
            : `rgba(232,225,216,${.28 + rand() * .45})`;
        ctx.fillRect(x - .7, y - .7, 1.4, 1.4);
      }
    }

    if (frozenConstellation) {
      let crystalState = frozenStageStates.get(canvas);
      if (!crystalState || crystalState.width !== width || crystalState.height !== height) {
        const crystalRand = mulberry32(seed * 137 + 73);
        const anchors = Array.from({ length: 28 }, () => {
          const angle = crystalRand() * TAU;
          const radius = Math.sqrt(crystalRand());
          return [
            width * .5 + Math.cos(angle) * width * .26 * radius,
            centreY + Math.sin(angle) * height * .31 * radius
          ];
        });
        const links = Array.from({ length: 190 }, () => {
          const start = Math.floor(crystalRand() * anchors.length);
          let end = Math.floor(crystalRand() * anchors.length);
          if (end === start) end = (end + 5) % anchors.length;
          return [start, end, .075 + crystalRand() * .075];
        });
        crystalState = {
          width,
          height,
          anchors,
          links,
          growth: 18,
          targetGrowth: 18,
          wasOpen: false,
          lastTime: time
        };
        frozenStageStates.set(canvas, crystalState);
      }

      const elapsed = Math.max(0, Math.min(.1, time - crystalState.lastTime));
      crystalState.lastTime = time;
      if (breath > .82) crystalState.wasOpen = true;
      if (crystalState.wasOpen && breath < .42) {
        crystalState.targetGrowth = Math.min(
          crystalState.links.length,
          crystalState.targetGrowth + 3
        );
        crystalState.wasOpen = false;
      }
      crystalState.growth = Math.min(
        crystalState.targetGrowth,
        crystalState.growth + elapsed * 5.4
      );

      const completedLinks = Math.min(crystalState.links.length, Math.floor(crystalState.growth));
      const partialGrowth = crystalState.growth - completedLinks;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = .72;
      for (let link = 0; link < completedLinks; link++) {
        const [startIndex, endIndex, alpha] = crystalState.links[link];
        const start = crystalState.anchors[startIndex];
        const end = crystalState.anchors[endIndex];
        ctx.strokeStyle = `rgba(196,185,208,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
      }
      if (completedLinks < crystalState.links.length && partialGrowth > 0) {
        const [startIndex, endIndex, alpha] = crystalState.links[completedLinks];
        const start = crystalState.anchors[startIndex];
        const end = crystalState.anchors[endIndex];
        ctx.strokeStyle = `rgba(205,195,216,${alpha * .9})`;
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(
          start[0] + (end[0] - start[0]) * partialGrowth,
          start[1] + (end[1] - start[1]) * partialGrowth
        );
        ctx.stroke();
      }
    }

    // Two restrained pulse centres identify the two-hand sources without
    // turning the composition into another set of concentric Open rings.
    ctx.globalCompositeOperation = "source-over";
    [leftX, rightX].forEach((x, index) => {
      const pulse = 5 + breath * 9 + index * 1.5;
      const glow = ctx.createRadialGradient(x, centreY, 0, x, centreY, pulse * 3.4);
      glow.addColorStop(0, cloudChamber ? "rgba(213,190,142,.38)" : mercuryBasin ? "rgba(221,231,228,.34)" : partedVeil ? "rgba(203,228,234,.38)" : wovenCanopy ? "rgba(230,216,184,.5)" : amberOrbit ? "rgba(255,223,140,.62)" : warmSessionArchive ? "rgba(242,214,179,.5)" : coolSessionArchive ? "rgba(158,196,210,.5)" : frozenConstellation ? "rgba(220,212,228,.34)" : "rgba(232,225,216,.55)");
      glow.addColorStop(.16, cloudChamber ? "rgba(113,132,122,.18)" : mercuryBasin ? "rgba(130,155,152,.17)" : partedVeil ? "rgba(102,120,140,.18)" : wovenCanopy ? "rgba(183,170,138,.24)" : amberOrbit ? "rgba(225,123,38,.34)" : warmSessionArchive ? "rgba(217,149,104,.28)" : coolSessionArchive ? "rgba(139,125,184,.26)" : frozenConstellation ? "rgba(151,139,171,.14)" : "rgba(101,215,196,.28)");
      glow.addColorStop(1, cloudChamber ? "rgba(58,51,43,0)" : mercuryBasin ? "rgba(24,34,37,0)" : partedVeil ? "rgba(1,3,8,0)" : wovenCanopy ? "rgba(41,51,45,0)" : amberOrbit ? "rgba(118,28,30,0)" : warmSessionArchive ? "rgba(62,35,39,0)" : coolSessionArchive ? "rgba(32,41,67,0)" : frozenConstellation ? "rgba(105,96,121,0)" : "rgba(101,215,196,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, centreY, pulse * 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = cloudChamber ? "rgba(216,213,200,.62)" : mercuryBasin ? "rgba(221,231,228,.58)" : partedVeil ? "rgba(203,228,234,.6)" : wovenCanopy ? "rgba(230,216,184,.78)" : amberOrbit ? "rgba(255,226,151,.88)" : warmSessionArchive ? "rgba(242,214,179,.78)" : coolSessionArchive ? "rgba(227,236,243,.78)" : frozenConstellation ? "rgba(216,208,224,.52)" : "rgba(232,225,216,.78)";
      ctx.beginPath();
      ctx.arc(x, centreY, 1.5, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawGlassStrainStage(ctx, time, width, height, seed) {
    const background = "#061016";
    const glass = "#587582";
    const stress = "#D8F0EC";
    const violet = "#826B9B";
    const warm = "#CBB377";
    const shadow = "#15242B";
    const drift = reduceMotion ? 0 : time;
    const paneWidth = Math.min(width * .43, height * .73);
    const paneHeight = paneWidth * .63;
    const centreX = width * .5;
    const centreY = height * .49;
    const placements = [
      [-.17, -.07, -.105], [.13, -.09, .08], [-.05, .12, -.035],
      [.18, .08, .12], [-.12, .035, -.075]
    ];

    ctx.save();
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Five restrained panes preview the archive as offset sheets, not rings.
    placements.forEach((placement, paneIndex) => {
      const rand = mulberry32(seed * 211 + paneIndex * 977 + 37);
      const cx = centreX + placement[0] * paneWidth;
      const cy = centreY + placement[1] * paneHeight;
      const rotation = placement[2];
      const points = [];
      for (let point = 0; point < 8; point++) {
        const angle = -Math.PI / 2 + point / 8 * TAU;
        const irregularity = .88 + rand() * .17;
        points.push([
          Math.cos(angle) * paneWidth * .5 * irregularity,
          Math.sin(angle) * paneHeight * .5 * irregularity
        ]);
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      const tracePane = () => {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let point = 1; point < points.length; point++) ctx.lineTo(points[point][0], points[point][1]);
        ctx.closePath();
      };

      // A dark displaced shadow gives each sheet weight without a glow halo.
      ctx.save();
      ctx.translate(5, 7);
      tracePane();
      ctx.fillStyle = "rgba(21,36,43,.16)";
      ctx.fill();
      ctx.restore();

      tracePane();
      ctx.fillStyle = `rgba(88,117,130,${.024 + paneIndex * .008})`;
      ctx.fill();
      ctx.save();
      tracePane();
      ctx.clip();

      const surface = ctx.createLinearGradient(-paneWidth * .45, -paneHeight * .35, paneWidth * .44, paneHeight * .38);
      surface.addColorStop(0, "rgba(130,107,155,.055)");
      surface.addColorStop(.48, "rgba(88,117,130,.018)");
      surface.addColorStop(1, "rgba(21,36,43,.15)");
      ctx.fillStyle = surface;
      ctx.fillRect(-paneWidth, -paneHeight, paneWidth * 2, paneHeight * 2);

      // Stable movement reads as long, clean stress arcs.
      const arcCount = 3 + paneIndex % 3;
      ctx.strokeStyle = paneIndex % 2 ? "rgba(216,240,236,.19)" : "rgba(216,240,236,.15)";
      ctx.lineWidth = .55;
      for (let arcIndex = 0; arcIndex < arcCount; arcIndex++) {
        const u = arcIndex / Math.max(1, arcCount - 1);
        const wobble = Math.sin(drift * .16 + paneIndex * 1.7 + arcIndex) * 2.2;
        ctx.beginPath();
        ctx.ellipse(
          (rand() - .5) * paneWidth * .08,
          (rand() - .5) * paneHeight * .08 + wobble,
          paneWidth * (.13 + u * .24),
          paneHeight * (.12 + u * .22),
          -.38 + paneIndex * .07,
          -.9 * Math.PI,
          .18 * Math.PI + u * .13
        );
        ctx.stroke();
      }

      // A few fine forks hint at instability, kept subordinate in the preview.
      const branchCount = 2 + paneIndex % 3;
      for (let branch = 0; branch < branchCount; branch++) {
        let x = (rand() - .5) * paneWidth * .13;
        let y = (rand() - .5) * paneHeight * .12;
        let angle = -Math.PI / 2 + (branch - 1) * .34 + (rand() - .5) * .18;
        const length = paneHeight * (.16 + rand() * .12);
        ctx.strokeStyle = branch % 2 ? "rgba(130,107,155,.24)" : "rgba(216,240,236,.23)";
        ctx.lineWidth = .48;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let segment = 0; segment < 4; segment++) {
          angle += (rand() - .5) * .42;
          x += Math.cos(angle) * length / 4;
          y += Math.sin(angle) * length / 4;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (branch === 0) {
          ctx.strokeStyle = "rgba(203,179,119,.16)";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle + .7) * length * .19, y + Math.sin(angle + .7) * length * .19);
          ctx.stroke();
        }
      }
      ctx.restore();

      tracePane();
      ctx.strokeStyle = "rgba(88,117,130,.32)";
      ctx.lineWidth = .72;
      ctx.stroke();

      // Narrow moving refractions remain on the edge rather than blooming.
      const edgeColors = [stress, violet, warm];
      edgeColors.forEach((color, edgeIndex) => {
        const edge = (paneIndex * 3 + edgeIndex * 2) % points.length;
        const a = points[edge];
        const b = points[(edge + 1) % points.length];
        const travel = reduceMotion ? .34 : (drift * .055 + paneIndex * .17 + edgeIndex * .23) % .48;
        const start = .12 + travel;
        const end = Math.min(.92, start + .18);
        const rgb = color === stress ? "216,240,236" : color === violet ? "130,107,155" : "203,179,119";
        ctx.strokeStyle = `rgba(${rgb},${edgeIndex === 0 ? .5 : .34})`;
        ctx.lineWidth = edgeIndex === 0 ? 1.15 : .72;
        ctx.beginPath();
        ctx.moveTo(a[0] + (b[0] - a[0]) * start, a[1] + (b[1] - a[1]) * start);
        ctx.lineTo(a[0] + (b[0] - a[0]) * end, a[1] + (b[1] - a[1]) * end);
        ctx.stroke();
      });
      ctx.restore();
    });

    // One local pause point, deliberately small and crisp.
    const pauseRadius = Math.min(width, height) * .033;
    const pauseX = centreX + Math.sin(drift * .11) * paneWidth * .025;
    const pauseY = centreY - paneHeight * .015;
    const pause = ctx.createRadialGradient(pauseX, pauseY, 0, pauseX, pauseY, pauseRadius);
    pause.addColorStop(0, "rgba(216,240,236,.18)");
    pause.addColorStop(.28, "rgba(203,179,119,.08)");
    pause.addColorStop(1, "rgba(216,240,236,0)");
    ctx.fillStyle = pause;
    ctx.beginPath();
    ctx.arc(pauseX, pauseY, pauseRadius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSeismographStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 173 + 41);
    const paper = "#D5D0C3";
    const graphite = "#292A27";
    const lead = "#686A63";
    const calibration = "#873B34";
    const grid = "#718080";
    const oldMark = "#A59C8B";
    const left = width * .055;
    const right = width * .955;
    const top = height * .085;
    const bottom = height * .92;
    const rowHeight = (bottom - top) / 12;
    const drift = reduceMotion ? 0 : time;

    ctx.save();
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);

    // Quiet paper fibres and age marks keep the preview tactile without
    // competing with the recorded bands.
    ctx.lineCap = "round";
    for (let i = 0; i < 72; i++) {
      const y = rand() * height;
      const x = rand() * width;
      ctx.strokeStyle = `rgba(165,156,139,${.018 + rand() * .025})`;
      ctx.lineWidth = .45 + rand() * .55;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(Math.min(width, x + width * (.04 + rand() * .14)), y + (rand() - .5) * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(113,128,128,.22)";
    ctx.lineWidth = .55;
    for (let row = 0; row <= 12; row++) {
      const y = top + row * rowHeight;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
    for (let column = 0; column <= 18; column++) {
      const x = left + (right - left) * column / 18;
      ctx.strokeStyle = column % 3 === 0 ? "rgba(113,128,128,.19)" : "rgba(113,128,128,.09)";
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    for (let row = 0; row < 12; row++) {
      const rowSeed = seed * 97 + row * 311;
      const rowRand = mulberry32(rowSeed);
      const steadiness = .28 + rowRand() * .66;
      const slowness = .2 + rowRand() * .72;
      const tilt = (rowRand() - .5) * .62;
      const pause = rowRand();
      const baseY = top + rowHeight * (row + .5);
      const amplitude = rowHeight * (.08 + (1 - steadiness) * .34);
      const frequency = 4 + (1 - slowness) * 18;
      const fragmentChance = (1 - steadiness) * .18;
      const traceCount = 1 + Math.floor(slowness * 2.8);

      for (let trace = 0; trace < traceCount; trace++) {
        ctx.beginPath();
        let drawing = false;
        const samples = 92;
        for (let sample = 0; sample <= samples; sample++) {
          const u = sample / samples;
          const x = left + (right - left) * u;
          const tremor = Math.sin(u * frequency * Math.PI * 2 + rowSeed + trace * .7 + drift * (.08 + row * .003));
          const micro = Math.sin(u * frequency * 3.1 + rowSeed * .17) * amplitude * .23;
          const slope = tilt * rowHeight * (u - .5);
          const y = baseY + slope + tremor * amplitude + micro + (trace - (traceCount - 1) / 2) * .7;
          const gap = seededPreviewUnit(rowSeed + sample * 43 + trace * 997) < fragmentChance;
          if (gap) {
            drawing = false;
          } else if (!drawing) {
            ctx.moveTo(x, y);
            drawing = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.strokeStyle = trace === 0 ? "rgba(41,42,39,.74)" : "rgba(104,106,99,.42)";
        ctx.lineWidth = trace === 0 ? .8 + slowness * .55 : .45;
        ctx.stroke();
      }

      if (pause > .28) {
        const depositX = right - width * .015;
        ctx.fillStyle = `rgba(41,42,39,${.2 + pause * .42})`;
        ctx.beginPath();
        ctx.ellipse(depositX, baseY + tilt * rowHeight * .46, 1.4 + pause * 4.2, .8 + pause * 1.7, 0, 0, TAU);
        ctx.fill();
      }
    }

    const scanX = left + ((drift * .018) % 1) * (right - left);
    const scanGradient = ctx.createLinearGradient(scanX - 20, 0, scanX + 20, 0);
    scanGradient.addColorStop(0, "rgba(135,59,52,0)");
    scanGradient.addColorStop(.5, "rgba(135,59,52,.32)");
    scanGradient.addColorStop(1, "rgba(135,59,52,0)");
    ctx.fillStyle = scanGradient;
    ctx.fillRect(scanX - 20, top, 40, bottom - top);
    ctx.strokeStyle = "rgba(135,59,52,.5)";
    ctx.lineWidth = .7;
    ctx.beginPath();
    ctx.moveTo(scanX, top);
    ctx.lineTo(scanX, bottom);
    ctx.stroke();

    ctx.fillStyle = calibration;
    ctx.font = `${Math.max(8, Math.min(12, width * .012))}px ui-monospace, monospace`;
    ctx.textBaseline = "middle";
    for (let row = 0; row < 12; row += 3) {
      ctx.fillText(String(row + 1).padStart(2, "0"), left + 4, top + rowHeight * (row + .5));
    }
    ctx.fillStyle = oldMark;
    ctx.fillText("QUALITY / 12", right - Math.min(90, width * .12), top - 8);
    ctx.restore();
  }

  function seededPreviewUnit(value) {
    const x = Math.sin(value * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawFibrousBleedStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 109 + 41);
    const motionTime = reduceMotion ? 7.2 : time;
    const paper = "rgb(214,205,187)";
    const ink = [45, 36, 31];

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);

    // A static field of mostly horizontal fibres makes the material read as
    // rough paper even when the animated trace is viewed without colour.
    ctx.save();
    ctx.lineCap = "round";
    for (let fibre = 0; fibre < 620; fibre++) {
      const x = rand() * width;
      const y = rand() * height;
      const length = 4 + rand() * 24;
      ctx.strokeStyle = rand() > .68
        ? `rgba(245,239,220,${.035 + rand() * .075})`
        : `rgba(104,86,70,${.025 + rand() * .065})`;
      ctx.lineWidth = .25 + rand() * .6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y + (rand() - .5) * 3.2);
      ctx.stroke();
    }

    const pointAt = sampleTime => {
      const phase = sampleTime * .3;
      return [
        width * (.5 + Math.sin(phase) * .4),
        height * (.5 + Math.sin(phase * 1.73 + .65) * .23)
      ];
    };

    ctx.globalCompositeOperation = "multiply";
    for (let deposit = 0; deposit < 92; deposit++) {
      const age = deposit / 91;
      const [x, y] = pointAt(motionTime - age * 13.5);
      const spread = 8 + age * 58 + rand() * 24;
      const centreFade = .13 + (1 - age) * .13;

      ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${centreFade * (.36 + rand() * .45)})`;
      ctx.beginPath();
      ctx.ellipse(
        x + (rand() - .5) * 16,
        y + (rand() - .5) * 9,
        spread * (1.6 + rand() * 1.4),
        spread * (.18 + rand() * .22),
        (rand() - .5) * .08,
        0,
        TAU
      );
      ctx.fill();

      const side = deposit % 2 ? -1 : 1;
      ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${.055 + rand() * .16})`;
      ctx.lineWidth = .3 + rand() * .7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + side * spread * .5,
        y + (rand() - .5) * 12,
        x + side * spread * 1.15,
        y + (rand() - .5) * 18,
        x + side * spread * (1.7 + rand() * .8),
        y + (rand() - .5) * 25
      );
      ctx.stroke();
    }

    // The newest gesture remains a thin line before capillary spreading.
    ctx.strokeStyle = "rgba(45,36,31,.62)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let sample = 0; sample <= 44; sample++) {
      const [x, y] = pointAt(motionTime - (1 - sample / 44) * 4.2);
      if (sample === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawSuspendedVaporStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 137 + 29);
    const motionTime = reduceMotion ? 9.4 : time;

    ctx.fillStyle = "#05070e";
    ctx.fillRect(0, 0, width, height);

    const volume = ctx.createRadialGradient(
      width * .5,
      height * .58,
      0,
      width * .5,
      height * .58,
      Math.max(width, height) * .62
    );
    volume.addColorStop(0, "rgba(38,40,65,.24)");
    volume.addColorStop(.58, "rgba(23,29,48,.09)");
    volume.addColorStop(1, "rgba(5,7,14,0)");
    ctx.fillStyle = volume;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    for (let mote = 0; mote < 180; mote++) {
      const x = rand() * width;
      const sourceY = rand() * height;
      const y = (sourceY - motionTime * (1 + rand() * 3) + height) % height;
      ctx.fillStyle = `rgba(165,169,190,${.025 + rand() * .09})`;
      ctx.beginPath();
      ctx.arc(x, y, .3 + rand() * .8, 0, TAU);
      ctx.fill();
    }

    const trailPoint = sampleTime => {
      const phase = sampleTime * .31;
      return [
        width * (.5 + Math.sin(phase) * .38),
        height * (.58 + Math.sin(phase * 1.52 + .7) * .19)
      ];
    };

    // Older samples have had more time to swell and rise, creating a strong
    // vertical composition while the current gesture remains a fine trace.
    for (let cloud = 0; cloud < 34; cloud++) {
      const age = 1.1 + cloud * .36 + rand() * .28;
      const [sourceX, sourceY] = trailPoint(motionTime - age);
      const delayedAge = Math.max(0, age - .75);
      const radius = Math.min(width, height) * (.018 + delayedAge * .014);
      const x = sourceX + Math.sin(age * .7 + seed) * radius * .36;
      const y = sourceY - delayedAge * height * .021;

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.translate(x, y);
      ctx.scale(1 + rand() * .42, .68 + rand() * .34);
      const mist = ctx.createRadialGradient(0, 0, radius * .08, 0, 0, radius);
      mist.addColorStop(0, "rgba(23,29,48,0)");
      mist.addColorStop(.5, "rgba(103,94,124,.035)");
      mist.addColorStop(.78, "rgba(115,107,138,.13)");
      mist.addColorStop(.92, "rgba(191,194,210,.17)");
      mist.addColorStop(1, "rgba(191,194,210,0)");
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = `rgba(16,18,31,${.035 + rand() * .045})`;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * .52, radius * .3, 0, 0, TAU);
      ctx.fill();
    }

    const newest = trailPoint(motionTime);
    const previous = trailPoint(motionTime - 2.7);
    ctx.strokeStyle = "rgba(196,198,211,.48)";
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(previous[0], previous[1]);
    ctx.lineTo(newest[0], newest[1]);
    ctx.stroke();
    ctx.restore();
  }

  function drawSurveyorsMapStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 157 + 17);
    const paper = "#e8e2cf";
    const green = [70, 86, 74];
    const red = [104, 46, 43];
    const graphite = [55, 59, 54];
    const grid = Math.max(34, Math.min(54, width / 18));

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.lineWidth = .45;
    ctx.strokeStyle = "rgba(70,86,74,.09)";
    for (let x = grid; x < width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = grid; y < height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const points = [];
    const pointCount = 29;
    const mapOffsetX = width * .08;
    const mapOffsetY = height * .13;
    for (let index = 0; index < pointCount; index++) {
      const progress = index / (pointCount - 1);
      const x = mapOffsetX + progress * width * .78;
      const y = mapOffsetY + height * (
        .23 + progress * .38 + Math.sin(progress * Math.PI * 3.2 + .5) * .115
      );
      points.push([x, y]);
    }

    ctx.strokeStyle = "rgba(70,86,74,.58)";
    ctx.lineWidth = .75;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    points.forEach((point, index) => {
      const size = index % 6 === 0 ? 3.2 : 1.7;
      ctx.strokeStyle = `rgba(${green[0]},${green[1]},${green[2]},.66)`;
      ctx.lineWidth = .5;
      ctx.beginPath();
      ctx.moveTo(point[0] - size * 2, point[1]);
      ctx.lineTo(point[0] + size * 2, point[1]);
      ctx.moveTo(point[0], point[1] - size * 2);
      ctx.lineTo(point[0], point[1] + size * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(${graphite[0]},${graphite[1]},${graphite[2]},.72)`;
      ctx.beginPath();
      ctx.arc(point[0], point[1], size * .55, 0, TAU);
      ctx.fill();
    });

    [5, 15, 24].forEach((pointIndex, anchorIndex) => {
      const anchor = points[pointIndex];
      for (let contour = 0; contour < 5; contour++) {
        const radius = 16 + contour * 9;
        ctx.strokeStyle = `rgba(${green[0]},${green[1]},${green[2]},${.26 - contour * .025})`;
        ctx.lineWidth = .5;
        ctx.beginPath();
        for (let sample = 0; sample <= 52; sample++) {
          const angle = sample / 52 * TAU;
          const uneven = .84 + rand() * .28;
          const x = anchor[0] + Math.cos(angle) * radius * uneven;
          const y = anchor[1] + Math.sin(angle) * radius * .7 * uneven;
          if (sample === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      ctx.strokeStyle = `rgba(${graphite[0]},${graphite[1]},${graphite[2]},.82)`;
      ctx.lineWidth = .85;
      ctx.beginPath();
      ctx.arc(anchor[0], anchor[1], 11, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${red[0]},${red[1]},${red[2]},.9)`;
      ctx.beginPath();
      ctx.moveTo(anchor[0] + 7, anchor[1] - 7);
      ctx.lineTo(anchor[0] + 14, anchor[1] - 14);
      ctx.stroke();
      ctx.fillStyle = `rgba(${red[0]},${red[1]},${red[2]},.92)`;
      ctx.beginPath();
      ctx.arc(anchor[0], anchor[1], 1.7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(${graphite[0]},${graphite[1]},${graphite[2]},.75)`;
      ctx.font = "9px IBM Plex Mono, monospace";
      ctx.fillText(`P-${String(anchorIndex + 1).padStart(2, "0")}`, anchor[0] + 16, anchor[1] - 16);
    });

    ctx.restore();
  }

  function drawPulseRelicsStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 173 + 23);
    const motionTime = reduceMotion ? 6.8 : time;
    const amber = [220, 137, 61];
    const hot = [244, 195, 117];
    const red = [112, 31, 30];

    ctx.fillStyle = "#030305";
    ctx.fillRect(0, 0, width, height);
    ctx.save();

    for (let dust = 0; dust < 46; dust++) {
      ctx.fillStyle = `rgba(102,92,88,${.015 + rand() * .05})`;
      ctx.beginPath();
      ctx.arc(rand() * width, rand() * height, .25 + rand() * .55, 0, TAU);
      ctx.fill();
    }

    const points = [];
    for (let index = 0; index < 24; index++) {
      const progress = index / 23;
      points.push([
        width * (.12 + progress * .72),
        height * (.32 + progress * .28 + Math.sin(progress * TAU * 1.4 + .8) * .12)
      ]);
    }

    points.forEach((point, index) => {
      const cycle = (motionTime * .08 + index / points.length) % 1;
      const signalFade = Math.pow(1 - cycle, 1.7);
      if (signalFade < .12 || index % 3 === 1) return;

      const previous = points[Math.max(0, index - 1)];
      const dx = previous[0] - point[0];
      const dy = previous[1] - point[1];
      const length = Math.hypot(dx, dy) || 1;
      const remnant = Math.min(21, length * .3);

      ctx.strokeStyle = `rgba(${red[0]},${red[1]},${red[2]},${.12 * signalFade})`;
      ctx.lineWidth = .65;
      ctx.beginPath();
      ctx.moveTo(point[0], point[1]);
      ctx.lineTo(point[0] + dx / length * remnant, point[1] + dy / length * remnant);
      ctx.stroke();

      ctx.fillStyle = `rgba(${amber[0]},${amber[1]},${amber[2]},${.34 * signalFade})`;
      ctx.beginPath();
      ctx.arc(point[0], point[1], 1 + signalFade * 1.25, 0, TAU);
      ctx.fill();
    });

    [6, 16, 22].forEach((pointIndex, anchorIndex) => {
      const anchor = points[pointIndex];
      const period = 3.4 + anchorIndex * .6;
      const pulse = (motionTime % period) / period;
      const heartbeat = .5 + Math.sin(motionTime * TAU / period + anchorIndex) * .5;
      const baseRadius = 10 + anchorIndex * 3;
      const ringRadius = baseRadius + pulse * (32 + anchorIndex * 6);

      ctx.strokeStyle = `rgba(${red[0]},${red[1]},${red[2]},${.38 * Math.pow(1 - pulse, 1.5)})`;
      ctx.lineWidth = .75;
      ctx.beginPath();
      ctx.arc(anchor[0], anchor[1], ringRadius, 0, TAU);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${amber[0]},${amber[1]},${amber[2]},${.28 + heartbeat * .38})`;
      ctx.lineWidth = .9;
      ctx.beginPath();
      ctx.arc(anchor[0], anchor[1], baseRadius * (1 + heartbeat * .16), 0, TAU);
      ctx.stroke();

      const glow = ctx.createRadialGradient(anchor[0], anchor[1], 0, anchor[0], anchor[1], 12 + heartbeat * 8);
      glow.addColorStop(0, `rgba(${hot[0]},${hot[1]},${hot[2]},${.72 + heartbeat * .2})`);
      glow.addColorStop(.18, `rgba(${amber[0]},${amber[1]},${amber[2]},${.3 + heartbeat * .25})`);
      glow.addColorStop(1, `rgba(${red[0]},${red[1]},${red[2]},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(anchor[0], anchor[1], 12 + heartbeat * 8, 0, TAU);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawMineralOrbitStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 191 + 31);
    const motionTime = reduceMotion ? 7.2 : time;
    const graphite = [55, 62, 58];
    const graphiteDark = [20, 25, 23];
    const mineral = [83, 112, 91];
    const mineralLight = [128, 153, 131];
    const metallic = [207, 211, 202];
    const tilt = -.34;
    const centreX = width * .57;
    const centreY = height * .47;
    const radiusX = Math.min(width * .31, height * .43);
    const radiusY = radiusX * .46;
    const crystallisation = .78 + Math.sin(motionTime * .34) * .08;

    ctx.fillStyle = "#080b0a";
    ctx.fillRect(0, 0, width, height);
    ctx.save();

    // Faint mineral seams keep the field dark while giving it a stone surface.
    for (let seam = 0; seam < 24; seam++) {
      const x = rand() * width;
      const y = rand() * height;
      const length = 28 + rand() * Math.min(width, height) * .24;
      const angle = rand() * TAU;
      ctx.strokeStyle = `rgba(${mineral[0]},${mineral[1]},${mineral[2]},${.018 + rand() * .035})`;
      ctx.lineWidth = .45;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(angle + .34) * length * .54,
        y + Math.sin(angle + .34) * length * .54,
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length
      );
      ctx.stroke();
    }

    // A broken ellipse suggests the stable orbit without turning it into a
    // luminous ring. The composition deliberately sits off-centre.
    ctx.strokeStyle = `rgba(${mineral[0]},${mineral[1]},${mineral[2]},.14)`;
    ctx.lineWidth = .55;
    ctx.setLineDash([18, 11, 7, 15]);
    ctx.beginPath();
    ctx.ellipse(centreX, centreY, radiusX, radiusY, tilt, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawShard = (x, y, size, rotation, sides, depth, glint) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = `rgba(${graphiteDark[0] + depth * 30},${graphiteDark[1] + depth * 31},${graphiteDark[2] + depth * 30},.9)`;
      ctx.strokeStyle = `rgba(${mineral[0]},${mineral[1]},${mineral[2]},${.34 + depth * .28})`;
      ctx.lineWidth = .45;
      ctx.beginPath();
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * TAU;
        const uneven = .7 + rand() * .54;
        const px = Math.cos(angle) * size * uneven;
        const py = Math.sin(angle) * size * uneven * .7;
        if (side === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = `rgba(${mineralLight[0]},${mineralLight[1]},${mineralLight[2]},.34)`;
      ctx.lineWidth = .4;
      ctx.beginPath();
      ctx.moveTo(-size * .46, size * .12);
      ctx.lineTo(size * .38, -size * .35);
      ctx.stroke();

      if (glint > .72) {
        ctx.strokeStyle = `rgba(${metallic[0]},${metallic[1]},${metallic[2]},${(glint - .72) * 2.8})`;
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(-size * .5, -size * .31);
        ctx.lineTo(size * .16, -size * .44);
        ctx.stroke();
      }
      ctx.restore();
    };

    for (let shard = 0; shard < 82; shard++) {
      const progress = shard / 82;
      const angle = progress * TAU * 1.08 + seed * .019;
      const ellipseX = Math.cos(angle) * radiusX;
      const ellipseY = Math.sin(angle) * radiusY;
      const targetX = centreX + ellipseX * Math.cos(tilt) - ellipseY * Math.sin(tilt);
      const targetY = centreY + ellipseX * Math.sin(tilt) + ellipseY * Math.cos(tilt);
      const scatteredX = centreX + (rand() - .5) * radiusX * 2.35;
      const scatteredY = centreY + (rand() - .5) * radiusY * 3.1;
      const x = scatteredX + (targetX - scatteredX) * crystallisation;
      const y = scatteredY + (targetY - scatteredY) * crystallisation;
      const size = 2.2 + rand() * 4.8;
      const rotation = angle + tilt + (rand() - .5) * (1 - crystallisation) * 2.2;
      const glint = Math.max(0, Math.sin(motionTime * .7 + shard * 1.73));
      drawShard(x, y, size, rotation, 3 + Math.floor(rand() * 3), rand(), glint);
    }

    // Newly fractured pieces remain irregular beyond the forming specimen.
    for (let fragment = 0; fragment < 22; fragment++) {
      const side = fragment % 2 ? -1 : 1;
      const x = centreX + side * radiusX * (.86 + rand() * .72) + (rand() - .5) * 42;
      const y = centreY + (rand() - .5) * radiusY * 2.5;
      drawShard(x, y, 1.8 + rand() * 3.4, rand() * TAU, 3 + Math.floor(rand() * 3), rand() * .7, 0);
    }

    ctx.restore();
  }

  function drawMagneticDebrisStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 211 + 47);
    const motionTime = reduceMotion ? 5.8 : time;
    const iron = [104, 111, 113];
    const ironDark = [25, 29, 31];
    const rust = [120, 48, 40];
    const coldWhite = [215, 222, 222];
    const tilt = -.27;
    const centreX = width * .56;
    const centreY = height * .46;
    const radiusX = Math.min(width * .3, height * .45);
    const radiusY = radiusX * .43;
    const bandGap = Math.max(7, Math.min(17, radiusX * .1));
    const magnetism = .72 + (Math.sin(motionTime * .38) * .5 + .5) * .2;
    const overshoot = Math.sin(motionTime * .38 + .9) * .025;

    ctx.fillStyle = "#060809";
    ctx.fillRect(0, 0, width, height);
    ctx.save();

    // Sparse background filings establish a directional field without glow.
    for (let filing = 0; filing < 86; filing++) {
      const x = rand() * width;
      const y = rand() * height;
      const angle = tilt + (rand() - .5) * 1.6;
      const length = .7 + rand() * 2.4;
      ctx.strokeStyle = `rgba(${iron[0]},${iron[1]},${iron[2]},${.025 + rand() * .065})`;
      ctx.lineWidth = .4;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    // Three incomplete field bands replace the single closed orbit.
    for (let band = -1; band <= 1; band++) {
      const rx = radiusX + band * bandGap;
      const ry = radiusY + band * bandGap * .46;
      ctx.strokeStyle = band === 0
        ? `rgba(${rust[0]},${rust[1]},${rust[2]},.15)`
        : `rgba(${iron[0]},${iron[1]},${iron[2]},.16)`;
      ctx.lineWidth = .55;
      for (let segment = 0; segment < 20; segment++) {
        if ((segment + band + 8) % 4 === 1 || rand() < .18) continue;
        const start = segment / 20 * TAU;
        const end = start + TAU / 20 * (.48 + rand() * .18);
        ctx.beginPath();
        for (let angle = start; angle <= end + .01; angle += .04) {
          const ex = Math.cos(angle) * rx;
          const ey = Math.sin(angle) * ry;
          const x = centreX + ex * Math.cos(tilt) - ey * Math.sin(tilt);
          const y = centreY + ex * Math.sin(tilt) + ey * Math.cos(tilt);
          if (angle === start) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    const drawRod = (x, y, length, thickness, rotation, polarity, glint, alpha = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = `rgba(${ironDark[0]},${ironDark[1]},${ironDark[2]},${.82 * alpha})`;
      ctx.strokeStyle = polarity < 0
        ? `rgba(${rust[0]},${rust[1]},${rust[2]},${.68 * alpha})`
        : `rgba(${iron[0]},${iron[1]},${iron[2]},${.66 * alpha})`;
      ctx.lineWidth = .5;
      ctx.beginPath();
      ctx.rect(-length * .5, -thickness * .5, length, thickness);
      ctx.fill();
      ctx.stroke();

      if (glint > .82) {
        ctx.strokeStyle = `rgba(${coldWhite[0]},${coldWhite[1]},${coldWhite[2]},${(glint - .82) * 5.2 * alpha})`;
        ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.moveTo(-length * .42, -thickness * .58);
        ctx.lineTo(length * .2, -thickness * .58);
        ctx.stroke();
      }
      ctx.restore();
    };

    for (let debris = 0; debris < 96; debris++) {
      const band = debris % 3 - 1;
      const progress = debris / 96;
      const angle = progress * TAU * 1.09 + seed * .017;
      const rx = (radiusX + band * bandGap) * (1 + overshoot);
      const ry = (radiusY + band * bandGap * .46) * (1 + overshoot);
      const ex = Math.cos(angle) * rx;
      const ey = Math.sin(angle) * ry;
      const targetX = centreX + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      const targetY = centreY + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      const scatteredX = centreX + (rand() - .5) * radiusX * 2.6;
      const scatteredY = centreY + (rand() - .5) * radiusY * 3.3;
      const x = scatteredX + (targetX - scatteredX) * magnetism;
      const y = scatteredY + (targetY - scatteredY) * magnetism;
      const tangent = Math.atan2(ry * Math.cos(angle), -rx * Math.sin(angle)) + tilt;
      const randomRotation = rand() * TAU;
      const rotation = randomRotation + Math.atan2(Math.sin(tangent - randomRotation), Math.cos(tangent - randomRotation)) * magnetism;
      const glint = Math.max(0, Math.sin(motionTime * .74 + debris * 1.67));
      drawRod(x, y, 4 + rand() * 9, .7 + rand() * 1.6, rotation, debris % 7 === 0 ? -1 : 1, glint);
    }

    // Fine filings keep orbiting after the larger debris appears locked.
    for (let mote = 0; mote < 18; mote++) {
      const angle = rand() * TAU + motionTime * (.06 + rand() * .08) * (mote % 2 ? -1 : 1);
      const rx = radiusX + bandGap * (2.2 + rand() * .8);
      const ry = radiusY + bandGap * (1 + rand() * .6);
      const ex = Math.cos(angle) * rx;
      const ey = Math.sin(angle) * ry;
      const x = centreX + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      const y = centreY + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      const tangent = Math.atan2(ry * Math.cos(angle), -rx * Math.sin(angle)) + tilt;
      drawRod(x, y, 2 + rand() * 3.4, .45 + rand() * .6, tangent, 1, 0, .55);
    }

    ctx.restore();
  }

  function drawInkSedimentStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 229 + 61);
    const motionTime = reduceMotion ? 7.6 : time;
    const paper = [174, 176, 170];
    const ink = [24, 31, 33];
    const softInk = [53, 62, 63];

    ctx.fillStyle = `rgb(${paper[0]},${paper[1]},${paper[2]})`;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const wash = ctx.createRadialGradient(
      width * .68,
      height * .62,
      0,
      width * .68,
      height * .62,
      Math.max(width, height) * .56
    );
    wash.addColorStop(0, "rgba(42,51,52,.09)");
    wash.addColorStop(.55, "rgba(61,69,69,.035)");
    wash.addColorStop(1, "rgba(174,176,170,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    for (let fibre = 0; fibre < 180; fibre++) {
      const x = rand() * width;
      const y = rand() * height;
      ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${.012 + rand() * .03})`;
      ctx.fillRect(x, y, .35 + rand() * .8, .25 + rand() * .65);
    }

    const trailPoint = sampleTime => {
      const phase = sampleTime * .31;
      return [
        width * (.5 + Math.sin(phase) * .39),
        height * (.46 + Math.sin(phase * 1.63 + .62) * .22 + Math.sin(phase * 3.1) * .025)
      ];
    };

    // Older water blooms widen, drift downward and retain irregular dark rims.
    for (let bloom = 0; bloom < 14; bloom++) {
      const age = ((motionTime * .035 + bloom / 14) % 1);
      const sampleAge = 2.5 + bloom * .82;
      const source = trailPoint(motionTime - sampleAge);
      const radius = Math.min(width, height) * (.022 + age * .15) * (.65 + rand() * .55);
      const aspect = .56 + rand() * .4;
      const rotation = rand() * Math.PI;
      const x = source[0] + (rand() - .5) * radius * .55;
      const y = source[1] + age * height * .085;
      const fade = Math.pow(1 - age, .68);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = `rgba(${softInk[0]},${softInk[1]},${softInk[2]},${.042 * fade})`;
      ctx.beginPath();
      for (let point = 0; point <= 44; point++) {
        const angle = point / 44 * TAU;
        const irregularity = .82 + Math.sin(angle * (5 + bloom % 4) + bloom * 1.7) * .1 + Math.sin(angle * 13 + seed) * .05;
        const px = Math.cos(angle) * radius * irregularity;
        const py = Math.sin(angle) * radius * aspect * irregularity;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      if (bloom % 3 !== 1) {
        ctx.fillStyle = `rgba(${paper[0] + 8},${paper[1] + 7},${paper[2] + 3},${.05 * fade})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * .36, radius * aspect * .31, 0, 0, TAU);
        ctx.fill();
      }

      for (let ring = 0; ring < 3; ring++) {
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(.11 - ring * .021) * fade})`;
        ctx.lineWidth = .45 + ring * .38;
        ctx.beginPath();
        for (let point = 0; point <= 48; point++) {
          const angle = point / 48 * TAU;
          const ringScale = .7 + ring * .14;
          const irregularity = .88 + Math.sin(angle * (7 + ring) + bloom) * .075;
          const px = Math.cos(angle) * radius * ringScale * irregularity;
          const py = Math.sin(angle) * radius * aspect * ringScale * irregularity;
          if (point === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // Fine fresh paths remain visible before the water opens them into blooms.
    for (let strand = 0; strand < 25; strand++) {
      const laneX = (rand() - .5) * width * .012;
      const laneY = (rand() - .5) * height * .045;
      ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${.055 + rand() * .1})`;
      ctx.lineWidth = strand % 8 === 0 ? 2.2 : .4 + rand() * .85;
      ctx.beginPath();
      for (let sample = 0; sample <= 54; sample++) {
        const progress = sample / 54;
        const point = trailPoint(motionTime - (1 - progress) * 8.4);
        const x = point[0] + laneX;
        const y = point[1] + laneY;
        if (sample === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Dense specks fall out of the path as sediment rather than light.
    for (let speck = 0; speck < 92; speck++) {
      const age = rand() * 11;
      const point = trailPoint(motionTime - age);
      const fall = ((motionTime * (2 + rand() * 3) + speck * 7.3) % (height * .18));
      ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${.06 + rand() * .22})`;
      ctx.beginPath();
      ctx.ellipse(
        point[0] + (rand() - .5) * width * .08,
        point[1] + fall,
        .4 + rand() * 1.5,
        .6 + rand() * 2.5,
        0,
        0,
        TAU
      );
      ctx.fill();
    }

    ctx.restore();
  }

  function drawElectricDriftStage(ctx, time, width, height, seed) {
    const rand = mulberry32(seed * 241 + 71);
    const motionTime = reduceMotion ? 8.2 : time;
    const blue = [57, 163, 255];
    const ice = [223, 248, 255];
    const cyan = [145, 226, 255];

    ctx.fillStyle = "#020814";
    ctx.fillRect(0, 0, width, height);
    const field = ctx.createRadialGradient(
      width * .45,
      height * .5,
      0,
      width * .45,
      height * .5,
      Math.max(width, height) * .58
    );
    field.addColorStop(0, "rgba(31,116,219,.12)");
    field.addColorStop(.52, "rgba(35,92,159,.035)");
    field.addColorStop(1, "rgba(2,8,20,0)");
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, width, height);

    const trailPoint = sampleTime => {
      const phase = sampleTime * .36;
      const x = width * (.5 + Math.sin(phase) * .41);
      const y = height * (.49 + Math.sin(phase * 1.49 + .86) * .24 + Math.sin(phase * 3.6) * .03);
      const dx = width * .41 * .36 * Math.cos(phase);
      const dy = height * (
        .24 * 1.49 * .36 * Math.cos(phase * 1.49 + .86)
        + .03 * 3.6 * .36 * Math.cos(phase * 3.6)
      );
      return [x, y, dx, dy];
    };

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    // Long filament afterimages follow the unchanged path at different ages.
    for (let filament = 0; filament < 34; filament++) {
      const lane = (rand() - .5) * height * .11;
      const history = 5.4 + rand() * 5.8;
      let previous = trailPoint(motionTime - history);
      ctx.beginPath();
      for (let sample = 1; sample <= 48; sample++) {
        const progress = sample / 48;
        const current = trailPoint(motionTime - history * (1 - progress));
        const x = current[0];
        const y = current[1] + lane * Math.sin(progress * Math.PI);
        if (sample === 1) ctx.moveTo(previous[0], previous[1]);
        ctx.lineTo(x, y);
        previous = [x, y];
      }
      ctx.strokeStyle = `rgba(${blue[0]},${blue[1]},${blue[2]},${.035 + rand() * .105})`;
      ctx.lineWidth = filament % 9 === 0 ? 1.25 : .26 + rand() * .55;
      ctx.stroke();
    }

    // Residual particles flicker locally instead of forming one soft glow.
    for (let residue = 0; residue < 230; residue++) {
      const age = rand() * 11.2;
      const point = trailPoint(motionTime - age);
      const pulse = Math.sin(residue * 19.43 + motionTime * (1.8 + rand() * 3.2)) * .5 + .5;
      if (pulse < .35) continue;
      const spread = (1 - age / 11.2) * 8 + age * 1.8;
      const x = point[0] + (rand() - .5) * spread;
      const y = point[1] + (rand() - .5) * spread;
      const tone = pulse > .84 ? ice : residue % 3 === 0 ? cyan : blue;
      ctx.fillStyle = `rgba(${tone[0]},${tone[1]},${tone[2]},${.08 + pulse * .48})`;
      ctx.beginPath();
      ctx.arc(x, y, .25 + rand() * (pulse > .86 ? 1.05 : .62), 0, TAU);
      ctx.fill();
    }

    // The active front is a cluster of short directional afterimages.
    const head = trailPoint(motionTime);
    const velocity = Math.hypot(head[2], head[3]) || 1;
    const tx = head[2] / velocity;
    const ty = head[3] / velocity;
    const nx = -ty;
    const ny = tx;
    for (let spark = 0; spark < 64; spark++) {
      const behind = rand() * Math.min(width, height) * .13;
      const side = (rand() - .5) * Math.min(width, height) * .075;
      const length = 3 + rand() * 18;
      const x = head[0] - tx * behind + nx * side;
      const y = head[1] - ty * behind + ny * side;
      const flicker = Math.sin(motionTime * 4.7 + spark * 2.16) * .5 + .5;
      ctx.strokeStyle = `rgba(${flicker > .82 ? ice.join(",") : cyan.join(",")},${.12 + flicker * .62})`;
      ctx.lineWidth = .35 + rand() * .72;
      ctx.beginPath();
      ctx.moveTo(x - tx * length, y - ty * length);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawTrailStageField(ctx, time, width, height, seed, canvas) {
    const rand = mulberry32(seed * 71 + 53);
    const motionTime = reduceMotion ? 8.5 : time;
    const historyLength = 11.5;
    const inkSediment = canvas.dataset.variant === "ink-sediment";
    const electricDrift = canvas.dataset.variant === "electric-drift";
    const fibrousBleed = canvas.dataset.variant === "fibrous-bleed";
    const suspendedVapor = canvas.dataset.variant === "suspended-vapor";
    const surveyorsMap = canvas.dataset.variant === "surveyors-map";
    const pulseRelics = canvas.dataset.variant === "pulse-relics";
    const mineralOrbit = canvas.dataset.variant === "mineral-orbit";
    const magneticDebris = canvas.dataset.variant === "magnetic-debris";

    if (inkSediment) {
      drawInkSedimentStage(ctx, time, width, height, seed);
      return;
    }

    if (electricDrift) {
      drawElectricDriftStage(ctx, time, width, height, seed);
      return;
    }

    if (fibrousBleed) {
      drawFibrousBleedStage(ctx, time, width, height, seed);
      return;
    }

    if (suspendedVapor) {
      drawSuspendedVaporStage(ctx, time, width, height, seed);
      return;
    }

    if (surveyorsMap) {
      drawSurveyorsMapStage(ctx, time, width, height, seed);
      return;
    }

    if (pulseRelics) {
      drawPulseRelicsStage(ctx, time, width, height, seed);
      return;
    }

    if (mineralOrbit) {
      drawMineralOrbitStage(ctx, time, width, height, seed);
      return;
    }

    if (magneticDebris) {
      drawMagneticDebrisStage(ctx, time, width, height, seed);
      return;
    }

    const trailPoint = (sampleTime, lane = 0) => {
      const phase = sampleTime * .34;
      const x = width * (.5 + Math.sin(phase) * .43);
      const y = height * (
        .5
        + Math.sin(phase * 1.57 + .82) * .27
        + Math.sin(phase * 3.4) * .035
      );
      const dx = width * .43 * .34 * Math.cos(phase);
      const dy = height * (
        .27 * 1.57 * .34 * Math.cos(phase * 1.57 + .82)
        + .035 * 3.4 * .34 * Math.cos(phase * 3.4)
      );
      const velocity = Math.hypot(dx, dy) || 1;
      return [x - dy / velocity * lane, y + dx / velocity * lane, dx, dy];
    };

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Older paths remain as broad, low-contrast sediment. Their warm tint and
    // longer history separate the archive layer from the active teal wake.
    for (let strand = 0; strand < 26; strand++) {
      const lane = (rand() - .5) * height * .34;
      const ageOffset = 2.8 + rand() * 7.5;
      const strandHistory = 10 + rand() * 7;
      ctx.beginPath();
      for (let sample = 0; sample <= 68; sample++) {
        const progress = sample / 68;
        const sampleTime = motionTime - ageOffset - strandHistory * (1 - progress);
        const [x, y] = trailPoint(sampleTime, lane);
        if (sample === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const tealSediment = strand % 5 === 0;
      ctx.strokeStyle = inkSediment
        ? `rgba(19,27,30,${.055 + rand() * .085})`
        : electricDrift
          ? `rgba(25,76,132,${.035 + rand() * .075})`
        : tealSediment
          ? `rgba(38,91,79,${.035 + rand() * .045})`
          : `rgba(91,48,54,${.025 + rand() * .05})`;
      ctx.lineWidth = inkSediment ? 1.2 + rand() * 4.6 : .65 + rand() * 2.2;
      ctx.stroke();
    }

    // Recent filaments brighten gradually toward the moving front, producing
    // a clear sense of direction instead of a stationary decorative vortex.
    ctx.globalCompositeOperation = inkSediment ? "source-over" : "lighter";
    const recentStrandCount = electricDrift ? 22 : 31;
    const recentSampleCount = electricDrift ? 42 : 58;
    for (let strand = 0; strand < recentStrandCount; strand++) {
      const lane = (rand() - .5) * height * .2;
      const strandHistory = historyLength * (.7 + rand() * .34);
      let previous = trailPoint(motionTime - strandHistory, lane);
      for (let sample = 1; sample <= recentSampleCount; sample++) {
        const progress = sample / recentSampleCount;
        const sampleTime = motionTime - strandHistory * (1 - progress);
        const current = trailPoint(sampleTime, lane);
        const frontLight = progress * progress;
        ctx.strokeStyle = inkSediment
          ? `rgba(38,50,54,${.02 + frontLight * (.13 + rand() * .1)})`
          : electricDrift
            ? `rgba(87,183,255,${.025 + frontLight * (.2 + rand() * .18)})`
          : `rgba(101,215,196,${.012 + frontLight * (.15 + rand() * .13)})`;
        ctx.lineWidth = inkSediment
          ? (strand % 7 === 0 ? 2.4 : .55 + rand() * 1.3)
          : electricDrift
            ? (strand % 8 === 0 ? 1.18 : .3 + rand() * .52)
            : (strand % 9 === 0 ? .92 : .28 + rand() * .4);
        ctx.beginPath();
        ctx.moveTo(previous[0], previous[1]);
        ctx.lineTo(current[0], current[1]);
        ctx.stroke();
        previous = current;
      }
    }

    // Small moving strokes travel through different ages of the same path.
    // Their varied lengths make the trail read as flow rather than dotted noise.
    const movingParticleCount = electricDrift ? 148 : 230;
    for (let particle = 0; particle < movingParticleCount; particle++) {
      const age = rand() * historyLength;
      const lane = (rand() - .5) * height * .22;
      const current = trailPoint(motionTime - age, lane);
      const previous = trailPoint(motionTime - age - (.045 + rand() * .09), lane);
      const recency = 1 - age / historyLength;
      const alpha = .035 + recency * (.2 + rand() * .48);
      ctx.strokeStyle = inkSediment
        ? `rgba(17,24,27,${alpha * .13})`
        : electricDrift
          ? `rgba(31,121,255,${alpha * .22})`
          : `rgba(101,215,196,${alpha * .16})`;
      ctx.lineWidth = inkSediment ? 4.8 + rand() * 6.2 : electricDrift ? 3.2 + rand() * 4.6 : 2.1 + rand() * 2.8;
      ctx.beginPath();
      ctx.moveTo(previous[0], previous[1]);
      ctx.lineTo(current[0], current[1]);
      ctx.stroke();
      ctx.strokeStyle = inkSediment
        ? `rgba(24,33,36,${alpha * .72})`
        : electricDrift
          ? `rgba(154,225,255,${alpha * (particle % 9 === 0 ? 1.38 : 1)})`
          : `rgba(101,215,196,${alpha})`;
      ctx.lineWidth = inkSediment ? .55 + rand() * 1.15 : electricDrift ? .38 + rand() * .74 : .32 + rand() * .68;
      ctx.beginPath();
      ctx.moveTo(previous[0], previous[1]);
      ctx.lineTo(current[0], current[1]);
      ctx.stroke();
      if (particle % 13 === 0) {
        ctx.fillStyle = inkSediment
          ? `rgba(16,22,24,${.12 + recency * .28})`
          : electricDrift
            ? `rgba(222,248,255,${.24 + recency * .68})`
            : `rgba(232,225,216,${.18 + recency * .55})`;
        ctx.beginPath();
        ctx.arc(current[0], current[1], .45 + rand() * .75, 0, TAU);
        ctx.fill();
      }
    }

    // A compact leading edge gathers the newest particles and gently points in
    // the direction of travel while the rest of the path remains diffuse.
    const [headX, headY, velocityX, velocityY] = trailPoint(motionTime);
    const velocity = Math.hypot(velocityX, velocityY) || 1;
    const normalX = -velocityY / velocity;
    const normalY = velocityX / velocity;
    const tangentX = velocityX / velocity;
    const tangentY = velocityY / velocity;
    const sparkCount = electricDrift ? 42 : 68;
    for (let spark = 0; spark < sparkCount; spark++) {
      const behind = rand() * Math.min(width, height) * .09;
      const side = (rand() - .5) * Math.min(width, height) * .105;
      const x = headX - tangentX * behind + normalX * side;
      const y = headY - tangentY * behind + normalY * side;
      ctx.fillStyle = inkSediment
        ? `rgba(20,28,31,${.09 + rand() * .34})`
        : electricDrift
          ? `rgba(119,211,255,${.18 + rand() * .72})`
          : `rgba(101,215,196,${.16 + rand() * .58})`;
      ctx.beginPath();
      ctx.arc(x, y, .35 + rand() * .9, 0, TAU);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    const headGlow = ctx.createRadialGradient(headX, headY, 0, headX, headY, Math.min(width, height) * .07);
    headGlow.addColorStop(0, inkSediment ? "rgba(29,38,41,.2)" : electricDrift ? "rgba(226,249,255,.55)" : "rgba(232,225,216,.34)");
    headGlow.addColorStop(.16, inkSediment ? "rgba(37,49,52,.12)" : electricDrift ? "rgba(73,174,255,.32)" : "rgba(101,215,196,.2)");
    headGlow.addColorStop(1, inkSediment ? "rgba(37,49,52,0)" : electricDrift ? "rgba(49,132,255,0)" : "rgba(101,215,196,0)");
    ctx.fillStyle = headGlow;
    ctx.beginPath();
    ctx.arc(headX, headY, Math.min(width, height) * .07, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawOpenStageField(ctx, width, height, seed, canvas) {
    const variant = canvas.dataset.variant || "";
    const carbonVeil = variant === "carbon-veil";
    const luminousAperture = variant === "luminous-aperture";
    const redStrata = variant === "red-strata";
    const topographicTissue = variant === "topographic-tissue";
    const phaseBloom = variant === "phase-bloom";
    const dustNegative = variant === "dust-negative";
    const cyanotypeExposure = variant === "cyanotype-exposure";
    const embossedSeal = variant === "embossed-seal";
    const thermalPlate = variant === "thermal-plate";
    const liquidLens = variant === "liquid-lens";
    const acousticCompression = variant === "acoustic-compression";
    const threadCartography = variant === "thread-cartography";
    const mineralArchive = variant === "mineral-archive";
    const stagePalette = redStrata
      ? {
          background: "#0d0a09",
          wash: "rgba(13,10,9,.05)",
          wide: "rgba(60,45,40,.08)",
          middle: "rgba(113,58,48,.18)",
          fine: "rgba(164,79,63,.48)",
          dot: "rgba(201,190,179,.88)"
        }
      : mineralArchive
      ? {
          background: "#0b0d18",
          wash: "rgba(11,13,24,.052)",
          wide: "rgba(98,89,126,.07)",
          middle: "rgba(139,157,181,.16)",
          fine: "rgba(181,222,235,.45)",
          dot: "rgba(230,235,238,.86)"
        }
      : threadCartography
      ? {
          background: "#061116",
          wash: "rgba(6,17,22,.05)",
          wide: "rgba(69,105,103,.06)",
          middle: "rgba(104,151,143,.14)",
          fine: "rgba(222,220,206,.39)",
          dot: "rgba(231,226,208,.82)"
        }
      : acousticCompression
      ? {
          background: "#050506",
          wash: "rgba(5,5,6,.06)",
          wide: "rgba(103,106,110,.06)",
          middle: "rgba(187,190,192,.14)",
          fine: "rgba(238,239,235,.42)",
          dot: "rgba(182,28,24,.78)"
        }
      : liquidLens
      ? {
          background: "#071318",
          wash: "rgba(7,19,24,.048)",
          wide: "rgba(89,129,137,.065)",
          middle: "rgba(105,154,135,.15)",
          fine: "rgba(181,215,216,.4)",
          dot: "rgba(232,234,217,.82)"
        }
      : thermalPlate
      ? {
          background: "#070303",
          wash: "rgba(7,3,3,.055)",
          wide: "rgba(68,4,3,.08)",
          middle: "rgba(169,37,7,.2)",
          fine: "rgba(245,142,27,.48)",
          dot: "rgba(255,239,194,.9)"
        }
      : embossedSeal
      ? {
          background: "#d9d4c7",
          wash: "rgba(217,212,199,.072)",
          wide: "rgba(116,107,91,.052)",
          middle: "rgba(147,136,117,.13)",
          fine: "rgba(92,84,70,.32)",
          dot: "rgba(121,88,42,.68)"
        }
      : cyanotypeExposure
      ? {
          background: "#052b4f",
          wash: "rgba(5,43,79,.045)",
          wide: "rgba(93,185,199,.065)",
          middle: "rgba(151,218,219,.15)",
          fine: "rgba(226,238,218,.43)",
          dot: "rgba(235,242,221,.84)"
        }
      : dustNegative
      ? {
          background: "#0c0b0a",
          wash: "rgba(12,11,10,.042)",
          wide: "rgba(69,52,45,.052)",
          middle: "rgba(115,91,78,.12)",
          fine: "rgba(170,153,139,.3)",
          dot: "rgba(183,165,150,.66)"
        }
      : topographicTissue
      ? {
          background: "#12130f",
          wash: "rgba(18,19,15,.045)",
          wide: "rgba(120,101,76,.052)",
          middle: "rgba(121,132,101,.13)",
          fine: "rgba(219,211,190,.38)",
          dot: "rgba(221,214,195,.8)"
        }
      : phaseBloom
        ? {
            background: "#080921",
            wash: "rgba(8,9,33,.045)",
            wide: "rgba(96,104,255,.075)",
            middle: "rgba(201,51,154,.17)",
            fine: "rgba(219,231,255,.52)",
            dot: "rgba(226,236,255,.9)"
          }
        : null;
    let state = openStageStates.get(canvas);
    if (!state || state.width !== width || state.height !== height || state.variant !== variant) {
      const rand = mulberry32(seed * 97 + 41);
      const count = Math.round(480 * 1.6 * Math.min(1.6, Math.max(.5, width * height / 380000)));
      const spawn = () => {
        const radius = 10 + rand() * Math.min(width, height) * .52;
        const angle = rand() * TAU;
        return {
          r: radius,
          a: angle,
          x: width * .62 + Math.cos(angle) * radius,
          y: height * .46 + Math.sin(angle) * radius,
          px: 0,
          py: 0,
          life: 0,
          max: 120 + rand() * 400,
          dot: rand() < .12
        };
      };
      state = { width, height, variant, rand, spawn, particles: Array.from({ length: count }, spawn), frames: 0 };
      openStageStates.set(canvas, state);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = stagePalette?.background || (carbonVeil ? "#b8b0a2" : luminousAperture ? "#020916" : "#07100d");
      ctx.fillRect(0, 0, width, height);
    }

    // This follows the supplied Trail field: particles spiral inward while the
    // translucent frame wash preserves a soft record of their previous paths.
    ctx.fillStyle = stagePalette?.wash || (carbonVeil ? "rgba(184,176,162,.07)" : luminousAperture ? "rgba(2,9,22,.055)" : "rgba(7,16,13,.045)");
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    const path = new Path2D();
    const dots = [];

    state.particles.forEach((particle, index) => {
      particle.px = particle.x;
      particle.py = particle.y;
      particle.a += (.55 * 26) / (particle.r + 60) * .09;
      particle.r -= .06 * (particle.r * .04 + 1);
      if (particle.r < 4) particle.r = 10 + state.rand() * Math.min(width, height) * .5;
      particle.x = width * .62 + Math.cos(particle.a) * particle.r * 1.35;
      particle.y = height * .46 + Math.sin(particle.a) * particle.r;
      path.moveTo(particle.px, particle.py);
      path.lineTo(particle.x, particle.y);
      if (particle.dot && state.frames % 3 === 0) dots.push([particle.x, particle.y]);
      particle.life += 1;
      if (particle.life > particle.max) state.particles[index] = state.spawn();
    });

    ctx.save();
    if (luminousAperture) {
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(82,181,255,.62)";
    }
    ctx.strokeStyle = stagePalette?.wide || (carbonVeil ? "rgba(43,41,37,.032)" : luminousAperture ? "rgba(57,148,255,.11)" : "rgba(101,215,196,.049)");
    ctx.lineWidth = 3.4;
    ctx.stroke(path);
    ctx.strokeStyle = stagePalette?.middle || (carbonVeil ? "rgba(62,57,51,.09)" : luminousAperture ? "rgba(92,202,255,.3)" : "rgba(101,215,196,.112)");
    ctx.lineWidth = 1.7;
    ctx.stroke(path);
    ctx.strokeStyle = stagePalette?.fine || (carbonVeil ? "rgba(43,41,37,.34)" : luminousAperture ? "rgba(215,244,255,.82)" : "rgba(101,215,196,.35)");
    ctx.lineWidth = .8;
    ctx.stroke(path);
    ctx.fillStyle = stagePalette?.dot || (carbonVeil ? "rgba(43,41,37,.58)" : luminousAperture ? "rgba(231,250,255,.95)" : "rgba(232,225,216,.78)");
    dots.forEach(([x, y]) => ctx.fillRect(x, y, 1.35, 1.35));
    ctx.restore();
    state.frames += 1;
  }

function drawOpenMaterial(ctx, type, time, width, height, seed) {
  const rand = mulberry32(seed);
  const pulse = reduceMotion ? .68 : (Math.sin(time * .72 - .9) + 1) * .5;
  const openness = pulse * pulse * (3 - 2 * pulse);
  const teal = "rgba(101,215,196,.84)";
  const bone = "rgba(224,221,209,.78)";

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (type === "open-gesture") {
    const palmX = width * .5;
    const palmY = height * .72;
    const palmHalf = width * .095;
    const fingerLengths = [.32, .39, .41, .37, .3];
    const openAngles = [-1.02, -.5, 0, .5, 1.02];

    ctx.strokeStyle = teal;
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(palmX, palmY + height * .055);
    ctx.lineTo(palmX - palmHalf, palmY - height * .08);
    ctx.lineTo(palmX + palmHalf, palmY - height * .08);
    ctx.lineTo(palmX, palmY + height * .055);
    ctx.stroke();

    for (let finger = 0; finger < 5; finger++) {
      const baseX = palmX + (finger - 2) * palmHalf * .46;
      const baseY = palmY - height * .08;
      const length = height * fingerLengths[finger];
      const openPoints = [[baseX, baseY]];
      let openX = baseX;
      let openY = baseY;
      for (let joint = 1; joint <= 3; joint++) {
        const jointAngle = openAngles[finger] + (finger - 2) * .025 * joint;
        openX += Math.sin(jointAngle) * length / 3;
        openY -= Math.cos(jointAngle) * length / 3;
        openPoints.push([openX, openY]);
      }

      // In the closed pose every finger bends back toward the palm, forming a fist.
      const side = finger - 2;
      const inward = side === 0 ? 0 : -Math.sign(side);
      const closedPoints = [
        [baseX, baseY],
        [baseX + inward * width * .014, baseY - height * (.052 + Math.abs(side) * .003)],
        [palmX + side * palmHalf * .24, baseY - height * .022],
        [palmX + side * palmHalf * .16, baseY + height * (.018 + Math.abs(side) * .004)]
      ];
      const points = closedPoints.map((closedPoint, joint) => [
        closedPoint[0] + (openPoints[joint][0] - closedPoint[0]) * openness,
        closedPoint[1] + (openPoints[joint][1] - closedPoint[1]) * openness
      ]);

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
      ctx.stroke();

      points.forEach((point, joint) => {
        ctx.fillStyle = joint === 3 ? bone : "rgba(224,221,209,.62)";
        ctx.beginPath();
        ctx.arc(point[0], point[1], joint === 3 ? 2.15 : 1.25, 0, TAU);
        ctx.fill();
      });
    }
    ctx.restore();
    return;
  }

  if (type === "open-bloom") {
    const centreX = width * .5;
    const centreY = height * .5;
    const maxRadius = Math.min(width, height) * (.1 + openness * .32);
    const envelopeX = width * (.16 + openness * .22);
    const envelopeY = height * (.18 + openness * .25);
    ctx.fillStyle = "rgba(22,43,37,.24)";
    ctx.beginPath();
    ctx.ellipse(centreX, centreY, envelopeX, envelopeY, 0, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    for (let ring = 0; ring < 14; ring++) {
      const radius = maxRadius * (.18 + ring / 16);
      const rotation = (reduceMotion ? 0 : time * (.18 + ring * .006)) + ring * .63;
      ctx.beginPath();
      ctx.ellipse(centreX, centreY, radius * 1.2, radius * .72, rotation * .035, 0, TAU);
      ctx.setLineDash([1.5 + rand() * 3.5, 3 + rand() * 5.5]);
      ctx.lineDashOffset = -rotation * 10;
      ctx.strokeStyle = `rgba(101,215,196,${.1 + openness * .16 + rand() * .12})`;
      ctx.lineWidth = .45 + rand() * .65;
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let particle = 0; particle < 70; particle++) {
      const angle = rand() * TAU + (reduceMotion ? 0 : time * (.12 + rand() * .08));
      const radius = Math.sqrt(rand()) * maxRadius;
      const x = centreX + Math.cos(angle) * radius * 1.18;
      const y = centreY + Math.sin(angle) * radius * .72;
      ctx.fillStyle = `rgba(101,215,196,${.09 + rand() * .34})`;
      ctx.beginPath();
      ctx.arc(x, y, .3 + rand() * .65, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(3,12,10,.92)";
    ctx.beginPath();
    ctx.ellipse(centreX, centreY, maxRadius * .12, maxRadius * .075, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }

  const centreX = width * .5;
  const centreY = height * .51;
  const outerX = width * (.25 + openness * .13);
  const outerY = height * (.25 + openness * .13);
  ctx.fillStyle = "rgba(49,48,50,.72)";
  ctx.beginPath();
  ctx.ellipse(centreX, centreY, outerX, outerY, 0, 0, TAU);
  ctx.fill();

  ctx.globalCompositeOperation = "lighter";
  for (let ring = 0; ring < 7; ring++) {
    const spacing = (.22 + ring * .115) * (.78 + openness * .22);
    const radiusX = outerX * spacing;
    const radiusY = outerY * spacing;
    const glow = ctx.createLinearGradient(centreX - radiusX, 0, centreX + radiusX, 0);
    glow.addColorStop(0, "rgba(101,215,196,.62)");
    glow.addColorStop(.5, ring % 3 === 0 ? "rgba(101,215,196,.92)" : "rgba(101,215,196,.58)");
    glow.addColorStop(1, "rgba(101,215,196,.62)");
    ctx.beginPath();
    ctx.ellipse(centreX, centreY, radiusX, radiusY, 0, 0, TAU);
    ctx.strokeStyle = glow;
    ctx.lineWidth = ring === 0 || ring === 6 ? 1.8 : .85 + (ring % 2) * .5;
    ctx.stroke();
  }

  const innerGlow = ctx.createRadialGradient(centreX, centreY, 1, centreX, centreY, outerX * .3);
  innerGlow.addColorStop(0, "rgba(0,0,0,.95)");
  innerGlow.addColorStop(.55, "rgba(6,20,17,.92)");
  innerGlow.addColorStop(1, "rgba(101,215,196,.72)");
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.ellipse(centreX, centreY, outerX * .3, outerY * .28, 0, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = bone;
  ctx.fillRect(centreX - 1, centreY - 1, 2, 2);
  ctx.restore();
}

function drawBothMaterial(ctx, type, time, width, height, seed, canvas) {
  const rand = mulberry32(seed);
  const opennessAt = sampleTime => {
    const pulse = reduceMotion ? .72 : (Math.sin(sampleTime * .58 - .7) + 1) * .5;
    return pulse * pulse * (3 - 2 * pulse);
  };
  const openness = opennessAt(time);
  const centreX = width * .5;
  const centreY = height * .5;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (type === "both-gesture") {
    const handScale = Math.min(width, height) * .3;
    const separation = width * (.07 + openness * .25);
    const drawHand = (handX, mirror) => {
      const palmHalf = handScale * .15;
      const palmY = handScale * .12;
      const fingerLengths = [.3, .38, .42, .39, .31];
      const fingerAngles = [-.92, -.43, 0, .43, .92];

      ctx.save();
      ctx.translate(handX, height * .525);
      ctx.scale(mirror, 1);
      ctx.strokeStyle = "rgba(101,215,196,.88)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, palmY + handScale * .075);
      ctx.lineTo(-palmHalf, palmY - handScale * .055);
      ctx.lineTo(palmHalf, palmY - handScale * .055);
      ctx.lineTo(0, palmY + handScale * .075);
      ctx.stroke();

      for (let finger = 0; finger < 5; finger++) {
        const baseX = (finger - 2) * palmHalf * .46;
        const baseY = palmY - handScale * .055;
        const segmentLength = handScale * fingerLengths[finger] / 3;
        let x = baseX;
        let y = baseY;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let joint = 1; joint <= 3; joint++) {
          const angle = fingerAngles[finger] + (finger - 2) * .022 * joint;
          x += Math.sin(angle) * segmentLength;
          y -= Math.cos(angle) * segmentLength;
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        x = baseX;
        y = baseY;
        for (let joint = 0; joint <= 3; joint++) {
          ctx.fillStyle = joint === 3 ? "rgba(224,221,209,.86)" : "rgba(224,221,209,.64)";
          ctx.beginPath();
          ctx.arc(x, y, joint === 3 ? 1.9 : 1.05, 0, TAU);
          ctx.fill();
          if (joint < 3) {
            const angle = fingerAngles[finger] + (finger - 2) * .022 * (joint + 1);
            x += Math.sin(angle) * segmentLength;
            y -= Math.cos(angle) * segmentLength;
          }
        }
      }
      ctx.restore();
    };

    drawHand(centreX - separation, 1);
    drawHand(centreX + separation, -1);
    ctx.restore();
    return;
  }

  if (type === "both-field") {
    let state = bothFieldStates.get(canvas);
    if (!state || state.width !== width || state.height !== height) {
      const stateRand = mulberry32(seed);
      const areaScale = Math.min(1.6, Math.max(.5, width * height / 380000));
      const particleCount = Math.round(300 * 1.6 * areaScale);
      const particles = Array.from({ length: particleCount }, () => ({
        angle: stateRand() * TAU,
        radiusRatio: .2 + stateRand() * .8,
        speed: .6 + stateRand() * .8,
        x: centreX,
        y: centreY
      }));
      state = { width, height, particles, lastTime: time };
      bothFieldStates.set(canvas, state);
      ctx.fillStyle = "#07100d";
      ctx.fillRect(0, 0, width, height);

      if (reduceMotion) {
        const spread = .07 + (.4 - .07) * openness;
        state.particles.forEach(particle => {
          particle.x = centreX + Math.cos(particle.angle) * width * spread * particle.radiusRatio * .85;
          particle.y = height * .5 + Math.sin(particle.angle) * height * spread * particle.radiusRatio * .95;
        });
      }
    }

    const frameScale = Math.max(.25, Math.min(3, (time - state.lastTime) * 60 || 1));
    state.lastTime = time;
    const fadeAlpha = 1 - Math.pow(.94, frameScale);
    ctx.fillStyle = `rgba(7,16,13,${fadeAlpha})`;
    ctx.fillRect(0, 0, width, height);

    const spread = .07 + (.4 - .07) * openness;
    const path = new Path2D();
    const easing = 1 - Math.pow(.94, frameScale);
    state.particles.forEach(particle => {
      const previousX = particle.x;
      const previousY = particle.y;
      particle.angle += .012 * particle.speed * frameScale;
      const targetX = centreX + Math.cos(particle.angle) * width * spread * particle.radiusRatio * .85;
      const targetY = height * .5 + Math.sin(particle.angle) * height * spread * particle.radiusRatio * .95;
      particle.x += (targetX - particle.x) * easing;
      particle.y += (targetY - particle.y) * easing;
      path.moveTo(previousX, previousY);
      path.lineTo(particle.x, particle.y);
    });

    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(101,215,196,.035)";
    ctx.lineWidth = 3;
    ctx.stroke(path);
    ctx.strokeStyle = "rgba(101,215,196,.21)";
    ctx.lineWidth = .8;
    ctx.stroke(path);
    ctx.restore();
    return;
  }

  const constellationTime = reduceMotion ? 16 : time % 28;
  const smoothstep = (from, to, value) => {
    const progress = Math.max(0, Math.min(1, (value - from) / (to - from)));
    return progress * progress * (3 - 2 * progress);
  };

  // Low-contrast deposited marks form the archive layer beneath the particles.
  for (let mark = 0; mark < 72; mark++) {
    const markPhase = rand() * TAU;
    const x = width * (.02 + rand() * .96)
      + (reduceMotion ? 0 : Math.sin(time * .13 + markPhase) * width * .012);
    const y = height * (.04 + rand() * .92)
      + (reduceMotion ? 0 : Math.cos(time * .11 + markPhase) * height * .014);
    const length = width * (.02 + rand() * .07);
    const angle = rand() * TAU + (reduceMotion ? 0 : Math.sin(time * .09 + markPhase) * .08);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.strokeStyle = "rgba(25,49,42,.16)";
    ctx.lineWidth = 1.15 + rand() * .55;
    ctx.stroke();
  }

  // Many small particles swim across the field at independent speeds and angles.
  const wrap = value => ((value % 1) + 1) % 1;
  ctx.globalCompositeOperation = "lighter";
  for (let particle = 0; particle < 112; particle++) {
    const startX = rand();
    const startY = rand();
    const heading = rand() * TAU;
    const phase = rand() * TAU;
    const speed = .008 + rand() * .018;
    const travel = reduceMotion ? 0 : time * speed;
    const xProgress = wrap(startX + Math.cos(heading) * travel);
    const yProgress = wrap(
      startY
      + Math.sin(heading) * travel
      + (reduceMotion ? 0 : Math.sin(time * .17 + phase) * .018)
    );
    const x = width * (.02 + xProgress * .96);
    const y = height * (.04 + yProgress * .92);
    const swimAngle = heading + (reduceMotion ? 0 : Math.cos(time * .14 + phase) * .12);
    const length = width * (.004 + rand() * .009);
    const alpha = .12 + rand() * .34;

    ctx.strokeStyle = `rgba(101,215,196,${alpha})`;
    ctx.lineWidth = .45 + rand() * .5;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(swimAngle) * length, y - Math.sin(swimAngle) * length);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (particle % 5 === 0) {
      ctx.fillStyle = `rgba(101,215,196,${alpha * .72})`;
      ctx.beginPath();
      ctx.arc(x, y, .35 + rand() * .35, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";

  // The video builds an open constellation from the lower arc toward the top.
  const layout = [
    [.78, .58],
    [.66, .38],
    [.45, .32],
    [.27, .42],
    [.23, .62],
    [.35, .78],
    [.56, .82],
    [.74, .7]
  ];
  const anchorCentreOffset = -.085;
  const anchors = layout.map((position, index) => [
    width * position[0] + (reduceMotion ? 0 : Math.sin(time * .16 + index * 1.37) * width * .008),
    height * (position[1] + anchorCentreOffset)
      + (reduceMotion ? 0 : Math.cos(time * .14 + index * 1.19) * height * .01)
  ]);
  const fadeOut = 1 - smoothstep(23, 27.5, constellationTime);
  const reveals = anchors.map((_, index) => {
    const rank = anchors.length - 1 - index;
    return smoothstep(rank * 1.65, rank * 1.65 + 2.6, constellationTime);
  });

  // Each connection grows gently from the previous anchor instead of popping in.
  for (let index = anchors.length - 2; index >= 0; index--) {
    const reveal = reveals[index];
    const alpha = Math.min(reveal, reveals[index + 1]) * fadeOut;
    if (alpha <= .001) continue;
    const start = anchors[index + 1];
    const end = anchors[index];
    ctx.strokeStyle = `rgba(101,215,196,${.58 * alpha})`;
    ctx.lineWidth = .85;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(
      start[0] + (end[0] - start[0]) * reveal,
      start[1] + (end[1] - start[1]) * reveal
    );
    ctx.stroke();
  }

  anchors.forEach((anchor, index) => {
    const alpha = reveals[index] * fadeOut;
    if (alpha <= .001) return;
    const baseRadius = 4.2 + (index % 3) * 1.1;
    const nodeRadius = baseRadius * (.58 + reveals[index] * .42);
    ctx.strokeStyle = `rgba(101,215,196,${.65 * alpha})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(anchor[0], anchor[1], nodeRadius, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = `rgba(224,221,209,${.88 * alpha})`;
    ctx.beginPath();
    ctx.arc(anchor[0], anchor[1], 1.8, 0, TAU);
    ctx.fill();
  });

  ctx.restore();
}

function drawTrailSediment(ctx, time, width, height, seed) {
  const rand = mulberry32(seed);
  const pathCount = 40;
  const samples = 58;
  const deposit = reduceMotion ? .7 : (time * .085) % 1;

  ctx.save();
  ctx.lineCap = "round";

  // Completed paths remain visible as quiet layers of deposited movement.
  for (let pathIndex = 0; pathIndex < pathCount; pathIndex++) {
    const baseY = height * (.18 + rand() * .64);
    const amplitude = height * (.03 + rand() * .11);
    const frequency = 1.15 + rand() * 1.6;
    const phase = rand() * TAU;
    const slope = (rand() - .5) * height * .22;
    const warm = pathIndex < pathCount * .72;
    const shimmer = reduceMotion ? 0 : Math.sin(time * .19 + pathIndex * .42) * .018;

    ctx.beginPath();
    for (let sample = 0; sample < samples; sample++) {
      const progress = sample / (samples - 1);
      const x = width * (.02 + progress * .96);
      const y = baseY
        + Math.sin(progress * TAU * frequency + phase) * amplitude
        + slope * (progress - .5)
        + Math.sin(progress * Math.PI) * height * shimmer;
      if (sample === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = warm
      ? `rgba(104,58,63,${.045 + rand() * .085})`
      : `rgba(66,130,118,${.04 + rand() * .07})`;
    ctx.lineWidth = .35 + rand() * .85;
    ctx.stroke();
  }

  // One new strand is slowly laid down over the older sediment.
  ctx.globalCompositeOperation = "lighter";
  const activeCentre = height * (
    .5 + (reduceMotion ? 0 : Math.sin(time * .16) * .28)
  );
  for (let strand = 0; strand < 7; strand++) {
    const baseY = activeCentre + height * (strand - 3) * .013;
    const lastSample = Math.max(2, Math.floor((samples - 1) * deposit));
    ctx.beginPath();
    for (let sample = 0; sample <= lastSample; sample++) {
      const progress = sample / (samples - 1);
      const x = width * (.02 + progress * .96);
      const y = baseY
        + Math.sin(progress * TAU * 1.42 + strand * .14) * height * .11
        + Math.sin(progress * Math.PI) * height * .045;
      if (sample === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const gradient = ctx.createLinearGradient(width * .02, 0, width * .98, 0);
    gradient.addColorStop(0, "rgba(101,215,196,.1)");
    gradient.addColorStop(Math.max(.01, deposit * .72), "rgba(101,215,196,.28)");
    gradient.addColorStop(Math.max(.02, deposit), "rgba(101,215,196,.68)");
    gradient.addColorStop(1, "rgba(101,215,196,0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = .5 + strand * .06;
    ctx.stroke();
  }

  ctx.restore();
}

function drawTrailGesture(ctx, time, width, height, seed) {
  const rand = mulberry32(seed);
  const motionTime = reduceMotion ? 3.4 : time;
  const historyLength = 4.6;

  const handPoint = (sampleTime, lane = 0) => {
    const phase = sampleTime * .48;
    const x = width * (.5 + Math.sin(phase) * .34);
    const y = height * (
      .5
      + Math.sin(phase * 1.37 + .68) * .19
      + Math.sin(phase * 2.8) * .025
    );
    const dx = width * .34 * .48 * Math.cos(phase);
    const dy = height * (
      .19 * 1.37 * .48 * Math.cos(phase * 1.37 + .68)
      + .025 * 2.8 * .48 * Math.cos(phase * 2.8)
    );
    const length = Math.hypot(dx, dy) || 1;
    return [x - dy / length * lane, y + dx / length * lane, dx, dy];
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Several fingertip-like paths retain the recent movement of the whole hand.
  for (let line = 0; line < 15; line++) {
    const lane = (line - 7) * height * .009;
    const lineHistory = historyLength * (.76 + rand() * .28);
    ctx.beginPath();
    for (let sample = 0; sample <= 48; sample++) {
      const progress = sample / 48;
      const sampleTime = motionTime - lineHistory * (1 - progress);
      const [x, y] = handPoint(sampleTime, lane);
      if (sample === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(101,215,196,${.035 + line / 15 * .055})`;
    ctx.lineWidth = line % 5 === 0 ? .8 : .4;
    ctx.stroke();
  }

  // Particles occupy the same recent route and fade with age.
  ctx.globalCompositeOperation = "lighter";
  for (let particle = 0; particle < 58; particle++) {
    const age = rand() * historyLength;
    const lane = (rand() - .5) * height * .16;
    const [x, y] = handPoint(motionTime - age, lane);
    const recency = 1 - age / historyLength;
    ctx.fillStyle = `rgba(101,215,196,${.05 + recency * (.18 + rand() * .34)})`;
    ctx.beginPath();
    ctx.arc(x, y, .35 + rand() * 1.05, 0, TAU);
    ctx.fill();
  }

  // The Open-style hand skeleton itself travels across the complete field.
  const [handX, handY, velocityX, velocityY] = handPoint(motionTime);
  const handScale = Math.min(width, height) * .29;
  const palmHalf = handScale * .15;
  const palmY = handScale * .12;
  const tilt = Math.atan2(velocityY, velocityX) * .16;
  const fingerLengths = [.31, .39, .42, .37, .29];
  const fingerAngles = [-.92, -.43, 0, .43, .92];

  ctx.globalCompositeOperation = "source-over";
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(tilt);
  ctx.strokeStyle = "rgba(101,215,196,.88)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, palmY + handScale * .075);
  ctx.lineTo(-palmHalf, palmY - handScale * .055);
  ctx.lineTo(palmHalf, palmY - handScale * .055);
  ctx.lineTo(0, palmY + handScale * .075);
  ctx.stroke();

  for (let finger = 0; finger < 5; finger++) {
    const baseX = (finger - 2) * palmHalf * .46;
    const baseY = palmY - handScale * .055;
    const segmentLength = handScale * fingerLengths[finger] / 3;
    let x = baseX;
    let y = baseY;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let joint = 1; joint <= 3; joint++) {
      const angle = fingerAngles[finger] + (finger - 2) * .022 * joint;
      x += Math.sin(angle) * segmentLength;
      y -= Math.cos(angle) * segmentLength;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    x = baseX;
    y = baseY;
    for (let joint = 0; joint <= 3; joint++) {
      ctx.fillStyle = joint === 3 ? "rgba(224,221,209,.86)" : "rgba(224,221,209,.64)";
      ctx.beginPath();
      ctx.arc(x, y, joint === 3 ? 1.9 : 1.05, 0, TAU);
      ctx.fill();
      if (joint < 3) {
        const angle = fingerAngles[finger] + (finger - 2) * .022 * (joint + 1);
        x += Math.sin(angle) * segmentLength;
        y -= Math.cos(angle) * segmentLength;
      }
    }
  }
  ctx.restore();
  ctx.restore();
}

function drawTrailMaterial(ctx, type, time, width, height, seed) {
  const rand = mulberry32(seed);
  const sediment = type === "trail-sediment";

  if (sediment) {
    drawTrailSediment(ctx, time, width, height, seed);
    return;
  }

  const motionTime = reduceMotion ? 4.2 : time;
  const historyLength = 4.1;

  const trailPoint = (sampleTime, lane = 0) => {
    const phase = sampleTime * .58;
    const x = width * (.5 + Math.sin(phase) * .32);
    const y = height * (
      .49
      + Math.sin(phase * 1.46 + .62) * .17
      + Math.sin(phase * 3.12) * .035
    );
    const dx = width * .32 * .58 * Math.cos(phase);
    const dy = height * (
      .17 * 1.46 * .58 * Math.cos(phase * 1.46 + .62)
      + .035 * 3.12 * .58 * Math.cos(phase * 3.12)
    );
    const length = Math.hypot(dx, dy) || 1;
    return [x - dy / length * lane, y + dx / length * lane];
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.globalCompositeOperation = "source-over";

  // Quiet older strands follow the same curved gesture rather than a fixed endpoint.
  for (let strand = 0; strand < 23; strand++) {
    const lane = (rand() - .5) * height * .19;
    const strandHistory = historyLength * (.76 + rand() * .32);
    ctx.beginPath();
    for (let sample = 0; sample <= 42; sample++) {
      const progress = sample / 42;
      const sampleTime = motionTime - strandHistory * (1 - progress);
      const [x, y] = trailPoint(sampleTime, lane);
      if (sample === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(18,47,39,${.045 + rand() * .06})`;
    ctx.lineWidth = .8 + rand() * 2.4;
    ctx.stroke();
  }

  // Fine teal filaments brighten toward the moving front and fade into its history.
  ctx.globalCompositeOperation = "lighter";
  for (let strand = 0; strand < 19; strand++) {
    const lane = (rand() - .5) * height * .15;
    const strandHistory = historyLength * (.68 + rand() * .24);
    let previous = trailPoint(motionTime - strandHistory, lane);
    for (let sample = 1; sample <= 38; sample++) {
      const progress = sample / 38;
      const sampleTime = motionTime - strandHistory * (1 - progress);
      const current = trailPoint(sampleTime, lane);
      ctx.beginPath();
      ctx.moveTo(previous[0], previous[1]);
      ctx.lineTo(current[0], current[1]);
      ctx.strokeStyle = `rgba(101,215,196,${.018 + progress * progress * (.19 + rand() * .1)})`;
      ctx.lineWidth = rand() > .88 ? .95 : .3 + rand() * .42;
      ctx.stroke();
      previous = current;
    }
  }

  // Particles occupy recent positions along the same path, reinforcing direction.
  for (let particle = 0; particle < 54; particle++) {
    const age = rand() * historyLength;
    const lane = (rand() - .5) * height * .13;
    const [x, y] = trailPoint(motionTime - age, lane);
    const recency = 1 - age / historyLength;
    ctx.fillStyle = `rgba(101,215,196,${.06 + recency * (.18 + rand() * .35)})`;
    ctx.beginPath();
    ctx.arc(x, y, .35 + rand() * .7, 0, TAU);
    ctx.fill();
  }

  // A compact sparkling head marks the current position of the gesture.
  const [headX, headY] = trailPoint(motionTime);
  for (let i = 0; i < 34; i++) {
    const angle = rand() * TAU;
    const radius = rand() * Math.min(width, height) * .07;
    ctx.fillStyle = `rgba(101,215,196,${.2 + rand() * .48})`;
    ctx.beginPath();
    ctx.arc(headX + Math.cos(angle) * radius, headY + Math.sin(angle) * radius, .35 + rand() * .7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawField(canvas, time) {
    const { ctx, width, height } = fit(canvas);
    const type = canvas.dataset.field || "home";
    const compact = canvas.classList.contains("material-canvas");
    const seed = Number(canvas.dataset.seed || [...type].reduce((sum, c) => sum + c.charCodeAt(0), 11));
    const rand = mulberry32(seed);
    const persistentField = compact && type === "both-field" || !compact && type === "open";
    if (!persistentField) ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    if (!compact && type === "open") {
      drawOpenStageField(ctx, width, height, seed, canvas);
      return;
    }

    if (!compact && type === "both") {
      drawBothStageField(ctx, time, width, height, seed, canvas);
      return;
    }

    if (!compact && type === "trail") {
      drawTrailStageField(ctx, time, width, height, seed, canvas);
      return;
    }

    if (compact && type.startsWith("open-")) {
      drawOpenMaterial(ctx, type, time, width, height, seed);
      return;
    }

    if (compact && type.startsWith("both-")) {
      drawBothMaterial(ctx, type, time, width, height, seed, canvas);
      return;
    }

    if (compact && type === "trail-gesture") {
      drawTrailGesture(ctx, time, width, height, seed);
      return;
    }

    if (compact && (type === "trail-response" || type === "trail-sediment")) {
      drawTrailMaterial(ctx, type, time, width, height, seed);
      return;
    }

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
