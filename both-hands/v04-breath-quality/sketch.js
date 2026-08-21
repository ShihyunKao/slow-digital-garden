let handPose;
let video;
let hands = [];
let detectedHands = [];
let lastHandDetectionAt = 0;

let inputMode = "hand";
let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = false;
let handDisplayMode = 1; // Default POINTS; P cycles POINTS → SKELETON → HIDDEN

let breath = 0;
let targetBreath = 0;
let previousBreath = 0;
let currentInput = { amount: 0, symmetry: 1, tilt: 0 };
let cycle = null;
let readyForCycle = true;
let memories = [];
let memoryStep = 0;
let fieldStars = [];
let savedFlash = 0;

const V04_VARIANT = window.BOTH_V04_VARIANT || {};
const IS_SEISMOGRAPH_SKIN = V04_VARIANT.id === "seismograph-skin";
const IS_GLASS_STRAIN = V04_VARIANT.id === "glass-strain";
const SEISMOGRAPH_PALETTE = {
  paper: "#D5D0C3",
  graphite: "#292A27",
  lead: "#686A63",
  calibration: "#873B34",
  grid: "#718080",
  oldMark: "#A59C8B"
};
const GLASS_STRAIN_PALETTE = {
  background: "#061016",
  glass: "#587582",
  stress: "#D8F0EC",
  violet: "#826B9B",
  warm: "#CBB377",
  shadow: "#15242B"
};

const MAX_MEMORIES = 12;
const GLASS_INPUT_MAX_WIDTH = 640;
const GLASS_INPUT_MAX_HEIGHT = 480;
const HAND_DETECTION_HOLD_MS = 240;
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);
  pixelDensity(1);
  randomSeed(1005);
  noiseSeed(1005);

  for (let i = 0; i < 105; i++) {
    fieldStars.push({
      angle: random(TWO_PI),
      radius: random(18, 260),
      speed: random(0.0004, 0.0018),
      size: random(0.7, 2.7),
      alpha: random(14, 62),
      depth: random(0.3, 1)
    });
  }
  beginExperience();
}

function draw() {
  drawBackground();

  updateTrackedHands();
  currentInput = getBreathInput();
  targetBreath = currentInput.amount;
  previousBreath = breath;
  const breathEase = 1 - pow(0.9, deltaTime / (1000 / 60));
  breath = lerp(breath, targetBreath, breathEase);

  if (!showHelp) updateBreathCycle();
  else cycle = null;

  if (IS_SEISMOGRAPH_SKIN) {
    drawSeismographField(breath);
    drawSeismographMemories();
  } else if (IS_GLASS_STRAIN) {
    drawGlassStrainField(breath);
    drawGlassStrainMemories();
  } else {
    drawCosmicField(breath);
    drawQualityMemories();
  }

  if (!showHelp) {
    cursor(ARROW);
    drawHandDisplay();
    drawCycleFeedback();
  }

  savedFlash = max(0, savedFlash - 1);

  syncHelpOverlay();
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
}

function getBreathInput() {
  if (hands.length < 2) {
    return { amount: max(0, breath - 0.04), symmetry: 1, tilt: 0 };
  }

  const a = hands[0].keypoints[8];
  const b = hands[1].keypoints[8];
  const maximumDistance = min(width * 0.72, height * 1.15);
  const verticalDifference = a.y - b.y;
  const tilt = constrain(verticalDifference / (height * 0.23), -1, 1);

  return {
    amount: constrain(map(dist(a.x, a.y, b.x, b.y), 48, maximumDistance, 0, 1), 0, 1),
    symmetry: 1 - abs(tilt),
    tilt
  };
}

function updateTrackedHands() {
  if (detectedHands.length < 2) {
    if (millis() - lastHandDetectionAt > HAND_DETECTION_HOLD_MS) hands = [];
    return;
  }

  const sourceWidth = max(video ? video.width : width, 1);
  const sourceHeight = max(video ? video.height : height, 1);
  const orderedHands = [...detectedHands].sort((a, b) => {
    const aLabel = String(a.handedness || a.label || "");
    const bLabel = String(b.handedness || b.label || "");
    if (aLabel && bLabel && aLabel !== bLabel) return aLabel.localeCompare(bLabel);
    return a.keypoints[0].x - b.keypoints[0].x;
  });
  const scaledHands = orderedHands.map((hand) => ({
    ...hand,
    keypoints: hand.keypoints.map((point) => ({
      ...point,
      x: point.x * width / sourceWidth,
      y: point.y * height / sourceHeight
    }))
  }));

  if (hands.length !== scaledHands.length) {
    hands = scaledHands;
    return;
  }

  const trackingEase = 1 - pow(0.62, deltaTime / (1000 / 60));
  hands = scaledHands.map((hand, handIndex) => ({
    ...hand,
    keypoints: hand.keypoints.map((point, pointIndex) => {
      const previous = hands[handIndex].keypoints[pointIndex];
      return {
        ...point,
        x: lerp(previous.x, point.x, trackingEase),
        y: lerp(previous.y, point.y, trackingEase)
      };
    })
  }));
}

function createCycle() {
  return {
    maxBreath: 0,
    movingFrames: 0,
    deltaSum: 0,
    deltaSquaredSum: 0,
    symmetrySum: 0,
    tiltSum: 0,
    sampleFrames: 0,
    pauseFrames: 0,
    opened: false
  };
}

function updateBreathCycle() {
  const delta = breath - previousBreath;
  const absoluteDelta = abs(delta);

  if (breath < 0.08) readyForCycle = true;
  if (!cycle && readyForCycle && breath > 0.12) {
    cycle = createCycle();
    readyForCycle = false;
  }
  if (!cycle) return;

  cycle.maxBreath = max(cycle.maxBreath, breath);
  cycle.opened = cycle.opened || breath > 0.68;
  cycle.symmetrySum += currentInput.symmetry;
  cycle.tiltSum += currentInput.tilt;
  cycle.sampleFrames++;

  if (absoluteDelta > 0.0012) {
    cycle.deltaSum += absoluteDelta;
    cycle.deltaSquaredSum += absoluteDelta * absoluteDelta;
    cycle.movingFrames++;
  }

  if (breath > 0.65 && absoluteDelta < 0.0055) {
    cycle.pauseFrames++;
  }

  if (cycle.opened && breath < 0.3) {
    addQualityMemory(cycle);
    cycle = null;
    return;
  }

  if (!cycle.opened && breath < 0.05 && cycle.sampleFrames > 25) {
    cycle = null;
  }
}

