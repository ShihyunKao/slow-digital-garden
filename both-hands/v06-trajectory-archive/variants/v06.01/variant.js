const CERAMIC_DEMO = new URLSearchParams(window.location.search).has("demo");
const CERAMIC_COMPLETE = new URLSearchParams(window.location.search).has("complete");
const CERAMIC_LIVE_DEMO = new URLSearchParams(window.location.search).has("live");
const CERAMIC_PALETTE = {
  clay: "#B7A48D",
  mud: "#766554",
  crack: "#362E29",
  glaze: "#2D6762",
  glazeLight: "#A8C3B8",
  kiln: "#914B35",
  bone: "#E4D1B4"
};

let ceramicLayer;
let ceramicEdge = [];
let ceramicBounds;

setup = function () {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  randomSeed(60124);
  noiseSeed(60124);
  buildCeramicSurface();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  if (CERAMIC_DEMO) createCeramicDemo();
  else beginExperience();
};

draw = function () {
  drawCeramicSurface();

  currentInput = CERAMIC_LIVE_DEMO
    ? { amount: 0.64, symmetry: 0.84, tilt: 0.12, midpointX: 0.7, midpointY: 0.54 }
    : getBreathInput();
  targetBreath = currentInput.amount;
  previousBreath = breath;
  breath = lerp(breath, targetBreath, 0.1);

  if (!showHelp && !sessionComplete && !CERAMIC_DEMO) updateSessionCycle();
  if (sessionComplete) completionAge++;

  drawCeramicArchive();
  drawLiveCeramicCue();

  if (!showHelp) {
    cursor(ARROW);
    drawCeramicHandDisplay();
    drawCeramicFeedback();
  }

  savedFlash = max(0, savedFlash - 1);
  syncHelpOverlay();
};

