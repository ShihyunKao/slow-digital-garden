let handPose;
let video;
let hands = [];
let paperLayer;

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = false;
let handDisplayMode = 1; // POINTS → SKELETON → HIDDEN

let breath = 0;
let previousBreath = 0;
let currentInput = {
  amount: 0,
  symmetry: 1,
  tilt: 0,
  midpointX: 0.5,
  midpointY: 0.5
};
let cycle = null;
let readyForCycle = true;

let specimens = [];
let sessionStep = 0;
let sessionComplete = false;
let completionAge = 0;
let savedFlash = 0;

const SESSION_LENGTH = 15;
const DRYING_FRAMES = 900;
const FINAL_MIDPOINT_SAMPLES = 12;
const DEMO_MODE = new URLSearchParams(window.location.search).has("demo");
const PAPER = "#D2C9B3";
const OLIVE = "#586348";
const VEIN = "#2F3B2E";
const EDGE = "#84674A";
const FADED = "#8C9780";
const STAMP = "#88483D";
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
  randomSeed(50321);
  noiseSeed(50321);
  buildPaperLayer();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  if (DEMO_MODE) {
    createDemoPage();
  } else {
    beginExperience();
  }
}

function draw() {
  drawPaper();

  currentInput = getBreathInput();
  previousBreath = breath;
  breath = lerp(breath, currentInput.amount, 0.1);

  if (!showHelp && !sessionComplete && !DEMO_MODE) updateSessionCycle();
  if (sessionComplete) completionAge++;

  drawPageRegistration();
  drawSpecimens();

  if (!showHelp) {
    drawHandDisplay();
    drawSessionFeedback();
    cursor(ARROW);
  }

  savedFlash = max(0, savedFlash - 1);
  syncHelpOverlay();
}

function buildPaperLayer() {
  paperLayer = createGraphics(width, height);
  paperLayer.pixelDensity(1);
  paperLayer.background(PAPER);

  paperLayer.noStroke();
  for (let i = 0; i < 1700; i++) {
    const x = random(width);
    const y = random(height);
    const light = random() > 0.52;
    paperLayer.fill(light ? 239 : 101, light ? 234 : 92, light ? 218 : 72, light ? 10 : 5);
    paperLayer.ellipse(x, y, random(0.4, 1.8), random(0.25, 0.8));
  }

  paperLayer.strokeWeight(0.45);
  for (let i = 0; i < 230; i++) {
    const x = random(width);
    const y = random(height);
    const length = random(8, 42);
    paperLayer.stroke(74, 82, 63, random(5, 13));
    paperLayer.line(x, y, x + length, y + random(-1.3, 1.3));
  }
}

function drawPaper() {
  background(PAPER);
  image(paperLayer, 0, 0);
}

function drawPageRegistration() {
  const left = 52;
  const right = width - 52;
  const top = 76;
  const bottom = height - 118;

  stroke(47, 59, 46, 24);
  strokeWeight(0.65);
  line(left, top, left + 19, top);
  line(left, top, left, top + 19);
  line(right, top, right - 19, top);
  line(right, top, right, top + 19);
  line(left, bottom, left + 19, bottom);
  line(left, bottom, left, bottom - 19);
  line(right, bottom, right - 19, bottom);
  line(right, bottom, right, bottom - 19);

  noStroke();
  fill(47, 59, 46, 54);
  textAlign(RIGHT, TOP);
  textSize(8);
  text(`SHEET 05.03  /  ${SESSION_LENGTH} PRESSED RECORDS`, right, top - 1);
}

function getBreathInput() {
  if (hands.length < 2) {
    return {
      amount: max(0, breath - 0.04),
      symmetry: 1,
      tilt: 0,
      midpointX: 0.5,
      midpointY: 0.5
    };
  }

  const a = hands[0].keypoints[8];
  const b = hands[1].keypoints[8];
  const maximumDistance = min(width * 0.72, height * 1.15);
  const tilt = constrain((a.y - b.y) / (height * 0.23), -1, 1);

  return {
    amount: constrain(map(dist(a.x, a.y, b.x, b.y), 48, maximumDistance, 0, 1), 0, 1),
    symmetry: 1 - abs(tilt),
    tilt,
    midpointX: constrain((a.x + b.x) * 0.5 / width, 0, 1),
    midpointY: constrain((a.y + b.y) * 0.5 / height, 0, 1)
  };
}

