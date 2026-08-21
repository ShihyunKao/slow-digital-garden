let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = false;
let handDisplayMode = 1; // POINTS → SKELETON → HIDDEN
let reducedMotion = false;

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

let memories = [];
let sessionStep = 0;
let sessionComplete = false;
let savedFlash = 0;
let globalSway = 0;
let globalVelocity = 0;

const SESSION_LENGTH = 12;
const DEMO_MODE = new URLSearchParams(window.location.search).has("demo");
const PALETTE = {
  background: "#100F0D",
  brass: "#A99A79",
  verdigris: "#547B76",
  copper: "#9A573D",
  smoke: "#657B85",
  ivory: "#E9DCC0",
  shadow: "#29211C"
};
const PLATE_COLORS = [PALETTE.verdigris, PALETTE.copper, PALETTE.smoke];
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
  randomSeed(50421);
  noiseSeed(50421);
  reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  if (DEMO_MODE) createDemoMobile();
  else beginExperience();
}

function draw() {
  drawBackgroundAndLight();

  currentInput = getBreathInput();
  previousBreath = breath;
  breath = lerp(breath, currentInput.amount, 0.1);

  if (!showHelp && !sessionComplete && !DEMO_MODE) updateSessionCycle();
  updateMobilePhysics();

  const points = getCurrentAnchorPoints();
  if (points.length === 0) drawEmptySuspension();
  else {
    drawMobile(points, true);
    drawMobile(points, false);
  }

  if (!showHelp) {
    drawHandDisplay();
    drawSessionFeedback();
    cursor(ARROW);
  }

  savedFlash = max(0, savedFlash - 1);
  syncHelpOverlay();
}

function drawBackgroundAndLight() {
  background(PALETTE.background);
  const ctx = drawingContext;
  const lightX = width * 0.5;
  const lightY = 36;

  ctx.save();
  const glow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, min(width, height) * 0.76);
  glow.addColorStop(0, "rgba(233,220,192,0.145)");
  glow.addColorStop(0.22, "rgba(233,220,192,0.055)");
  glow.addColorStop(0.72, "rgba(100,82,60,0.012)");
  glow.addColorStop(1, "rgba(16,15,13,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  noStroke();
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    fill(233, 220, 192, lerp(2.7, 0, t));
    triangle(
      lightX - 18 - t * width * 0.31,
      lightY,
      lightX + 18 + t * width * 0.31,
      lightY,
      lightX,
      height * lerp(0.52, 0.96, t)
    );
  }

  stroke(233, 220, 192, 26);
  strokeWeight(0.65);
  line(lightX - 28, 47, lightX + 28, 47);
  noStroke();
  fill(233, 220, 192, 72);
  ellipse(lightX, 47, 10, 2.2);
}