function buildCeramicSurface() {
  ceramicBounds = {
    x: max(34, width * 0.065),
    y: max(76, height * 0.105),
    w: width - max(68, width * 0.13),
    h: height - max(164, height * 0.205)
  };
  ceramicEdge = buildSlabEdge(ceramicBounds);
  ceramicLayer = createGraphics(width, height);
  ceramicLayer.pixelDensity(1);

  const g = ceramicLayer;
  g.clear();
  const ctx = g.drawingContext;
  ctx.save();
  tracePolygon(ctx, ceramicEdge, 0, 0);
  ctx.clip();

  const clayLight = ctx.createLinearGradient(
    ceramicBounds.x,
    ceramicBounds.y,
    ceramicBounds.x + ceramicBounds.w,
    ceramicBounds.y + ceramicBounds.h
  );
  clayLight.addColorStop(0, "#d0bda3");
  clayLight.addColorStop(0.22, CERAMIC_PALETTE.clay);
  clayLight.addColorStop(0.72, "#a18e77");
  clayLight.addColorStop(1, CERAMIC_PALETTE.mud);
  ctx.fillStyle = clayLight;
  ctx.fillRect(ceramicBounds.x, ceramicBounds.y, ceramicBounds.w, ceramicBounds.h);

  g.noStroke();
  const grainCount = floor(constrain(width * height / 1150, 520, 1450));
  for (let i = 0; i < grainCount; i++) {
    const x = random(ceramicBounds.x, ceramicBounds.x + ceramicBounds.w);
    const y = random(ceramicBounds.y, ceramicBounds.y + ceramicBounds.h);
    const n = noise(x * 0.018, y * 0.018);
    if (n > 0.57) g.fill(228, 209, 180, random(3, 13));
    else g.fill(71, 58, 48, random(3, 11));
    g.ellipse(x, y, random(0.45, 2.2), random(0.35, 1.35));
  }

  // Low relief catches the raking light without reading as another path.
  for (let i = 0; i < 74; i++) {
    const x = random(ceramicBounds.x, ceramicBounds.x + ceramicBounds.w);
    const y = random(ceramicBounds.y, ceramicBounds.y + ceramicBounds.h);
    const len = random(9, 58);
    const turn = random(-0.18, 0.32);
    g.noFill();
    g.stroke(228, 209, 180, random(7, 19));
    g.strokeWeight(random(0.35, 0.9));
    g.arc(x - 1.2, y - 1.1, len, len * random(0.12, 0.3), PI + turn, TWO_PI + turn);
    g.stroke(74, 60, 49, random(5, 14));
    g.arc(x + 1.1, y + 1.2, len, len * random(0.12, 0.3), turn, PI + turn);
  }

  // Small rust-red firing traces sit inside the body of the clay.
  for (let i = 0; i < 12; i++) {
    const x = random(ceramicBounds.x + 30, ceramicBounds.x + ceramicBounds.w - 30);
    const y = random(ceramicBounds.y + 24, ceramicBounds.y + ceramicBounds.h - 24);
    const rw = random(18, 92);
    const rh = random(4, 16);
    const kiln = ctx.createRadialGradient(x, y, 0, x, y, rw * 0.55);
    kiln.addColorStop(0, `rgba(145,75,53,${random(0.09, 0.2)})`);
    kiln.addColorStop(0.48, `rgba(145,75,53,${random(0.035, 0.09)})`);
    kiln.addColorStop(1, "rgba(145,75,53,0)");
    ctx.fillStyle = kiln;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random(-0.8, 0.8));
    ctx.scale(1, rh / rw);
    ctx.beginPath();
    ctx.arc(0, 0, rw, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  const rake = ctx.createLinearGradient(
    ceramicBounds.x,
    ceramicBounds.y,
    ceramicBounds.x + ceramicBounds.w * 0.8,
    ceramicBounds.y + ceramicBounds.h
  );
  rake.addColorStop(0, "rgba(228,209,180,0.19)");
  rake.addColorStop(0.38, "rgba(228,209,180,0.035)");
  rake.addColorStop(1, "rgba(54,46,41,0.19)");
  ctx.fillStyle = rake;
  ctx.fillRect(ceramicBounds.x, ceramicBounds.y, ceramicBounds.w, ceramicBounds.h);
  ctx.restore();

  // A thin, irregular rim gives the surface physical thickness.
  ctx.save();
  tracePolygon(ctx, ceramicEdge, 0, 0);
  ctx.strokeStyle = "rgba(54,46,41,0.44)";
  ctx.lineWidth = 1.15;
  ctx.stroke();
  tracePolygon(ctx, ceramicEdge, -1.1, -1.1);
  ctx.strokeStyle = "rgba(228,209,180,0.34)";
  ctx.lineWidth = 0.75;
  ctx.stroke();
  ctx.restore();
}

function buildSlabEdge(bounds) {
  const points = [];
  const divisions = 18;
  const jitter = min(7, min(width, height) * 0.008);
  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    points.push({ x: bounds.x + bounds.w * t, y: bounds.y + map(noise(10 + i * 0.31), 0, 1, -jitter, jitter) });
  }
  for (let i = 1; i <= divisions; i++) {
    const t = i / divisions;
    points.push({ x: bounds.x + bounds.w + map(noise(20 + i * 0.31), 0, 1, -jitter, jitter), y: bounds.y + bounds.h * t });
  }
  for (let i = 1; i <= divisions; i++) {
    const t = i / divisions;
    points.push({ x: bounds.x + bounds.w * (1 - t), y: bounds.y + bounds.h + map(noise(30 + i * 0.31), 0, 1, -jitter, jitter) });
  }
  for (let i = 1; i < divisions; i++) {
    const t = i / divisions;
    points.push({ x: bounds.x + map(noise(40 + i * 0.31), 0, 1, -jitter, jitter), y: bounds.y + bounds.h * (1 - t) });
  }
  return points;
}

function tracePolygon(ctx, points, offsetX, offsetY) {
  ctx.beginPath();
  ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x + offsetX, points[i].y + offsetY);
  ctx.closePath();
}