function createCycle() {
  return {
    maxBreath: 0,
    opened: false,
    movingFrames: 0,
    sampleFrames: 0,
    deltaSum: 0,
    deltaSquaredSum: 0,
    symmetrySum: 0,
    tiltSum: 0,
    pauseFrames: 0,
    lastMidX: currentInput.midpointX,
    lastMidY: currentInput.midpointY,
    closeMidXValues: [],
    closeMidYValues: []
  };
}

function updateSessionCycle() {
  const delta = breath - previousBreath;
  const absoluteDelta = abs(delta);

  if (breath < 0.18) readyForCycle = true;

  if (!cycle && readyForCycle && breath > 0.24) {
    cycle = createCycle();
    readyForCycle = false;
  }

  if (!cycle) return;

  cycle.maxBreath = max(cycle.maxBreath, breath);
  cycle.opened = cycle.opened || breath > 0.68;
  cycle.symmetrySum += currentInput.symmetry;
  cycle.tiltSum += currentInput.tilt;
  cycle.sampleFrames++;

  if (hands.length >= 2) {
    cycle.lastMidX = currentInput.midpointX;
    cycle.lastMidY = currentInput.midpointY;
  }

  if (absoluteDelta > 0.0012) {
    cycle.deltaSum += absoluteDelta;
    cycle.deltaSquaredSum += absoluteDelta * absoluteDelta;
    cycle.movingFrames++;
  }

  if (breath > 0.65 && absoluteDelta < 0.0055) cycle.pauseFrames++;

  if (cycle.opened && breath < 0.42 && hands.length >= 2) {
    cycle.closeMidXValues.push(currentInput.midpointX);
    cycle.closeMidYValues.push(currentInput.midpointY);
    if (cycle.closeMidXValues.length > FINAL_MIDPOINT_SAMPLES) {
      cycle.closeMidXValues.shift();
      cycle.closeMidYValues.shift();
    }
  }

  if (cycle.opened && breath < 0.3) {
    addSpecimen(calculateQuality(cycle));
    cycle = null;
    return;
  }

  if (!cycle.opened && breath < 0.08 && cycle.sampleFrames > 25) cycle = null;
}

function calculateQuality(record) {
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
  const duration = constrain(map(record.sampleFrames, 55, 280, 0, 1), 0, 1);
  const finalMidpointX = record.closeMidXValues.length > 0
    ? medianValue(record.closeMidXValues)
    : record.lastMidX;
  const finalMidpointY = record.closeMidYValues.length > 0
    ? medianValue(record.closeMidYValues)
    : record.lastMidY;
  const coherence = constrain(slowness * 0.56 + steadiness * 0.44, 0, 1);

  return {
    slowness,
    steadiness,
    balance,
    tilt,
    pause,
    duration,
    finalMidpointX,
    finalMidpointY,
    coherence
  };
}

function medianValue(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) * 0.5
    : sorted[middle];
}

function addSpecimen(quality, options = {}) {
  const size = 124;
  const anchor = getFullScreenAnchor(quality, size);
  const x = options.x ?? anchor.x;
  const y = options.y ?? anchor.y;
  const seed = options.seed ?? random(10000);
  const botany = buildBotanicalProfile(seed);

  const specimen = {
    step: sessionStep,
    x,
    y,
    seed,
    age: options.age ?? 0,
    size,
    leafCount: floor(lerp(4, 11, quality.pause)),
    rotation: quality.tilt * 0.58,
    veinClarity: quality.steadiness,
    fiberCount: floor(lerp(8, 46, quality.duration)),
    botany,
    quality
  };

  specimen.leaves = buildLeaves(specimen);
  specimen.fibers = buildFibers(specimen);
  specimens.push(specimen);
  sessionStep++;
  savedFlash = 100;

  if (sessionStep >= SESSION_LENGTH) {
    sessionComplete = true;
    completionAge = 0;
  }
}

