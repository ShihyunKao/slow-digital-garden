let handPose, video;
let hands = [];
let modelReady = false, videoReady = false, detectionStarted = false, modelLoading = false;

let breath = 0, targetBreath = 0, previousBreath = 0;
let wasOpen = false, memoryStep = 0;
let memories = [], stars = [];
let showHelp = false;
let handDisplayMode = 1; // Default POINTS; P cycles POINTS → SKELETON → HIDDEN

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
  noiseSeed(204); randomSeed(204);
  for (let i = 0; i < 150; i++) {
    stars.push({ angle: random(TWO_PI), radius: random(18, 245), speed: random(0.0005, 0.002), size: random(0.8, 2.8), alpha: random(18, 68), depth: random(0.35, 1) });
  }
  beginExperience();
}

function draw() {
  drawBackground();
  targetBreath = getBreathAmount();
  previousBreath = breath;
  breath = lerp(breath, targetBreath, 0.075);
  if (showHelp) {
    wasOpen = false;
  } else {
    detectBreathMemory();
  }
  drawCosmicField(breath);
  drawMemoryRings();
  drawHandDisplay();
  drawInterface();
}

function getBreathAmount() {
  // If one hand temporarily leaves the camera frame, return smoothly instead
  // of holding the last large state or making the sketch feel frozen.
  if (hands.length < 2) return max(0, breath - 0.035);
  const a = hands[0].keypoints[8], b = hands[1].keypoints[8];
  const maximumDistance = min(width * 0.72, height * 1.15);
  return constrain(map(dist(a.x, a.y, b.x, b.y), 48, maximumDistance, 0, 1), 0, 1);
}

function detectBreathMemory() {
  if (breath > 0.84) wasOpen = true;
  if (wasOpen && breath < 0.30 && previousBreath >= 0.30) {
    addMemory();
    wasOpen = false;
  }
}

function addMemory() {
  const maxSteps = 8;
  const progress = (memoryStep % maxSteps) / (maxSteps - 1);
  const maximumRadius = min(width * 0.42, height * 0.64);
  memories.push({
    age: 0, life: 1500,
    radius: lerp(maximumRadius, maximumRadius * 0.3, progress) + random(-5, 5),
    aspect: random(0.48, 0.62), rotation: random(-0.035, 0.035),
    seed: random(1000), starCount: floor(random(36, 58)), flash: 1
  });
  memoryStep++;
  if (memories.length > maxSteps) memories.shift();
}

function drawCosmicField(amount) {
  const cx = width / 2, cy = height / 2 + 20;
  const eased = easeInOutCubic(amount);
  const maximumRadius = min(width * 0.44, height * 0.68);
  const radius = lerp(14, maximumRadius, eased);
  const aspect = lerp(0.32, 0.61, eased);
  drawGlow(cx, cy, radius, aspect, eased);
  drawFieldBody(cx, cy, radius, aspect, eased);
  drawOrbitLines(cx, cy, radius, aspect, eased);
  drawStarCurrent(cx, cy, radius, aspect, eased);
}

function drawGlow(cx, cy, radius, aspect, amount) {
  drawingContext.save(); drawingContext.filter = "blur(30px)";
  noStroke(); fill(142, 170, 135, 9 + amount * 22);
  ellipse(cx, cy, radius * 2.05, radius * 2.05 * aspect);
  fill(231, 219, 181, 5 + amount * 12);
  ellipse(cx, cy, radius * 0.95, radius * 0.95 * aspect);
  drawingContext.restore();
}

function drawFieldBody(cx, cy, radius, aspect, amount) {
  noStroke();
  for (let i = 0; i < 9; i++) {
    const t = i / 8, rr = radius * (1 - t * 0.78);
    fill(lerp(18, 66, amount), lerp(31, 84, amount), lerp(29, 70, amount), 21 - t * 1.4);
    ellipse(cx, cy, rr * 2, rr * 2 * aspect);
  }
}