function drawCeramicSurface() {
  background(82, 70, 58);
  const ctx = drawingContext;
  const backdrop = ctx.createRadialGradient(width * 0.24, height * 0.16, 0, width * 0.5, height * 0.5, max(width, height));
  backdrop.addColorStop(0, "rgba(228,209,180,0.12)");
  backdrop.addColorStop(0.5, "rgba(118,101,84,0.06)");
  backdrop.addColorStop(1, "rgba(54,46,41,0.36)");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = "rgba(39,30,24,0.56)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetX = 14;
  ctx.shadowOffsetY = 19;
  tracePolygon(ctx, ceramicEdge, 0, 0);
  ctx.fillStyle = CERAMIC_PALETTE.mud;
  ctx.fill();
  ctx.restore();
  image(ceramicLayer, 0, 0);
}

addSessionMemory = function (record) {
  const quality = calculateQuality(record);
  const finalPoint = getFinalCeramicMidpoint(record);
  quality.anchorMidX = finalPoint.x;
  quality.anchorMidY = finalPoint.y;
  addCeramicMemory(quality, record.liveSeed, 0);
  sessionStep++;
  savedFlash = 110;

  if (sessionStep >= SESSION_LENGTH) {
    sessionComplete = true;
    completionAge = 0;
  }
};

function getFinalCeramicMidpoint(record) {
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

function addCeramicMemory(quality, seed, age) {
  const mappedAnchor = mapCeramicAnchor(
    quality.anchorMidX ?? map(quality.horizontalPosition, -1, 1, 0.18, 0.82),
    quality.anchorMidY ?? map(quality.verticalPosition, -1, 1, 0.18, 0.82)
  );

  const memory = {
    step: sessionStep,
    seed,
    age,
    anchorX: mappedAnchor.x,
    anchorY: mappedAnchor.y,
    rotation: quality.tilt * 0.18,
    glazeSize: lerp(10, 27, quality.pause),
    growFrames: floor(lerp(132, 82, quality.steadiness)),
    quality,
    crack: null
  };

  if (memories.length > 0) {
    const previous = getAnchorPoint(memories[memories.length - 1]);
    const current = getAnchorPoint(memory);
    memory.crack = buildFault(previous, current, memory);
  }

  memories.push(memory);
}

function mapCeramicAnchor(midpointX, midpointY) {
  const cx = width * 0.5;
  const cy = height * 0.5 + 20;
  const insetX = max(54, ceramicBounds.w * 0.065);
  const insetTop = max(48, ceramicBounds.h * 0.09);
  const insetBottom = max(72, ceramicBounds.h * 0.13);
  const x = map(
    constrain(midpointX, 0.08, 0.92),
    0.08,
    0.92,
    ceramicBounds.x + insetX,
    ceramicBounds.x + ceramicBounds.w - insetX
  );
  const y = map(
    constrain(midpointY, 0.08, 0.92),
    0.08,
    0.92,
    ceramicBounds.y + insetTop,
    ceramicBounds.y + ceramicBounds.h - insetBottom
  );
  return { x: x - cx, y: y - cy };
}

// V06.01 deliberately abandons V06.00's nested radii. The final joined-hand
// midpoint now lands directly on the rectangular ceramic surface.
getAnchorPoint = function (memory) {
  return { x: memory.anchorX, y: memory.anchorY };
};

function buildFault(start, end, memory) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = max(1, sqrt(dx * dx + dy * dy));
  const nx = -dy / distance;
  const ny = dx / distance;
  // Stability is expressed only through the main fault's edge. Moderate hand
  // variation is intentionally expanded so smooth and jagged records read at
  // a glance; unexplained side branches are not generated.
  const instability = pow(1 - memory.quality.steadiness, 0.68);
  const amplitude = lerp(0.7, min(48, distance * 0.18), instability);
  const count = max(22, floor(distance / 7));
  const points = [];
  let drift = 0;

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    if (i > 0 && i < count) {
      const kick = randomSeeded(memory.seed + i * 5.91, -1, 1);
      drift = lerp(drift, kick, lerp(0.08, 0.9, instability));
    } else {
      drift = 0;
    }
    const taper = sin(PI * t);
    const fine =
      sin(t * TWO_PI * (3 + memory.step)) * amplitude * 0.16 * instability +
      sin(t * TWO_PI * (9 + memory.step * 0.7)) * amplitude * 0.07 * instability;
    points.push({
      x: lerp(start.x, end.x, t) + nx * (drift * amplitude + fine) * taper,
      y: lerp(start.y, end.y, t) + ny * (drift * amplitude + fine) * taper
    });
  }

  return { points };
}

