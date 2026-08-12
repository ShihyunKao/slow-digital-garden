let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let breath = 0;
let targetBreath = 0;
let particles = [];
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
  noiseSeed(72);
  randomSeed(72);

  for (let i = 0; i < 120; i++) {
    particles.push({
      angle: random(TWO_PI),
      radius: random(70, 280),
      speed: random(0.0008, 0.0022),
      size: random(1.2, 3.8),
      alpha: random(18, 58)
    });
  }
  beginExperience();
}

function draw() {
  drawBackground();

  targetBreath = getBreathAmount();
  breath = lerp(breath, targetBreath, 0.045);

  drawBreathingPond(breath);
  drawHandDisplay();
  drawInterface();
}

function getBreathAmount() {
  if (hands.length >= 2) {
    const a = hands[0].keypoints[8];
    const b = hands[1].keypoints[8];

    const d = dist(a.x, a.y, b.x, b.y);
    return constrain(map(d, 80, 520, 0, 1), 0, 1);
  }

  return max(0, breath - 0.035);
}

function drawBreathingPond(amount) {
  const cx = width / 2;
  const cy = height / 2 + 18;

  const eased = easeInOutCubic(amount);
  const pondRadius = lerp(82, 265, eased);
  const verticalScale = lerp(0.42, 0.68, eased);

  drawSoftGlow(cx, cy, pondRadius, verticalScale, eased);
  drawWaterBody(cx, cy, pondRadius, verticalScale, eased);
  drawRippleLines(cx, cy, pondRadius, verticalScale, eased);
  drawBotanicalEdges(cx, cy, pondRadius, verticalScale, eased);
  drawFloatingParticles(cx, cy, pondRadius, verticalScale, eased);
}

function drawSoftGlow(cx, cy, r, sy, amount) {
  drawingContext.save();
  drawingContext.filter = "blur(28px)";

  noStroke();
  fill(196, 210, 181, 24 + amount * 18);
  ellipse(cx, cy, r * 2.1, r * 2.1 * sy);

  fill(236, 221, 184, 14 + amount * 10);
  ellipse(cx, cy, r * 1.25, r * 1.25 * sy);

  drawingContext.restore();
}

function drawWaterBody(cx, cy, r, sy, amount) {
  noStroke();

  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const rr = r * (1 - t * 0.72);

    fill(
      lerp(28, 78, amount),
      lerp(47, 93, amount),
      lerp(43, 74, amount),
      34 - t * 2
    );

    ellipse(cx, cy, rr * 2, rr * 2 * sy);
  }
}

function drawRippleLines(cx, cy, r, sy, amount) {
  noFill();

  const count = 12;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const rr = r * (0.18 + t * 0.9);
    const alpha = (1 - t * 0.55) * (32 + amount * 34);

    stroke(225, 226, 207, alpha);
    strokeWeight(lerp(0.35, 1.2, 1 - t));

    beginShape();

    for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / 150) {
      const n = noise(
        cos(a) * 1.4 + i * 0.16,
        sin(a) * 1.4,
        frameCount * 0.003
      );

      const wave = map(n, 0, 1, 0.965, 1.035);
      const pulse = sin(frameCount * 0.018 + i * 0.55) * 2.5 * amount;

      curveVertex(
        cx + cos(a) * (rr * wave + pulse),
        cy + sin(a) * (rr * wave + pulse) * sy
      );
    }

    endShape(CLOSE);
  }
}

function drawBotanicalEdges(cx, cy, r, sy, amount) {
  const stems = floor(lerp(8, 22, amount));

  for (let i = 0; i < stems; i++) {
    const angle = map(i, 0, stems, -PI * 0.92, PI * 0.92);
    const side = i % 2 === 0 ? -1 : 1;

    const baseX = cx + cos(angle) * r * 0.88;
    const baseY = cy + sin(angle) * r * sy * 0.88;

    const length = lerp(18, 68, amount) * randomSeeded(i, 0.75, 1.15);
    const curve = side * lerp(8, 28, amount);

    stroke(171, 193, 158, 36 + amount * 55);
    strokeWeight(0.8);
    noFill();

    beginShape();
    curveVertex(baseX, baseY);
    curveVertex(baseX, baseY);
    curveVertex(
      baseX + cos(angle - HALF_PI) * curve,
      baseY - length * 0.45
    );
    curveVertex(
      baseX + cos(angle - HALF_PI) * curve * 1.4,
      baseY - length
    );
    endShape();

    noStroke();
    fill(210, 205, 172, 26 + amount * 38);
    ellipse(
      baseX + cos(angle - HALF_PI) * curve * 1.4,
      baseY - length,
      5 + amount * 8,
      2.5 + amount * 5
    );
  }
}