function calculateCycleQuality(record) {
  const movingFrames = max(record.movingFrames, 1);
  const sampleFrames = max(record.sampleFrames, 1);
  const meanDelta = record.deltaSum / movingFrames;
  const variance = max(0, record.deltaSquaredSum / movingFrames - meanDelta * meanDelta);
  const deviation = sqrt(variance);

  const slowness = 1 - constrain(map(meanDelta, 0.006, 0.045, 0, 1), 0, 1);
  const steadiness = 1 - constrain(map(deviation, 0.001, 0.024, 0, 1), 0, 1);
  const balance = constrain(record.symmetrySum / sampleFrames, 0, 1);
  const tilt = constrain(record.tiltSum / sampleFrames, -1, 1);
  const pause = constrain(record.pauseFrames / 85, 0, 1);
  const coherence = constrain(slowness * 0.56 + steadiness * 0.44, 0, 1);

  return { slowness, steadiness, balance, tilt, pause, coherence };
}

function addQualityMemory(record) {
  const quality = calculateCycleQuality(record);

  if (IS_SEISMOGRAPH_SKIN) {
    const memory = {
      age: 0,
      slot: memoryStep % MAX_MEMORIES,
      seed: random(1000),
      flash: 1,
      quality
    };
    memories.push(memory);
    memoryStep++;
    savedFlash = 100;
    if (memories.length > MAX_MEMORIES) memories.shift();
    return;
  }

  if (IS_GLASS_STRAIN) {
    const memory = {
      age: 0,
      slot: memoryStep % MAX_MEMORIES,
      seed: random(1000),
      flash: 1,
      quality
    };
    memories.push(memory);
    memoryStep++;
    savedFlash = 100;
    if (memories.length > MAX_MEMORIES) memories.shift();
    return;
  }

  const progress = (memoryStep % MAX_MEMORIES) / max(MAX_MEMORIES - 1, 1);
  const maximumRadius = min(width * 0.42, height * 0.64);

  const memory = {
    age: 0,
    radius: lerp(maximumRadius, maximumRadius * 0.23, progress),
    aspect: lerp(0.48, 0.62, quality.balance),
    rotation: quality.tilt * 0.34,
    seed: random(1000),
    flash: 1,
    completeness: lerp(0.24, 0.98, quality.coherence),
    brightness: lerp(0.32, 1, quality.coherence),
    roughness: lerp(0.13, 0.018, quality.steadiness),
    starCount: floor(lerp(18, 108, quality.pause)),
    quality
  };

  memory.ringSegments = buildRingSegments(memory);
  memory.stars = buildMemoryStars(memory);
  memories.push(memory);

  memoryStep++;
  savedFlash = 100;

  if (memories.length > MAX_MEMORIES) memories.shift();
}

function drawCosmicField(amount) {
  const cx = width / 2;
  const cy = height / 2 + 20;
  const eased = easeInOutCubic(amount);
  const maximumRadius = min(width * 0.44, height * 0.68);
  const radius = lerp(14, maximumRadius, eased);
  const aspect = lerp(0.31, 0.61, eased);

  drawingContext.save();
  drawingContext.filter = "blur(30px)";
  noStroke();
  fill(136, 168, 133, 8 + eased * 21);
  ellipse(cx, cy, radius * 2.05, radius * 2.05 * aspect);
  fill(232, 220, 182, 4 + eased * 11);
  ellipse(cx, cy, radius * 0.95, radius * 0.95 * aspect);
  drawingContext.restore();

  noStroke();

  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const rr = radius * (1 - t * 0.78);
    fill(lerp(18, 64, eased), lerp(31, 82, eased), lerp(29, 68, eased), 19 - t * 1.3);
    ellipse(cx, cy, rr * 2, rr * 2 * aspect);
  }

  noFill();

  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const rr = radius * (0.2 + t * 0.88);
    stroke(220, 226, 205, (1 - t * 0.5) * (9 + eased * 27));
    strokeWeight(lerp(0.85, 0.3, t));
    ellipse(cx, cy, rr * 2, rr * 2 * aspect);
  }

  noStroke();

  for (const star of fieldStars) {
    star.angle += star.speed * (0.35 + eased * 1.4);
    const rr = star.radius * eased * star.depth;
    fill(238, 231, 198, star.alpha * eased * star.depth);
    circle(cx + cos(star.angle) * rr, cy + sin(star.angle) * rr * aspect, star.size * star.depth);
  }
}

function getSeismographMetrics() {
  const left = max(96, width * 0.075);
  const right = width - max(96, width * 0.075);
  const top = max(122, height * 0.145);
  const bottom = height - max(142, height * 0.145);
  return {
    left,
    right,
    top,
    bottom,
    chartWidth: right - left,
    chartHeight: bottom - top,
    rowHeight: (bottom - top) / MAX_MEMORIES
  };
}

function drawSeismographField(amount) {
  const chart = getSeismographMetrics();
  drawSeismographPaper(chart);
  drawSeismographGrid(chart);

  if (!cycle) return;

  const quality = getLiveQuality();
  if (!quality) return;
  const liveSlot = memoryStep % MAX_MEMORIES;
  const openedProgress = cycle.opened
    ? 0.58 + (1 - amount) * 0.42
    : constrain(map(amount, 0.12, 0.68, 0.04, 0.58), 0.04, 0.58);
  drawSeismographTrace(quality, liveSlot, cycle.maxBreath * 761 + liveSlot * 43, 0.54, openedProgress, true);
}

function drawSeismographPaper(chart) {
  background(SEISMOGRAPH_PALETTE.paper);
  noStroke();
  for (let i = 0; i < 96; i++) {
    const x = seededUnit(i * 13.7 + 4.2) * width;
    const y = seededUnit(i * 29.1 + 17.8) * height;
    const length = 18 + seededUnit(i * 7.3 + 81.2) * 86;
    fill(81, 74, 63, 5 + seededUnit(i * 9.7) * 5);
    rect(x, y, length, 0.65);
  }

  noFill();
  stroke(113, 128, 128, 30);
  strokeWeight(1);
  rect(chart.left, chart.top, chart.chartWidth, chart.chartHeight);
}