function drawCeramicArchive() {
  if (memories.length === 0) return;
  const cx = width * 0.5;
  const cy = height * 0.5 + 20;

  push();
  translate(cx, cy);

  for (let i = 1; i < memories.length; i++) {
    const memory = memories[i];
    memory.age++;
    if (memory.age < 0 || !memory.crack) continue;
    const progress = easeInOutCubic(constrain(memory.age / memory.growFrames, 0, 1));
    drawFault(memory, progress);
  }

  const first = memories[0];
  first.age++;
  if (first.age >= 0) drawGlazeNode(first, constrain(first.age / 32, 0, 1), true);

  for (let i = 1; i < memories.length; i++) {
    const memory = memories[i];
    if (memory.age < 0) continue;
    const progress = constrain(memory.age / memory.growFrames, 0, 1);
    if (progress < 0.96) drawTargetPit(memory, progress);
    else drawGlazeNode(memory, constrain(map(progress, 0.96, 1, 0.1, 1), 0, 1), false);
  }

  pop();
}

function drawFault(memory, progress) {
  const partial = partialPolyline(memory.crack.points, progress);
  if (partial.length < 2) return;

  const ctx = drawingContext;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Shadow and upper lip are offset in opposite directions by the raking light.
  noFill();
  stroke(76, 61, 49, 105);
  strokeWeight(8.2);
  drawPolyline(partial, 3.1, 3.8);
  stroke(228, 209, 180, 72);
  strokeWeight(1.25);
  drawPolyline(partial, -1.5, -1.7);
  stroke(54, 46, 41, 245);
  strokeWeight(5.1);
  drawPolyline(partial, 0, 0);

  // The glaze is an inlay, not a luminous overlay.
  stroke(45, 103, 98, 230);
  strokeWeight(2.15);
  drawPolyline(partial, -0.25, -0.35);
  stroke(168, 195, 184, 115);
  strokeWeight(0.62);
  drawPolyline(partial, -0.85, -0.95);

  if (progress < 0.995) {
    const tip = partial[partial.length - 1];
    noStroke();
    fill(54, 46, 41, 210);
    circle(tip.x, tip.y, 6.6);
    fill(118, 101, 84, 120);
    for (let i = 0; i < 5; i++) {
      const angle = memory.seed + i * 2.16;
      const spread = 7 + i * 2.1;
      circle(tip.x + cos(angle) * spread, tip.y + sin(angle) * spread, 1.1 + (i % 2));
    }
  }
  ctx.restore();
}

function partialPolyline(points, progress) {
  if (progress <= 0 || points.length === 0) return [];
  if (progress >= 1) return points;
  const scaled = progress * (points.length - 1);
  const whole = floor(scaled);
  const partial = points.slice(0, whole + 1);
  if (whole < points.length - 1) {
    partial.push({
      x: lerp(points[whole].x, points[whole + 1].x, scaled - whole),
      y: lerp(points[whole].y, points[whole + 1].y, scaled - whole)
    });
  }
  return partial;
}

function drawPolyline(points, ox, oy) {
  if (points.length < 2) return;
  beginShape();
  for (const point of points) vertex(point.x + ox, point.y + oy);
  endShape();
}