function getBreathInput() {
  if (hands.length < 2) {
    return {
      amount: max(0, breath - 0.04),
      symmetry: 1,
      tilt: 0,
      midpointX: currentInput.midpointX,
      midpointY: currentInput.midpointY
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
    holdRunFrames: 0,
    maxHoldFrames: 0,
    wideMidXSum: 0,
    wideMidYSum: 0,
    wideFrames: 0
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

  if (absoluteDelta > 0.0012) {
    cycle.deltaSum += absoluteDelta;
    cycle.deltaSquaredSum += absoluteDelta * absoluteDelta;
    cycle.movingFrames++;
  }

  // Only one uninterrupted, genuinely still hold changes the plate size.
  // Slow opening frames are no longer accumulated as pause time.
  if (cycle.opened && breath > 0.68 && absoluteDelta < 0.0018) {
    cycle.holdRunFrames++;
    cycle.maxHoldFrames = max(cycle.maxHoldFrames, cycle.holdRunFrames);
  } else if (breath < 0.64 || absoluteDelta > 0.0024) {
    cycle.holdRunFrames = 0;
  }
  if (breath > 0.55 && hands.length >= 2) {
    cycle.wideMidXSum += currentInput.midpointX;
    cycle.wideMidYSum += currentInput.midpointY;
    cycle.wideFrames++;
  }

  if (cycle.opened && breath < 0.3) {
    addMemory(calculateQuality(cycle));
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
  const wideFrames = max(record.wideFrames, 1);

  return {
    slowness: 1 - constrain(map(meanDelta, 0.006, 0.045, 0, 1), 0, 1),
    steadiness: 1 - constrain(map(deviation, 0.001, 0.024, 0, 1), 0, 1),
    balance: constrain(record.symmetrySum / sampleFrames, 0, 1),
    tilt: constrain(record.tiltSum / sampleFrames, -1, 1),
    pause: constrain(map(record.maxHoldFrames, 4, 64, 0, 1), 0, 1),
    holdFrames: record.maxHoldFrames,
    duration: constrain(map(record.sampleFrames, 55, 280, 0, 1), 0, 1),
    midpointX: record.wideFrames > 0 ? record.wideMidXSum / wideFrames : currentInput.midpointX,
    midpointY: record.wideFrames > 0 ? record.wideMidYSum / wideFrames : currentInput.midpointY
  };
}

function addMemory(quality, options = {}) {
  const seed = options.seed ?? random(10000);
  const exhibitionScale = getExhibitionScale();
  const memory = {
    step: sessionStep,
    seed,
    age: options.age ?? 0,
    rawX: constrain(quality.midpointX, 0, 1),
    rawY: constrain(quality.midpointY, 0, 1),
    plateAngle: quality.tilt * 0.92,
    plateSize: getPlateSize(quality) * exhibitionScale,
    swingAmount: lerp(1.6, 10.5, 1 - quality.steadiness),
    stringLength: (96 + (sessionStep % 4) * 29 + randomSeeded(seed + 51, -10, 15)) * exhibitionScale,
    color: PLATE_COLORS[sessionStep % PLATE_COLORS.length],
    offsetX: 0,
    offsetY: 0,
    velocityX: 0,
    velocityY: 0,
    rotationOffset: 0,
    rotationVelocity: 0,
    quality
  };

  memories.push(memory);
  sessionStep++;
  savedFlash = 120;
  introduceImpulse(memory);

  if (sessionStep >= SESSION_LENGTH) sessionComplete = true;
}

function getPlateSize(quality) {
  const holdFrames = quality.holdFrames ?? quality.pause * 64;
  if (holdFrames < 5) return 32;
  if (holdFrames < 15) return 54;
  if (holdFrames < 28) return 80;
  if (holdFrames < 45) return 112;
  return 154;
}

function introduceImpulse(newMemory) {
  if (reducedMotion) return;
  const direction = newMemory.rawX < 0.5 ? 1 : -1;
  const force = newMemory.swingAmount;
  globalVelocity += direction * force * 0.00072;

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    const distanceFalloff = lerp(0.46, 1, (i + 1) / memories.length);
    const phase = i % 2 === 0 ? 1 : -0.72;
    memory.velocityX += direction * force * 0.032 * distanceFalloff;
    memory.velocityY += force * 0.012 * phase;
    memory.rotationVelocity += direction * force * 0.00085 * phase;
  }
}

function updateMobilePhysics() {
  if (reducedMotion) {
    globalSway = 0;
    globalVelocity = 0;
    for (const memory of memories) {
      memory.offsetX = 0;
      memory.offsetY = 0;
      memory.rotationOffset = 0;
      memory.age++;
    }
    return;
  }

  globalVelocity += -globalSway * 0.00155;
  globalVelocity *= 0.9915;
  globalSway += globalVelocity;
  globalSway = constrain(globalSway, -0.075, 0.075);

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    memory.age++;
    const spring = 0.0018 + (i % 3) * 0.00028;
    const verticalSpring = 0.0024 + (i % 2) * 0.00025;
    memory.velocityX += -memory.offsetX * spring;
    memory.velocityY += -memory.offsetY * verticalSpring;
    memory.rotationVelocity += -memory.rotationOffset * 0.0021;
    memory.velocityX *= 0.985;
    memory.velocityY *= 0.983;
    memory.rotationVelocity *= 0.982;
    memory.offsetX += memory.velocityX;
    memory.offsetY += memory.velocityY;
    memory.rotationOffset += memory.rotationVelocity;
  }
}

function getRestAnchor(memory) {
  // A two-hand midpoint normally occupies only the central camera range.
  // Expand that physical working range across the exhibition field while
  // retaining the raw normalized coordinates on every memory record.
  const normalizedX = constrain(map(memory.rawX, 0.34, 0.66, 0, 1), 0, 1);
  const normalizedY = constrain(map(memory.rawY, 0.26, 0.74, 0, 1), 0, 1);
  const left = width * 0.08;
  const right = width * 0.92;
  const top = max(170, height * 0.2);
  const bottom = min(height * 0.58, height - 330);
  return {
    x: lerp(left, right, normalizedX),
    y: lerp(top, max(top + 150, bottom), normalizedY)
  };
}

function getExhibitionScale() {
  return constrain(min(width / 1512, height / 850), 1, 1.55);
}

function getCurrentAnchorPoints() {
  return memories.map((memory, index) => {
    const rest = getRestAnchor(memory);
    const rootInfluence = (rest.y - 48) * sin(globalSway);
    return {
      x: rest.x + rootInfluence + memory.offsetX,
      y: rest.y + abs(rootInfluence) * 0.045 + memory.offsetY,
      memory,
      index
    };
  });
}

function buildHierarchy(points) {
  const levels = [points.map((point) => ({ x: point.x, y: point.y, leaves: [point] }))];
  let current = levels[0];

  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1];
      if (!b) {
        next.push({ ...a, single: true });
        continue;
      }
      const x = (a.x + b.x) * 0.5;
      const level = levels.length;
      const branchLift = (84 - level * 10) * getExhibitionScale();
      const tierFloor = max(76, 168 - level * 34);
      const y = max(tierFloor, min(a.y, b.y) - branchLift);
      next.push({ x, y, a, b, leaves: [...a.leaves, ...b.leaves] });
    }
    levels.push(next);
    current = next;
  }

  return { levels, root: current[0] };
}

