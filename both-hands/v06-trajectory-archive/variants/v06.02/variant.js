const CORRIDOR_PARAMS = new URLSearchParams(window.location.search);
const CORRIDOR_DEMO = CORRIDOR_PARAMS.has("demo");
const CORRIDOR_COMPLETE = CORRIDOR_PARAMS.has("complete");
const CORRIDOR_LIVE_DEMO = CORRIDOR_PARAMS.has("live");
const CORRIDOR_ANIMATE_DEMO = CORRIDOR_PARAMS.has("animate");
const CORRIDOR_SESSION_LENGTH = 10;
const CORRIDOR_COMPLETION_DELAY = 18;
const CORRIDOR_COMPLETION_DURATION = 330;
const CORRIDOR_PALETTE = {
  background: "#030509",
  farGlass: "#34485B",
  midGlass: "#647F98",
  bone: "#E3E3DC",
  ice: "#9FC5C7",
  smoke: "#67556F",
  farLight: "#C4D5D4"
};

let corridorDust = [];
let corridorReducedMotion = false;

setup = function () {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  randomSeed(60219);
  noiseSeed(60219);
  corridorReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  buildCorridorDust();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  if (CORRIDOR_DEMO) createCorridorDemo();
  else beginExperience();
};

draw = function () {
  drawCorridorBackground();

  currentInput = CORRIDOR_LIVE_DEMO
    ? { amount: 0.25, symmetry: 0.88, tilt: 0.08, midpointX: 0.65, midpointY: 0.72 }
    : getBreathInput();
  targetBreath = currentInput.amount;
  previousBreath = breath;
  breath = lerp(breath, targetBreath, 0.1);

  if (!showHelp && !sessionComplete && !CORRIDOR_DEMO) updateSessionCycle();
  if (sessionComplete) completionAge++;

  updateCorridorDepths();
  const active = getActiveCorridorMemories();
  drawCorridorRails(active);
  drawGlassLayers(active);
  drawCorridorPath(active);
  drawGlassDepthVeils(active);
  drawCorridorAfterimages(active);
  drawCorridorCompletionTrace(active);
  drawLiveCorridorCue();

  if (!showHelp) {
    cursor(ARROW);
    drawCorridorHands();
    drawCorridorFeedback(active.length);
  }

  savedFlash = max(0, savedFlash - 1);
  syncHelpOverlay();
};

function buildCorridorDust() {
  corridorDust = [];
  const count = floor(constrain(width * height / 11000, 55, 150));
  for (let i = 0; i < count; i++) {
    corridorDust.push({
      x: random(width),
      y: random(height),
      size: random(0.35, 1.6),
      alpha: random(5, 24),
      phase: random(TWO_PI)
    });
  }
}

function getCorridorVanishingPoint() {
  return { x: width * 0.5, y: height * 0.34 };
}

function drawCorridorBackground() {
  background(3, 5, 9);
  const ctx = drawingContext;
  const vanishing = getCorridorVanishingPoint();

  ctx.save();
  const farGlow = ctx.createRadialGradient(
    vanishing.x,
    vanishing.y,
    0,
    vanishing.x,
    vanishing.y,
    min(width, height) * 0.52
  );
  farGlow.addColorStop(0, "rgba(196,213,212,0.28)");
  farGlow.addColorStop(0.09, "rgba(100,127,152,0.16)");
  farGlow.addColorStop(0.38, "rgba(52,72,91,0.06)");
  farGlow.addColorStop(1, "rgba(3,5,9,0)");
  ctx.fillStyle = farGlow;
  ctx.fillRect(0, 0, width, height);

  const floorFade = ctx.createLinearGradient(0, vanishing.y, 0, height);
  floorFade.addColorStop(0, "rgba(100,127,152,0.02)");
  floorFade.addColorStop(1, "rgba(103,85,111,0.08)");
  ctx.fillStyle = floorFade;
  ctx.fillRect(0, vanishing.y, width, height - vanishing.y);
  ctx.restore();

  noStroke();
  for (const dust of corridorDust) {
    const pulse = sin(frameCount * 0.008 + dust.phase) * 0.5 + 0.5;
    fill(196, 213, 212, dust.alpha + pulse * 7);
    circle(dust.x, dust.y, dust.size);
  }

  drawingContext.save();
  drawingContext.shadowBlur = 28;
  drawingContext.shadowColor = "rgba(196,213,212,0.55)";
  noStroke();
  fill(196, 213, 212, 132);
  ellipse(vanishing.x, vanishing.y, 8, 3);
  drawingContext.restore();
}

