let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = true;
let handDisplayMode = 0; // 0 hidden, 1 points, 2 skeleton

let breath = 0;
let targetBreath = 0;
let previousBreath = 0;
let currentInput = {
  amount: 0,
  symmetry: 1,
  tilt: 0,
  midpointX: 0.5,
  midpointY: 0.5
};
let cycle = null;
let readyForCycle = true;

let memories = [];
let sessionStep = 0;
let sessionComplete = false;
let completionAge = 0;
let savedFlash = 0;

const SESSION_LENGTH = 8;
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
  pixelDensity(1);
  randomSeed(1106);
  noiseSeed(1106);
}

function draw() {
  drawBackground();

  currentInput = getBreathInput();
  targetBreath = currentInput.amount;
  previousBreath = breath;
  breath = lerp(breath, targetBreath, 0.1);

  if (!showHelp && !sessionComplete) updateSessionCycle();
  else if (showHelp) cycle = null;

  if (sessionComplete) completionAge++;

  drawArchiveScaffold(breath);
  drawArchiveRings();
  drawArchivePath();
  drawCompletedBodyMap();

  if (!showHelp) {
    drawHandDisplay();
    drawSessionFeedback();
    drawHeader();
  }

  savedFlash = max(0, savedFlash - 1);

  if (showHelp) drawHelpScreen();
}

function getBreathInput() {
  if (hands.length < 2) {
    return {
      amount: max(0, breath - 0.04),
      symmetry: 1,
      tilt: 0,
      midpointX: 0.5,
      midpointY: 0.5
    };
  }

  const a = hands[0].keypoints[8];
  const b = hands[1].keypoints[8];
  const maximumDistance = min(width * 0.72, height * 1.15);
  const tilt = constrain((a.y - b.y) / (height * 0.23), -1, 1);

  return {
    amount: constrain(map(dist(a.x, a.y, b.x, b.y), 48, maximumDistance, 0, 1), 0, 1),
    symmetry: 1 - abs(tilt),
    tilt,
    midpointX: constrain((a.x + b.x) / 2 / width, 0, 1),
    midpointY: constrain((a.y + b.y) / 2 / height, 0, 1)
  };
}

function createCycle() {
  return {
    maxBreath: 0,
    opened: false,
    movingFrames: 0,
    sampleFrames: 0,
    deltaSum: 0,
    deltaSquaredSum: 0,
    symmetrySum: 0,
    tiltSum: 0,
    pauseFrames: 0,
    wideMidXSum: 0,
    wideMidYSum: 0,
    wideFrames: 0
  };
}