function drawSeismographGrid(chart) {
  push();
  textFont("monospace");
  textSize(9);
  textAlign(RIGHT, CENTER);

  for (let i = 0; i <= MAX_MEMORIES; i++) {
    const y = chart.top + i * chart.rowHeight;
    stroke(113, 128, 128, i % 3 === 0 ? 42 : 23);
    strokeWeight(i % 3 === 0 ? 0.8 : 0.55);
    line(chart.left, y, chart.right, y);

    if (i < MAX_MEMORIES) {
      noStroke();
      fill(81, 74, 63, 118);
      text(nf(i + 1, 2), chart.left - 16, y + chart.rowHeight * 0.5);
      fill(135, 59, 52, 125);
      rect(chart.left + 7, y + chart.rowHeight * 0.5 - 0.8, 11, 1.6);
    }
  }

  for (let i = 0; i <= 20; i++) {
    const x = chart.left + chart.chartWidth * (i / 20);
    stroke(113, 128, 128, i % 5 === 0 ? 33 : 15);
    strokeWeight(0.6);
    line(x, chart.top, x, chart.bottom);
    if (i % 5 === 0 && i > 0 && i < 20) {
      stroke(135, 59, 52, 85);
      line(x, chart.top, x, chart.top + 8);
    }
  }

  const scanX = chart.left + (frameCount * 0.42 % chart.chartWidth);
  stroke(135, 59, 52, 30);
  strokeWeight(1);
  line(scanX, chart.top, scanX, chart.bottom);
  pop();
}

function drawSeismographMemories() {
  for (const memory of memories) {
    memory.age++;
    memory.flash *= 0.96;
    const appear = easeOutCubic(constrain(memory.age / 44, 0, 1));
    drawSeismographTrace(memory.quality, memory.slot, memory.seed, appear, appear, false, memory.flash);
  }
}

function drawSeismographTrace(quality, slot, seed, opacity, progress = 1, live = false, flash = 0) {
  const chart = getSeismographMetrics();
  const rowCenter = chart.top + chart.rowHeight * (slot + 0.5);
  const startX = chart.left + 26;
  const endX = chart.right - 24;
  const span = (endX - startX) * constrain(progress, 0, 1);
  const pointCount = max(24, floor(lerp(210, 390, 1 - quality.slowness) * progress));
  const amplitude = lerp(chart.rowHeight * 0.26, chart.rowHeight * 0.035, quality.steadiness);
  const slope = quality.tilt * chart.rowHeight * 0.34;
  const frequency = lerp(6.5, 28, 1 - quality.slowness);
  const continuity = lerp(0.7, 0.985, quality.slowness);
  const traceCount = 1 + floor((1 - quality.slowness) * 3.2);

  push();
  drawingContext.lineCap = "round";

  for (let trace = traceCount - 1; trace >= 0; trace--) {
    noFill();
    stroke(
      trace === 0 ? 41 : 104,
      trace === 0 ? 42 : 106,
      trace === 0 ? 39 : 99,
      (trace === 0 ? 185 : 72) * opacity + flash * 18
    );
    strokeWeight(trace === 0 ? lerp(0.72, 2.25, quality.slowness) : 0.48);

    let drawing = false;
    for (let i = 0; i < pointCount; i++) {
      const u = i / max(pointCount - 1, 1);
      const x = startX + span * u;
      const randomGate = seededUnit(seed * 0.31 + i * 7.17 + trace * 91.4);
      const gap = randomGate > continuity && i > 5;
      const tremor = sin(u * TWO_PI * frequency + seed + trace * 0.71) * amplitude;
      const grit = (seededUnit(seed + i * 19.9 + trace * 43.2) - 0.5) * amplitude * 1.35;
      const drift = (u - 0.5) * slope;
      const y = rowCenter + drift + tremor * 0.45 + grit + (trace - 1) * 0.72;

      if (gap) {
        if (drawing) endShape();
        drawing = false;
      } else {
        if (!drawing) {
          beginShape();
          drawing = true;
        }
        vertex(x, y);
      }
    }
    if (drawing) endShape();
  }

  const terminalX = startX + span;
  const terminalY = rowCenter + (constrain(progress, 0, 1) - 0.5) * slope;
  if (quality.pause > 0.04) {
    noStroke();
    for (let i = 0; i < 10; i++) {
      const spread = quality.pause * 13;
      fill(41, 42, 39, (16 + quality.pause * 28) * opacity);
      ellipse(
        terminalX + (seededUnit(seed + i * 31.4) - 0.5) * spread,
        terminalY + (seededUnit(seed + i * 43.1) - 0.5) * spread * 0.48,
        2 + quality.pause * 7,
        1.2 + quality.pause * 3.2
      );
    }
  }

  if (live) {
    stroke(135, 59, 52, 155 * opacity);
    strokeWeight(1.15);
    line(terminalX, rowCenter - chart.rowHeight * 0.32, terminalX, rowCenter + chart.rowHeight * 0.32);
  }
  pop();
}

function getGlassStrainMetrics() {
  const paneWidth = min(width * 0.34, height * 0.54);
  return {
    cx: width * 0.5,
    cy: height * 0.47,
    paneWidth,
    paneHeight: paneWidth * 0.66
  };
}

function drawGlassStrainField() {
  const metrics = getGlassStrainMetrics();

  push();
  noFill();
  drawingContext.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const y = metrics.cy + (u - 0.5) * metrics.paneHeight * 1.8;
    const drift = sin(frameCount * 0.0025 + i * 1.71) * 18;
    stroke(88, 117, 130, 7 + (1 - abs(u - 0.5) * 2) * 6);
    strokeWeight(0.55);
    bezier(
      metrics.cx - metrics.paneWidth * 1.7,
      y + drift,
      metrics.cx - metrics.paneWidth * 0.62,
      y - 22,
      metrics.cx + metrics.paneWidth * 0.58,
      y + 24,
      metrics.cx + metrics.paneWidth * 1.7,
      y - drift
    );
  }
  pop();
}

