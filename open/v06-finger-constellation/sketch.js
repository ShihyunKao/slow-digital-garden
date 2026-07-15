let handPose;
let video;
let hands = [];

let inputMode = "hand";
let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = true;
let handDisplayMode = 0; // 0 hidden, 1 fingertips, 2 skeleton
let openness = 0;
let targetOpenness = 0;
let gestureActive = false;
let pendingFingertips = null;
let candidateFingertips = null;
let lockedFingertips = null;
let stableFrames = 0;
let lockFlash = 0;
let saveFlash = 0;
let savedPosition = null;
let constellations = [];
let backgroundPoints = [];

const OPEN_RATIO = 2.12;
const TRIGGER_RATIO = 1.68;
const RESET_RATIO = 1.43;
const STABLE_FRAMES_REQUIRED = 18;
const STABILITY_DISTANCE = 5.5;
const TIP_INDICES = [4, 8, 12, 16, 20];
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
  randomSeed(806);
  noiseSeed(806);

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

  const metrics = inputMode === "hand" && hands.length > 0
    ? getHandMetrics(hands[0])
    : null;

  targetOpenness = getOpenness(metrics);
  openness = lerp(openness, targetOpenness, 0.17);
  lockFlash *= 0.92;
  saveFlash = max(0, saveFlash - 1);

  drawConstellationMemories();

  if (!showHelp) {
    updateCapture(metrics);
    drawLiveConstellation(metrics);
    drawCaptureStatus();
    drawTechnicalHand(metrics);
    drawHeader();
  }

  if (showHelp) drawHelpScreen();
}

function getHandMetrics(hand) {
  const points = hand.keypoints;
  const wrist = points[0];
  const palmWidth = dist(points[5].x, points[5].y, points[17].x, points[17].y);

  if (palmWidth < 1) return null;

  let total = 0;

  for (const index of TIP_INDICES) {
    total += dist(wrist.x, wrist.y, points[index].x, points[index].y);
  }

  return {
    points,
    ratio: total / TIP_INDICES.length / palmWidth,
    fingertips: TIP_INDICES.map((index) => ({
      x: points[index].x,
      y: points[index].y
    }))
  };
}

function getOpenness(metrics) {
  if (!metrics) return openness * 0.94;

  return constrain(map(metrics.ratio, RESET_RATIO, OPEN_RATIO, 0, 1), 0, 1);
}

function getCurrentFingertips(metrics) {
  return metrics ? metrics.fingertips : null;
}

function updateCapture(metrics) {
  const fingertips = getCurrentFingertips(metrics);
  if (!fingertips) return;

  const isOpen = metrics && metrics.ratio > TRIGGER_RATIO;
  const isReset = metrics && metrics.ratio < RESET_RATIO;

  if (isOpen) {
    gestureActive = true;
    const current = copyPoints(fingertips);
    pendingFingertips = current;

    if (!candidateFingertips) {
      candidateFingertips = current;
      stableFrames = 0;
    } else {
      const movement = averagePointMovement(current, candidateFingertips);

      if (movement <= STABILITY_DISTANCE) {
        stableFrames++;
        candidateFingertips = blendPoints(candidateFingertips, current, 0.22);

        if (stableFrames >= STABLE_FRAMES_REQUIRED) {
          const firstLock = lockedFingertips === null;
          lockedFingertips = copyPoints(candidateFingertips);
          if (firstLock) lockFlash = 1;
        }
      } else {
        candidateFingertips = current;
        stableFrames = 0;
      }
    }
  }

  if (gestureActive && isReset && pendingFingertips) {
    addConstellation(lockedFingertips || pendingFingertips);
    resetCaptureState();
  }
}

function copyPoints(points) {
  return points.map((point) => ({ x: point.x, y: point.y }));
}

function blendPoints(from, to, amount) {
  return from.map((point, index) => ({
    x: lerp(point.x, to[index].x, amount),
    y: lerp(point.y, to[index].y, amount)
  }));
}

function averagePointMovement(a, b) {
  let total = 0;

  for (let i = 0; i < a.length; i++) {
    total += dist(a[i].x, a[i].y, b[i].x, b[i].y);
  }

  return total / a.length;
}

function resetCaptureState() {
  gestureActive = false;
  pendingFingertips = null;
  candidateFingertips = null;
  lockedFingertips = null;
  stableFrames = 0;
}