function updateSessionCycle() {
  const delta = breath - previousBreath;
  const absoluteDelta = abs(delta);

  if (breath < 0.18) readyForCycle = true;

  if (!cycle && readyForCycle && breath > 0.24) {
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

  if (breath > 0.55) {
    cycle.wideMidXSum += currentInput.midpointX;
    cycle.wideMidYSum += currentInput.midpointY;
    cycle.wideFrames++;
  }

  if (cycle.opened && breath < 0.3) {
    addSessionMemory(cycle);
    cycle = null;
    return;
  }

  if (!cycle.opened && breath < 0.08 && cycle.sampleFrames > 25) {
    cycle = null;
  }
}

function calculateQuality(record) {
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
  const duration = constrain(map(record.sampleFrames, 55, 280, 0, 1), 0, 1);
  const wideFrames = max(record.wideFrames, 1);
  const averageMidX = record.wideFrames > 0 ? record.wideMidXSum / wideFrames : 0.5;
  const averageMidY = record.wideFrames > 0 ? record.wideMidYSum / wideFrames : 0.5;
  const horizontalPosition = constrain(map(averageMidX, 0.36, 0.64, -1, 1), -1, 1);
  const verticalPosition = constrain(map(averageMidY, 0.27, 0.73, -1, 1), -1, 1);
  const coherence = constrain(slowness * 0.56 + steadiness * 0.44, 0, 1);

  return {
    slowness,
    steadiness,
    balance,
    tilt,
    pause,
    duration,
    horizontalPosition,
    verticalPosition,
    coherence
  };
}

function addSessionMemory(record) {
  const quality = calculateQuality(record);
  const progress = sessionStep / max(SESSION_LENGTH - 1, 1);
  const maximumRadius = min(width * 0.39, height * 0.58);
  let directionX = quality.horizontalPosition;
  let directionY = quality.verticalPosition;

  if (abs(directionX) + abs(directionY) < 0.12) {
    directionX = quality.tilt;
    directionY = map(quality.pause, 0, 1, -0.72, 0.72);
  }

  const anchorAngle = atan2(directionY, directionX);

  const memory = {
    step: sessionStep,
    age: 0,
    radius: lerp(maximumRadius, maximumRadius * 0.2, progress),
    aspect: lerp(0.5, 0.64, quality.balance),
    rotation: quality.tilt * 0.18,
    seed: random(1000),
    flash: 1,
    completeness: lerp(0.76, 0.995, quality.coherence),
    brightness: lerp(0.58, 1, quality.coherence),
    roughness: lerp(0.055, 0.009, quality.steadiness),
    starCount: floor(lerp(5, 22, quality.duration)),
    anchorAngle,
    anchorScale: lerp(0.76, 1.08, quality.slowness),
    anchorSize: lerp(3.8, 9.2, quality.pause),
    quality
  };

  memory.contourSegments = buildArchiveContour(memory);
  memory.stars = buildArchiveStars(memory);
  memories.push(memory);

  sessionStep++;
  savedFlash = 100;

  if (sessionStep >= SESSION_LENGTH) {
    sessionComplete = true;
    completionAge = 0;
  }
}

function buildArchiveContour(memory) {
  const segments = [];
  let segment = [];
  const angleStep = TWO_PI / 180;

  for (let angle = 0; angle <= TWO_PI + angleStep; angle += angleStep) {
    const gate = noise(
      memory.seed + cos(angle) * 1.72,
      memory.seed + sin(angle) * 1.72,
      0.42
    );
    const visible = gate < memory.completeness * 0.62 + 0.37;
    const surface = noise(
      memory.seed * 0.51 + cos(angle) * 2.35,
      memory.seed * 0.51 + sin(angle) * 2.35,
      0.18
    );
    const wobble = map(
      surface,
      0,
      1,
      1 - memory.roughness,
      1 + memory.roughness
    );

    if (visible) {
      segment.push({
        x: cos(angle) * memory.radius * wobble,
        y: sin(angle) * memory.radius * memory.aspect * wobble
      });
    } else if (segment.length > 1) {
      segments.push(segment);
      segment = [];
    } else {
      segment = [];
    }
  }

  if (segment.length > 1) segments.push(segment);
  return segments;
}

function buildArchiveStars(memory) {
  const stars = [];

  for (let i = 0; i < memory.starCount; i++) {
    const angle =
      memory.anchorAngle +
      map(i, 0, max(memory.starCount - 1, 1), -0.72, 0.72) +
      randomSeeded(memory.seed + i * 3.2, -0.12, 0.12);
    const rr = memory.radius * randomSeeded(memory.seed + i * 2.7, 0.94, 1.04);

    stars.push({
      x: cos(angle) * rr,
      y: sin(angle) * rr * memory.aspect,
      size: randomSeeded(memory.seed + i + 200, 1.1, 2.8),
      phase: i * 1.7 + memory.seed
    });
  }

  return stars;
}

function getArchiveRadius(step) {
  const maximumRadius = min(width * 0.39, height * 0.58);
  const progress = step / max(SESSION_LENGTH - 1, 1);
  return lerp(maximumRadius, maximumRadius * 0.2, progress);
}

function drawArchiveScaffold(amount) {
  const cx = width / 2;
  const cy = height / 2 + 20;
  const guideAspect = 0.57;

  noFill();

  for (let i = 0; i < SESSION_LENGTH; i++) {
    const rr = getArchiveRadius(i);
    const recorded = i < sessionStep;
    const current = i === sessionStep && !sessionComplete;

    noFill();
    stroke(187, 205, 180, recorded ? 8 : current ? 22 : 6);
    strokeWeight(current ? 0.65 : 0.35);
    ellipse(cx, cy, rr * 2, rr * 2 * guideAspect);

    const markerAngle = -HALF_PI;
    noStroke();
    fill(213, 220, 199, recorded ? 38 : current ? 95 : 18);
    circle(
      cx + cos(markerAngle) * rr,
      cy + sin(markerAngle) * rr * guideAspect,
      current ? 3.8 : 2.2
    );
  }

  if (sessionComplete || sessionStep >= SESSION_LENGTH) return;

  const rr = getArchiveRadius(sessionStep);
  const eased = easeInOutCubic(amount);
  const sweepEnd = -HALF_PI + TWO_PI * eased;

  drawingContext.save();
  drawingContext.shadowBlur = 18 + eased * 16;
  drawingContext.shadowColor = "rgba(228, 226, 193, 0.38)";
  noFill();
  stroke(239, 233, 201, 32 + eased * 105);
  strokeWeight(0.85 + eased * 0.45);
  arc(cx, cy, rr * 2, rr * 2 * guideAspect, -HALF_PI, sweepEnd);
  noStroke();
  fill(250, 241, 201, 80 + eased * 165);
  circle(
    cx + cos(sweepEnd) * rr,
    cy + sin(sweepEnd) * rr * guideAspect,
    3.2 + eased * 3.2
  );
  drawingContext.restore();

  drawingContext.save();
  drawingContext.filter = "blur(22px)";
  noStroke();
  fill(117, 153, 124, 5 + eased * 13);
  ellipse(cx, cy, rr * 2.12, rr * 2.12 * guideAspect);
  drawingContext.restore();
}

function drawArchiveRings() {
  const cx = width / 2;
  const cy = height / 2 + 20;
  const newest = memories.length > 0 ? memories[memories.length - 1] : null;

  for (const memory of memories) {
    memory.age++;
    memory.flash *= 0.955;

    const appear = easeOutCubic(constrain(memory.age / 38, 0, 1));
    const completeLift = sessionComplete
      ? lerp(0.82, 1.08, easeOutCubic(constrain(completionAge / 130, 0, 1)))
      : 1;
    const opacity = appear * completeLift;

    push();
    translate(cx, cy);
    rotate(memory.rotation);

    drawArchiveContour(memory, opacity);
    drawArchiveStars(memory, opacity);
    drawAnchorStar(memory, opacity);

    if (memory === newest && memory.age < 120 && !sessionComplete) {
      drawNewArchiveReveal(memory);
    }

    pop();
  }
}

function drawArchiveContour(memory, opacity) {
  noFill();
  stroke(
    235,
    232,
    207,
    (22 + memory.brightness * 66 + memory.flash * 34) * opacity
  );
  strokeWeight(0.42 + memory.brightness * 0.48 + memory.flash * 0.18);

  for (const segment of memory.contourSegments) {
    beginShape();
    for (const point of segment) vertex(point.x, point.y);
    endShape();
  }
}

function drawArchiveStars(memory, opacity) {
  noStroke();

  for (const star of memory.stars) {
    const pulse = sin(frameCount * 0.024 + star.phase) * 0.5 + 0.5;
    fill(245, 237, 198, (28 + memory.brightness * 62 + pulse * 22) * opacity);
    circle(star.x, star.y, star.size + pulse * 0.6);
  }
}

function getAnchorPoint(memory, scaleAmount = 1, includeRotation = true) {
  const rr = memory.radius * memory.anchorScale * scaleAmount;
  const localX = cos(memory.anchorAngle) * rr;
  const localY = sin(memory.anchorAngle) * rr * memory.aspect;

  if (!includeRotation) return { x: localX, y: localY };

  return {
    x: localX * cos(memory.rotation) - localY * sin(memory.rotation),
    y: localX * sin(memory.rotation) + localY * cos(memory.rotation)
  };
}

function drawAnchorStar(memory, opacity) {
  const anchor = getAnchorPoint(memory, 1, false);
  const pulse = sin(frameCount * 0.035 + memory.seed) * 0.5 + 0.5;
  const stabilityLight = lerp(0.55, 1, memory.quality.steadiness);

  drawingContext.save();
  drawingContext.shadowBlur = 12 + memory.flash * 14;
  drawingContext.shadowColor = "rgba(246, 236, 194, 0.58)";
  noStroke();
  fill(
    251,
    241,
    199,
    (95 + stabilityLight * 105 + pulse * 42 + memory.flash * 70) * opacity
  );
  circle(
    anchor.x,
    anchor.y,
    memory.anchorSize + pulse * 1.4 + memory.flash * 2.5
  );
  drawingContext.restore();
}

function drawNewArchiveReveal(memory) {
  const progress = easeOutCubic(constrain(memory.age / 80, 0, 1));
  const fade = 1 - easeInCubic(constrain(memory.age / 120, 0, 1));
  const anchor = getAnchorPoint(memory, progress, false);

  drawingContext.save();
  drawingContext.shadowBlur = 22;
  drawingContext.shadowColor = "rgba(246, 236, 194, 0.6)";
  noStroke();
  fill(252, 242, 201, 210 * fade);
  circle(anchor.x, anchor.y, 7 + memory.flash * 3);
  drawingContext.restore();
}

function drawArchivePath() {
  if (memories.length < 2) return;

  const cx = width / 2;
  const cy = height / 2 + 20;
  const finalReveal = sessionComplete
    ? easeOutCubic(constrain(completionAge / 120, 0, 1))
    : 0;

  push();
  translate(cx, cy);

  drawingContext.save();
  drawingContext.shadowBlur = 10 + finalReveal * 12;
  drawingContext.shadowColor = "rgba(236, 228, 191, 0.34)";
  noFill();
  stroke(226, 226, 201, 30 + finalReveal * 68);
  strokeWeight(0.55 + finalReveal * 0.35);
  beginShape();

  const first = getAnchorPoint(memories[0]);
  curveVertex(first.x, first.y);
  curveVertex(first.x, first.y);

  for (const memory of memories) {
    const anchor = getAnchorPoint(memory);
    curveVertex(anchor.x, anchor.y);
  }

  const last = getAnchorPoint(memories[memories.length - 1]);
  curveVertex(last.x, last.y);
  endShape();
  drawingContext.restore();
  pop();
}

function drawCompletedBodyMap() {
  if (!sessionComplete || memories.length < SESSION_LENGTH) return;

  const cx = width / 2;
  const cy = height / 2 + 20;
  const reveal = easeOutCubic(constrain(completionAge / 160, 0, 1));

  push();
  translate(cx, cy);

  drawingContext.save();
  drawingContext.filter = "blur(28px)";
  noStroke();
  fill(112, 150, 122, 20 * reveal);
  ellipse(0, 0, getArchiveRadius(0) * 1.55, getArchiveRadius(0) * 0.95);
  fill(233, 221, 181, 12 * reveal);
  circle(0, 0, 105 * reveal);
  drawingContext.restore();

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    const anchor = getAnchorPoint(memory);
    const readPulse =
      sin(frameCount * 0.025 - i * 0.9) * 0.5 + 0.5;
    const haloSize =
      memory.anchorSize * 2.2 +
      memory.quality.duration * 11 +
      readPulse * 3;

    noFill();
    stroke(
      237,
      231,
      198,
      (10 + memory.quality.steadiness * 28 + readPulse * 12) * reveal
    );
    strokeWeight(0.4);
    circle(anchor.x, anchor.y, haloSize);
  }

  drawingContext.save();
  drawingContext.shadowBlur = 22 * reveal;
  drawingContext.shadowColor = "rgba(248, 238, 196, 0.55)";
  noStroke();
  fill(250, 240, 198, 190 * reveal);
  circle(0, 0, 4 + reveal * 4);
  drawingContext.restore();
  pop();
}