function drawGlassStrainMemories() {
  for (const memory of memories) {
    memory.age++;
    memory.flash *= 0.95;
    const appear = easeOutCubic(constrain(memory.age / 36, 0, 1));
    drawGlassPane(memory.quality, memory.slot, memory.seed, appear, 1, false, memory.flash);
  }

  if (!cycle) return;
  const quality = getLiveQuality();
  if (!quality) return;

  const phase = cycle.opened
    ? 0.54 + constrain(map(1 - breath, 0, 0.72, 0, 0.46), 0, 0.46)
    : constrain(map(breath, 0.12, 0.68, 0.06, 0.54), 0.06, 0.54);
  drawGlassPane(
    quality,
    memoryStep % MAX_MEMORIES,
    91.7 + memoryStep * 47.3,
    0.78,
    phase,
    true,
    0
  );
}

function getGlassPanePlacement(slot) {
  const layout = [
    [-0.10, -0.08, -0.10], [0.10, -0.10, 0.08], [-0.03, 0.08, -0.03],
    [0.16, 0.05, 0.13], [-0.17, 0.09, -0.14], [0.01, -0.15, 0.03],
    [0.20, -0.02, 0.16], [-0.10, 0.15, -0.08], [0.08, 0.14, 0.09],
    [-0.21, -0.01, -0.17], [0.00, 0.01, 0.01], [0.18, 0.12, 0.12]
  ];
  const entry = layout[slot % layout.length];
  return {
    x: entry[0],
    y: entry[1],
    rotation: entry[2]
  };
}

function buildGlassPanePoints(seed, paneWidth, paneHeight) {
  const points = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = -HALF_PI + i / count * TWO_PI;
    const variation = 0.88 + seededUnit(seed + i * 17.3) * 0.18;
    points.push({
      x: cos(angle) * paneWidth * 0.5 * variation,
      y: sin(angle) * paneHeight * 0.5 * variation
    });
  }
  return points;
}

function traceGlassPanePath(points) {
  drawingContext.beginPath();
  drawingContext.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) drawingContext.lineTo(points[i].x, points[i].y);
  drawingContext.closePath();
}

function drawGlassPane(quality, slot, seed, opacity, phase, live, flash) {
  const metrics = getGlassStrainMetrics();
  const placement = getGlassPanePlacement(slot);
  const sizePulse = live ? lerp(0.72, 1.03, easeInOutCubic(breath)) : 1;
  const paneWidth = metrics.paneWidth * sizePulse;
  const paneHeight = metrics.paneHeight * sizePulse;
  const points = buildGlassPanePoints(seed, paneWidth, paneHeight);
  const centreX = metrics.cx + placement.x * metrics.paneWidth * 1.72;
  const centreY = metrics.cy + placement.y * metrics.paneHeight * 1.45;
  const rotation = placement.rotation + quality.tilt * 0.32;

  push();
  translate(centreX, centreY);
  rotate(rotation);

  noStroke();
  fill(21, 36, 43, 34 * opacity);
  beginShape();
  for (const point of points) vertex(point.x + 12, point.y + 16);
  endShape(CLOSE);

  drawingContext.save();
  traceGlassPanePath(points);
  drawingContext.clip();

  noStroke();
  fill(88, 117, 130, (20 + quality.balance * 22) * opacity);
  beginShape();
  for (const point of points) vertex(point.x, point.y);
  endShape(CLOSE);

  const shade = drawingContext.createLinearGradient(-paneWidth * 0.45, -paneHeight * 0.35, paneWidth * 0.4, paneHeight * 0.4);
  shade.addColorStop(0, `rgba(130, 107, 155, ${0.04 * opacity})`);
  shade.addColorStop(0.48, `rgba(88, 117, 130, ${0.015 * opacity})`);
  shade.addColorStop(1, `rgba(21, 36, 43, ${0.16 * opacity})`);
  drawingContext.fillStyle = shade;
  drawingContext.fillRect(-paneWidth, -paneHeight, paneWidth * 2, paneHeight * 2);

  drawGlassStressArcs(quality, seed, paneWidth, paneHeight, opacity, phase, live);
  drawGlassCracks(quality, seed, paneWidth, paneHeight, opacity, phase, live);
  drawGlassPauseHighlight(quality, seed, paneWidth, paneHeight, opacity);
  drawingContext.restore();

  noFill();
  stroke(88, 117, 130, (48 + flash * 58) * opacity);
  strokeWeight(0.85);
  beginShape();
  for (const point of points) vertex(point.x, point.y);
  endShape(CLOSE);
  drawGlassEdgeRefractions(points, seed, opacity, flash, live);
  pop();
}

function drawGlassStressArcs(quality, seed, paneWidth, paneHeight, opacity, phase, live) {
  const direction = quality.tilt * 0.85 + (seededUnit(seed * 0.31) - 0.5) * 0.28;
  const reveal = constrain(phase * 1.18, 0, 1);
  const bandCount = 4;

  push();
  rotate(direction);
  noFill();
  drawingContext.lineCap = "round";
  for (let i = 0; i < bandCount; i++) {
    const u = i / (bandCount - 1);
    const bandReveal = easeOutCubic(constrain(map(reveal, u * 0.42, u * 0.42 + 0.34, 0, 1), 0, 1));
    if (bandReveal <= 0.01) continue;

    const y = lerp(-paneHeight * 0.34, paneHeight * 0.34, u)
      + (seededUnit(seed + i * 23.7) - 0.5) * paneHeight * 0.045;
    const bend = (seededUnit(seed + i * 19.2) - 0.5) * paneHeight * 0.25;
    const edgeDrift = (seededUnit(seed + i * 31.8) - 0.5) * paneHeight * 0.11;
    const alpha = (28 + quality.steadiness * 54 - abs(u - 0.5) * 10) * opacity * bandReveal;

    stroke(216, 240, 236, alpha);
    strokeWeight(0.55 + quality.steadiness * 0.5);
    bezier(
      -paneWidth * 0.62, y + edgeDrift,
      -paneWidth * 0.19, y - bend,
      paneWidth * 0.18, y + bend,
      paneWidth * 0.62, y - edgeDrift
    );

    if (i === 1 || i === 3) {
      stroke(130, 107, 155, (12 + quality.balance * 24) * opacity * bandReveal);
      strokeWeight(0.45);
      bezier(
        -paneWidth * 0.62, y + edgeDrift + 2.2,
        -paneWidth * 0.19, y - bend + 1.2,
        paneWidth * 0.18, y + bend + 2.8,
        paneWidth * 0.62, y - edgeDrift + 1.6
      );
    }
  }
  pop();
}