addSessionMemory = function (record) {
  const quality = calculateQuality(record);
  const finalMidpoint = getCorridorFinalMidpoint(record);
  quality.anchorMidX = finalMidpoint.x;
  quality.anchorMidY = finalMidpoint.y;
  addCorridorMemory(quality, record.liveSeed, 0);
  sessionStep++;
  savedFlash = 105;

  if (sessionStep >= CORRIDOR_SESSION_LENGTH) {
    sessionComplete = true;
    completionAge = 0;
  }
};

function getCorridorFinalMidpoint(record) {
  const hasFinalHold = record.closeMidXValues.length >= CLOSE_HOLD_FRAMES;
  if (hasFinalHold) {
    return {
      x: medianValue(record.closeMidXValues),
      y: medianValue(record.closeMidYValues)
    };
  }
  const wideFrames = max(record.wideFrames, 1);
  return {
    x: record.wideFrames > 0 ? record.wideMidXSum / wideFrames : currentInput.midpointX,
    y: record.wideFrames > 0 ? record.wideMidYSum / wideFrames : currentInput.midpointY
  };
}

function mapCorridorMidpoint(midpointX, midpointY) {
  const spanX = min(width * 0.34, 470);
  const spanY = min(height * 0.3, 315);
  return {
    x: map(constrain(midpointX, 0.24, 0.76), 0.24, 0.76, -spanX, spanX),
    y: map(constrain(midpointY, 0.22, 0.78), 0.22, 0.78, -spanY, spanY)
  };
}

function addCorridorMemory(quality, seed, age) {
  const anchor = mapCorridorMidpoint(
    quality.anchorMidX ?? map(quality.horizontalPosition, -1, 1, 0.24, 0.76),
    quality.anchorMidY ?? map(quality.verticalPosition, -1, 1, 0.22, 0.78)
  );

  memories.push({
    step: sessionStep,
    seed,
    age,
    depth: 0,
    targetDepth: 0,
    corridorX: anchor.x,
    corridorY: anchor.y,
    anchorSize: lerp(5.2, 11.5, quality.pause),
    paneBrightness: lerp(0.34, 1, quality.pause),
    clarity: quality.steadiness,
    quality
  });
}

// Every glass layer exposes the same full positioning field. Chronology now
// changes depth only; it no longer shrinks the available anchor coordinates.
getAnchorPoint = function (memory) {
  return { x: memory.corridorX, y: memory.corridorY };
};

function getActiveCorridorMemories() {
  return memories.filter((memory) => memory.age >= 0);
}

function updateCorridorDepths() {
  for (const memory of memories) memory.age++;
  const active = getActiveCorridorMemories();

  for (let i = 0; i < active.length; i++) {
    const memory = active[i];
    memory.targetDepth = active.length - 1 - i;
    const easing = corridorReducedMotion || CORRIDOR_COMPLETE ? 1 : 0.018;
    memory.depth = lerp(memory.depth, memory.targetDepth, easing);
  }
}

function getCorridorDepthT(memory) {
  return constrain(memory.depth / max(CORRIDOR_SESSION_LENGTH - 1, 1), 0, 1);
}

