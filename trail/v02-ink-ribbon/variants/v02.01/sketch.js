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
let handDisplayMode = 1;
let paperFibres = [];
let edgeStains = [];

const VARIANT = window.TRAIL_V02_VARIANT;
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
  createPaperField();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  startHandMode();
}

function draw() {
  drawOldPaper();

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

// The input thresholds and timing are identical to Soft Ink Wash v02.00.
function updateInk(point) {
  if (!insideCanvas(point.x, point.y)) return;

  if (previousPoint === null) {
    previousPoint = { x: point.x, y: point.y };
    lastGestureFrame = frameCount;
    addBloom(point.x, point.y, 0.7, previousPoint, point);
    return;
  }

  const movement = dist(point.x, point.y, previousPoint.x, previousPoint.y);

  if (movement > 1.2) {
    lastGestureFrame = frameCount;
  }

  if (movement > 18) {
    const slowness = constrain(map(movement, 0, 80, 1, 0.22), 0.22, 1);
    const origin = { x: previousPoint.x, y: previousPoint.y };

    addBloom(
      lerp(previousPoint.x, point.x, 0.55),
      lerp(previousPoint.y, point.y, 0.55),
      slowness,
      origin,
      point
    );

    previousPoint = { x: point.x, y: point.y };
  }
}

function addBloom(x, y, slowness, fromPoint, toPoint) {
  const branchTotal = floor(random(VARIANT.branchCount[0], VARIANT.branchCount[1] + 1));
  const branches = [];

  for (let i = 0; i < branchTotal; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const length = random(24, 92) * (0.55 + slowness * 0.8);

    branches.push({
      side,
      length,
      lift: random(-17, 17),
      bend: random(-12, 12),
      width: random(0.28, 0.92),
      alpha: random(0.48, 1),
      delay: random(8, 92),
      duration: random(150, 310),
      forkAt: random(0.52, 0.83),
      forkLength: random(8, 26),
      seed: random(1000)
    });
  }

  blooms.push({
    x: x + random(-3, 3),
    y: y + random(-3, 3),
    fromX: fromPoint.x,
    fromY: fromPoint.y,
    toX: toPoint.x,
    toY: toPoint.y,
    age: 0,
    fadeAge: 0,
    growLife: random(180, 280),
    life: random(900, 1350),
    startRadius: random(3, 7),
    endRadius: random(62, 128) * slowness,
    strength: random(0.42, 0.78) * slowness,
    aspect: random(0.42, 0.72),
    seed: random(1000),
    branches
  });

  if (blooms.length > MAX_BLOOMS) {
    blooms.shift();
  }
}

function drawBlooms() {
  const gestureIsActive = frameCount - lastGestureFrame < 24;

  drawingContext.save();
  drawingContext.globalCompositeOperation = "multiply";

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

    drawFibrousBloom(bloom);
  }

  drawingContext.restore();
}

function drawFibrousBloom(bloom) {
  const grow = easeOutQuart(constrain(bloom.age / bloom.growLife, 0, 1));
  const stopProgress = constrain(bloom.fadeAge / bloom.life, 0, 1);
  const persistence = 1 - pow(stopProgress, 4.5);
  const centreFade = 1 - pow(stopProgress, 0.62);
  const radius = lerp(bloom.startRadius, bloom.endRadius, grow);

  drawInitialInkLine(bloom, persistence);
  drawLayeredInkBody(bloom, radius, persistence, centreFade);
  drawCapillaryBranches(bloom, radius, persistence);
}

function drawInitialInkLine(bloom, persistence) {
  const ink = VARIANT.palette.ink;
  const lineFade = constrain(1 - bloom.fadeAge / (bloom.life * 0.72), 0, 1);

  noFill();
  stroke(ink[0], ink[1], ink[2], 118 * bloom.strength * persistence * lineFade);
  strokeWeight(0.65 + bloom.strength * 0.7);
  line(bloom.fromX, bloom.fromY, bloom.toX, bloom.toY);

  stroke(ink[0], ink[1], ink[2], 42 * persistence);
  strokeWeight(0.38);
  line(bloom.fromX, bloom.fromY + 1.8, bloom.toX, bloom.toY + 1.8);
}