function drawGlassCracks(quality, seed, paneWidth, paneHeight, opacity, phase, live) {
  const instability = 1 - quality.steadiness;
  const crackLevel = constrain(map(instability, 0.16, 1, 0, 1), 0, 1);
  if (crackLevel <= 0) return;
  const branchCount = 3 + floor(crackLevel * 6.99);
  const growth = constrain(map(phase, 0.18, 1, 0.05, 1), 0.05, 1);
  const originX = (seededUnit(seed + 4.2) - 0.5) * paneWidth * 0.18;
  const originY = (seededUnit(seed + 7.8) - 0.5) * paneHeight * 0.14;
  const baseAngle = seededUnit(seed + 12.4) * TWO_PI + quality.tilt * 0.45;
  const angularStep = TWO_PI / branchCount;

  push();
  drawingContext.lineCap = "round";
  noFill();
  for (let branch = 0; branch < branchCount; branch++) {
    let x = originX;
    let y = originY;
    const liveDrift = live
      ? (1 - quality.pause) * sin(frameCount * 0.025 + branch * 1.7) * 0.06
      : 0;
    const angularJitter = (seededUnit(seed + branch * 9.7) - 0.5) * angularStep * 0.46;
    let angle = baseAngle + branch * angularStep + angularJitter + liveDrift;
    const lengthVariation = lerp(0.72, 1.18, seededUnit(seed + branch * 21.3));
    const totalLength = paneHeight * lerp(0.14, 0.43, crackLevel) * growth * lengthVariation;
    const branchPoints = [{ x, y, angle }];
    stroke(216, 240, 236, (28 + instability * 70) * opacity);
    strokeWeight(lerp(0.42, 0.82, instability));
    beginShape();
    vertex(x, y);
    for (let segment = 0; segment < 4; segment++) {
      angle += (seededUnit(seed + branch * 31 + segment * 17) - 0.5) * lerp(0.12, 0.48, instability);
      x += cos(angle) * totalLength / 4;
      y += sin(angle) * totalLength / 4;
      vertex(x, y);
      branchPoints.push({ x, y, angle });
    }
    endShape();

    if (crackLevel > 0.22 && branch % 2 === 0) {
      const fork = branchPoints[2];
      const sideAngle = fork.angle + (branch % 4 === 0 ? -0.78 : 0.78);
      const sideLength = totalLength * lerp(0.14, 0.28, crackLevel);
      stroke(216, 240, 236, (14 + crackLevel * 34) * opacity);
      strokeWeight(0.42);
      line(
        fork.x,
        fork.y,
        fork.x + cos(sideAngle) * sideLength,
        fork.y + sin(sideAngle) * sideLength
      );
    }
  }
  pop();
}

function drawGlassPauseHighlight(quality, seed, paneWidth, paneHeight, opacity) {
  if (quality.pause < 0.025) return;
  const hx = (seededUnit(seed + 66.4) - 0.5) * paneWidth * 0.17;
  const hy = (seededUnit(seed + 92.8) - 0.5) * paneHeight * 0.13;
  const coreRadius = lerp(5, min(paneWidth, paneHeight) * 0.12, quality.pause);
  const outerRadius = coreRadius * 1.72;
  const gradient = drawingContext.createRadialGradient(hx, hy, 0, hx, hy, outerRadius);
  gradient.addColorStop(0, `rgba(216, 240, 236, ${0.3 * quality.pause * opacity})`);
  gradient.addColorStop(0.14, `rgba(216, 240, 236, ${0.22 * quality.pause * opacity})`);
  gradient.addColorStop(0.34, `rgba(203, 179, 119, ${0.1 * quality.pause * opacity})`);
  gradient.addColorStop(0.58, `rgba(216, 240, 236, ${0.038 * quality.pause * opacity})`);
  gradient.addColorStop(0.8, `rgba(216, 240, 236, ${0.012 * quality.pause * opacity})`);
  gradient.addColorStop(1, "rgba(216, 240, 236, 0)");
  drawingContext.fillStyle = gradient;
  drawingContext.beginPath();
  drawingContext.arc(hx, hy, outerRadius, 0, TWO_PI);
  drawingContext.fill();
}

function drawGlassEdgeRefractions(points, seed, opacity, flash, live) {
  const colors = [
    [216, 240, 236],
    [130, 107, 155],
    [203, 179, 119]
  ];
  drawingContext.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const edge = floor(seededUnit(seed + i * 28.4) * points.length) % points.length;
    const a = points[edge];
    const b = points[(edge + 1) % points.length];
    const start = 0.18 + seededUnit(seed + i * 33.6) * 0.28;
    const finish = min(0.9, start + 0.18 + seededUnit(seed + i * 41.1) * 0.2);
    const c = colors[i];
    stroke(c[0], c[1], c[2], (70 + flash * 80 + (live ? 18 : 0)) * opacity);
    strokeWeight(i === 0 ? 1.25 : 0.82);
    line(lerp(a.x, b.x, start), lerp(a.y, b.y, start), lerp(a.x, b.x, finish), lerp(a.y, b.y, finish));
  }
}

function seededUnit(value) {
  return abs(sin(value * 12.9898 + 78.233) * 43758.5453) % 1;
}