function getCorridorPlane(memory) {
  const depthT = getCorridorDepthT(memory);
  const vanishing = getCorridorVanishingPoint();
  // Evenly spaced perspective stages keep the middle anchors from collapsing
  // into one flat cluster while preserving a small, distant terminal plane.
  const perspectiveT = pow(depthT, 0.78);
  const scale = lerp(1, 0.14, perspectiveT);
  const centerX = lerp(width * 0.5, vanishing.x, depthT);
  const centerY = lerp(height * 0.5 + 20, vanishing.y, pow(depthT, 0.86));
  const planeWidth = min(width * 0.82, 1080) * scale;
  const planeHeight = min(height * 0.62, 650) * scale;
  const skew = planeWidth * 0.035 * (1 - depthT);
  return {
    depthT,
    scale,
    centerX,
    centerY,
    width: planeWidth,
    height: planeHeight,
    corners: [
      { x: centerX - planeWidth * 0.5 + skew, y: centerY - planeHeight * 0.5 },
      { x: centerX + planeWidth * 0.5 + skew, y: centerY - planeHeight * 0.5 },
      { x: centerX + planeWidth * 0.5 - skew, y: centerY + planeHeight * 0.5 },
      { x: centerX - planeWidth * 0.5 - skew, y: centerY + planeHeight * 0.5 }
    ]
  };
}

function getFrontCorridorPlane() {
  return getCorridorPlane({ depth: 0 });
}

function projectCorridorAnchor(memory) {
  const plane = getCorridorPlane(memory);
  const local = getAnchorPoint(memory);
  return {
    x: plane.centerX + local.x * plane.scale,
    y: plane.centerY + local.y * plane.scale,
    scale: plane.scale,
    depthT: plane.depthT
  };
}

function drawCorridorRails(active) {
  if (active.length === 0) return;
  const ordered = [...active].sort((a, b) => b.depth - a.depth);

  noFill();
  for (let i = 1; i < ordered.length; i++) {
    const farPlane = getCorridorPlane(ordered[i - 1]);
    const nearPlane = getCorridorPlane(ordered[i]);
    const alpha = lerp(19, 7, farPlane.depthT);
    stroke(100, 127, 152, alpha);
    strokeWeight(0.55);
    for (let c = 0; c < 4; c++) {
      line(
        farPlane.corners[c].x,
        farPlane.corners[c].y,
        nearPlane.corners[c].x,
        nearPlane.corners[c].y
      );
    }
  }
}

function drawGlassLayers(active) {
  const ordered = [...active].sort((a, b) => b.depth - a.depth);
  for (const memory of ordered) drawGlassPane(memory);
}

function drawGlassPane(memory) {
  const plane = getCorridorPlane(memory);
  const depthFade = lerp(1, 0.28, plane.depthT);
  const brightness = memory.paneBrightness * depthFade;
  const ctx = drawingContext;

  ctx.save();
  pathCorridorQuad(ctx, plane.corners, 3, 5);
  ctx.fillStyle = `rgba(103,85,111,${0.018 + brightness * 0.022})`;
  ctx.fill();

  pathCorridorQuad(ctx, plane.corners, 0, 0);
  const glassGradient = ctx.createLinearGradient(
    plane.corners[0].x,
    plane.corners[0].y,
    plane.corners[2].x,
    plane.corners[2].y
  );
  glassGradient.addColorStop(0, `rgba(159,197,199,${0.025 + brightness * 0.075})`);
  glassGradient.addColorStop(0.46, `rgba(100,127,152,${0.018 + brightness * 0.045})`);
  glassGradient.addColorStop(1, `rgba(52,72,91,${0.035 + brightness * 0.07})`);
  ctx.fillStyle = glassGradient;
  ctx.fill();
  ctx.strokeStyle = `rgba(159,197,199,${0.12 + brightness * 0.26})`;
  ctx.lineWidth = 0.55 + plane.scale * 0.55;
  ctx.stroke();
  ctx.restore();

  const glintY = lerp(plane.corners[0].y, plane.corners[3].y, 0.18 + noise(memory.seed) * 0.58);
  stroke(196, 213, 212, 8 + brightness * 24);
  strokeWeight(max(0.35, plane.scale * 0.7));
  line(
    lerp(plane.corners[0].x, plane.corners[1].x, 0.12),
    glintY,
    lerp(plane.corners[0].x, plane.corners[1].x, 0.88),
    glintY
  );
}

function pathCorridorQuad(ctx, corners, ox, oy) {
  ctx.beginPath();
  ctx.moveTo(corners[0].x + ox, corners[0].y + oy);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x + ox, corners[i].y + oy);
  ctx.closePath();
}