function buildBotanicalProfile(seed) {
  return {
    form: floor(randomSeeded(seed + 101, 0, 2.99)),
    stemLean: randomSeeded(seed + 103, -0.16, 0.16),
    stemBend: randomSeeded(seed + 107, -0.13, 0.13),
    stemWave: randomSeeded(seed + 109, 0.014, 0.044),
    leafRise: randomSeeded(seed + 113, -0.24, 0.22),
    spacingJitter: randomSeeded(seed + 127, 0.032, 0.072),
    edgeRoughness: randomSeeded(seed + 131, 0.035, 0.1),
    ochre: randomSeeded(seed + 137, 0.2, 0.78),
    rootCount: floor(randomSeeded(seed + 139, 2, 4.99))
  };
}

// The specimen lands at the final midpoint between the two index fingertips.
// Only the plant's visible half-size is clamped so the specimen is not cropped.
function getFullScreenAnchor(quality, specimenSize) {
  const halfWidth = specimenSize * 0.52;
  const halfHeight = specimenSize * 0.58;
  const left = 52 + halfWidth;
  const right = width - 52 - halfWidth;
  const top = 88 + halfHeight;
  const bottom = height - 96 - halfHeight;
  return {
    x: constrain(quality.finalMidpointX * width, left, right),
    y: constrain(quality.finalMidpointY * height, top, bottom)
  };
}

function buildLeaves(specimen) {
  const leaves = [];
  const lateralCount = max(3, specimen.leafCount - 1);
  const form = specimen.botany.form;

  for (let i = 0; i < lateralCount; i++) {
    const baseT = map(i, 0, max(lateralCount - 1, 1), 0.12, 0.82);
    const spacing = randomSeeded(specimen.seed + i * 17.3, -specimen.botany.spacingJitter, specimen.botany.spacingJitter);
    const t = constrain(baseT + spacing, 0.12, 0.84);
    const sideShift = randomSeeded(specimen.seed + i * 31.1, 0, 1) > 0.82 ? 1 : 0;
    const side = (i + floor(specimen.seed) + sideShift) % 2 === 0 ? -1 : 1;
    const taper = lerp(1.12, 0.62, t);
    const formLength = [0.39, 0.34, 0.29][form];
    const formWidth = [0.057, 0.09, 0.067][form];
    const rise = specimen.botany.leafRise + randomSeeded(specimen.seed + i * 5.9, -0.12, 0.12);
    leaves.push({
      t,
      side,
      angle: side > 0 ? rise : PI - rise,
      length: formLength * taper * randomSeeded(specimen.seed + i * 7.1, 0.84, 1.12),
      width: formWidth * taper * randomSeeded(specimen.seed + i * 5.7, 0.82, 1.18),
      petiole: randomSeeded(specimen.seed + i * 3.9, 0.025, form === 1 ? 0.065 : 0.045),
      branch: form === 2 && i > 0
        ? randomSeeded(specimen.seed + i * 14.3, 0.035, 0.105)
        : 0,
      asymmetry: randomSeeded(specimen.seed + i * 4.3, -0.18, 0.18),
      curl: randomSeeded(specimen.seed + i * 6.7, -0.11, 0.11),
      damage: randomSeeded(specimen.seed + i * 9.1, 0, 1),
      fade: randomSeeded(specimen.seed + i * 12.7, 0, 1),
      edgeSeed: specimen.seed + i * 29.7
    });
  }

  leaves.push({
    t: 0.93,
    side: 0,
    angle: -HALF_PI + randomSeeded(specimen.seed + 211, -0.42, 0.42),
    length: [0.27, 0.23, 0.2][form],
    width: [0.046, 0.068, 0.052][form],
    petiole: 0.018,
    branch: 0,
    asymmetry: randomSeeded(specimen.seed + 223, -0.12, 0.12),
    curl: randomSeeded(specimen.seed + 227, -0.07, 0.07),
    damage: randomSeeded(specimen.seed + 229, 0, 1),
    fade: randomSeeded(specimen.seed + 231, 0, 1),
    edgeSeed: specimen.seed + 233
  });
  return leaves;
}