function drawMobile(points, shadowPass) {
  const hierarchy = buildHierarchy(points);
  const root = hierarchy.root;
  const ctx = drawingContext;

  push();
  if (shadowPass) {
    translate(34, 48);
    translate(width * 0.5, 48);
    scale(1.035, 1.075);
    translate(-width * 0.5, -48);
    ctx.save();
    ctx.filter = "blur(3.2px)";
  }

  drawCeilingSuspension(root, shadowPass);
  drawHierarchyRods(hierarchy, shadowPass);
  for (const point of points) drawWeight(point, shadowPass);

  if (shadowPass) ctx.restore();
  pop();
}

function drawCeilingSuspension(root, shadowPass) {
  const ceilingX = width * 0.5;
  const ceilingY = 48;
  if (shadowPass) {
    stroke(41, 33, 28, 54);
    strokeWeight(2.2);
  } else {
    stroke(169, 154, 121, 118);
    strokeWeight(0.72);
  }
  line(ceilingX, ceilingY, root.x, root.y);

  if (!shadowPass) {
    noStroke();
    fill(233, 220, 192, 138);
    circle(ceilingX, ceilingY, 3.2);
    fill(169, 154, 121, 150);
    circle(root.x, root.y, 4.1);
  }
}

function drawHierarchyRods(hierarchy, shadowPass) {
  for (let levelIndex = hierarchy.levels.length - 1; levelIndex >= 1; levelIndex--) {
    const parents = hierarchy.levels[levelIndex];
    for (const parent of parents) {
      if (!parent.a || !parent.b) continue;
      drawSuspendedBranch(parent, parent.a, shadowPass);
      drawSuspendedBranch(parent, parent.b, shadowPass);

      if (shadowPass) {
        stroke(41, 33, 28, 74);
        strokeWeight(3.5);
      } else {
        stroke(169, 154, 121, 185);
        strokeWeight(levelIndex === 1 ? 1.35 : 1.65);
      }
      line(parent.a.x, parent.a.y, parent.b.x, parent.b.y);

      if (!shadowPass) {
        drawBrassHighlight(parent.a.x, parent.a.y, parent.b.x, parent.b.y);
        noStroke();
        fill(233, 220, 192, 110);
        circle(parent.x, parent.y, 3.4);
      }
    }
  }
}

function drawSuspendedBranch(parent, child, shadowPass) {
  const attachY = min(child.y, parent.y + max(22, (child.y - parent.y) * 0.48));
  if (shadowPass) {
    stroke(41, 33, 28, 48);
    strokeWeight(1.9);
  } else {
    stroke(169, 154, 121, 94);
    strokeWeight(0.54);
  }
  line(parent.x, parent.y, child.x, attachY);
}