function drawSessionFeedback() {
  if (sessionComplete) {
    drawStatus("SESSION ARCHIVE COMPLETE — R TO BEGIN AGAIN", 1);
    return;
  }

  let instruction = `STRETCH ${min(sessionStep + 1, SESSION_LENGTH)} OF ${SESSION_LENGTH}`;

  if (cycle) {
    if (breath > 0.65) instruction += " · PAUSE, THEN RETURN";
    else if (previousBreath > breath) instruction += " · RETURN SLOWLY";
    else instruction += " · OPEN SLOWLY";
  } else if (savedFlash > 0) {
    instruction = `MEMORY ${sessionStep} RECORDED`;
  } else {
    instruction += " · BRING HANDS TOGETHER";
  }

  drawStatus(instruction, sessionStep / SESSION_LENGTH);
}

function drawStatus(label, progress) {
  const barWidth = min(420, width - 100);
  const y = height - 38;

  textAlign(CENTER, CENTER);
  noStroke();
  fill(232, 229, 208, 175);
  textSize(10);
  text(label, width / 2, y - 16);

  stroke(184, 201, 178, 32);
  strokeWeight(1);
  line(width / 2 - barWidth / 2, y, width / 2 + barWidth / 2, y);

  stroke(237, 227, 191, 175);
  strokeWeight(1.4);
  line(
    width / 2 - barWidth / 2,
    y,
    width / 2 - barWidth / 2 + barWidth * progress,
    y
  );
}