function drawCorridorPath(active) {
  if (active.length < 2) return;
  const ordered = [...active].sort((a, b) => a.step - b.step);

  if (sessionComplete) {
    for (let i = 1; i < ordered.length; i++) {
      drawTaperedCorridorSegment(
        projectCorridorAnchor(ordered[i - 1]),
        projectCorridorAnchor(ordered[i]),
        false,
        0.14
      );
    }
    return;
  }

  for (let i = 1; i < ordered.length; i++) {
    const previous = projectCorridorAnchor(ordered[i - 1]);
    const memory = ordered[i];
    const current = projectCorridorAnchor(memory);
    const reveal = easeOutCubic(constrain(memory.age / 82, 0, 1));
    const endX = lerp(previous.x, current.x, reveal);
    const endY = lerp(previous.y, current.y, reveal);
    const endScale = lerp(previous.scale, current.scale, reveal);
    const endDepthT = lerp(previous.depthT, current.depthT, reveal);
    const newest = i === ordered.length - 1;

    drawTaperedCorridorSegment(
      previous,
      { x: endX, y: endY, scale: endScale, depthT: endDepthT },
      newest
    );
  }
}

function drawTaperedCorridorSegment(start, end, newest, intensity = 1, glowBoost = 1) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = max(1, sqrt(dx * dx + dy * dy));
  const nx = -dy / length;
  const ny = dx / length;
  const startWidth = 0.55 + start.scale * 1.55;
  const endWidth = 0.55 + end.scale * 1.55;
  const startAlpha = lerp(0.2, newest ? 0.9 : 0.62, 1 - start.depthT) * intensity;
  const endAlpha = lerp(0.2, newest ? 0.9 : 0.62, 1 - end.depthT) * intensity;
  const ctx = drawingContext;

  ctx.save();
  ctx.shadowBlur = (newest ? 15 : 7) * glowBoost;
  ctx.shadowColor = "rgba(159,197,199,0.38)";

  const shadowGradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  shadowGradient.addColorStop(0, `rgba(103,85,111,${startAlpha * 0.42})`);
  shadowGradient.addColorStop(1, `rgba(103,85,111,${endAlpha * 0.42})`);
  ctx.fillStyle = shadowGradient;
  pathTaperedSegment(ctx, start, end, nx, ny, startWidth * 2.6, endWidth * 2.6, 2.2, 3.1);
  ctx.fill();

  const iceGradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  iceGradient.addColorStop(0, `rgba(159,197,199,${startAlpha})`);
  iceGradient.addColorStop(1, `rgba(159,197,199,${endAlpha})`);
  ctx.fillStyle = iceGradient;
  pathTaperedSegment(ctx, start, end, nx, ny, startWidth, endWidth, 0, 0);
  ctx.fill();
  ctx.restore();
}

function getCorridorCompletionProgress() {
  if (!sessionComplete) return 0;
  if (corridorReducedMotion) return 1;
  const raw = constrain(
    (completionAge - CORRIDOR_COMPLETION_DELAY) / CORRIDOR_COMPLETION_DURATION,
    0,
    1
  );
  return -(cos(PI * raw) - 1) * 0.5;
}