function drawTargetPit(memory, progress) {
  const anchor = getAnchorPoint(memory);
  noStroke();
  fill(54, 46, 41, lerp(58, 130, progress));
  ellipse(anchor.x + 1.5, anchor.y + 1.8, 4.6 + progress * 2.8, 3.5 + progress * 2.2);
  fill(228, 209, 180, 55);
  ellipse(anchor.x - 1, anchor.y - 1, 2.4, 1.3);
}

function drawGlazeNode(memory, appear, isFirst) {
  const anchor = getAnchorPoint(memory);
  const nodeSize = memory.glazeSize * easeOutCubic(appear) * (isFirst ? 0.92 : 1);
  if (nodeSize < 0.5) return;

  push();
  translate(anchor.x, anchor.y);
  rotate(memory.rotation * 0.7 + memory.seed * 0.01);
  noStroke();
  fill(73, 57, 46, 126 * appear);
  drawIrregularPool(memory.seed + 10, nodeSize * 1.2, 2.2, 3.1);
  fill(145, 75, 53, 78 * appear);
  drawIrregularPool(memory.seed + 20, nodeSize * 1.08, 0.9, 1.1);
  fill(45, 103, 98, 250 * appear);
  drawIrregularPool(memory.seed + 30, nodeSize, 0, 0);
  fill(168, 195, 184, 150 * appear);
  ellipse(-nodeSize * 0.17, -nodeSize * 0.2, nodeSize * 0.46, max(1.2, nodeSize * 0.12));
  fill(228, 209, 180, 80 * appear);
  ellipse(-nodeSize * 0.23, -nodeSize * 0.29, nodeSize * 0.17, max(0.8, nodeSize * 0.055));
  pop();

  textAlign(CENTER, CENTER);
  noStroke();
  fill(54, 46, 41, 105 * appear);
  textSize(8);
  text(nf(memory.step + 1, 2), anchor.x, anchor.y + nodeSize * 0.82 + 8);
}

function drawIrregularPool(seed, diameter, ox, oy) {
  beginShape();
  const vertices = 20;
  for (let i = 0; i < vertices; i++) {
    const a = i / vertices * TWO_PI;
    const radius = diameter * 0.5 * randomSeeded(seed + i * 2.71, 0.84, 1.14);
    vertex(ox + cos(a) * radius, oy + sin(a) * radius * 0.76);
  }
  endShape(CLOSE);
}

function getLiveCeramicSteadiness(record) {
  const movingFrames = max(record.movingFrames, 1);
  const meanDelta = record.deltaSum / movingFrames;
  const variance = max(0, record.deltaSquaredSum / movingFrames - meanDelta * meanDelta);
  return 1 - constrain(map(sqrt(variance), 0.001, 0.024, 0, 1), 0, 1);
}

function getLiveCeramicMidpoint(record) {
  if (record.closeMidXValues.length > 0) {
    return {
      x: medianValue(record.closeMidXValues),
      y: medianValue(record.closeMidYValues)
    };
  }
  return { x: currentInput.midpointX, y: currentInput.midpointY };
}