function drawBackground() {
  background(9, 19, 17);
  noStroke();
  for (let y = 0; y < height; y += 5) {
    fill(30, 45, 39, map(y, 0, height, 16, 2));
    rect(0, y, width, 5);
  }
  fill(240, 232, 205, 4);
  rect(22, 22, width - 44, height - 44);
}

function drawHandDisplay() {
  if (handDisplayMode === 0) return;

  for (const hand of hands) {
    const points = hand.keypoints;

    if (handDisplayMode === 2) {
      stroke(230, 226, 204, 58);
      strokeWeight(0.75);
      for (const [a, b] of HAND_CONNECTIONS) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);
    noStroke();
    fill(246, 238, 198, 92);
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
  text("SESSION ARCHIVE SPATIAL", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 08 / POSITION-DRIVEN BODY MAP", inset, 47);

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
  text("GESTURE STUDY 08", left, panel.y + (compact ? 24 : 36));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Session Archive Spatial", left, panel.y + (compact ? 46 : 65));

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
    "Eight gentle stretches record nested contours and connect them into one personal bodily star map.",
    left,
    panel.y + 118,
    dividerX - left - 46
  );

  const stepsY = panel.y + 198;
  const gap = 58;
  drawHelpStep("01", "Select Begin, allow the camera, and bring hands together.", left, stepsY);
  drawHelpStep("02", "Open slowly, pause, then return to fix one contour and anchor.", left, stepsY + gap);
  drawHelpStep("03", "Complete eight stretches to reveal your connected body map.", left, stepsY + gap * 2);

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
    "While both hands are widely open, the system averages the midpoint between the two index fingers. Shift the whole stretch left, right, up or down; the anchor follows the same direction.",
    right,
    panel.y + 146,
    rightWidth
  );

  const legendY = panel.y + 246;
  const legendGap = 40;
  drawArchiveLegendRow("01", "DIRECTION", "two-hand midpoint", right, legendY, rightWidth);
  drawArchiveLegendRow("02", "DISTANCE", "movement slowness", right, legendY + legendGap, rightWidth);
  drawArchiveLegendRow("03", "SIZE", "open-palm pause", right, legendY + legendGap * 2, rightWidth);
  drawArchiveLegendRow("04", "LIGHT", "movement steadiness", right, legendY + legendGap * 3, rightWidth);
  drawArchiveLegendRow("05", "STARS", "stretch duration", right, legendY + legendGap * 4, rightWidth);

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
    "Eight stretches accumulate into one personal bodily star map.",
    left,
    panel.y + 86,
    contentWidth
  );

  const stepsY = panel.y + 126;
  const gap = 39;
  drawHelpStep("01", "Begin with both hands together.", left, stepsY);
  drawHelpStep("02", "Open, pause, then return.", left, stepsY + gap);
  drawHelpStep("03", "Repeat eight times.", left, stepsY + gap * 2);

  const keyY = stepsY + gap * 3 + 5;
  fill(174, 191, 166, 115);
  textSize(10);
  text("DIRECTION / TWO-HAND MIDPOINT", left, keyY);
  text("DISTANCE / SLOWNESS     SIZE / PAUSE", left, keyY + 16);
  text("LIGHT / STEADINESS      STARS / DURATION", left, keyY + 32);

  fill(174, 191, 166, 120);
  textSize(9);
  text("P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - 28);
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

  if (key === "r" || key === "R") resetSession();
}

function mousePressed() {
  if (!showHelp) return;

  const panel = getHelpPanelMetrics();
  const insideButton =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  if (insideButton) beginExperience();
}

function beginExperience() {
  showHelp = false;
  if (!video && !modelLoading) startHandMode();
}

function resetSession() {
  memories = [];
  sessionStep = 0;
  sessionComplete = false;
  completionAge = 0;
  cycle = null;
  readyForCycle = true;
  savedFlash = 0;
}

function startHandMode() {
  if (video || modelLoading) return;

  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];
  cycle = null;
  readyForCycle = true;

  video = createCapture(
    { video: { width, height }, audio: false },
    () => {
      videoReady = true;
      tryStartDetection();
    }
  );

  video.size(width, height);
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
  if (modelReady && videoReady && !detectionStarted) {
    handPose.detectStart(video, gotHands);
    detectionStarted = true;
  }
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
  resetSession();
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
