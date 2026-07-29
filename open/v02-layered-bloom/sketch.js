let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = true;
let handDisplayMode = 1; // Default POINTS; P cycles POINTS → SKELETON → HIDDEN
let openness = 0;
let targetOpenness = 0;
let backgroundPoints = [];

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

const TIP_INDICES = [4, 8, 12, 16, 20];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noiseSeed(12);
  randomSeed(12);

  for (let i = 0; i < 100; i++) {
    backgroundPoints.push({
      x: random(width),
      y: random(height),
      size: random(0.5, 1.7),
      alpha: random(4, 16),
      phase: random(TWO_PI)
    });
  }
}

function draw() {
  drawBackground();

  const hand = hands.length > 0 ? hands[0] : null;
  targetOpenness = hand ? getHandOpenness(hand) : openness * 0.94;
  openness = lerp(openness, targetOpenness, 0.055);

  if (!showHelp) {
    drawLayeredBloom(width / 2, height * 0.53, openness);
    drawTechnicalHand(hand);
    drawHeader();
  }

  if (showHelp) drawHelpScreen();
}

function getHandOpenness(hand) {
  const points = hand.keypoints;
  const wrist = points[0];
  const palmSize = dist(points[5].x, points[5].y, points[17].x, points[17].y);

  if (palmSize < 1) return 0;

  let totalDistance = 0;

  for (const index of TIP_INDICES) {
    totalDistance += dist(wrist.x, wrist.y, points[index].x, points[index].y);
  }

  const ratio = totalDistance / TIP_INDICES.length / palmSize;
  return constrain(map(ratio, 1.15, 2.65, 0, 1), 0, 1);
}

function drawLayeredBloom(cx, cy, amount) {
  const totalLayers = 46;
  const time = frameCount * 0.0018;

  push();
  translate(cx, cy);

  for (let layer = totalLayers; layer >= 1; layer--) {
    const layerAmount = layer / totalLayers;
    const closedRadius = 5 + layerAmount * 13;
    const openRadius = 22 + pow(layerAmount, 0.88) * min(width, height) * 0.35;
    const radius = lerp(closedRadius, openRadius, amount);
    const irregularity = amount * (3 + layerAmount * 22);

    const lineColour = layer % 6 === 0
      ? color(215, 192, 160)
      : color(169, 192, 154);

    lineColour.setAlpha(18 + amount * 58);
    stroke(lineColour);
    strokeWeight(0.45 + layerAmount * 0.75);

    if (layer % 8 === 0) {
      fill(184, 197, 164, 3 + amount * 5);
    } else {
      noFill();
    }

    beginShape();

    for (let point = 0; point <= 150; point++) {
      const angle = map(point, 0, 150, 0, TWO_PI);
      const noiseValue = noise(
        cos(angle) * 0.75 + 2.5,
        sin(angle) * 0.75 + 2.5,
        layer * 0.075 + time
      );

      const wave = sin(angle * 3 + layer * 0.13 + time * 8) * irregularity * 0.25;
      const distortedRadius = radius + map(noiseValue, 0, 1, -irregularity, irregularity) + wave;

      vertex(
        cos(angle) * distortedRadius,
        sin(angle) * distortedRadius * (0.88 + layerAmount * 0.08)
      );
    }

    endShape(CLOSE);
  }

  noStroke();
  fill(226, 221, 197, 110 + amount * 70);
  circle(0, 0, lerp(7, 15, amount));

  pop();
}

function drawTechnicalHand(hand) {
  if (!hand || handDisplayMode === 0) return;

  const points = hand.keypoints;

  if (handDisplayMode === 1) {
    noStroke();
    fill(240, 231, 194, 62);

    for (const index of TIP_INDICES) {
      circle(points[index].x, points[index].y, 3.5);
    }

    return;
  }

  noFill();
  stroke(230, 226, 204, 45);
  strokeWeight(0.7);

  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(240, 231, 194, 72);

  for (const point of points) {
    circle(point.x, point.y, 3.5);
  }
}

function drawBackground() {
  background(9, 19, 17);
  noStroke();

  for (let y = 0; y < height; y += 5) {
    fill(30, 45, 39, map(y, 0, height, 18, 3));
    rect(0, y, width, 5);
  }

  for (const point of backgroundPoints) {
    const flicker = sin(frameCount * 0.012 + point.phase) * 0.5 + 0.5;
    fill(222, 219, 194, point.alpha * (0.65 + flicker * 0.35));
    circle(point.x, point.y, point.size);
  }

  fill(240, 232, 205, 5);
  rect(34, 34, width - 68, height - 68);
}

function drawHeader() {
  const inset = 38;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("LAYERED BLOOM", inset, 27);

  fill(196, 207, 188, 100);
  textSize(10);
  text("GESTURE STUDY 02 / OPEN PALM CONTOUR FIELD", inset, 47);

  textAlign(RIGHT, TOP);
  fill(206, 212, 196, 120);
  textSize(11);
  text(`${modelLoading ? "CAMERA LOADING · " : ""}P ${display} · ? HELP`, width - inset, 30);

  stroke(232, 229, 210, 20);
  strokeWeight(1);
  line(inset, 70, width - inset, 70);
}

function getHelpPanelMetrics() {
  const panelWidth = min(620, width - 40);
  const panelHeight = min(510, height - 40);

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
  text("GESTURE STUDY 02", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Layered Bloom", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "An opening palm unfolds a layered contour field. A small movement becomes a slow, shifting expansion.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const gap = compact ? 42 : 54;
  drawHelpStep("01", "Select Begin and allow access to the camera.", left, stepsY);
  drawHelpStep("02", "Show one hand and open your palm slowly.", left, stepsY + gap);
  drawHelpStep("03", "Open and close to unfold and gather the contour field.", left, stepsY + gap * 2);

  fill(174, 191, 166, 135);
  textSize(11);
  text("P  HAND DISPLAY     ?  HELP", left, panel.buttonY - (compact ? 31 : 40));

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
    showHelp = !showHelp;
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

  if (!video && !modelLoading) {
    startHandMode();
  }
}

function startHandMode() {
  if (video || modelLoading) return;

  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];

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
}
