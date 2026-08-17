let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let vaporNodes = [];
let previousPoint = null;
let lastGestureFrame = -1000;
let showHelp = false;
let handDisplayMode = 1;
let suspendedDust = [];

const VARIANT = window.TRAIL_V02_VAPOR_VARIANT;
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
  createSuspendedDust();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  startHandMode();
}

function draw() {
  drawDarkVolume();

  if (!showHelp) {
    const point = getInputPoint();

    if (point) {
      updateVapor(point);
    } else {
      previousPoint = null;
    }
  }

  drawVaporNodes();

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

// Input cadence, movement threshold and pause detection match v02.00 exactly.
function updateVapor(point) {
  if (!insideCanvas(point.x, point.y)) return;

  if (previousPoint === null) {
    previousPoint = { x: point.x, y: point.y };
    lastGestureFrame = frameCount;
    addVaporNode(point.x, point.y, 0.7, previousPoint, point);
    return;
  }

  const movement = dist(point.x, point.y, previousPoint.x, previousPoint.y);

  if (movement > 1.2) {
    lastGestureFrame = frameCount;
  }

  if (movement > 18) {
    const slowness = constrain(map(movement, 0, 80, 1, 0.22), 0.22, 1);
    const origin = { x: previousPoint.x, y: previousPoint.y };

    addVaporNode(
      lerp(previousPoint.x, point.x, 0.55),
      lerp(previousPoint.y, point.y, 0.55),
      slowness,
      origin,
      point
    );

    previousPoint = { x: point.x, y: point.y };
  }
}

function addVaporNode(x, y, slowness, fromPoint, toPoint) {
  const dustTotal = floor(random(VARIANT.nodeDustCount[0], VARIANT.nodeDustCount[1] + 1));
  const nodeDust = [];
  const lobes = [];

  for (let i = 0; i < dustTotal; i++) {
    nodeDust.push({
      angle: random(TWO_PI),
      distance: random(9, 72),
      size: random(0.35, 1.25),
      speed: random(0.04, 0.2),
      alpha: random(0.25, 0.82),
      phase: random(TWO_PI)
    });
  }

  for (let i = 0; i < 7; i++) {
    lobes.push({
      offsetX: random(-0.42, 0.42),
      offsetY: random(-0.3, 0.3),
      scaleX: random(0.55, 1.2),
      scaleY: random(0.48, 1.05),
      alpha: random(0.62, 1),
      phase: random(TWO_PI)
    });
  }

  vaporNodes.push({
    x: x + random(-3, 3),
    y: y + random(-3, 3),
    fromX: fromPoint.x,
    fromY: fromPoint.y,
    toX: toPoint.x,
    toY: toPoint.y,
    age: 0,
    fadeAge: 0,
    delay: random(VARIANT.expansionDelay[0], VARIANT.expansionDelay[1]),
    growLife: random(220, 360),
    life: random(980, 1480),
    startRadius: random(3, 7),
    endRadius: random(68, 142) * slowness,
    strength: random(0.42, 0.76) * (0.55 + slowness * 0.45),
    aspect: random(0.68, 1.18),
    riseSpeed: random(VARIANT.upwardDrift[0], VARIANT.upwardDrift[1]),
    sway: random(8, 24),
    swaySpeed: random(0.003, 0.009),
    seed: random(1000),
    nodeDust,
    lobes
  });

  if (vaporNodes.length > MAX_BLOOMS) {
    vaporNodes.shift();
  }
}

function drawVaporNodes() {
  const gestureIsActive = frameCount - lastGestureFrame < 24;

  for (let i = vaporNodes.length - 1; i >= 0; i--) {
    const node = vaporNodes[i];
    node.age++;

    if (!gestureIsActive) {
      node.fadeAge++;
    }

    if (node.fadeAge > node.life) {
      vaporNodes.splice(i, 1);
      continue;
    }

    drawVaporNode(node);
  }
}

function drawVaporNode(node) {
  const afterDelay = max(0, node.age - node.delay);
  const delayedGrowth = easeOutQuart(constrain(afterDelay / node.growLife, 0, 1));
  const fade = 1 - pow(constrain(node.fadeAge / node.life, 0, 1), 4.7);
  const radius = lerp(node.startRadius, node.endRadius, delayedGrowth);
  const driftY = -afterDelay * node.riseSpeed;
  const driftX = sin(afterDelay * node.swaySpeed + node.seed) * node.sway * delayedGrowth;
  const x = node.x + driftX;
  const y = node.y + driftY;

  drawSuspendedLine(node, delayedGrowth, fade);

  if (afterDelay <= 0) {
    drawWaitingDust(node, x, y, fade);
    return;
  }

  drawVolumetricMist(node, x, y, radius, fade, delayedGrowth);
  drawLocalDust(node, x, y, radius, fade, delayedGrowth);
}

function drawSuspendedLine(node, growth, fade) {
  const rim = VARIANT.palette.rim;
  const lineFade = constrain(1 - growth * 1.35, 0, 1) * fade;
  if (lineFade <= 0) return;

  noFill();
  stroke(rim[0], rim[1], rim[2], 82 * node.strength * lineFade);
  strokeWeight(0.7);
  line(node.fromX, node.fromY, node.toX, node.toY);

  const pulse = 1.5 + sin(node.age * 0.08 + node.seed) * 0.6;
  noStroke();
  fill(rim[0], rim[1], rim[2], 62 * lineFade);
  circle(node.toX, node.toY, pulse);
}

function drawWaitingDust(node, x, y, fade) {
  const dust = VARIANT.palette.dust;
  noStroke();

  for (let i = 0; i < 4; i++) {
    const angle = node.seed + i * 1.8;
    const distance = 3 + i * 2.4;
    fill(dust[0], dust[1], dust[2], (20 - i * 3) * fade);
    circle(x + cos(angle) * distance, y + sin(angle) * distance, 0.8 + i * 0.2);
  }
}

function drawVolumetricMist(node, x, y, radius, fade, growth) {
  const ctx = drawingContext;
  const deep = VARIANT.palette.deepBlue;
  const purple = VARIANT.palette.mistPurple;
  const rim = VARIANT.palette.rim;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.filter = `blur(${lerp(2, 8, growth)}px)`;

  for (let index = 0; index < node.lobes.length; index++) {
    const lobe = node.lobes[index];
    const breathing = 1 + sin(node.age * 0.006 + lobe.phase) * 0.045;
    const lobeRadius = radius * (0.52 + index * 0.065) * breathing;
    const lobeX = x + lobe.offsetX * radius;
    const lobeY = y + lobe.offsetY * radius * node.aspect;

    ctx.save();
    ctx.translate(lobeX, lobeY);
    ctx.scale(lobe.scaleX, lobe.scaleY * node.aspect);

    const glow = ctx.createRadialGradient(0, 0, lobeRadius * 0.08, 0, 0, lobeRadius);
    glow.addColorStop(0, `rgba(${deep[0]},${deep[1]},${deep[2]},0)`);
    glow.addColorStop(0.46, `rgba(${purple[0]},${purple[1]},${purple[2]},${0.03 * node.strength * lobe.alpha * fade})`);
    glow.addColorStop(0.73, `rgba(${purple[0]},${purple[1]},${purple[2]},${0.12 * node.strength * lobe.alpha * fade})`);
    glow.addColorStop(0.9, `rgba(${rim[0]},${rim[1]},${rim[2]},${0.16 * node.strength * lobe.alpha * fade})`);
    glow.addColorStop(1, `rgba(${rim[0]},${rim[1]},${rim[2]},0)`);

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, lobeRadius, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // Dark overlapping cores make accumulated vapour denser rather than simply brighter.
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = `blur(${lerp(3, 10, growth)}px)`;
  for (let layer = 0; layer < 4; layer++) {
    const offset = noise(node.seed, layer * 2.3) - 0.5;
    ctx.fillStyle = `rgba(${deep[0]},${deep[1]},${deep[2]},${(0.045 + layer * 0.012) * node.strength * fade})`;
    ctx.beginPath();
    ctx.ellipse(
      x + offset * radius * 0.22,
      y + (noise(node.seed + 12, layer) - 0.5) * radius * 0.18,
      radius * (0.38 + layer * 0.11),
      radius * node.aspect * (0.24 + layer * 0.08),
      offset * 0.3,
      0,
      TWO_PI
    );
    ctx.fill();
  }
  ctx.restore();

  drawBacklitContour(node, x, y, radius, fade, growth);
}

function drawBacklitContour(node, x, y, radius, fade, growth) {
  const purple = VARIANT.palette.mistPurple;
  const rim = VARIANT.palette.rim;

  noFill();
  for (let pass = 0; pass < 3; pass++) {
    stroke(
      pass === 2 ? rim[0] : purple[0],
      pass === 2 ? rim[1] : purple[1],
      pass === 2 ? rim[2] : purple[2],
      (14 + pass * 8) * node.strength * fade * growth
    );
    strokeWeight(0.45 + pass * 0.18);
    beginShape();

    for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 58) {
      const turbulence = map(
        noise(node.seed + cos(angle) * 1.8, node.seed + sin(angle) * 1.8, pass * 0.23),
        0,
        1,
        0.78,
        1.2
      );
      const sideLight = map(cos(angle - PI * 0.28), -1, 1, 0.74, 1.15);
      curveVertex(
        x + cos(angle) * radius * turbulence * sideLight,
        y + sin(angle) * radius * node.aspect * turbulence
      );
    }

    endShape(CLOSE);
  }
}

function drawLocalDust(node, x, y, radius, fade, growth) {
  const dust = VARIANT.palette.dust;
  noStroke();

  for (const mote of node.nodeDust) {
    const distance = mote.distance * growth;
    const drift = node.age * mote.speed;
    const px = x + cos(mote.angle + sin(node.age * 0.004 + mote.phase) * 0.16) * distance;
    const py = y + sin(mote.angle) * distance * node.aspect - drift;
    fill(dust[0], dust[1], dust[2], 72 * mote.alpha * fade * growth);
    circle(px, py, mote.size);
  }
}

function createSuspendedDust() {
  suspendedDust = [];
  randomSeed(2202);

  for (let i = 0; i < VARIANT.dustCount; i++) {
    suspendedDust.push({
      x: random(width),
      y: random(height),
      size: random(0.35, 1.3),
      alpha: random(7, 28),
      speed: random(0.012, 0.05),
      phase: random(TWO_PI)
    });
  }
}

function drawDarkVolume() {
  const voidTone = VARIANT.palette.void;
  const blue = VARIANT.palette.deepBlue;
  const dust = VARIANT.palette.dust;
  background(voidTone[0], voidTone[1], voidTone[2]);

  const ctx = drawingContext;
  const volume = ctx.createRadialGradient(width * 0.5, height * 0.58, 0, width * 0.5, height * 0.58, max(width, height) * 0.62);
  volume.addColorStop(0, `rgba(${blue[0]},${blue[1]},${blue[2]},0.22)`);
  volume.addColorStop(0.58, `rgba(${blue[0]},${blue[1]},${blue[2]},0.07)`);
  volume.addColorStop(1, `rgba(${voidTone[0]},${voidTone[1]},${voidTone[2]},0)`);
  ctx.fillStyle = volume;
  ctx.fillRect(0, 0, width, height);

  noStroke();
  for (const mote of suspendedDust) {
    const wrappedY = (mote.y - frameCount * mote.speed + height) % height;
    const shimmer = 0.62 + sin(frameCount * 0.008 + mote.phase) * 0.38;
    fill(dust[0], dust[1], dust[2], mote.alpha * shimmer);
    circle(mote.x + sin(frameCount * 0.002 + mote.phase) * 4, wrappedY, mote.size);
  }
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplayMode === 0) return;

  const points = hands[0].keypoints.map(toCanvasPoint);
  const rim = VARIANT.palette.rim;

  if (handDisplayMode === 1) {
    const tip = points[8];
    noFill();
    stroke(rim[0], rim[1], rim[2], 92);
    strokeWeight(1);
    circle(tip.x, tip.y, 14);
    return;
  }

  stroke(rim[0], rim[1], rim[2], 48);
  strokeWeight(0.7);
  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(rim[0], rim[1], rim[2], 72);
  for (const point of points) {
    circle(point.x, point.y, 3.5);
  }
}

function drawInterface() {
  const rim = VARIANT.palette.rim;
  textAlign(CENTER);
  noStroke();
  fill(rim[0], rim[1], rim[2], 82);
  textSize(12);

  if (!modelLoading && hands.length === 0) {
    text("Show one hand to the camera.", width / 2, height - 28);
  } else if (!modelLoading) {
    text("Move slowly, then pause and watch the vapour rise.", width / 2, height - 28);
  }
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
    vaporNodes = [];
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createSuspendedDust();

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