function drawBrassHighlight(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = max(1, sqrt(dx * dx + dy * dy));
  const nx = -dy / length;
  const ny = dx / length;
  stroke(233, 220, 192, 39);
  strokeWeight(0.48);
  line(x1 + nx, y1 + ny, x2 + nx, y2 + ny);
}

function drawWeight(point, shadowPass) {
  const memory = point.memory;
  const reveal = easeOutCubic(constrain(memory.age / 42, 0, 1));
  const weightX = point.x + sin(memory.rotationOffset) * memory.stringLength * 0.38;
  const weightY = point.y + cos(memory.rotationOffset) * memory.stringLength;
  const angle = memory.plateAngle + memory.rotationOffset * 1.35;

  if (shadowPass) {
    stroke(41, 33, 28, 56);
    strokeWeight(1.8);
    line(point.x, point.y, weightX, weightY);
  } else {
    stroke(169, 154, 121, 104);
    strokeWeight(0.55);
    line(point.x, point.y, weightX, weightY);
    noStroke();
    fill(169, 154, 121, 132);
    circle(point.x, point.y, 3.2);
  }

  push();
  translate(weightX, weightY);
  rotate(angle);
  scale(reveal);
  if (shadowPass) drawPlateShadow(memory);
  else drawPlate(memory);
  pop();

  if (!shadowPass) drawRecordNumber(memory, point, weightX, weightY, reveal);
}

function drawPlateShadow(memory) {
  noStroke();
  fill(41, 33, 28, 78);
  const size = memory.plateSize;
  beginShape();
  vertex(-size * 0.52, -size * 0.19);
  vertex(-size * 0.16, -size * 0.5);
  vertex(size * 0.4, -size * 0.31);
  vertex(size * 0.55, size * 0.12);
  vertex(size * 0.12, size * 0.49);
  vertex(-size * 0.42, size * 0.34);
  endShape(CLOSE);
}

function drawPlate(memory) {
  const size = memory.plateSize;
  const base = color(memory.color);
  const glint = color(PALETTE.ivory);
  const ctx = drawingContext;

  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = "rgba(233,220,192,0.08)";
  fill(red(base), green(base), blue(base), memory.color === PALETTE.smoke ? 98 : 122);
  stroke(233, 220, 192, 63);
  strokeWeight(0.75);
  beginShape();
  vertex(-size * 0.52, -size * 0.19);
  vertex(-size * 0.16, -size * 0.5);
  vertex(size * 0.4, -size * 0.31);
  vertex(size * 0.55, size * 0.12);
  vertex(size * 0.12, size * 0.49);
  vertex(-size * 0.42, size * 0.34);
  endShape(CLOSE);
  ctx.restore();

  noFill();
  stroke(red(glint), green(glint), blue(glint), 52);
  strokeWeight(0.55);
  line(-size * 0.27, -size * 0.24, size * 0.28, size * 0.22);
  stroke(red(base), green(base), blue(base), 168);
  strokeWeight(1.25);
  line(-size * 0.38, size * 0.25, size * 0.08, size * 0.42);
  noStroke();
  fill(233, 220, 192, 106);
  circle(0, -size * 0.36, 2.5);
}

function drawRecordNumber(memory, point, weightX, weightY, reveal) {
  if (reveal < 0.75) return;
  const x = lerp(point.x, weightX, 0.22) + 7;
  const y = lerp(point.y, weightY, 0.22);
  noStroke();
  fill(169, 154, 121, 82);
  textAlign(LEFT, CENTER);
  textSize(8.5 * getExhibitionScale());
  text(nf(memory.step + 1, 2), x, y);
}

function drawEmptySuspension() {
  const x = width * 0.5;
  const y = max(165, height * 0.2);
  stroke(169, 154, 121, 48);
  strokeWeight(0.65);
  line(x, 48, x, y);
  line(x - 78, y, x + 78, y);
  noStroke();
  fill(233, 220, 192, 75);
  circle(x, y, 3.5);

  if (cycle) {
    const previewX = lerp(width * 0.16, width * 0.84, currentInput.midpointX);
    const previewY = lerp(max(150, height * 0.17), max(240, height * 0.56), currentInput.midpointY);
    stroke(84, 123, 118, 55 + breath * 65);
    noFill();
    circle(previewX, previewY, 12 + breath * 12);
  }
}