function drawLayeredInkBody(bloom, radius, persistence, centreFade) {
  const ink = VARIANT.palette.ink;
  const soft = VARIANT.palette.inkSoft;
  const horizontalRadius = radius * VARIANT.lateralBias;

  noStroke();

  for (let layer = 5; layer >= 0; layer--) {
    const layerRatio = layer / 5;
    const layerRadius = horizontalRadius * (0.28 + layerRatio * 0.72);
    const layerHeight = radius * bloom.aspect * (0.42 + layerRatio * 0.72);
    const edgeWeight = pow(layerRatio, 1.5);
    const alpha = lerp(13 * centreFade, 26 * persistence, edgeWeight) * bloom.strength;
    const tone = lerpColor(color(soft[0], soft[1], soft[2]), color(ink[0], ink[1], ink[2]), edgeWeight * 0.72);

    fill(red(tone), green(tone), blue(tone), alpha);
    beginShape();

    for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 54) {
      const paperPull = noise(
        bloom.seed + cos(angle) * 2.4,
        bloom.seed + sin(angle) * 2.4,
        layer * 0.19
      );
      const serration = sin(angle * (11 + layer * 2) + bloom.seed) * 0.025;
      const uneven = map(paperPull, 0, 1, 0.76, 1.19) + serration;

      curveVertex(
        bloom.x + cos(angle) * layerRadius * uneven,
        bloom.y + sin(angle) * layerHeight * uneven
      );
    }

    endShape(CLOSE);
  }

  drawBrokenInkEdge(bloom, horizontalRadius, radius * bloom.aspect, persistence);
}

function drawBrokenInkEdge(bloom, radiusX, radiusY, persistence) {
  const ink = VARIANT.palette.ink;
  noFill();
  stroke(ink[0], ink[1], ink[2], 48 * bloom.strength * persistence);
  strokeWeight(0.48);

  for (let pass = 0; pass < 2; pass++) {
    beginShape();

    for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 62) {
      const skip = noise(bloom.seed + angle * 1.7, pass * 4.3);
      if (skip < 0.27) {
        endShape();
        beginShape();
        continue;
      }

      const uneven = map(noise(bloom.seed * 0.8 + cos(angle), bloom.seed + sin(angle), pass), 0, 1, 0.84, 1.14);
      curveVertex(
        bloom.x + cos(angle) * radiusX * uneven * (0.92 + pass * 0.08),
        bloom.y + sin(angle) * radiusY * uneven * (0.92 + pass * 0.08)
      );
    }

    endShape();
  }
}

function drawCapillaryBranches(bloom, radius, persistence) {
  const ink = VARIANT.palette.ink;
  const fibre = VARIANT.palette.fibre;

  for (const branch of bloom.branches) {
    const branchProgress = easeOutQuart(constrain((bloom.age - branch.delay) / branch.duration, 0, 1));
    if (branchProgress <= 0) continue;

    const startX = bloom.x + branch.side * radius * randomStable(branch.seed, 0.08, 0.46);
    const startY = bloom.y + map(noise(branch.seed, 2.4), 0, 1, -radius * 0.34, radius * 0.34);
    const spread = branch.length * branchProgress * VARIANT.lateralBias;
    const endX = startX + branch.side * spread;
    const endY = startY + branch.lift * branchProgress;
    const forkX = lerp(startX, endX, branch.forkAt);
    const forkY = lerp(startY, endY, branch.forkAt);

    noFill();
    stroke(ink[0], ink[1], ink[2], 64 * branch.alpha * bloom.strength * persistence);
    strokeWeight(branch.width);
    bezier(
      startX,
      startY,
      lerp(startX, endX, 0.34),
      startY + branch.bend,
      lerp(startX, endX, 0.7),
      endY - branch.bend * 0.38,
      endX,
      endY
    );

    if (branchProgress > branch.forkAt) {
      const forkProgress = map(branchProgress, branch.forkAt, 1, 0, 1);
      stroke(fibre[0], fibre[1], fibre[2], 45 * branch.alpha * persistence);
      strokeWeight(max(0.24, branch.width * 0.58));
      line(
        forkX,
        forkY,
        forkX + branch.side * branch.forkLength * forkProgress,
        forkY + branch.lift * 0.45 * forkProgress + branch.bend * 0.35
      );
    }
  }
}

