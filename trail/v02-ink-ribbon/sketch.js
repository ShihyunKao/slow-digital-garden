let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let blooms = [];
let previousPoint = null;
let lastGestureFrame = -1000;
let showHelp = false;
let handDisplayMode = 1; // 0 hidden, 1 points, 2 skeleton
let backgroundPoints = [];

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];
const MAX_BLOOMS = 80;
const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noiseSeed(12);
  randomSeed(12);
  createBackgroundPoints();
  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);
  startHandMode();
}

function draw() {
  drawWarmPaper();

  if (!showHelp) {
    const point = getInputPoint();

    if (point) {
      updateInk(point);
    } else {
      previousPoint = null;
    }
  }

  drawBlooms();

  if (!showHelp) {
    drawHandDisplay();
    drawInterface();
  }

  syncHelpOverlay();
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
}

function getInputPoint() {
  if (hands.length > 0) {
    return toCanvasPoint(hands[0].keypoints[8]);
  }

  return null;
}

function toCanvasPoint(point) {
  const sourceWidth = video ? video.width : CAMERA_WIDTH;
  const sourceHeight = video ? video.height : CAMERA_HEIGHT;

  return {
    x: point.x * (width / sourceWidth),
    y: point.y * (height / sourceHeight)
  };
}

function updateInk(point) {
  if (!insideCanvas(point.x, point.y)) return;

  if (previousPoint === null) {
    previousPoint = { x: point.x, y: point.y };
    lastGestureFrame = frameCount;
    addBloom(point.x, point.y, 0.7);
    return;
  }

  const movement = dist(point.x, point.y, previousPoint.x, previousPoint.y);

  if (movement > 1.2) {
    lastGestureFrame = frameCount;
  }

  if (movement > 18) {
    const slowness = constrain(map(movement, 0, 80, 1, 0.22), 0.22, 1);

    addBloom(
      lerp(previousPoint.x, point.x, 0.55),
      lerp(previousPoint.y, point.y, 0.55),
      slowness
    );

    previousPoint = { x: point.x, y: point.y };
  }
}

function addBloom(x, y, slowness) {
  blooms.push({
    x: x + random(-4, 4),
    y: y + random(-4, 4),
    age: 0,
    fadeAge: 0,
    growLife: random(180, 280),
    life: random(900, 1350),
    startRadius: random(4, 10),
    endRadius: random(70, 135) * slowness,
    strength: random(0.35, 0.72) * slowness,
    aspect: random(0.72, 1.18),
    seed: random(1000)
  });

  if (blooms.length > MAX_BLOOMS) {
    blooms.shift();
  }
}

function drawBlooms() {
  const gestureIsActive = frameCount - lastGestureFrame < 24;

  for (let i = blooms.length - 1; i >= 0; i--) {
    const bloom = blooms[i];
    bloom.age++;

    if (!gestureIsActive) {
      bloom.fadeAge++;
    }

    if (bloom.fadeAge > bloom.life) {
      blooms.splice(i, 1);
      continue;
    }

    drawMistBloom(bloom);
  }
}

function drawMistBloom(bloom) {
  const grow = easeOutQuart(constrain(bloom.age / bloom.growLife, 0, 1));
  const fade = 1 - pow(constrain(bloom.fadeAge / bloom.life, 0, 1), 5);

  const radius = lerp(bloom.startRadius, bloom.endRadius, grow);
  const alpha = 34 * bloom.strength * fade;

  drawingContext.save();
  drawingContext.filter = "blur(14px)";

  noStroke();

  for (let i = 0; i < 8; i++) {
    const layer = i / 7;
    const r = radius * (0.18 + layer * 1.08);
    const a = alpha * pow(1 - layer, 1.7);

    fill(101, 215, 196, a * 1.45);

    beginShape();

    for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 80) {
      const n = noise(
        bloom.seed + cos(angle) * 1.2,
        bloom.seed + sin(angle) * 1.2,
        i * 0.13 + frameCount * 0.0015
      );

      const uneven = map(n, 0, 1, 0.88, 1.12);

      curveVertex(
        bloom.x + cos(angle) * r * uneven,
        bloom.y + sin(angle) * r * uneven * bloom.aspect
      );
    }

    endShape(CLOSE);
  }

  drawingContext.restore();

  drawQuietEdge(bloom, radius, alpha);
}