function drawCorridorCompletionTrace(active) {
  if (!sessionComplete || active.length < 2) return;
  const ordered = [...active].sort((a, b) => a.step - b.step);
  const traceProgress = getCorridorCompletionProgress();
  const travel = traceProgress * (ordered.length - 1);

  for (let i = 1; i < ordered.length; i++) {
    const segmentProgress = constrain(travel - (i - 1), 0, 1);
    if (segmentProgress <= 0) break;
    const previous = projectCorridorAnchor(ordered[i - 1]);
    const current = projectCorridorAnchor(ordered[i]);
    drawTaperedCorridorSegment(
      previous,
      {
        x: lerp(previous.x, current.x, segmentProgress),
        y: lerp(previous.y, current.y, segmentProgress),
        scale: lerp(previous.scale, current.scale, segmentProgress),
        depthT: lerp(previous.depthT, current.depthT, segmentProgress)
      },
      true,
      1,
      1.55
    );
  }

  const arrivalWindow = 0.085;
  for (let i = 0; i < ordered.length; i++) {
    const arrival = i / max(ordered.length - 1, 1);
    if (traceProgress < arrival) break;
    const anchor = projectCorridorAnchor(ordered[i]);
    const arrivalAge = traceProgress - arrival;
    const pulse = constrain(1 - arrivalAge / arrivalWindow, 0, 1);
    const depthFade = lerp(1, 0.32, anchor.depthT);

    drawingContext.save();
    drawingContext.shadowBlur = 10 + pulse * 24;
    drawingContext.shadowColor = `rgba(196,213,212,${0.42 + pulse * 0.48})`;
    noStroke();
    fill(227, 227, 220, (72 + pulse * 170) * depthFade);
    circle(anchor.x, anchor.y, max(3.2, anchor.scale * (5 + pulse * 5.5)));
    noFill();
    stroke(159, 197, 199, (80 + pulse * 150) * depthFade);
    strokeWeight(max(0.55, anchor.scale * 1.15));
    circle(anchor.x, anchor.y, max(8, anchor.scale * (13 + pulse * 14)));
    drawingContext.restore();
  }
}

function pathTaperedSegment(ctx, start, end, nx, ny, startWidth, endWidth, ox, oy) {
  ctx.beginPath();
  ctx.moveTo(start.x + nx * startWidth + ox, start.y + ny * startWidth + oy);
  ctx.lineTo(end.x + nx * endWidth + ox, end.y + ny * endWidth + oy);
  ctx.lineTo(end.x - nx * endWidth + ox, end.y - ny * endWidth + oy);
  ctx.lineTo(start.x - nx * startWidth + ox, start.y - ny * startWidth + oy);
  ctx.closePath();
}

function drawGlassDepthVeils(active) {
  const ordered = [...active].sort((a, b) => b.depth - a.depth);
  const ctx = drawingContext;
  for (const memory of ordered) {
    const plane = getCorridorPlane(memory);
    const nearPresence = 1 - plane.depthT;
    ctx.save();
    pathCorridorQuad(ctx, plane.corners, 0, 0);
    ctx.fillStyle = `rgba(52,72,91,${0.006 + nearPresence * 0.012})`;
    ctx.fill();
    ctx.restore();
  }
}

function drawCorridorAfterimages(active) {
  const ordered = [...active].sort((a, b) => b.depth - a.depth);
  for (const memory of ordered) drawCorridorAnchor(memory);
}

function drawCorridorAnchor(memory) {
  const anchor = projectCorridorAnchor(memory);
  const clarity = memory.clarity;
  const depthFade = lerp(1, 0.2, anchor.depthT);
  const afterimageDepthFade = lerp(1, 0.48, anchor.depthT);
  const copies = floor(lerp(8, 2, clarity));
  const spread = lerp(34, 4, clarity) * lerp(1, 0.62, anchor.depthT);
  const blur = lerp(8, 0.35, clarity);
  const vanishing = getCorridorVanishingPoint();
  const towardX = vanishing.x - anchor.x;
  const towardY = vanishing.y - anchor.y;
  const towardLength = max(1, sqrt(towardX * towardX + towardY * towardY));
  const depthX = towardX / towardLength;
  const depthY = towardY / towardLength;
  const sideX = -depthY;
  const sideY = depthX;

  for (let i = copies; i >= 1; i--) {
    const t = i / max(copies, 1);
    const sideNoise = sin(memory.seed * 0.021 + i * 2.07);
    const retreat = (12 + towardLength * 0.075) * t;
    const lateral = sideNoise * spread * t * (1 - clarity * 0.72);
    const ox = depthX * retreat + sideX * lateral;
    const oy = depthY * retreat + sideY * lateral;
    drawingContext.save();
    drawingContext.filter = `blur(${blur * t}px)`;
    noStroke();
    const afterimageAlpha =
      (30 + (1 - clarity) * 54) * afterimageDepthFade * (1 - t * 0.46);
    fill(103, 85, 111, afterimageAlpha);
    circle(anchor.x + ox, anchor.y + oy, memory.anchorSize * anchor.scale * (1.5 + t * 0.62));
    noFill();
    stroke(159, 197, 199, afterimageAlpha * 0.34);
    strokeWeight(max(0.35, anchor.scale * 0.55));
    circle(anchor.x + ox, anchor.y + oy, memory.anchorSize * anchor.scale * (1.7 + t * 0.7));
    drawingContext.restore();
  }

  const newestLight = lerp(1, 0.24, anchor.depthT);
  const pulse = sin(frameCount * 0.022 + memory.seed) * 0.5 + 0.5;
  drawingContext.save();
  drawingContext.shadowBlur = (8 + newestLight * 18) * anchor.scale;
  drawingContext.shadowColor = "rgba(196,213,212,0.62)";
  noFill();
  stroke(159, 197, 199, (45 + newestLight * 110) * depthFade);
  strokeWeight(max(0.45, anchor.scale * 0.8));
  circle(anchor.x, anchor.y, memory.anchorSize * anchor.scale * 2.25 + pulse * 3);
  noStroke();
  fill(227, 227, 220, (72 + newestLight * 180) * depthFade);
  circle(anchor.x, anchor.y, memory.anchorSize * anchor.scale * 1.05 + pulse * 1.2);
  drawingContext.restore();
}