function addConstellation(fingertips) {
  const points = fingertips.map((point) => ({ x: point.x, y: point.y }));
  const center = averagePoint(points);
  const links = buildDistanceNetwork(points);

  for (let i = 0; i < constellations.length; i++) {
    const existing = constellations[i];
    const direction = existing.seed * 0.017;
    const separation = min(16 + (i + 1) * 3.5, 76);
    existing.targetOffsetX = cos(direction) * separation;
    existing.targetOffsetY = sin(direction) * separation * 0.62 - min(i * 1.5, 22);
  }

  constellations.push({
    points,
    links,
    center,
    age: 0,
    offsetX: 0,
    offsetY: 0,
    targetOffsetX: random(-7, 7),
    targetOffsetY: random(-7, 4),
    rotation: random(-0.018, 0.018),
    scale: random(0.98, 1.025),
    flash: 1,
    seed: random(1000)
  });

  savedPosition = center;
  saveFlash = 105;

  if (constellations.length > 40) constellations.shift();
}

function buildDistanceNetwork(points) {
  const visited = new Set([0]);
  const links = [];

  while (visited.size < points.length) {
    let best = null;

    for (const from of visited) {
      for (let to = 0; to < points.length; to++) {
        if (visited.has(to)) continue;

        const distance = dist(points[from].x, points[from].y, points[to].x, points[to].y);

        if (!best || distance < best.distance) {
          best = { from, to, distance };
        }
      }
    }

    links.push(best);
    visited.add(best.to);
  }

  const candidates = [];

  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) {
      const alreadyLinked = links.some((link) =>
        (link.from === a && link.to === b) || (link.from === b && link.to === a)
      );

      if (!alreadyLinked) {
        candidates.push({
          from: a,
          to: b,
          distance: dist(points[a].x, points[a].y, points[b].x, points[b].y)
        });
      }
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  if (candidates.length > 0) links.push(candidates[0]);

  return links;
}

function drawLiveConstellation(metrics) {
  const points = getCurrentFingertips(metrics);
  if (!points || openness < 0.06) return;

  const links = buildDistanceNetwork(points);
  const amount = easeOutCubic(openness);

  drawConstellationShape(points, links, amount * 0.58, amount, 0, true);

  if (lockedFingertips) drawLockedConfirmation(lockedFingertips);
}

function drawLockedConfirmation(points) {
  const links = buildDistanceNetwork(points);
  const confirmation = 1 + lockFlash * 1.15;
  drawConstellationShape(points, links, 1, 1, confirmation, false);

  const pulse = sin(frameCount * 0.08) * 0.5 + 0.5;

  for (const point of points) {
    drawingContext.save();
    drawingContext.shadowBlur = 24 + lockFlash * 28;
    drawingContext.shadowColor = "rgba(250, 237, 190, 0.9)";

    noFill();
    stroke(250, 239, 199, 145 + pulse * 65);
    strokeWeight(1.1 + lockFlash * 0.8);
    circle(point.x, point.y, 10 + pulse * 2.5 + lockFlash * 5);

    noStroke();
    fill(255, 244, 205, 225);
    circle(point.x, point.y, 4.8 + pulse * 1.4);

    drawingContext.restore();
  }
}

function drawCaptureStatus() {
  let label = "";
  let progress = 0;
  let position = null;

  if (saveFlash > 0 && savedPosition) {
    label = "IMPRINT SAVED — MOVE AGAIN";
    progress = 1;
    position = savedPosition;
  } else if (lockedFingertips) {
    label = "LOCKED — CLOSE YOUR HAND";
    progress = 1;
    position = averagePoint(lockedFingertips);
  } else if (gestureActive && pendingFingertips) {
    label = "HOLD STILL TO LOCK";
    progress = constrain(stableFrames / STABLE_FRAMES_REQUIRED, 0, 1);
    position = averagePoint(pendingFingertips);
  }

  if (!label || !position) return;

  const x = constrain(position.x, 145, width - 145);
  const y = constrain(position.y + 78, 112, height - 78);
  const lineWidth = 150;

  textAlign(CENTER, CENTER);
  noStroke();
  fill(235, 231, 207, label.startsWith("HOLD") ? 125 : 215);
  textSize(10);
  text(label, x, y);

  stroke(188, 204, 181, 36);
  strokeWeight(1);
  line(x - lineWidth / 2, y + 17, x + lineWidth / 2, y + 17);

  stroke(238, 229, 193, label.startsWith("HOLD") ? 145 : 220);
  strokeWeight(1.4);
  line(x - lineWidth / 2, y + 17, x - lineWidth / 2 + lineWidth * progress, y + 17);
}

