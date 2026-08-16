(() => {
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

  function drawBothStageField(ctx, time, width, height, seed, canvas) {
    const rand = mulberry32(seed * 83 + 29);
    const amberOrbit = canvas.dataset.variant === "amber-orbit";
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
      if (amberOrbit) {
        contourGradient.addColorStop(0, `rgba(104,25,30,${lineAlpha * .68})`);
        contourGradient.addColorStop(.18, `rgba(168,66,35,${lineAlpha * .88})`);
        contourGradient.addColorStop(.5, `rgba(240,169,61,${lineAlpha * 1.3})`);
        contourGradient.addColorStop(.82, `rgba(168,66,35,${lineAlpha * .88})`);
        contourGradient.addColorStop(1, `rgba(104,25,30,${lineAlpha * .68})`);
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
      ctx.strokeStyle = amberOrbit
        ? `rgba(139,45,32,${.035 + gatherStrength * .07})`
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
      ctx.strokeStyle = amberOrbit
        ? `rgba(215,109,38,${bright * .15})`
        : frozenConstellation
          ? `rgba(168,155,186,${bright * .07})`
          : `rgba(101,215,196,${bright * .12})`;
      ctx.lineWidth = 2.4 + rand() * 1.3;
      ctx.beginPath();
      ctx.moveTo(previousX, previousY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.strokeStyle = amberOrbit
        ? `rgba(244,178,68,${bright})`
        : frozenConstellation
          ? `rgba(194,184,207,${bright * .58})`
          : `rgba(101,215,196,${bright})`;
      ctx.lineWidth = .35 + rand() * .65;
      ctx.beginPath();
      ctx.moveTo(previousX, previousY);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (particle % 11 === 0) {
        ctx.fillStyle = amberOrbit
          ? `rgba(255,218,125,${.32 + rand() * .5})`
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
      glow.addColorStop(0, amberOrbit ? "rgba(255,223,140,.62)" : frozenConstellation ? "rgba(220,212,228,.34)" : "rgba(232,225,216,.55)");
      glow.addColorStop(.16, amberOrbit ? "rgba(225,123,38,.34)" : frozenConstellation ? "rgba(151,139,171,.14)" : "rgba(101,215,196,.28)");
      glow.addColorStop(1, amberOrbit ? "rgba(118,28,30,0)" : frozenConstellation ? "rgba(105,96,121,0)" : "rgba(101,215,196,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, centreY, pulse * 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = amberOrbit ? "rgba(255,226,151,.88)" : frozenConstellation ? "rgba(216,208,224,.52)" : "rgba(232,225,216,.78)";
      ctx.beginPath();
      ctx.arc(x, centreY, 1.5, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawTrailStageField(ctx, time, width, height, seed, canvas) {
    const rand = mulberry32(seed * 71 + 53);
    const motionTime = reduceMotion ? 8.5 : time;
    const historyLength = 11.5;
    const inkSediment = canvas.dataset.variant === "ink-sediment";
    const electricDrift = canvas.dataset.variant === "electric-drift";

    if (inkSediment) {
      ctx.fillStyle = "#aeb0aa";
      ctx.fillRect(0, 0, width, height);
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
    const stagePalette = mineralArchive
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