function buildFibers(specimen) {
  const fibers = [];
  for (let i = 0; i < specimen.fiberCount; i++) {
    fibers.push({
      x: randomSeeded(specimen.seed + i * 11.2, -0.43, 0.43),
      y: randomSeeded(specimen.seed + i * 13.8, -0.51, 0.54),
      length: randomSeeded(specimen.seed + i * 17.1, 0.045, 0.17),
      angle: randomSeeded(specimen.seed + i * 19.6, -0.8, 0.8),
      alpha: randomSeeded(specimen.seed + i * 23.4, 18, 55)
    });
  }
  return fibers;
}

function drawSpecimens() {
  for (const specimen of specimens) {
    if (!DEMO_MODE || specimen.age < DRYING_FRAMES + 600) specimen.age++;
    drawSpecimen(specimen);
  }
}

function drawSpecimen(specimen) {
  const dry = easeInOutCubic(constrain(specimen.age / DRYING_FRAMES, 0, 1));
  const wet = 1 - dry;
  const settle = sin(frameCount * 0.045 + specimen.seed) * wet;
  const scaleIn = easeOutCubic(constrain(specimen.age / 32, 0, 1));

  push();
  translate(specimen.x + settle * 1.8, specimen.y + cos(frameCount * 0.038 + specimen.seed) * wet * 1.15);
  rotate(specimen.rotation + settle * 0.018);
  scale(scaleIn);

  drawSpecimenFibers(specimen, dry);
  drawStem(specimen, dry);
  for (let i = 0; i < specimen.leaves.length; i++) {
    drawLeaf(specimen, specimen.leaves[i], i, dry, wet);
  }
  pop();

  drawSpecimenStamp(specimen, dry, scaleIn);

  drawScannerLight(specimen);
}

function drawSpecimenFibers(specimen, dry) {
  const s = specimen.size;
  strokeWeight(0.45);
  for (const fiber of specimen.fibers) {
    const x = fiber.x * s;
    const y = fiber.y * s;
    const length = fiber.length * s;
    stroke(132, 103, 74, fiber.alpha * lerp(0.35, 1, dry));
    line(x, y, x + cos(fiber.angle) * length, y + sin(fiber.angle) * length);
  }
}

function stemPoint(specimen, t) {
  const s = specimen.size;
  const y = lerp(s * 0.5, -s * 0.49, t);
  const lean = specimen.botany.stemLean * s * (t - 0.18);
  const bend = sin(t * PI) * specimen.botany.stemBend * s;
  const wave = sin(t * PI * 2.25 + specimen.seed * 0.07) * specimen.botany.stemWave * s;
  const x = lean + bend + wave;
  return { x, y };
}

function drawStem(specimen, dry) {
  const dryOlive = lerpColor(color(OLIVE), color(FADED), dry * 0.72);
  stroke(132, 103, 74, 42 + dry * 76);
  strokeWeight(lerp(2.35, 1.55, dry));
  noFill();
  beginShape();
  for (let i = 0; i <= 24; i++) {
    const point = stemPoint(specimen, i / 24);
    curveVertex(point.x, point.y);
  }
  endShape();

  stroke(red(dryOlive), green(dryOlive), blue(dryOlive), lerp(205, 166, dry));
  strokeWeight(lerp(1.35, 0.72, dry));
  beginShape();
  for (let i = 0; i <= 24; i++) {
    const point = stemPoint(specimen, i / 24);
    curveVertex(point.x - 0.25, point.y);
  }
  endShape();

  const base = stemPoint(specimen, 0);
  for (let i = 0; i < specimen.botany.rootCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const rootLength = randomSeeded(specimen.seed + 310 + i * 7.4, 8, 19);
    const rootDrop = randomSeeded(specimen.seed + 314 + i * 9.2, 3, 10);
    stroke(132, 103, 74, 28 + dry * 55);
    strokeWeight(0.45);
    noFill();
    bezier(
      base.x,
      base.y,
      base.x + side * rootLength * 0.28,
      base.y + rootDrop * 0.18,
      base.x + side * rootLength * 0.72,
      base.y + rootDrop * 0.72,
      base.x + side * rootLength,
      base.y + rootDrop
    );
  }
}