function drawQualityMemories() {
  const cx = width / 2;
  const cy = height / 2 + 20;
  const newest = memories.length > 0 ? memories[memories.length - 1] : null;
  const focusActive = newest && newest.age < 150;
  const focusReturn = focusActive
    ? easeOutCubic(constrain(newest.age / 150, 0, 1))
    : 1;

  for (const memory of memories) {
    memory.age++;
    memory.flash *= 0.96;
    const appear = easeOutCubic(constrain(memory.age / 24, 0, 1));
    const settle = easeOutCubic(constrain(memory.age / 300, 0, 1));
    const archiveFocus = focusActive && memory !== newest
      ? lerp(0.32, 1, focusReturn)
      : 1;
    const newestFocus = memory === newest && memory.age < 150 ? 1.18 : 1;
    const opacity = lerp(1, 0.76, settle) * archiveFocus * newestFocus;

    push();
    translate(cx, cy);
    rotate(memory.rotation);

    if (memory === newest && memory.age < 150) {
      drawNewMemoryReveal(memory);
    }

    for (let ring = 0; ring < 3; ring++) {
      drawFragmentedRing(memory, ring, appear * opacity);
    }

    drawMemoryStars(memory, appear * opacity);
    pop();
  }
}

function drawNewMemoryReveal(memory) {
  const progress = constrain(memory.age / 105, 0, 1);
  const fade = 1 - easeInCubic(constrain(memory.age / 150, 0, 1));
  const angle = -HALF_PI + progress * TWO_PI;
  const radius = memory.radius * 1.01;

  drawingContext.save();
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = "rgba(246, 236, 194, 0.62)";

  noFill();
  stroke(242, 235, 201, 78 * fade);
  strokeWeight(0.85);
  ellipse(0, 0, radius * 2, radius * 2 * memory.aspect);

  noStroke();
  fill(252, 242, 200, 235 * fade);
  circle(
    cos(angle) * radius,
    sin(angle) * radius * memory.aspect,
    5.5 + memory.flash * 3
  );

  drawingContext.restore();
}

function drawFragmentedRing(memory, ring, opacity) {
  stroke(
    239,
    234,
    202,
    (20 + memory.brightness * 72 + memory.flash * 42) * opacity
  );
  strokeWeight(0.42 + memory.brightness * 0.58 + memory.flash * 0.25);
  noFill();

  for (const segment of memory.ringSegments[ring]) {
    if (segment.length < 2) continue;
    beginShape();
    for (const point of segment) vertex(point.x, point.y);
    endShape();
  }
}

function drawMemoryStars(memory, opacity) {
  noStroke();

  for (const star of memory.stars) {
    const pulse = sin(frameCount * 0.025 + star.phase) * 0.5 + 0.5;

    fill(246, 238, 198, (30 + memory.brightness * 74 + pulse * 28) * opacity);
    circle(star.x, star.y, star.size + pulse * 0.7);
  }
}

function buildRingSegments(memory) {
  const rings = [];
  const step = TWO_PI / 125;

  for (let ring = 0; ring < 3; ring++) {
    const rr = memory.radius * (0.91 + ring * 0.095);
    const segments = [];
    let segment = [];

    for (let angle = 0; angle <= TWO_PI + step; angle += step) {
      const gate = noise(
        memory.seed + cos(angle) * 1.65,
        memory.seed + sin(angle) * 1.65,
        ring * 0.33
      );
      const visible = gate < memory.completeness * 0.78 + 0.2;
      const surface = noise(
        memory.seed * 0.6 + cos(angle) * 2.1,
        memory.seed * 0.6 + sin(angle) * 2.1,
        ring * 0.24
      );
      const wobble = map(surface, 0, 1, 1 - memory.roughness, 1 + memory.roughness);

      if (visible) {
        segment.push({
          x: cos(angle) * rr * wobble,
          y: sin(angle) * rr * memory.aspect * wobble
        });
      } else if (segment.length > 0) {
        segments.push(segment);
        segment = [];
      }
    }

    if (segment.length > 0) segments.push(segment);
    rings.push(segments);
  }

  return rings;
}

function buildMemoryStars(memory) {
  const stars = [];

  for (let i = 0; i < memory.starCount; i++) {
    const angle = i / max(memory.starCount, 1) * TWO_PI + memory.seed * 0.01;
    const rr = memory.radius * randomSeeded(memory.seed + i * 2.7, 0.83, 1.12);

    stars.push({
      x: cos(angle) * rr,
      y: sin(angle) * rr * memory.aspect,
      size: randomSeeded(memory.seed + i + 200, 1.2, 3.5),
      phase: i * 1.7 + memory.seed
    });
  }

  return stars;
}

function getLiveQuality() {
  if (!cycle) return null;
  return calculateCycleQuality(cycle);
}

function drawCycleFeedback() {
  const quality = getLiveQuality();

  if (!cycle || !quality) {
    if (savedFlash > 0) {
      drawFeedbackLabel(IS_GLASS_STRAIN ? "GLASS PANE STORED" : "MEMORY RECORDED", 1);
    }
    return;
  }

  let instruction;
  if (IS_GLASS_STRAIN) {
    instruction = "OPEN — FIRST HALF";
    if (breath > 0.76) instruction = "FULLY OPEN — MIDPOINT";
    else if (previousBreath > breath) instruction = "RETURN — COMPLETE TO STORE";
  } else {
    instruction = "OPEN SLOWLY";
    if (breath > 0.76) instruction = "PAUSE — THEN RETURN";
    else if (previousBreath > breath) instruction = "RETURN SLOWLY";
  }

  drawFeedbackLabel(instruction, quality.coherence);
  drawQualityIndicators(quality);
}

function drawFeedbackLabel(label, strength) {
  textAlign(CENTER, CENTER);
  noStroke();
  if (IS_SEISMOGRAPH_SKIN) fill(41, 42, 39, 115 + strength * 115);
  else if (IS_GLASS_STRAIN) fill(216, 240, 236, 112 + strength * 112);
  else fill(232, 229, 208, 105 + strength * 105);
  textSize(10);
  text(label, width / 2, height - 58);
}