function randomStable(seed, low, high) {
  return map(noise(seed * 0.031, 7.2), 0, 1, low, high);
}

function createPaperField() {
  paperFibres = [];
  edgeStains = [];
  randomSeed(1201);

  for (let i = 0; i < VARIANT.paperFiberCount; i++) {
    paperFibres.push({
      x: random(width),
      y: random(height),
      length: random(5, 31),
      rise: random(-2.8, 2.8),
      weight: random(0.22, 0.72),
      alpha: random(5, 20),
      light: random() > 0.64
    });
  }

  for (let i = 0; i < VARIANT.edgeStainCount; i++) {
    const vertical = random() > 0.5;
    const side = random() > 0.5 ? 1 : 0;

    edgeStains.push({
      x: vertical ? random(width) : (side ? width + random(-80, 10) : random(-10, 80)),
      y: vertical ? (side ? height + random(-70, 12) : random(-12, 70)) : random(height),
      width: random(90, 310),
      height: random(35, 128),
      alpha: random(4, 13),
      seed: random(1000)
    });
  }
}

function drawOldPaper() {
  const paper = VARIANT.palette.paper;
  const paperLight = VARIANT.palette.paperLight;
  const fibre = VARIANT.palette.fibre;
  background(paper[0], paper[1], paper[2]);

  noStroke();
  for (const stain of edgeStains) {
    fill(83, 65, 49, stain.alpha);
    beginShape();

    for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 30) {
      const uneven = map(noise(stain.seed + cos(angle), stain.seed + sin(angle)), 0, 1, 0.72, 1.26);
      curveVertex(
        stain.x + cos(angle) * stain.width * uneven,
        stain.y + sin(angle) * stain.height * uneven
      );
    }

    endShape(CLOSE);
  }

  for (const paperFibre of paperFibres) {
    const tone = paperFibre.light ? paperLight : fibre;
    stroke(tone[0], tone[1], tone[2], paperFibre.alpha);
    strokeWeight(paperFibre.weight);
    line(
      paperFibre.x,
      paperFibre.y,
      paperFibre.x + paperFibre.length,
      paperFibre.y + paperFibre.rise
    );
  }
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplayMode === 0) return;

  const points = hands[0].keypoints.map(toCanvasPoint);
  const ink = VARIANT.palette.ink;

  if (handDisplayMode === 1) {
    const tip = points[8];
    noFill();
    stroke(ink[0], ink[1], ink[2], 105);
    strokeWeight(1);
    circle(tip.x, tip.y, 14);
    return;
  }

  stroke(ink[0], ink[1], ink[2], 64);
  strokeWeight(0.7);
  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(ink[0], ink[1], ink[2], 92);
  for (const point of points) {
    circle(point.x, point.y, 3.5);
  }
}

function drawInterface() {
  const ink = VARIANT.palette.ink;
  textAlign(CENTER);
  noStroke();
  fill(ink[0], ink[1], ink[2], 105);
  textSize(12);

  if (!modelLoading && hands.length === 0) {
    text("Show one hand to the camera.", width / 2, height - 28);
  } else if (!modelLoading) {
    text("Move slowly, then pause and watch the fibres bleed.", width / 2, height - 28);
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createPaperField();

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