function drawQuietEdge(bloom, radius, alpha) {
  noFill();
  stroke(101, 215, 196, alpha * 0.34);
  strokeWeight(0.55);

  beginShape();

  for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 96) {
    const n = noise(
      bloom.seed * 0.8 + cos(angle) * 1.8,
      bloom.seed * 0.8 + sin(angle) * 1.8,
      frameCount * 0.001
    );

    const uneven = map(n, 0, 1, 0.94, 1.08);

    curveVertex(
      bloom.x + cos(angle) * radius * uneven,
      bloom.y + sin(angle) * radius * uneven * bloom.aspect
    );
  }

  endShape(CLOSE);
}

function drawWarmPaper() {
  clear();
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplayMode === 0) return;

  const points = hands[0].keypoints.map(toCanvasPoint);

  if (handDisplayMode === 1) {
    const tip = points[8];

    noFill();
    stroke(234, 228, 194, 90);
    strokeWeight(1);
    circle(tip.x, tip.y, 14);
    return;
  }

  stroke(230, 226, 204, 48);
  strokeWeight(0.7);

  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(240, 231, 194, 78);

  for (const point of points) {
    circle(point.x, point.y, 3.5);
  }
}

function drawInterface() {
  textAlign(CENTER);
  noStroke();
  fill(228, 228, 213, 95);
  textSize(12);

  if (!modelLoading && hands.length === 0) {
    text("Show one hand to the camera.", width / 2, height - 28);
  } else if (!modelLoading) {
    text("Move your index finger slowly, then pause.", width / 2, height - 28);
  }
}

function handDisplayLabel() {
  if (handDisplayMode === 0) return "HIDDEN";
  if (handDisplayMode === 1) return "POINTS";
  return "SKELETON";
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
  text("Soft Ink Wash", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "A slow movement releases a pale wash that continues to diffuse after the hand has passed.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const stepGap = compact ? 42 : 54;
  drawHelpStep("01", "Select Begin to activate the camera.", left, stepsY);
  drawHelpStep("02", "Move one index finger slowly through the space.", left, stepsY + stepGap);
  drawHelpStep("03", "Pause and let the soft wash expand.", left, stepsY + stepGap * 2);

  fill(174, 191, 166, 135);
  textSize(11);
  text("P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - (compact ? 31 : 40));

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
    if (showHelp) {
      beginExperience();
    } else {
      showHelp = true;
    }
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
    blooms = [];
    previousPoint = null;
    lastGestureFrame = -1000;
  }
}

function mousePressed() {
  if (showHelp) return false;
}

function beginExperience() {
  showHelp = false;
  syncHelpOverlay();
  cursor(ARROW);

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
  previousPoint = null;

  video = createCapture(
    {
      video: {
        width: { ideal: CAMERA_WIDTH },
        height: { ideal: CAMERA_HEIGHT },
        frameRate: { ideal: 30, max: 30 }
      },
      audio: false
    },
    () => {
      videoReady = true;
      tryStartDetection();
    }
  );

  video.size(CAMERA_WIDTH, CAMERA_HEIGHT);
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

function createBackgroundPoints() {
  backgroundPoints = [];

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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createBackgroundPoints();

  if (video) {
    video.size(CAMERA_WIDTH, CAMERA_HEIGHT);
  }
}

function insideCanvas(x, y) {
  return x >= 0 && x <= width && y >= 0 && y <= height;
}

function easeOutQuart(t) {
  return 1 - pow(1 - t, 4);
}