function drawQualityIndicators(quality) {
  const labels = [
    ["SLOWNESS", quality.slowness],
    ["STEADINESS", quality.steadiness],
    ["BALANCE", quality.balance],
    ["PAUSE", quality.pause]
  ];
  const totalWidth = min(560, width - 80);
  const itemWidth = totalWidth / labels.length;
  const startX = width / 2 - totalWidth / 2;
  const y = height - 35;

  for (let i = 0; i < labels.length; i++) {
    const x = startX + itemWidth * i;
    const value = labels[i][1];

    textAlign(LEFT, CENTER);
    noStroke();
    if (IS_SEISMOGRAPH_SKIN) fill(81, 74, 63, 135);
    else if (IS_GLASS_STRAIN) fill(88, 117, 130, 154);
    else fill(194, 205, 187, 82);
    textSize(8);
    text(labels[i][0], x, y - 7);

    if (IS_SEISMOGRAPH_SKIN) stroke(113, 128, 128, 52);
    else if (IS_GLASS_STRAIN) stroke(88, 117, 130, 52);
    else stroke(183, 200, 178, 28);
    strokeWeight(1);
    line(x, y + 6, x + itemWidth - 20, y + 6);
    if (IS_SEISMOGRAPH_SKIN) stroke(135, 59, 52, 105 + value * 100);
    else if (IS_GLASS_STRAIN) {
      const colors = [
        [216, 240, 236],
        [216, 240, 236],
        [130, 107, 155],
        [203, 179, 119]
      ];
      stroke(colors[i][0], colors[i][1], colors[i][2], 88 + value * 116);
    }
    else stroke(235, 226, 190, 85 + value * 100);
    strokeWeight(1.2);
    line(x, y + 6, x + (itemWidth - 20) * value, y + 6);
  }
}

function drawBackground() {
  if (IS_SEISMOGRAPH_SKIN) background(SEISMOGRAPH_PALETTE.paper);
  else if (IS_GLASS_STRAIN) background(GLASS_STRAIN_PALETTE.background);
  else clear();
}

function drawHandDisplay() {
  if (inputMode !== "hand" || handDisplayMode === 0) return;

  for (const hand of hands) {
    const points = hand.keypoints;

    if (handDisplayMode === 2) {
      if (IS_SEISMOGRAPH_SKIN) stroke(41, 42, 39, 82);
      else if (IS_GLASS_STRAIN) stroke(216, 240, 236, 74);
      else stroke(230, 226, 204, 58);
      strokeWeight(0.75);
      for (const [a, b] of HAND_CONNECTIONS) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);
    noStroke();
    if (IS_SEISMOGRAPH_SKIN) fill(135, 59, 52, 145);
    else if (IS_GLASS_STRAIN) fill(203, 179, 119, 168);
    else fill(246, 238, 198, 92);
    for (const index of visible) circle(points[index].x, points[index].y, handDisplayMode === 1 ? 7 : 3.5);
  }
}