function drawOrbitLines(cx, cy, radius, aspect, amount) {
  const count = 12;
  noFill();
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1), rr = radius * (0.2 + t * 0.88);
    const alpha = (1 - t * 0.5) * (10 + amount * 29);
    stroke(220, 226, 205, alpha); strokeWeight(lerp(0.9, 0.3, t));
    beginShape();
    for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / 140) {
      const n = noise(cos(a) * 1.4 + i * 0.17, sin(a) * 1.4, frameCount * 0.002);
      const wave = map(n, 0, 1, 0.975, 1.028);
      curveVertex(cx + cos(a) * rr * wave, cy + sin(a) * rr * wave * aspect);
    }
    endShape(CLOSE);
  }
}

function drawStarCurrent(cx, cy, radius, aspect, amount) {
  noStroke();
  for (const star of stars) {
    star.angle += star.speed * (0.35 + amount * 1.4);
    const rr = star.radius * amount * star.depth;
    fill(238, 231, 198, star.alpha * amount * star.depth);
    circle(cx + cos(star.angle) * rr, cy + sin(star.angle) * rr * aspect, star.size * star.depth);
  }
}

function drawMemoryRings() {
  const cx = width / 2, cy = height / 2 + 20;
  for (let i = memories.length - 1; i >= 0; i--) {
    const memory = memories[i]; memory.age++; memory.flash *= 0.965;
    if (memory.age > memory.life) { memories.splice(i, 1); continue; }
    const fade = 1 - easeInCubic(memory.age / memory.life);
    const grow = easeOutCubic(constrain(memory.age / memory.life * 1.35, 0, 1));
    push(); translate(cx, cy); rotate(memory.rotation);
    drawingContext.save(); drawingContext.filter = "blur(1px)";
    noFill();
    for (let ring = 0; ring < 3; ring++) {
      const rr = memory.radius * (0.92 + ring * 0.11 + grow * 0.06);
      stroke(242, 235, 201, fade * (31 - ring * 5) + memory.flash * 35); strokeWeight(0.55 + memory.flash * 0.45);
      beginShape();
      for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / 160) {
        const wobble = map(noise(memory.seed + cos(a) * 1.7, memory.seed + sin(a) * 1.7, ring * 0.24), 0, 1, 0.985, 1.025);
        curveVertex(cos(a) * rr * wobble, sin(a) * rr * memory.aspect * wobble);
      }
      endShape(CLOSE);
    }
    drawingContext.restore(); noStroke();
    for (let s = 0; s < memory.starCount; s++) {
      const a = s / memory.starCount * TWO_PI + memory.seed * 0.01;
      const rr = memory.radius * randomSeeded(s + memory.seed, 0.86, 1.1);
      fill(246, 238, 198, fade * 42 + memory.flash * 36);
      circle(cos(a) * rr, sin(a) * rr * memory.aspect, randomSeeded(s + 200, 1.4, 3.5));
    }
    pop();
  }
}

function drawBackground() {
  clear();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
}

function drawHandDisplay() {
  if (handDisplayMode === 0) return;
  stroke(230, 226, 204, handDisplayMode === 2 ? 90 : 120); strokeWeight(1); noFill();
  for (const hand of hands) {
    if (handDisplayMode === 2) {
      for (const [a, b] of HAND_CONNECTIONS) line(hand.keypoints[a].x, hand.keypoints[a].y, hand.keypoints[b].x, hand.keypoints[b].y);
    }
    noStroke(); fill(246, 238, 198, 140);
    const points = handDisplayMode === 1 ? [8] : hand.keypoints.map((_, i) => i);
    for (const index of points) circle(hand.keypoints[index].x, hand.keypoints[index].y, handDisplayMode === 1 ? 8 : 4);
  }
}

function drawInterface() {
  syncHelpOverlay();
  if (!showHelp) cursor(ARROW);
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
}