function buildLiveCorridorMemory(record) {
  const sampleFrames = max(record.sampleFrames, 1);
  const movingFrames = max(record.movingFrames, 1);
  const meanDelta = record.deltaSum / movingFrames;
  const slowness = 1 - constrain(map(meanDelta, 0.006, 0.045, 0, 1), 0, 1);
  const midX = record.closeMidXValues.length > 0
    ? medianValue(record.closeMidXValues)
    : currentInput.midpointX;
  const midY = record.closeMidYValues.length > 0
    ? medianValue(record.closeMidYValues)
    : currentInput.midpointY;
  const tilt = constrain(record.tiltSum / sampleFrames, -1, 1);
  const anchor = mapCorridorMidpoint(midX, midY);
  return {
    depth: 0,
    corridorX: anchor.x,
    corridorY: anchor.y,
    rotation: tilt * 0.18,
    anchorScale: lerp(0.76, 1.08, slowness)
  };
}

function drawLiveCorridorCue() {
  if (!cycle || sessionComplete) return;
  const plane = getFrontCorridorPlane();
  const reveal = cycle.opened ? 1 : cycle.liveProgress;
  const revealProgress = constrain(reveal, 0, 1);
  const panelLight = pow(revealProgress, 1.65);
  const rimLight = pow(revealProgress, 1.3);
  const shimmer = 0.92 + sin(frameCount * 0.045) * 0.08;

  noStroke();
  fill(100, 127, 152, 1 + panelLight * 20);
  drawCorridorQuadShape(plane.corners);

  // The glass surface appears first as a slow exposure. Its ice-blue edge then
  // grows around the pane and only reaches the stronger glow near completion.
  noFill();
  drawingContext.save();
  drawingContext.shadowBlur = rimLight * 34;
  drawingContext.shadowColor = `rgba(159,197,199,${rimLight * 0.76})`;
  stroke(159, 197, 199, rimLight * 190 * shimmer);
  strokeWeight(0.7 + rimLight * 1.3);
  drawCorridorQuadOutline(plane.corners, reveal);
  drawingContext.restore();

  stroke(196, 213, 212, rimLight * 230 * shimmer);
  strokeWeight(0.45 + rimLight * 0.7);
  drawCorridorQuadOutline(plane.corners, reveal);

  if (!cycle.opened) return;
  const liveMemory = buildLiveCorridorMemory(cycle);
  const anchor = projectCorridorAnchor(liveMemory);
  const holdProgress = constrain(cycle.closeHoldFrames / CLOSE_HOLD_FRAMES, 0, 1);
  const progress = breath < 0.34 ? holdProgress : 1;

  drawingContext.save();
  drawingContext.shadowBlur = 18;
  drawingContext.shadowColor = "rgba(196,213,212,0.55)";
  noStroke();
  fill(227, 227, 220, 218);
  circle(anchor.x, anchor.y, 8);
  noFill();
  stroke(159, 197, 199, 210);
  strokeWeight(1.8);
  arc(anchor.x, anchor.y, 30, 30, -HALF_PI, -HALF_PI + TWO_PI * progress);
  stroke(159, 197, 199, 86);
  strokeWeight(0.7);
  line(anchor.x - 20, anchor.y, anchor.x - 11, anchor.y);
  line(anchor.x + 11, anchor.y, anchor.x + 20, anchor.y);
  line(anchor.x, anchor.y - 20, anchor.x, anchor.y - 11);
  line(anchor.x, anchor.y + 11, anchor.x, anchor.y + 20);
  drawingContext.restore();
}