function drawLeaf(specimen, leaf, index, dry, wet) {
  const s = specimen.size;
  const attachment = stemPoint(specimen, leaf.t);
  const length = leaf.length * s;
  const leafWidth = leaf.width * s;
  const localSway = sin(frameCount * 0.052 + specimen.seed + index * 1.7) * wet * 0.026;
  const angle = leaf.angle + localSway;
  const petioleLength = leaf.petiole * s;
  const leafColor = lerpColor(color(OLIVE), color(FADED), dry * (0.54 + leaf.fade * 0.28));
  const branchX = leaf.side * leaf.branch * s;
  const branchY = -abs(branchX) * randomSeeded(leaf.edgeSeed + 271, 0.18, 0.42);
  const petioleEndX = cos(angle) * petioleLength;
  const petioleEndY = sin(angle) * petioleLength;

  push();
  translate(attachment.x, attachment.y);
  stroke(132, 103, 74, 44 + dry * 72);
  strokeWeight(0.55);
  noFill();
  if (leaf.branch > 0) {
    bezier(0, 0, branchX * 0.32, branchY * 0.12, branchX * 0.7, branchY * 0.8, branchX, branchY);
    translate(branchX, branchY);
  }
  line(0, 0, petioleEndX, petioleEndY);
  translate(petioleEndX, petioleEndY);
  rotate(angle);

  const edgeAlpha = 42 + dry * (58 + specimen.botany.ochre * 58);
  fill(132, 103, 74, edgeAlpha);
  noStroke();
  drawLeafSilhouette(specimen, leaf, length * 1.025, leafWidth * 1.14, 1);

  fill(red(leafColor), green(leafColor), blue(leafColor), lerp(174, 137, dry));
  drawLeafSilhouette(specimen, leaf, length, leafWidth, 0.72);

  noStroke();
  fill(210, 201, 178, 13 + dry * 23);
  ellipse(length * 0.48, leaf.curl * leafWidth * 0.3, length * 0.42, leafWidth * 0.64);

  if (leaf.damage > 0.58) {
    const stainX = length * randomSeeded(leaf.edgeSeed + 301, 0.35, 0.72);
    const stainY = leafWidth * randomSeeded(leaf.edgeSeed + 307, -0.28, 0.28);
    fill(132, 103, 74, 8 + dry * 22);
    ellipse(stainX, stainY, length * 0.16, leafWidth * 0.42);
  }

  if (leaf.damage > 0.78) {
    const biteX = length * randomSeeded(leaf.edgeSeed + 317, 0.5, 0.78);
    const biteSide = randomSeeded(leaf.edgeSeed + 319, 0, 1) > 0.5 ? -1 : 1;
    fill(210, 201, 179, 205);
    ellipse(biteX, biteSide * leafWidth * 0.82, leafWidth * 0.48, leafWidth * 0.38);
  }

  drawLeafVeins(length, leafWidth, leaf.curl, specimen.veinClarity, dry);
  pop();
}