function drawFloatingParticles(cx, cy, r, sy, amount) {
  noStroke();

  for (const p of particles) {
    p.angle += p.speed * (0.6 + amount);

    const px = cx + cos(p.angle) * p.radius * amount;
    const py = cy + sin(p.angle) * p.radius * sy * amount;

    fill(238, 229, 196, p.alpha * amount);
    circle(px, py, p.size);
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
  if (handDisplayMode === 0 || hands.length === 0) return;

  for (const hand of hands) {
    const points = hand.keypoints;

    if (handDisplayMode === 2) {
      stroke(230, 226, 204, 58);
      strokeWeight(0.75);
      noFill();

      for (const [a, b] of HAND_CONNECTIONS) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    noStroke();
    fill(246, 238, 198, 92);
    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);

    for (const index of visible) {
      circle(points[index].x, points[index].y, handDisplayMode === 1 ? 7 : 3.5);
    }
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
  text("BREATHING COSMOS", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 02.00 / BREATHING FIELD", inset, 47);

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
  text("GESTURE STUDY 02.00", left, panel.y + (compact ? 24 : 36));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Breathing Cosmos", left, panel.y + (compact ? 46 : 65));

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
    "A two-hand gesture creates a live field of expansion, contraction and return.",
    left,
    panel.y + 118,
    dividerX - left - 46
  );

  const stepsY = panel.y + 198;
  const gap = 58;
  drawHelpStep("01", "Select Begin, allow the camera, and bring hands together.", left, stepsY);
  drawHelpStep("02", "Open both hands slowly to expand the breathing field.", left, stepsY + gap);
  drawHelpStep("03", "Return to the centre and begin another cycle.", left, stepsY + gap * 2);

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
    "This early study does not save individual traces yet. It establishes the live breathing system that later versions turn into memory.",
    right,
    panel.y + 146,
    rightWidth
  );

  const legendY = panel.y + 246;
  const legendGap = 40;
  drawArchiveLegendRow("01", "DISTANCE", "hands apart", right, legendY, rightWidth);
  drawArchiveLegendRow("02", "SCALE", "field expansion", right, legendY + legendGap, rightWidth);
  drawArchiveLegendRow("03", "RIPPLES", "breathing contours", right, legendY + legendGap * 2, rightWidth);
  drawArchiveLegendRow("04", "PARTICLES", "slow orbital drift", right, legendY + legendGap * 3, rightWidth);

  textAlign(LEFT, TOP);
  fill(174, 191, 166, 125);
  textSize(10);
  text("P  HAND DISPLAY     R  RESET FIELD     ?  HELP", left, panel.buttonY - 37);
}

function drawCompactHelp(panel, left, contentWidth) {
  fill(201, 207, 191, 165);
  textAlign(LEFT, TOP);
  textSize(12);
  textLeading(17);
  text(
    "A live two-hand breathing field. This early study does not save individual traces yet.",
    left,
    panel.y + 86,
    contentWidth
  );

  const stepsY = panel.y + 126;
  const gap = 39;
  drawHelpStep("01", "Begin with both hands together.", left, stepsY);
  drawHelpStep("02", "Open slowly to expand the field.", left, stepsY + gap);
  drawHelpStep("03", "Return and repeat the cycle.", left, stepsY + gap * 2);

  const keyY = stepsY + gap * 3 + 5;
  fill(174, 191, 166, 115);
  textSize(10);
  text("DISTANCE / HANDS APART     SCALE / FIELD EXPANSION", left, keyY);
  text("RIPPLES / BREATHING        PARTICLES / ORBITAL DRIFT", left, keyY + 18);

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
  if (key === "r" || key === "R") resetBreathingField();
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

function resetBreathingField() {
  breath = 0;
  targetBreath = 0;
}

function startHandMode() {
  if (video || modelLoading || detectionStarted) return;

  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];

  video = createCapture(
    {
      video: {
        width,
        height
      },
      audio: false
    },
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

function randomSeeded(seed, minValue, maxValue) {
  const n = noise(seed * 0.31, 4.7);
  return map(n, 0, 1, minValue, maxValue);
}

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }

  return 1 - pow(-2 * t + 2, 3) / 2;
}
