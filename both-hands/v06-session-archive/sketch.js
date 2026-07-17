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
let currentInput = { amount: 0, symmetry: 1, tilt: 0 };
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
    return { amount: max(0, breath - 0.04), symmetry: 1, tilt: 0 };
  }

  const a = hands[0].keypoints[8];
  const b = hands[1].keypoints[8];
  const maximumDistance = min(width * 0.72, height * 1.15);
  const tilt = constrain((a.y - b.y) / (height * 0.23), -1, 1);

  return {
    amount: constrain(map(dist(a.x, a.y, b.x, b.y), 48, maximumDistance, 0, 1), 0, 1),
    symmetry: 1 - abs(tilt),
    tilt
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
    pauseFrames: 0
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
  const coherence = constrain(slowness * 0.56 + steadiness * 0.44, 0, 1);

  return { slowness, steadiness, balance, tilt, pause, coherence };
}

function addSessionMemory(record) {
  const quality = calculateQuality(record);
  const progress = sessionStep / max(SESSION_LENGTH - 1, 1);
  const maximumRadius = min(width * 0.39, height * 0.58);
  const goldenAngle = PI * (3 - sqrt(5));

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
    starCount: floor(lerp(5, 14, quality.pause)),
    anchorAngle:
      -HALF_PI + sessionStep * goldenAngle + quality.tilt * 0.48,
    anchorScale: lerp(0.84, 1.04, quality.slowness),
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

  drawingContext.save();
  drawingContext.shadowBlur = 12 + memory.flash * 14;
  drawingContext.shadowColor = "rgba(246, 236, 194, 0.58)";
  noStroke();
  fill(251, 241, 199, (115 + pulse * 80 + memory.flash * 70) * opacity);
  circle(anchor.x, anchor.y, 3.5 + pulse * 1.8 + memory.flash * 2.5);
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
    const current = getAnchorPoint(memories[i]);
    const next = getAnchorPoint(memories[(i + 2) % memories.length]);

    stroke(218, 225, 200, (12 + memories[i].quality.coherence * 17) * reveal);
    strokeWeight(0.35);
    line(current.x, current.y, next.x, next.y);

    const innerPull = map(i, 0, memories.length - 1, 0.18, 0.68);
    stroke(232, 227, 198, 15 * reveal);
    line(current.x, current.y, current.x * innerPull, current.y * innerPull);
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
  text("SESSION ARCHIVE", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 06 / EIGHT MOVEMENT BODY MAP", inset, 47);

  textAlign(RIGHT, TOP);
  fill(211, 216, 198, 128);
  textSize(10);
  text(`${modelLoading ? "CAMERA LOADING · " : ""}P ${display} · R RESET · ? HELP`, width - inset, 32);

  stroke(199, 210, 188, 25);
  strokeWeight(1);
  line(inset, 66, width - inset, 66);
}

function getHelpPanelMetrics() {
  const panelWidth = min(620, width - 40);
  const panelHeight = min(500, height - 40);
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
  const compact = panel.height < 440;
  const left = panel.x + (compact ? 34 : 54);
  const contentWidth = panel.width - (compact ? 68 : 108);

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
  text("GESTURE STUDY 06", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Session Archive", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "Eight gentle stretches record nested contours and connect them into one personal bodily star map.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const gap = compact ? 42 : 54;
  drawHelpStep("01", "Select Begin, allow the camera, and bring hands together.", left, stepsY);
  drawHelpStep("02", "Open slowly, pause, then return to fix one contour and anchor.", left, stepsY + gap);
  drawHelpStep("03", "Complete eight stretches to reveal your connected body map.", left, stepsY + gap * 2);

  fill(174, 191, 166, 135);
  textSize(11);
  text("P  HAND DISPLAY     R  RESET ARCHIVE     ?  HELP", left, panel.buttonY - (compact ? 31 : 40));

  const hovering =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  cursor(hovering ? HAND : ARROW);
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
