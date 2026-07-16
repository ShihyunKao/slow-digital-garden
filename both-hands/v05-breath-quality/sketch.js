let handPose;
let video;
let hands = [];

let inputMode = "hand";
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
let memoryStep = 0;
let fieldStars = [];
let savedFlash = 0;

const MAX_MEMORIES = 12;
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
}

function draw() {
  drawBackground();

  currentInput = getBreathInput();
  targetBreath = currentInput.amount;
  previousBreath = breath;
  breath = lerp(breath, targetBreath, 0.1);

  if (!showHelp) updateBreathCycle();
  else cycle = null;

  drawCosmicField(breath);
  drawQualityMemories();

  if (!showHelp) {
    drawHandDisplay();
    drawCycleFeedback();
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
  const verticalDifference = a.y - b.y;
  const tilt = constrain(verticalDifference / (height * 0.23), -1, 1);

  return {
    amount: constrain(map(dist(a.x, a.y, b.x, b.y), 48, maximumDistance, 0, 1), 0, 1),
    symmetry: 1 - abs(tilt),
    tilt
  };
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
    if (savedFlash > 0) drawFeedbackLabel("MEMORY RECORDED", 1);
    return;
  }

  let instruction = "OPEN SLOWLY";
  if (breath > 0.76) instruction = "PAUSE — THEN RETURN";
  else if (previousBreath > breath) instruction = "RETURN SLOWLY";

  drawFeedbackLabel(instruction, quality.coherence);
  drawQualityIndicators(quality);
}

function drawFeedbackLabel(label, strength) {
  textAlign(CENTER, CENTER);
  noStroke();
  fill(232, 229, 208, 105 + strength * 105);
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
    fill(194, 205, 187, 82);
    textSize(8);
    text(labels[i][0], x, y - 7);

    stroke(183, 200, 178, 28);
    strokeWeight(1);
    line(x, y + 6, x + itemWidth - 20, y + 6);
    stroke(235, 226, 190, 85 + value * 100);
    strokeWeight(1.2);
    line(x, y + 6, x + (itemWidth - 20) * value, y + 6);
  }
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
  if (inputMode !== "hand" || handDisplayMode === 0) return;

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
  text("BREATH QUALITY", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 05 / QUALITY-BASED MEMORY RINGS", inset, 47);

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
  text("GESTURE STUDY 05", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Breath Quality", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "Each complete two-hand movement leaves a ring shaped by its speed, steadiness, balance and pause.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const gap = compact ? 42 : 54;
  drawHelpStep("01", "Select Begin, allow the camera, and bring hands together.", left, stepsY);
  drawHelpStep("02", "Open slowly and pause in the extended position.", left, stepsY + gap);
  drawHelpStep("03", "Return slowly to create one quality-based memory ring.", left, stepsY + gap * 2);

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

  if (key === "r" || key === "R") {
    memories = [];
    cycle = null;
    memoryStep = 0;
    savedFlash = 0;
    readyForCycle = true;
  }
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

function startHandMode() {
  if (video || modelLoading) return;

  inputMode = "hand";
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
  if (inputMode === "hand" && modelReady && videoReady && !detectionStarted) {
    handPose.detectStart(video, gotHands);
    detectionStarted = true;
  }
}

function gotHands(results) {
  hands = results;
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
  if (video) video.size(width, height);
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