function drawCorridorQuadShape(corners) {
  beginShape();
  for (const corner of corners) vertex(corner.x, corner.y);
  endShape(CLOSE);
}

function drawCorridorQuadOutline(corners, progress) {
  const lengths = [];
  let total = 0;
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    const len = dist(corners[i].x, corners[i].y, corners[next].x, corners[next].y);
    lengths.push(len);
    total += len;
  }
  let remaining = total * constrain(progress, 0, 1);
  for (let i = 0; i < 4 && remaining > 0; i++) {
    const next = (i + 1) % 4;
    const amount = constrain(remaining / lengths[i], 0, 1);
    line(
      corners[i].x,
      corners[i].y,
      lerp(corners[i].x, corners[next].x, amount),
      lerp(corners[i].y, corners[next].y, amount)
    );
    remaining -= lengths[i];
  }
}

function drawCorridorHands() {
  if (handDisplayMode === 0) return;
  for (const hand of hands) {
    const points = hand.keypoints;
    if (handDisplayMode === 2) {
      stroke(159, 197, 199, 62);
      strokeWeight(0.75);
      for (const [a, b] of HAND_CONNECTIONS) line(points[a].x, points[a].y, points[b].x, points[b].y);
    }
    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);
    noStroke();
    fill(227, 227, 220, 145);
    for (const index of visible) circle(points[index].x, points[index].y, handDisplayMode === 1 ? 7 : 3.4);
  }
}

function drawCorridorFeedback(activeCount) {
  if (CORRIDOR_DEMO && !CORRIDOR_LIVE_DEMO && activeCount < CORRIDOR_SESSION_LENGTH) {
    drawCorridorStatus(`LAYER ${activeCount} OF ${CORRIDOR_SESSION_LENGTH} · OLDER GLASS RECEDING`, activeCount / CORRIDOR_SESSION_LENGTH);
    return;
  }
  if (sessionComplete) {
    const traceProgress = getCorridorCompletionProgress();
    if (traceProgress < 1) {
      const reachedAnchor = min(
        CORRIDOR_SESSION_LENGTH,
        1 + floor(traceProgress * (CORRIDOR_SESSION_LENGTH - 1))
      );
      drawCorridorStatus(
        `RECALLING ANCHORS 01—${String(reachedAnchor).padStart(2, "0")}`,
        traceProgress
      );
    } else {
      drawCorridorStatus("AFTERIMAGE CORRIDOR COMPLETE — R TO BEGIN AGAIN", 1);
    }
    return;
  }

  let instruction = `ANCHOR ${min(sessionStep + 1, CORRIDOR_SESSION_LENGTH)} OF ${CORRIDOR_SESSION_LENGTH}`;
  let progress = sessionStep / CORRIDOR_SESSION_LENGTH;
  if (cycle) {
    if (!cycle.opened) {
      progress = cycle.liveProgress;
      const percent = floor(cycle.liveProgress * 100);
      instruction += breath > OPEN_EXTENT_THRESHOLD - 0.07 ? ` · HOLD FRONT PANE ${percent}%` : ` · OPEN WIDER ${percent}%`;
    } else if (breath > 0.65) {
      instruction += " · PANE COMPLETE — RETURN SLOWLY";
    } else if (breath < 0.34) {
      progress = constrain(cycle.closeHoldFrames / CLOSE_HOLD_FRAMES, 0, 1);
      instruction += ` · HOLD ANCHOR ${floor(progress * 100)}%`;
    } else {
      instruction += " · RETURN SLOWLY";
    }
  } else if (savedFlash > 0) {
    instruction = `ANCHOR ${sessionStep} RECORDED · OLDER GLASS RECEDING`;
  } else {
    instruction += " · BRING HANDS TOGETHER";
  }
  drawCorridorStatus(instruction, progress);
}