function drawLiveCeramicCue() {
  if (!cycle || sessionComplete) return;
  const cx = width * 0.5;
  const cy = height * 0.5 + 20;
  const midpoint = getLiveCeramicMidpoint(cycle);
  const target = mapCeramicAnchor(midpoint.x, midpoint.y);
  const liveSteadiness = getLiveCeramicSteadiness(cycle);
  const reveal = cycle.opened ? 1 : max(0.08, cycle.liveProgress);
  const holdProgress = constrain(cycle.closeHoldFrames / CLOSE_HOLD_FRAMES, 0, 1);

  push();
  translate(cx, cy);

  if (memories.length > 0) {
    const start = getAnchorPoint(memories[memories.length - 1]);
    const previewMemory = {
      step: sessionStep,
      seed: cycle.liveSeed,
      quality: { steadiness: liveSteadiness }
    };
    const preview = buildFault(start, target, previewMemory);
    const partial = partialPolyline(preview.points, reveal);
    const ctx = drawingContext;
    ctx.save();
    ctx.setLineDash([6, 7]);
    ctx.lineCap = "round";
    noFill();
    stroke(54, 46, 41, 92);
    strokeWeight(4.2);
    drawPolyline(partial, 2.1, 2.5);
    stroke(145, 75, 53, 210);
    strokeWeight(1.7);
    drawPolyline(partial, 0, 0);
    ctx.restore();
  }

  const arcProgress = cycle.opened && breath < 0.34 ? holdProgress : cycle.liveProgress;
  noStroke();
  fill(54, 46, 41, 145);
  circle(target.x + 2.4, target.y + 2.8, 17);
  fill(45, 103, 98, 245);
  circle(target.x, target.y, 13);
  noFill();
  stroke(228, 209, 180, 100);
  strokeWeight(1.1);
  circle(target.x, target.y, 30);
  stroke(168, 195, 184, 255);
  strokeWeight(2.2);
  arc(target.x, target.y, 30, 30, -HALF_PI, -HALF_PI + TWO_PI * arcProgress);
  stroke(54, 46, 41, 165);
  strokeWeight(0.8);
  line(target.x - 21, target.y, target.x - 11, target.y);
  line(target.x + 11, target.y, target.x + 21, target.y);
  line(target.x, target.y - 21, target.x, target.y - 11);
  line(target.x, target.y + 11, target.x, target.y + 21);

  const placeRight = target.x < ceramicBounds.w * 0.24;
  const labelX = target.x + (placeRight ? 24 : -24);
  const labelAlign = placeRight ? LEFT : RIGHT;
  const phase = !cycle.opened
    ? `LIVE POSITION · OPEN ${floor(cycle.liveProgress * 100)}%`
    : breath < 0.34
      ? `HOLD POSITION · ${floor(holdProgress * 100)}%`
      : "LIVE POSITION · RETURN SLOWLY";
  textAlign(labelAlign, CENTER);
  noStroke();
  fill(54, 46, 41, 235);
  textSize(9.5);
  text(phase, labelX, target.y - 1);
  fill(54, 46, 41, 145);
  textSize(8);
  text(`NEXT ANCHOR ${nf(sessionStep + 1, 2)}`, labelX, target.y + 13);
  pop();
}

function drawCeramicHandDisplay() {
  if (handDisplayMode === 0) return;
  for (const hand of hands) {
    const points = hand.keypoints;
    if (handDisplayMode === 2) {
      stroke(54, 46, 41, 72);
      strokeWeight(0.8);
      for (const [a, b] of HAND_CONNECTIONS) line(points[a].x, points[a].y, points[b].x, points[b].y);
    }
    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);
    noStroke();
    fill(45, 103, 98, 150);
    for (const index of visible) circle(points[index].x, points[index].y, handDisplayMode === 1 ? 7 : 3.4);
  }
}

function drawCeramicFeedback() {
  if (sessionComplete) {
    drawCeramicStatus(CERAMIC_DEMO ? "EIGHT ANCHORS · ONE FIRED FAULT" : "CERAMIC ARCHIVE COMPLETE — R TO BEGIN AGAIN", 1);
    return;
  }

  let instruction = `ANCHOR ${min(sessionStep + 1, SESSION_LENGTH)} OF ${SESSION_LENGTH}`;
  let progress = sessionStep / SESSION_LENGTH;
  if (cycle) {
    if (!cycle.opened) {
      const percent = floor(cycle.liveProgress * 100);
      progress = cycle.liveProgress;
      instruction += breath > OPEN_EXTENT_THRESHOLD - 0.07 ? ` · HOLD TO FIRE ${percent}%` : ` · OPEN WIDER ${percent}%`;
    } else if (breath > 0.65) {
      instruction += " · SURFACE READY — RETURN SLOWLY";
    } else if (breath < 0.34) {
      const closeProgress = constrain(cycle.closeHoldFrames / CLOSE_HOLD_FRAMES, 0, 1);
      progress = closeProgress;
      instruction += ` · HOLD NEXT ANCHOR ${floor(closeProgress * 100)}%`;
    } else {
      instruction += " · RETURN SLOWLY";
    }
  } else if (savedFlash > 0) {
    instruction = `ANCHOR ${sessionStep} FIRED · FAULT ADVANCING`;
  } else {
    instruction += " · BRING HANDS TOGETHER";
  }
  drawCeramicStatus(instruction, progress);
}