function drawHandDisplay() {
  if (handDisplayMode === 0 || DEMO_MODE) return;
  for (const hand of hands) {
    const points = hand.keypoints;
    if (handDisplayMode === 2) {
      stroke(169, 154, 121, 54);
      strokeWeight(0.65);
      for (const [a, b] of HAND_CONNECTIONS) line(points[a].x, points[a].y, points[b].x, points[b].y);
    }

    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);
    noStroke();
    fill(233, 220, 192, 105);
    for (const index of visible) circle(points[index].x, points[index].y, handDisplayMode === 1 ? 6.2 : 3);
  }

  if (hands.length >= 2 && breath > 0.55) {
    const x = currentInput.midpointX * width;
    const y = currentInput.midpointY * height;
    noFill();
    stroke(84, 123, 118, 72 + breath * 42);
    strokeWeight(0.7);
    circle(x, y, 12 + breath * 7);
  }
}

function drawSessionFeedback() {
  const totalLabel = nf(SESSION_LENGTH, 2);
  let label;
  if (DEMO_MODE) label = `${totalLabel} / ${totalLabel} · REFERENCE MOBILE`;
  else if (sessionComplete) label = `${totalLabel} / ${totalLabel} · BALANCED`;
  else if (cycle) {
    label = breath > 0.65
      ? `${nf(sessionStep + 1, 2)} / ${totalLabel} · HOLD TO ENLARGE THE PLATE`
      : previousBreath > breath
        ? `${nf(sessionStep + 1, 2)} / ${totalLabel} · RETURN TO SUSPEND`
        : `${nf(sessionStep + 1, 2)} / ${totalLabel} · OPEN SLOWLY`;
  } else if (savedFlash > 0) label = `${nf(sessionStep, 2)} / ${totalLabel} · REBALANCING`;
  else if (modelLoading || !modelReady) label = `${nf(sessionStep + 1, 2)} / ${totalLabel} · PREPARING CAMERA`;
  else label = `${nf(sessionStep + 1, 2)} / ${totalLabel} · BRING HANDS TOGETHER`;

  const x = width * 0.5;
  const y = height - 38;

  noStroke();
  fill(169, 154, 121, 105);
  textAlign(CENTER, CENTER);
  textSize(8.5 * getExhibitionScale());
  text(label, x, y - 16);
}

function createDemoMobile() {
  const records = [
    [0.35, 0.3, -0.46, 0.72, 0.13],
    [0.42, 0.55, 0.32, 0.44, 0.38],
    [0.49, 0.36, -0.15, 0.88, 0.52],
    [0.58, 0.49, 0.54, 0.59, 0.72],
    [0.38, 0.69, -0.62, 0.36, 0.26],
    [0.46, 0.45, 0.09, 0.93, 0.61],
    [0.55, 0.64, -0.28, 0.68, 0.84],
    [0.65, 0.28, 0.43, 0.5, 1],
    [0.36, 0.48, 0.12, 0.77, 0.18],
    [0.44, 0.62, -0.37, 0.62, 0.45],
    [0.53, 0.33, 0.21, 0.83, 0.68],
    [0.63, 0.58, -0.55, 0.49, 0.93]
  ];

  for (let i = 0; i < records.length; i++) {
    const [midpointX, midpointY, tilt, steadiness, pause] = records[i];
    addMemory({
      midpointX,
      midpointY,
      tilt,
      steadiness,
      pause,
      slowness: randomSeeded(700 + i * 31, 0.42, 0.92),
      balance: 1 - abs(tilt),
      duration: randomSeeded(800 + i * 37, 0.28, 0.88)
    }, { seed: 504 + i * 83, age: 180 + i * 18 });
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
  memories = [];
  sessionStep = 0;
  sessionComplete = false;
  cycle = null;
  readyForCycle = true;
  savedFlash = 0;
  globalSway = 0;
  globalVelocity = 0;
  if (DEMO_MODE) createDemoMobile();
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

function randomSeeded(seed, minValue, maxValue) {
  return map(noise(seed * 0.031, 5.04), 0, 1, minValue, maxValue);
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}