function drawHeader() {
  const inset = 28;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("BREATH QUALITY", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 04.00 / QUALITY-BASED MEMORY RINGS", inset, 47);

  textAlign(RIGHT, TOP);
  fill(211, 216, 198, 128);
  textSize(10);
  text(`${modelLoading ? "CAMERA LOADING · " : ""}P ${display} · R RESET · ? HELP`, width - inset, 32);

  stroke(199, 210, 188, 25);
  strokeWeight(1);
  line(inset, 66, width - inset, 66);
}

function getHelpPanelMetrics() {
  const panelWidth = min(840, width - 40);
  const panelHeight = min(540, height - 40);
  return {
    x: (width - panelWidth) / 2,
    y: (height - panelHeight) / 2,
    width: panelWidth,
    height: panelHeight,
    buttonX: width / 2 - 92,
    buttonY: (height - panelHeight) / 2 + panelHeight - 78,
    buttonWidth: 184,
    buttonHeight: 42
  };
}

function drawHelpScreen() {
  const panel = getHelpPanelMetrics();
  const compact = panel.width < 740 || panel.height < 500;
  const left = panel.x + (compact ? 34 : 56);
  const rightEdge = panel.x + panel.width - (compact ? 34 : 56);

  noStroke();
  fill(5, 12, 11, 205);
  rect(0, 0, width, height);

  drawingContext.save();
  drawingContext.shadowBlur = 40;
  drawingContext.shadowColor = "rgba(0, 0, 0, 0.45)";
  fill(15, 29, 25, 246);
  stroke(177, 192, 167, 52);
  strokeWeight(1);
  rect(panel.x, panel.y, panel.width, panel.height, 4);
  drawingContext.restore();

  noStroke();
  textAlign(LEFT, TOP);
  fill(174, 191, 166, 180);
  textSize(11);
  text("GESTURE STUDY 04.00", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Breath Quality", left, panel.y + (compact ? 46 : 65));

  if (compact) {
    drawCompactHelp(panel, left, rightEdge - left);
  } else {
    drawEditorialHelp(panel, left, rightEdge);
  }

  const hovering =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  cursor(hovering ? HAND : ARROW);
  noStroke();
  fill(hovering ? color(220, 224, 203, 235) : color(188, 202, 178, 210));
  rect(panel.buttonX, panel.buttonY, panel.buttonWidth, panel.buttonHeight, 2);

  fill(18, 31, 27, 245);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("BEGIN", width / 2, panel.buttonY + panel.buttonHeight / 2);

  fill(205, 210, 194, 105);
  textSize(10);
  text("or press Enter / Space", width / 2, panel.buttonY + panel.buttonHeight + 16);
}

function drawEditorialHelp(panel, left, rightEdge) {
  const dividerX = panel.x + panel.width * 0.59;
  const right = dividerX + 38;
  const rightWidth = rightEdge - right;

  fill(201, 207, 191, 175);
  textAlign(LEFT, TOP);
  textSize(15);
  textLeading(22);
  text(
    "Each complete two-hand movement leaves a ring shaped by its speed, steadiness, balance and pause.",
    left,
    panel.y + 118,
    dividerX - left - 46
  );

  const stepsY = panel.y + 198;
  const gap = 58;
  drawHelpStep("01", "Select Begin, allow the camera, and bring hands together.", left, stepsY);
  drawHelpStep("02", "Open slowly and pause in the extended position.", left, stepsY + gap);
  drawHelpStep("03", "Return slowly to create one quality-based memory ring.", left, stepsY + gap * 2);

  stroke(178, 193, 169, 35);
  strokeWeight(1);
  line(dividerX, panel.y + 112, dividerX, panel.buttonY - 42);

  noStroke();
  fill(174, 191, 166, 120);
  textAlign(LEFT, TOP);
  textSize(10);
  text("READING THE ARCHIVE", right, panel.y + 120);

  fill(201, 207, 191, 145);
  textSize(12);
  textLeading(18);
  text(
    "Each completed stretch becomes a ring whose surface reveals the quality of movement.",
    right,
    panel.y + 146,
    rightWidth
  );

  const legendY = panel.y + 246;
  const legendGap = 40;
  drawArchiveLegendRow("01", "COMPLETENESS", "slow + steady movement", right, legendY, rightWidth);
  drawArchiveLegendRow("02", "TEXTURE", "movement steadiness", right, legendY + legendGap, rightWidth);
  drawArchiveLegendRow("03", "TILT", "vertical hand balance", right, legendY + legendGap * 2, rightWidth);
  drawArchiveLegendRow("04", "STARS", "open-palm pause", right, legendY + legendGap * 3, rightWidth);

  textAlign(LEFT, TOP);
  fill(174, 191, 166, 125);
  textSize(10);
  text("P  HAND DISPLAY     R  RESET ARCHIVE     ?  HELP", left, panel.buttonY - 37);
}

function drawCompactHelp(panel, left, contentWidth) {
  fill(201, 207, 191, 165);
  textAlign(LEFT, TOP);
  textSize(12);
  textLeading(17);
  text(
    "Each complete two-hand movement leaves a ring shaped by movement quality.",
    left,
    panel.y + 86,
    contentWidth
  );

  const stepsY = panel.y + 126;
  const gap = 39;
  drawHelpStep("01", "Begin with both hands together.", left, stepsY);
  drawHelpStep("02", "Open, pause, then return.", left, stepsY + gap);
  drawHelpStep("03", "Repeat to build a ring archive.", left, stepsY + gap * 2);

  const keyY = stepsY + gap * 3 + 5;
  fill(174, 191, 166, 115);
  textSize(10);
  text("COMPLETENESS / SLOW + STEADY     TEXTURE / STEADINESS", left, keyY);
  text("TILT / VERTICAL BALANCE           STARS / OPEN-PALM PAUSE", left, keyY + 18);

  fill(174, 191, 166, 120);
  textSize(9);
  text("P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - 28);
}

function drawArchiveLegendRow(number, label, description, x, y, rowWidth) {
  stroke(178, 193, 169, 30);
  strokeWeight(1);
  line(x, y - 10, x + rowWidth, y - 10);

  noStroke();
  textAlign(LEFT, TOP);
  fill(174, 191, 166, 90);
  textSize(9);
  text(number, x, y + 2);

  fill(230, 229, 211, 205);
  textSize(11);
  text(label, x + 34, y);

  fill(184, 195, 179, 145);
  textSize(10);
  textAlign(RIGHT, TOP);
  text(description, x + rowWidth, y + 1);
}

function drawHelpStep(number, label, x, y) {
  fill(174, 191, 166, 125);
  textAlign(LEFT, TOP);
  textSize(10);
  text(number, x, y + 2);
  fill(229, 228, 211, 205);
  textSize(13);
  text(label, x + 38, y);
}

function keyPressed() {
  if (key === "?" || keyCode === 191) {
    if (showHelp) beginExperience();
    else showHelp = true;
    return false;
  }

  if (showHelp && (keyCode === ENTER || key === " " || keyCode === ESCAPE)) {
    beginExperience();
    return false;
  }

  if (showHelp) return false;

  if (key === "p" || key === "P") {
    handDisplayMode = (handDisplayMode + 1) % 3;
  }

  if (key === "r" || key === "R") {
    memories = [];
    cycle = null;
    memoryStep = 0;
    savedFlash = 0;
    readyForCycle = true;
  }
}

function mousePressed() {
  if (showHelp) return false;
}

function beginExperience() {
  showHelp = false;
  syncHelpOverlay();
  cursor(ARROW);
  if (!video && !modelLoading) startHandMode();
}

function startHandMode() {
  if (video || modelLoading) return;

  inputMode = "hand";
  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];
  detectedHands = [];
  lastHandDetectionAt = 0;
  cycle = null;
  readyForCycle = true;

  const glassInputScale = IS_GLASS_STRAIN
    ? min(1, GLASS_INPUT_MAX_WIDTH / width, GLASS_INPUT_MAX_HEIGHT / height)
    : 1;
  const inputWidth = max(1, round(width * glassInputScale));
  const inputHeight = max(1, round(height * glassInputScale));

  video = createCapture(
    { video: { width: inputWidth, height: inputHeight }, audio: false },
    () => {
      videoReady = true;
      tryStartDetection();
    }
  );

  video.size(inputWidth, inputHeight);
  video.hide();

  handPose = ml5.handPose(
    { flipped: true },
    () => {
      modelReady = true;
      modelLoading = false;
      tryStartDetection();
    }
  );
}

function tryStartDetection() {
  if (inputMode === "hand" && modelReady && videoReady && !detectionStarted) {
    handPose.detectStart(video, gotHands);
    detectionStarted = true;
  }
}

function gotHands(results) {
  detectedHands = results;
  if (results.length >= 2) lastHandDetectionAt = millis();
}

function stopHandMode() {
  if (handPose && detectionStarted && handPose.detectStop) handPose.detectStop();
  if (video) {
    const stream = video.elt.srcObject;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    video.remove();
  }

  handPose = null;
  video = null;
  hands = [];
  detectedHands = [];
  lastHandDetectionAt = 0;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  modelLoading = false;
  inputMode = "mouse";
  cycle = null;
  readyForCycle = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) {
    const glassInputScale = IS_GLASS_STRAIN
      ? min(1, GLASS_INPUT_MAX_WIDTH / width, GLASS_INPUT_MAX_HEIGHT / height)
      : 1;
    video.size(max(1, round(width * glassInputScale)), max(1, round(height * glassInputScale)));
  }
  hands = [];
  detectedHands = [];
  lastHandDetectionAt = 0;
  memories = [];
  cycle = null;
  memoryStep = 0;
  readyForCycle = true;
}

function randomSeeded(seed, minValue, maxValue) {
  return map(noise(seed * 0.31, 4.7), 0, 1, minValue, maxValue);
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - pow(-2 * t + 2, 3) / 2;
}