function drawCeramicStatus(label, progress) {
  const barWidth = min(420, width - 100);
  const y = height - 38;
  textAlign(CENTER, CENTER);
  noStroke();
  fill(228, 209, 180, 250);
  textSize(10);
  text(label, width * 0.5, y - 16);
  stroke(228, 209, 180, 56);
  strokeWeight(1);
  line(width * 0.5 - barWidth * 0.5, y, width * 0.5 + barWidth * 0.5, y);
  stroke(168, 195, 184, 245);
  strokeWeight(1.4);
  line(width * 0.5 - barWidth * 0.5, y, width * 0.5 - barWidth * 0.5 + barWidth * progress, y);
}

function createCeramicDemo() {
  const positions = [
    [0.18, 0.28], [0.36, 0.2], [0.68, 0.29], [0.82, 0.48],
    [0.64, 0.72], [0.39, 0.68], [0.22, 0.52], [0.53, 0.43]
  ];
  const demoLength = CERAMIC_LIVE_DEMO ? 3 : SESSION_LENGTH;
  for (let i = 0; i < demoLength; i++) {
    const [anchorMidX, anchorMidY] = positions[i];
    const quality = {
      anchorMidX,
      anchorMidY,
      horizontalPosition: map(anchorMidX, 0, 1, -1, 1),
      verticalPosition: map(anchorMidY, 0, 1, -1, 1),
      slowness: [0.82, 0.62, 0.9, 0.7, 0.78, 0.56, 0.88, 0.72][i],
      steadiness: [0.92, 0.48, 0.78, 0.34, 0.86, 0.58, 0.74, 0.94][i],
      pause: [0.26, 0.72, 0.42, 0.9, 0.18, 0.58, 0.34, 0.78][i],
      balance: [0.9, 0.78, 0.96, 0.7, 0.88, 0.82, 0.92, 0.86][i],
      tilt: [-0.18, 0.22, -0.1, 0.3, -0.24, 0.14, -0.12, 0.08][i],
      duration: 0.7,
      coherence: 0.75
    };
    const age = CERAMIC_COMPLETE || CERAMIC_LIVE_DEMO ? 400 : -i * 46;
    addCeramicMemory(quality, 610 + i * 73.1, age);
    sessionStep++;
  }

  if (CERAMIC_LIVE_DEMO) {
    cycle = {
      maxBreath: 0.64,
      opened: false,
      movingFrames: 54,
      sampleFrames: 92,
      deltaSum: 0.52,
      deltaSquaredSum: 0.0048,
      symmetrySum: 77,
      tiltSum: 10,
      pauseFrames: 0,
      wideMidXSum: 22,
      wideMidYSum: 17,
      wideFrames: 34,
      closeMidXValues: [],
      closeMidYValues: [],
      closeHoldFrames: 0,
      liveSeed: 921.4,
      liveProgress: 0.58
    };
    breath = 0.64;
    sessionComplete = false;
    return;
  }

  sessionComplete = true;
  completionAge = CERAMIC_COMPLETE ? 500 : 0;
}

resetSession = function () {
  memories = [];
  sessionStep = 0;
  sessionComplete = false;
  completionAge = 0;
  cycle = null;
  readyForCycle = true;
  savedFlash = 0;
  if (CERAMIC_DEMO) createCeramicDemo();
};

windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
  buildCeramicSurface();
  resetSession();
};
