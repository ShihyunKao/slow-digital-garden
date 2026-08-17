let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let helpVisible = false;
let handDisplay = 1;

let nodes = [];
let smoothPoint = null;
let lastNodePoint = null;
let dwellFrames = 0;
let lastAnchorFrame = -1000;
let backgroundSignals = [];

const VARIANT = window.TRAIL_V03_PULSE_VARIANT;
const MAX_NODES = 120;
const NODE_SPACING = 29;
const DWELL_FRAMES = 7;
const STILL_SPEED = 2.1;
const ANCHOR_COOLDOWN = 60;
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
  randomSeed(603);
  noiseSeed(603);
  createBackgroundSignals();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  startHandMode();
}

function draw() {
  drawSignalVoid();
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

// The tracking, smoothing, spacing and pause recognition are unchanged from v03.00.
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
    life: anchor ? random(3200, 4600) : random(VARIANT.signalLife[0], VARIANT.signalLife[1]),
    pulsePeriod: random(VARIANT.pulsePeriod[0], VARIANT.pulsePeriod[1]),
    angle: random(TWO_PI),
    afterimageLength: random(12, 38),
    seed: random(1000)
  });

  lastNodePoint = { x: point.x, y: point.y };

  if (nodes.length > MAX_NODES) {
    nodes.shift();
  }
}

function drawPath() {
  drawShortAfterimages();
  const latestAnchor = findLatestAnchor();

  for (const node of nodes) {
    const age = frameCount - node.born;
    const appear = constrain(age / 8, 0, 1);
    const fade = 1 - pow(constrain(age / node.life, 0, 1), node.anchor ? 3.4 : 1.7);
    if (fade <= 0) continue;

    if (node.anchor) {
      const holdGrowth = node === latestAnchor ? getCurrentHoldGrowth(node) : 0;
      drawPulseAnchor(node, appear, fade, holdGrowth);
    } else {
      drawFadingSignal(node, appear, fade);
    }
  }
}

function drawShortAfterimages() {
  if (nodes.length < 2) return;

  const ember = VARIANT.palette.ember;
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1];
    const b = nodes[i];
    if (b.anchor) continue;

    const age = frameCount - b.born;
    const fade = constrain(1 - age / (b.life * 0.62), 0, 1);
    if (fade <= 0) continue;

    const distance = dist(a.x, a.y, b.x, b.y) || 1;
    const visibleLength = min(distance * 0.32, b.afterimageLength);
    const endX = b.x + (a.x - b.x) / distance * visibleLength;
    const endY = b.y + (a.y - b.y) / distance * visibleLength;

    stroke(ember[0], ember[1], ember[2], 54 * fade * b.slowness);
    strokeWeight(0.48 + b.slowness * 0.35);
    line(b.x, b.y, endX, endY);
  }
}

function drawFadingSignal(node, appear, fade) {
  const amber = VARIANT.palette.amber;
  const hot = VARIANT.palette.amberHot;
  const red = VARIANT.palette.red;
  const flicker = 0.76 + noise(node.seed, frameCount * 0.008) * 0.24;
  const alpha = node.alpha * appear * fade * flicker;
  const shortLine = node.size * 1.8;

  stroke(
    floor(node.seed) % 7 === 0 ? red[0] : amber[0],
    floor(node.seed) % 7 === 0 ? red[1] : amber[1],
    floor(node.seed) % 7 === 0 ? red[2] : amber[2],
    alpha * 0.58
  );
  strokeWeight(0.55);
  line(
    node.x - cos(node.angle) * shortLine,
    node.y - sin(node.angle) * shortLine,
    node.x + cos(node.angle) * shortLine,
    node.y + sin(node.angle) * shortLine
  );

  drawingContext.save();
  drawingContext.shadowBlur = 5;
  drawingContext.shadowColor = `rgba(${amber[0]},${amber[1]},${amber[2]},${0.22 * fade})`;
  noStroke();
  fill(hot[0], hot[1], hot[2], alpha * 0.9);
  circle(node.x, node.y, max(1.1, node.size * 0.62) * appear);
  drawingContext.restore();
}

function findLatestAnchor() {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].anchor) return nodes[i];
  }
  return null;
}

