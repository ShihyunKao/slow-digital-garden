let handPose;
let video;
let hands = [];

let inputMode = "mouse";
let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let helpVisible = true;
let handDisplay = 1; // 0 hidden, 1 point, 2 skeleton

let nodes = [];
let smoothPoint = null;
let lastNodePoint = null;
let dwellFrames = 0;
let lastAnchorFrame = -1000;

const MAX_NODES = 120;
const NODE_SPACING = 29;
const DWELL_FRAMES = 24;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  randomSeed(603);
  noiseSeed(603);
}

function draw() {
  drawBackground();
  drawPath();

  if (!helpVisible) {
    updatePath();
    drawHandDisplay();
    drawHeader();
  }

  if (helpVisible) {
    drawHelpScreen();
  }
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
  const slowness = constrain(map(speed, 0, 18, 1, 0.18), 0.18, 1);
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
  } else if (speed < 1.35) {
    dwellFrames++;

    if (
      dwellFrames >= DWELL_FRAMES &&
      frameCount - lastAnchorFrame > 90 &&
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
  if (inputMode === "mouse") {
    return { x: mouseX, y: mouseY };
  }

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
    size: anchor ? random(7.5, 10.5) : lerp(2.2, 5.4, slowness),
    alpha: anchor ? 180 : lerp(62, 152, slowness),
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
    drawingContext.save();
    drawingContext.filter = "blur(14px)";
    noStroke();
    fill(108, 151, 121, 30 * appear);
    circle(node.x, node.y, node.size * 6.5);
    drawingContext.restore();

    noFill();
    stroke(226, 225, 196, 55 * appear);
    strokeWeight(0.6);
    circle(node.x, node.y, node.size * (2.1 + pulse * 0.25));
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
  background(9, 19, 17);

  noStroke();

  for (let y = 0; y < height; y += 5) {
    const alpha = map(y, 0, height, 18, 3);
    fill(30, 45, 39, alpha);
    rect(0, y, width, 5);
  }

  drawingContext.save();
  drawingContext.filter = "blur(70px)";
  fill(58, 85, 68, 13);
  ellipse(width * 0.25, height * 0.68, width * 0.62, height * 0.72);
  fill(92, 88, 62, 8);
  ellipse(width * 0.78, height * 0.28, width * 0.45, height * 0.42);
  drawingContext.restore();

  fill(240, 232, 205, 5);
  rect(34, 34, width - 68, height - 68);
}

function drawHandDisplay() {
  if (inputMode === "mouse" || hands.length === 0 || handDisplay === 0) return;

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
  text("GESTURE STUDY 03 / MOVEMENT TRACE", 38, 60);

  textAlign(RIGHT);
  fill(232, 229, 210, 108);
  textSize(11);
  text(
    `M ${inputMode === "mouse" ? "CAMERA" : "MOUSE"} · P ${handDisplayLabel()} · R RESET · ? HELP`,
    width - 38,
    42
  );

  stroke(232, 229, 210, 20);
  strokeWeight(1);
  line(38, 76, width - 38, 76);
}

function handDisplayLabel() {
  if (handDisplay === 0) return "HIDDEN";
  if (handDisplay === 1) return "POINT";
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
  text("GESTURE STUDY 03", left, panel.y + (compact ? 25 : 38));

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
  drawHelpStep("01", "Press M to enable the camera.", left, stepsY);
  drawHelpStep("02", "Move one index finger slowly through the space.", left, stepsY + stepGap);
  drawHelpStep("03", "Pause briefly to leave a larger anchor point.", left, stepsY + stepGap * 2);

  fill(174, 191, 166, 135);
  textSize(11);
  text(
    "M  CAMERA / MOUSE     P  HAND DISPLAY     R  RESET     ?  HELP",
    left,
    panel.buttonY - (compact ? 31 : 40)
  );

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
    helpVisible = !helpVisible;
    return;
  }

  if (helpVisible && (keyCode === ENTER || key === " " || keyCode === ESCAPE)) {
    helpVisible = false;
    return;
  }

  if (helpVisible) return;

  if (key === "m" || key === "M") {
    if (inputMode === "mouse") {
      startHandMode();
    } else {
      stopHandMode();
    }
  }

  if (key === "p" || key === "P") {
    handDisplay = (handDisplay + 1) % 3;
  }

  if (key === "r" || key === "R") {
    resetPath();
  }
}

function mousePressed() {
  if (!helpVisible) return;

  const panel = getHelpPanelMetrics();
  const insideButton =
    mouseX >= panel.buttonX &&
    mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY &&
    mouseY <= panel.buttonY + panel.buttonHeight;

  if (insideButton) helpVisible = false;
}

function resetPath() {
  nodes = [];
  smoothPoint = null;
  lastNodePoint = null;
  dwellFrames = 0;
  lastAnchorFrame = -1000;
}

function startHandMode() {
  inputMode = "hand";
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
  if (
    inputMode === "hand" &&
    modelReady &&
    videoReady &&
    !detectionStarted
  ) {
    handPose.detectStart(video, gotHands);
    detectionStarted = true;
  }
}

function gotHands(results) {
  hands = results;
}

function stopHandMode() {
  if (handPose && detectionStarted && handPose.detectStop) {
    handPose.detectStop();
  }

  if (video) {
    const stream = video.elt.srcObject;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

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
  smoothPoint = null;
  lastNodePoint = null;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetPath();
}
