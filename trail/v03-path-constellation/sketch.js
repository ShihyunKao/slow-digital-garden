let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let helpVisible = false;
let handDisplay = 1; // 0 hidden, 1 point, 2 skeleton

let nodes = [];
let smoothPoint = null;
let lastNodePoint = null;
let dwellFrames = 0;
let lastAnchorFrame = -1000;
let backgroundPoints = [];

const MAX_NODES = 120;
const NODE_SPACING = 29;
const DWELL_FRAMES = 7;
const STILL_SPEED = 2.1;
const ANCHOR_COOLDOWN = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  randomSeed(603);
  noiseSeed(603);

  for (let i = 0; i < 100; i++) {
    backgroundPoints.push({
      x: random(width),
      y: random(height),
      size: random(0.5, 1.7),
      alpha: random(4, 16),
      phase: random(TWO_PI)
    });
  }
  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);
  startHandMode();
}

function draw() {
  drawBackground();
  drawPath();

  if (!helpVisible) {
    updatePath();
    drawHandDisplay();
  }

  syncHelpOverlay();
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !helpVisible;
  overlay.setAttribute("aria-hidden", String(!helpVisible));
}

function updatePath() {
  const rawPoint = getControlPoint();

  if (!rawPoint) {
    smoothPoint = null;
    lastNodePoint = null;
    dwellFrames = 0;
    return;
  }

  if (smoothPoint === null) {
    smoothPoint = { x: rawPoint.x, y: rawPoint.y };
    lastNodePoint = { x: rawPoint.x, y: rawPoint.y };
    return;
  }

  const previous = { x: smoothPoint.x, y: smoothPoint.y };
  smoothPoint.x = lerp(smoothPoint.x, rawPoint.x, 0.34);
  smoothPoint.y = lerp(smoothPoint.y, rawPoint.y, 0.34);

  const speed = dist(previous.x, previous.y, smoothPoint.x, smoothPoint.y);
  const slowRange = constrain(map(speed, 0.7, 12, 1, 0), 0, 1);
  const slowness = lerp(0.06, 1, pow(slowRange, 1.75));
  const distanceFromLastNode = dist(
    smoothPoint.x,
    smoothPoint.y,
    lastNodePoint.x,
    lastNodePoint.y
  );

  const spacing = lerp(NODE_SPACING + 8, NODE_SPACING - 7, slowness);

  if (distanceFromLastNode > spacing) {
    addNode(smoothPoint, slowness, false);
    dwellFrames = 0;
  } else if (speed < STILL_SPEED) {
    dwellFrames++;

    if (
      dwellFrames >= DWELL_FRAMES &&
      frameCount - lastAnchorFrame > ANCHOR_COOLDOWN &&
      distanceFromLastNode > 10
    ) {
      addNode(smoothPoint, 1, true);
      lastAnchorFrame = frameCount;
      dwellFrames = 0;
    }
  } else {
    dwellFrames = 0;
  }
}

function getControlPoint() {
  if (hands.length > 0) {
    const tip = hands[0].keypoints[8];
    return { x: tip.x, y: tip.y };
  }

  return null;
}

function addNode(point, slowness, anchor) {
  nodes.push({
    x: point.x,
    y: point.y,
    size: anchor ? random(8.5, 11.5) : lerp(1.5, 6.3, slowness),
    alpha: anchor ? 225 : lerp(24, 190, slowness),
    slowness,
    anchor,
    born: frameCount,
    seed: random(1000)
  });

  lastNodePoint = { x: point.x, y: point.y };

  if (nodes.length > MAX_NODES) {
    nodes.shift();
  }
}

function drawPath() {
  drawConnections();

  for (const node of nodes) {
    const appear = constrain((frameCount - node.born) / 15, 0, 1);
    drawNode(node, appear);
  }
}

function drawConnections() {
  if (nodes.length < 2) return;

  noFill();

  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1];
    const b = nodes[i];
    const age = constrain((frameCount - b.born) / 18, 0, 1);
    const linkStrength = (a.slowness + b.slowness) * 0.5;
    const bend = map(noise(a.seed, b.seed), 0, 1, -10, 10);
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5 + bend;

    stroke(132, 164, 138, (14 + linkStrength * 34) * age);
    strokeWeight(0.45 + linkStrength * 0.4);

    beginShape();
    vertex(a.x, a.y);
    quadraticVertex(mx, my, b.x, b.y);
    endShape();

    if (linkStrength > 0.72) {
      stroke(232, 227, 196, 14 * age);
      strokeWeight(0.35);
      line(a.x, a.y, b.x, b.y);
    }
  }
}