function getCurrentHoldGrowth(node) {
  if (!smoothPoint) return 0;
  if (dist(smoothPoint.x, smoothPoint.y, node.x, node.y) > 22) return 0;
  return min(VARIANT.maxHoldGrowth, dwellFrames * 0.34);
}

function drawPulseAnchor(node, appear, fade, holdGrowth) {
  const amber = VARIANT.palette.amber;
  const hot = VARIANT.palette.amberHot;
  const red = VARIANT.palette.red;
  const age = frameCount - node.born;
  const pulseProgress = (age % node.pulsePeriod) / node.pulsePeriod;
  const heartbeat = 0.5 + sin(age * TWO_PI / node.pulsePeriod) * 0.5;
  const baseRadius = node.size * 1.25 + holdGrowth;
  const expandingRadius = baseRadius + pulseProgress * (28 + holdGrowth * 0.72);
  const ringAlpha = pow(1 - pulseProgress, 1.5) * fade * appear;

  noFill();
  stroke(red[0], red[1], red[2], 86 * ringAlpha);
  strokeWeight(0.7);
  circle(node.x, node.y, expandingRadius * 2);

  stroke(amber[0], amber[1], amber[2], (62 + heartbeat * 78) * fade * appear);
  strokeWeight(0.85);
  circle(node.x, node.y, baseRadius * (1.3 + heartbeat * 0.18) * 2);

  stroke(red[0], red[1], red[2], 74 * fade * appear);
  strokeWeight(0.55);
  line(node.x - baseRadius * 0.42, node.y, node.x + baseRadius * 0.42, node.y);
  line(node.x, node.y - baseRadius * 0.42, node.x, node.y + baseRadius * 0.42);

  drawingContext.save();
  drawingContext.shadowBlur = 9 + heartbeat * 9;
  drawingContext.shadowColor = `rgba(${amber[0]},${amber[1]},${amber[2]},${0.42 * fade})`;
  noStroke();
  fill(hot[0], hot[1], hot[2], (125 + heartbeat * 110) * fade * appear);
  circle(node.x, node.y, node.size * (0.58 + heartbeat * 0.28));
  drawingContext.restore();
}

function createBackgroundSignals() {
  backgroundSignals = [];
  randomSeed(3202);

  for (let i = 0; i < VARIANT.dustCount; i++) {
    backgroundSignals.push({
      x: random(width),
      y: random(height),
      size: random(0.25, 0.9),
      alpha: random(4, 14),
      phase: random(TWO_PI)
    });
  }
}

function drawSignalVoid() {
  const voidTone = VARIANT.palette.void;
  const ash = VARIANT.palette.ash;
  background(voidTone[0], voidTone[1], voidTone[2]);

  noStroke();
  for (const signal of backgroundSignals) {
    const flicker = 0.34 + sin(frameCount * 0.006 + signal.phase) * 0.22;
    fill(ash[0], ash[1], ash[2], signal.alpha * max(0.08, flicker));
    circle(signal.x, signal.y, signal.size);
  }
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplay === 0) return;

  const points = hands[0].keypoints;
  const amber = VARIANT.palette.amber;
  const hot = VARIANT.palette.amberHot;

  if (handDisplay === 1) {
    const tip = points[8];
    noFill();
    stroke(amber[0], amber[1], amber[2], 86);
    strokeWeight(0.8);
    circle(tip.x, tip.y, 13);
    noStroke();
    fill(hot[0], hot[1], hot[2], 84);
    circle(tip.x, tip.y, 1.8);
    return;
  }

  stroke(amber[0], amber[1], amber[2], 34);
  strokeWeight(0.65);
  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(amber[0], amber[1], amber[2], 60);
  for (const point of points) {
    circle(point.x, point.y, 3.2);
  }
}

function keyPressed() {
  if (key === "?" || keyCode === 191) {
    if (helpVisible) {
      beginExperience();
    } else {
      helpVisible = true;
    }
    return false;
  }

  if (helpVisible && (keyCode === ENTER || key === " " || keyCode === ESCAPE)) {
    beginExperience();
    return false;
  }

  if (helpVisible) return false;

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
  createBackgroundSignals();
  resetPath();
}