function drawConstellationMemories() {
  for (const constellation of constellations) {
    constellation.age++;
    constellation.flash *= 0.94;

    constellation.offsetX = lerp(constellation.offsetX, constellation.targetOffsetX, 0.025);
    constellation.offsetY = lerp(constellation.offsetY, constellation.targetOffsetY, 0.025);

    const appear = easeOutCubic(constrain(constellation.age / 18, 0, 1));
    const settle = easeOutCubic(constrain(constellation.age / 260, 0, 1));
    const opacity = lerp(1, 0.82, settle);

    push();
    translate(constellation.offsetX, constellation.offsetY);
    translate(constellation.center.x, constellation.center.y);
    rotate(constellation.rotation * settle);
    scale(constellation.scale);
    translate(-constellation.center.x, -constellation.center.y);

    drawConstellationShape(
      constellation.points,
      constellation.links,
      opacity,
      appear,
      constellation.flash,
      false
    );

    pop();
  }
}

function drawConstellationShape(points, links, fade, appear, flash, live) {
  noFill();

  for (const link of links) {
    const a = points[link.from];
    const b = points[link.to];
    const lineAlpha = (live ? 43 : 30) * fade * appear + flash * 32;

    stroke(181, 207, 182, lineAlpha);
    strokeWeight(live ? 0.72 : 0.55);

    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5 - min(link.distance * 0.035, 5);

    beginShape();
    vertex(a.x, a.y);
    quadraticVertex(mx, my, b.x, b.y);
    endShape();
  }

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const pulse = sin(frameCount * 0.035 + i * 1.8) * 0.5 + 0.5;
    const size = (live ? 4.2 : 3.5) + pulse * 1.5;

    drawingContext.save();
    drawingContext.shadowBlur = live ? 16 : 12;
    drawingContext.shadowColor = "rgba(242, 230, 188, 0.52)";

    noStroke();
    fill(244, 233, 193, (live ? 125 : 92) * fade * appear + flash * 75);
    circle(point.x, point.y, size * appear);

    drawingContext.restore();
  }
}

function averagePoint(points) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function drawTechnicalHand(metrics) {
  if (!metrics || handDisplayMode === 0) return;

  if (handDisplayMode === 1) {
    noStroke();
    fill(240, 231, 194, 62);

    for (const point of metrics.fingertips) {
      circle(point.x, point.y, 3.5);
    }

    return;
  }

  noFill();
  stroke(230, 226, 204, 45);
  strokeWeight(0.7);

  for (const [a, b] of HAND_CONNECTIONS) {
    line(metrics.points[a].x, metrics.points[a].y, metrics.points[b].x, metrics.points[b].y);
  }

  noStroke();
  fill(240, 231, 194, 72);

  for (const point of metrics.points) {
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
  text("FINGER CONSTELLATION", inset, 27);

  fill(196, 207, 188, 100);
  textSize(10);
  text("GESTURE STUDY 06 / FIVE-POINT HAND MEMORY", inset, 47);

  textAlign(RIGHT, TOP);
  fill(206, 212, 196, 120);
  textSize(11);
  text(`${modelLoading ? "CAMERA LOADING · " : ""}P ${display} · R RESET · ? HELP`, width - inset, 30);

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
  text("GESTURE STUDY 06", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Finger Constellation", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "Five fingertips become five stars. Each open hand adds a persistent map to an accumulating bodily archive.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const gap = compact ? 42 : 54;
  drawHelpStep("01", "Select Begin and allow access to the camera.", left, stepsY);
  drawHelpStep("02", "Arrange the five stars, then hold until they brighten.", left, stepsY + gap);
  drawHelpStep("03", "Close the hand to preserve the locked constellation.", left, stepsY + gap * 2);

  fill(174, 191, 166, 135);
  textSize(11);
  text("P  HAND DISPLAY     R  RESET ARCHIVE     ?  HELP", left, panel.buttonY - (compact ? 31 : 40));

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

  if (key === "r" || key === "R") {
    constellations = [];
    resetCaptureState();
    saveFlash = 0;
    savedPosition = null;
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

  inputMode = "hand";
  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];
  resetCaptureState();

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
  if (inputMode === "hand" && modelReady && videoReady && !detectionStarted) {
    handPose.detectStart(video, gotHands);
    detectionStarted = true;
  }
}

function gotHands(results) {
  hands = results;
}

function stopHandMode() {
  if (handPose && detectionStarted && handPose.detectStop) handPose.detectStop();

  if (video) {
    const stream = video.elt.srcObject;
    if (stream) stream.getTracks().forEach((track) => track.stop());
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
  resetCaptureState();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}