function drawLeafSilhouette(specimen, leaf, length, leafWidth, roughnessScale) {
  const steps = 10;
  const top = [];
  const bottom = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const shapePower = [1.12, 0.98, 1.2][specimen.botany.form];
    const envelope = pow(sin(t * PI), shapePower);
    const edgeNoise = randomSeeded(leaf.edgeSeed + i * 4.7, -1, 1) * specimen.botany.edgeRoughness * roughnessScale;
    const damageIndex = floor(randomSeeded(leaf.edgeSeed + 91, 3, 8.99));
    const damage = leaf.damage > 0.66 && (i === damageIndex || i === damageIndex + 1)
      ? randomSeeded(leaf.edgeSeed + i * 8.3, 0.12, 0.34)
      : 0;
    const curveY = leaf.curl * leafWidth * t * t;
    const topWidth = leafWidth * envelope * (1 + leaf.asymmetry + edgeNoise - damage);
    const bottomWidth = leafWidth * envelope * (1 - leaf.asymmetry - edgeNoise * 0.65);
    top.push({ x: length * t, y: curveY - topWidth });
    bottom.push({ x: length * t, y: curveY + bottomWidth });
  }

  beginShape();
  for (const point of top) curveVertex(point.x, point.y);
  for (let i = bottom.length - 1; i >= 0; i--) curveVertex(bottom[i].x, bottom[i].y);
  curveVertex(top[0].x, top[0].y);
  curveVertex(top[1].x, top[1].y);
  endShape(CLOSE);
}

function drawLeafVeins(length, leafWidth, curl, clarity, dry) {
  stroke(47, 59, 46, lerp(28, 78, dry) + clarity * 105);
  strokeWeight(0.34 + clarity * 0.38);
  noFill();
  bezier(0, 0, length * 0.28, curl * leafWidth * 0.08, length * 0.68, curl * leafWidth * 0.46, length * 0.92, curl * leafWidth * 0.82);

  const pairs = floor(lerp(2, 5, clarity));
  for (let i = 1; i <= pairs; i++) {
    const t = i / (pairs + 1);
    const x = length * t * 0.82;
    const centerY = curl * leafWidth * t * t;
    const reach = leafWidth * sin(t * PI) * 0.62;
    const secondaryAlpha = (24 + clarity * 80) * lerp(0.52, 1, dry);
    stroke(47, 59, 46, secondaryAlpha);
    strokeWeight(0.25 + clarity * 0.19);
    line(x, centerY, x + length * 0.12, centerY - reach);
    line(x, centerY, x + length * 0.1, centerY + reach * 0.78);
  }
}

function drawSpecimenStamp(specimen, dry, scaleIn) {
  const s = specimen.size;
  const stampX = specimen.x + s * 0.42;
  const stampY = specimen.y + s * 0.42;

  push();
  translate(stampX, stampY);
  rotate(randomSeeded(specimen.seed + 401, -0.075, 0.075));
  scale(scaleIn);
  noFill();
  stroke(136, 72, 61, 78 + dry * 72);
  strokeWeight(0.65);
  rectMode(CENTER);
  rect(0, 0, 19, 13, 0.7);
  rectMode(CORNER);

  noStroke();
  fill(136, 72, 61, 115 + dry * 60);
  textAlign(CENTER, CENTER);
  textSize(7);
  text(nf(specimen.step + 1, 2), 0, 0.3);
  pop();
}

function drawScannerLight(specimen) {
  if (specimen.age > 260) return;

  const progress = constrain(specimen.age / 260, 0, 1);
  const fade = sin(progress * PI);
  const halfSize = specimen.size * 0.72;
  const scanY = lerp(specimen.y - halfSize, specimen.y + halfSize, progress);

  push();
  noStroke();
  fill(244, 239, 220, 28 * fade);
  rect(specimen.x - halfSize, scanY - 7, halfSize * 2, 14);
  stroke(249, 245, 226, 72 * fade);
  strokeWeight(0.75);
  line(specimen.x - halfSize, scanY, specimen.x + halfSize, scanY);
  pop();
}

function drawHandDisplay() {
  if (handDisplayMode === 0 || DEMO_MODE) return;

  for (const hand of hands) {
    const points = hand.keypoints;
    if (handDisplayMode === 2) {
      stroke(47, 59, 46, 62);
      strokeWeight(0.75);
      for (const [a, b] of HAND_CONNECTIONS) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);
    noStroke();
    fill(47, 59, 46, 105);
    for (const index of visible) circle(points[index].x, points[index].y, handDisplayMode === 1 ? 6.5 : 3.2);
  }
}