function drawExhibitionCaption() {
  cursor(ARROW);
  const inset = 28;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("COSMIC MEMORY", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 04.00  /  TWO-HAND MEMORY FIELD", inset, 47);

  textAlign(RIGHT, TOP);
  fill(211, 216, 198, 128);
  textSize(10);
  text(`${modelLoading ? "CAMERA LOADING · " : ""}P ${display}   ·   R RESET   ·   ? HELP`, width - inset, 32);

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
  textStyle(NORMAL);
  text("GESTURE STUDY 04.00", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Cosmic Memory", left, panel.y + (compact ? 46 : 65));

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
    "A slow two-hand movement leaves a sequence of orbit-like memories.",
    left,
    panel.y + 118,
    dividerX - left - 46
  );

  const stepsY = panel.y + 198;
  const stepGap = 58;
  drawHelpStep("01", "Move both hands close together.", left, stepsY);
  drawHelpStep("02", "Stretch them slowly apart until the field fully opens.", left, stepsY + stepGap);
  drawHelpStep("03", "Return to the centre to leave one memory ring.", left, stepsY + stepGap * 2);

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
    "Each completed stretch becomes one orbit-like memory. Across eight cycles, the archive moves steadily from the outer field towards its centre.",
    right,
    panel.y + 146,
    rightWidth
  );

  const legendY = panel.y + 246;
  const legendGap = 40;
  drawArchiveLegendRow("01", "CYCLE", "wide stretch + return", right, legendY, rightWidth);
  drawArchiveLegendRow("02", "RADIUS", "outer-to-inner order", right, legendY + legendGap, rightWidth);
  drawArchiveLegendRow("03", "ORBITS", "one memory ring", right, legendY + legendGap * 2, rightWidth);
  drawArchiveLegendRow("04", "STARS", "surrounding constellation", right, legendY + legendGap * 3, rightWidth);

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
    "Each stretch leaves one orbit-like memory in an eight-cycle archive.",
    left,
    panel.y + 86,
    contentWidth
  );

  const stepsY = panel.y + 126;
  const gap = 39;
  drawHelpStep("01", "Begin with both hands together.", left, stepsY);
  drawHelpStep("02", "Open fully, then return.", left, stepsY + gap);
  drawHelpStep("03", "Repeat eight times.", left, stepsY + gap * 2);

  const keyY = stepsY + gap * 3 + 5;
  fill(174, 191, 166, 115);
  textSize(10);
  text("CYCLE / WIDE STRETCH + RETURN     RADIUS / OUTER TO INNER", left, keyY);
  text("ORBITS / MEMORY RING              STARS / CONSTELLATION", left, keyY + 18);

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

  if (key === "p" || key === "P") handDisplayMode = (handDisplayMode + 1) % 3;
  if (key === "r" || key === "R") { memories = []; wasOpen = false; memoryStep = 0; }
}

function mousePressed() {
  if (showHelp) return false;
}

function beginExperience() {
  showHelp = false;
  syncHelpOverlay();
  cursor(ARROW);
  startHandMode();
}

function startHandMode() {
  if (video || modelLoading || detectionStarted) return;
  modelLoading = true; modelReady = false; videoReady = false; detectionStarted = false; hands = [];
  video = createCapture({ video: { width, height }, audio: false }, () => { videoReady = true; tryStartDetection(); });
  video.size(width, height); video.hide();
  handPose = ml5.handPose({ flipped: true }, () => { modelReady = true; modelLoading = false; tryStartDetection(); });
}

function tryStartDetection() {
  if (modelReady && videoReady && !detectionStarted) { handPose.detectStart(video, gotHands); detectionStarted = true; }
}
function gotHands(results) { hands = results; }

function randomSeeded(seed, minValue, maxValue) { return map(noise(seed * 0.31, 4.7), 0, 1, minValue, maxValue); }
function easeOutCubic(t) { return 1 - pow(1 - t, 3); }
function easeInCubic(t) { return t * t * t; }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2; }