function drawNode(node, appear) {
  const pulse = sin(frameCount * 0.035 + node.seed) * 0.5 + 0.5;

  if (node.anchor) {
    const twinkle = sin(frameCount * 0.055 + node.seed * 1.7) * 0.5 + 0.5;
    const baseAngle = noise(node.seed * 0.01, 2.1) * TWO_PI;

    drawingContext.save();
    drawingContext.shadowBlur = 18 + twinkle * 10;
    drawingContext.shadowColor = "rgba(244, 236, 196, 0.5)";
    noStroke();
    fill(244, 236, 196, (35 + twinkle * 34) * appear);
    circle(node.x, node.y, node.size * (1.25 + twinkle * 0.22));
    drawingContext.restore();

    for (let arm = 0; arm < 3; arm++) {
      const angle = baseAngle + (TWO_PI / 3) * arm;
      const variation = noise(node.seed, arm * 0.73);
      const length = node.size * (0.82 + variation * 0.72 + twinkle * 0.16);
      const start = node.size * 0.34;
      const curl = (noise(node.seed * 0.2, arm + 4) - 0.5) * node.size;

      const startX = node.x + cos(angle) * start;
      const startY = node.y + sin(angle) * start;
      const endX = node.x + cos(angle) * length;
      const endY = node.y + sin(angle) * length;
      const controlX = (startX + endX) * 0.5 + cos(angle + HALF_PI) * curl;
      const controlY = (startY + endY) * 0.5 + sin(angle + HALF_PI) * curl;

      noFill();
      stroke(242, 234, 197, (32 + twinkle * 45) * appear);
      strokeWeight(0.45);
      beginShape();
      vertex(startX, startY);
      quadraticVertex(controlX, controlY, endX, endY);
      endShape();

      noStroke();
      fill(246, 238, 198, (54 + twinkle * 62) * appear);
      circle(endX, endY, 1 + twinkle * 1.15);
    }
  }

  drawingContext.save();
  drawingContext.shadowBlur = node.anchor ? 15 : 8;
  drawingContext.shadowColor = "rgba(244, 236, 196, 0.42)";

  noStroke();
  fill(244, 236, 196, node.alpha * appear * (0.7 + pulse * 0.3));
  circle(node.x, node.y, (node.size + pulse * 0.8) * appear);

  drawingContext.restore();
}

function drawBackground() {
  clear();
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplay === 0) return;

  const hand = hands[0];
  const points = hand.keypoints;

  if (handDisplay === 1) {
    const tip = points[8];
    noFill();
    stroke(232, 227, 196, 90);
    strokeWeight(1);
    circle(tip.x, tip.y, 13);
    return;
  }

  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];

  stroke(232, 227, 196, 48);
  strokeWeight(0.75);

  for (const [a, b] of connections) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(244, 236, 196, 100);

  for (const point of points) {
    circle(point.x, point.y, 4);
  }
}

function drawHeader() {
  textAlign(LEFT);
  noStroke();
  fill(232, 229, 210, 160);
  textSize(13);
  text("PATH CONSTELLATION", 38, 42);

  fill(232, 229, 210, 80);
  textSize(10);
  text("GESTURE STUDY 03.00 / MOVEMENT TRACE", 38, 60);

  textAlign(RIGHT);
  fill(232, 229, 210, 108);
  textSize(11);
  const controls = modelLoading
    ? `CAMERA LOADING · P ${handDisplayLabel()} · R RESET · ? HELP`
    : `P ${handDisplayLabel()} · R RESET · ? HELP`;
  text(controls, width - 38, 42);

  stroke(232, 229, 210, 20);
  strokeWeight(1);
  line(38, 76, width - 38, 76);
}

function handDisplayLabel() {
  if (handDisplay === 0) return "HIDDEN";
  if (handDisplay === 1) return "POINTS";
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
  text("GESTURE STUDY 03.00", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Path Constellation", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "Slow movement deposits a constellation-like record of the path your hand takes through space.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const stepGap = compact ? 42 : 54;
  drawHelpStep("01", "Select Begin to activate the camera.", left, stepsY);
  drawHelpStep("02", "Move one index finger slowly through the space.", left, stepsY + stepGap);
  drawHelpStep("03", "Pause briefly to leave a larger anchor point.", left, stepsY + stepGap * 2);

  fill(174, 191, 166, 135);
  textSize(11);
  text("P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - (compact ? 31 : 40));

  const hovering =
    mouseX >= panel.buttonX &&
    mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY &&
    mouseY <= panel.buttonY + panel.buttonHeight;

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
    if (helpVisible) {
      beginExperience();
    } else {
      helpVisible = true;
    }
    return;
  }

  if (helpVisible && (keyCode === ENTER || key === " " || keyCode === ESCAPE)) {
    beginExperience();
    return;
  }

  if (helpVisible) return;

  if (key === "p" || key === "P") {
    handDisplay = (handDisplay + 1) % 3;
  }

  if (key === "r" || key === "R") {
    resetPath();
  }
}

function mousePressed() {
  if (helpVisible) return false;
}

function beginExperience() {
  helpVisible = false;
  syncHelpOverlay();
  cursor(ARROW);

  if (!video && !modelLoading) {
    startHandMode();
  }
}

function resetPath() {
  nodes = [];
  smoothPoint = null;
  lastNodePoint = null;
  dwellFrames = 0;
  lastAnchorFrame = -1000;
}

function startHandMode() {
  if (video || modelLoading) return;

  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];
  smoothPoint = null;
  lastNodePoint = null;

  video = createCapture(
    {
      video: {
        width: 900,
        height: 620
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetPath();
}