function drawSessionFeedback() {
  let label;
  if (DEMO_MODE) {
    label = "REFERENCE SPECIMEN PAGE · DEMO";
  } else if (sessionComplete) {
    label = "HERBARIUM PAGE COMPLETE — R TO BEGIN AGAIN";
  } else if (cycle) {
    label = breath > 0.65
      ? `SPECIMEN ${sessionStep + 1} OF ${SESSION_LENGTH} · PAUSE, THEN RETURN`
      : previousBreath > breath
        ? `SPECIMEN ${sessionStep + 1} OF ${SESSION_LENGTH} · RETURN TO PRESS`
        : `SPECIMEN ${sessionStep + 1} OF ${SESSION_LENGTH} · OPEN SLOWLY`;
  } else if (savedFlash > 0) {
    label = `SPECIMEN ${sessionStep} PRESSED · DRYING`;
  } else {
    label = `SPECIMEN ${min(sessionStep + 1, SESSION_LENGTH)} OF ${SESSION_LENGTH} · BRING HANDS TOGETHER`;
  }

  const progress = sessionStep / SESSION_LENGTH;
  const barWidth = min(420, width - 100);
  const y = height - 38;

  noStroke();
  fill(47, 59, 46, 130);
  textAlign(CENTER, CENTER);
  textSize(9);
  text(label, width / 2, y - 16);

  stroke(47, 59, 46, 36);
  strokeWeight(0.8);
  line(width / 2 - barWidth / 2, y, width / 2 + barWidth / 2, y);
  stroke(136, 72, 61, 145);
  strokeWeight(1.2);
  line(width / 2 - barWidth / 2, y, width / 2 - barWidth / 2 + barWidth * progress, y);
}

function createDemoPage() {
  const points = [
    [0.12, 0.17], [0.31, 0.23], [0.5, 0.15], [0.69, 0.24], [0.87, 0.18],
    [0.2, 0.43], [0.41, 0.51], [0.6, 0.41], [0.81, 0.48],
    [0.11, 0.68], [0.29, 0.76], [0.48, 0.67], [0.66, 0.78], [0.85, 0.69],
    [0.53, 0.86]
  ];
  for (let i = 0; i < SESSION_LENGTH; i++) {
    const slowness = randomSeeded(701 + i * 37.1, 0.34, 0.94);
    const steadiness = randomSeeded(809 + i * 41.3, 0.32, 0.96);
    const quality = {
      slowness,
      pause: randomSeeded(907 + i * 43.7, 0.08, 0.94),
      steadiness,
      balance: randomSeeded(1009 + i * 47.9, 0.62, 0.97),
      tilt: randomSeeded(1103 + i * 53.1, -0.42, 0.42),
      duration: randomSeeded(1201 + i * 59.3, 0.16, 0.96),
      finalMidpointX: points[i][0],
      finalMidpointY: points[i][1],
      coherence: constrain(slowness * 0.56 + steadiness * 0.44, 0, 1)
    };
    addSpecimen(quality, {
      seed: 503 + i * 91,
      age: max(36, 1120 - i * 74)
    });
  }
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
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
  if (key === "r" || key === "R") resetSession();
}

function beginExperience() {
  showHelp = false;
  syncHelpOverlay();
  cursor(ARROW);
  if (!video && !modelLoading && !DEMO_MODE) startHandMode();
}

function resetSession() {
  specimens = [];
  sessionStep = 0;
  sessionComplete = false;
  completionAge = 0;
  cycle = null;
  readyForCycle = true;
  savedFlash = 0;
  if (DEMO_MODE) createDemoPage();
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
  buildPaperLayer();
  if (video) video.size(width, height);
  resetSession();
}

function randomSeeded(seed, minValue, maxValue) {
  return map(noise(seed * 0.031, 5.03), 0, 1, minValue, maxValue);
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
}