function drawCorridorStatus(label, progress) {
  const barWidth = min(420, width - 100);
  const y = height - 38;
  textAlign(CENTER, CENTER);
  noStroke();
  fill(227, 227, 220, 215);
  textSize(10);
  text(label, width * 0.5, y - 16);
  stroke(100, 127, 152, 45);
  strokeWeight(1);
  line(width * 0.5 - barWidth * 0.5, y, width * 0.5 + barWidth * 0.5, y);
  stroke(159, 197, 199, 205);
  strokeWeight(1.4);
  line(width * 0.5 - barWidth * 0.5, y, width * 0.5 - barWidth * 0.5 + barWidth * progress, y);
}

function createCorridorDemo() {
  const directions = [
    [-0.76, -0.34], [0.58, -0.68], [0.82, 0.04], [-0.38, 0.76],
    [-0.72, 0.26], [0.12, -0.54], [0.66, 0.58], [-0.12, 0.16],
    [0.48, 0.72], [-0.46, 0.9]
  ];
  const demoLength = CORRIDOR_LIVE_DEMO ? 3 : CORRIDOR_SESSION_LENGTH;
  for (let i = 0; i < demoLength; i++) {
    const [horizontalPosition, verticalPosition] = directions[i];
    const quality = {
      horizontalPosition,
      verticalPosition,
      slowness: [0.82, 0.64, 0.9, 0.71, 0.79, 0.58, 0.88, 0.74, 0.68, 0.86][i],
      steadiness: [0.94, 0.42, 0.8, 0.3, 0.87, 0.56, 0.72, 0.92, 0.48, 0.84][i],
      pause: [0.22, 0.78, 0.46, 0.9, 0.16, 0.62, 0.34, 0.74, 0.52, 0.28][i],
      balance: [0.9, 0.78, 0.96, 0.72, 0.88, 0.82, 0.92, 0.86, 0.76, 0.94][i],
      tilt: [-0.16, 0.2, -0.08, 0.28, -0.22, 0.12, -0.1, 0.06, 0.18, -0.12][i],
      duration: 0.7,
      coherence: 0.76
    };
    const age = CORRIDOR_COMPLETE || CORRIDOR_LIVE_DEMO ? 420 : -i * 58;
    addCorridorMemory(quality, 720 + i * 81.4, age);
    sessionStep++;
  }

  if (CORRIDOR_COMPLETE) {
    for (let i = 0; i < memories.length; i++) {
      memories[i].targetDepth = memories.length - 1 - i;
      memories[i].depth = memories[i].targetDepth;
    }
    sessionComplete = true;
    completionAge = CORRIDOR_ANIMATE_DEMO ? 0 : 500;
    return;
  }

  if (CORRIDOR_LIVE_DEMO) {
    for (let i = 0; i < memories.length; i++) memories[i].depth = memories.length - 1 - i;
    cycle = {
      maxBreath: 0.92,
      opened: true,
      movingFrames: 56,
      sampleFrames: 98,
      deltaSum: 0.5,
      deltaSquaredSum: 0.0046,
      symmetrySum: 86,
      tiltSum: 8,
      pauseFrames: 34,
      wideMidXSum: 35,
      wideMidYSum: 38.88,
      wideFrames: 54,
      closeMidXValues: [0.64, 0.65, 0.65, 0.66, 0.65, 0.64],
      closeMidYValues: [0.71, 0.72, 0.72, 0.73, 0.72, 0.72],
      closeHoldFrames: 6,
      liveSeed: 1182.6,
      liveProgress: 1
    };
    breath = 0.25;
    sessionComplete = false;
    return;
  }

  sessionComplete = true;
};

resetSession = function () {
  memories = [];
  sessionStep = 0;
  sessionComplete = false;
  completionAge = 0;
  cycle = null;
  readyForCycle = true;
  savedFlash = 0;
  if (CORRIDOR_DEMO) createCorridorDemo();
};

windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
  buildCorridorDust();
  resetSession();
};
