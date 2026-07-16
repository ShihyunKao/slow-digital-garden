let handPose;
let video;
let hands = [];

let inputMode = "mouse";
let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = true;
let handDisplayMode = 1; // 0 hidden, 1 point, 2 skeleton

let smoothPoint = null;
let previousPoint = null;
let currentStroke;
let stableOrbits = [];
let scatterParticles = [];
let stillFrames = 0;
let missingFrames = 0;
let savedFlash = 0;
let savedPosition = null;

const MIN_POINT_DISTANCE = 5;
const PAUSE_TO_SAVE_FRAMES = 26;
const MIN_STABLE_POINTS = 12;
const STABLE_COHERENCE = 0.58;
const FAST_BREAK_SPEED = 25;
const MAX_ORBITS = 16;

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
  randomSeed(904);
  noiseSeed(904);
  currentStroke = createStroke();
}

function draw() {
  drawBackground();

  if (!showHelp) updateMotion();

  drawStableOrbits();
  drawScatterParticles();
  drawCurrentStroke();

  if (!showHelp) {
    drawHandDisplay();
    drawMovementStatus();
    drawHeader();
  }

  savedFlash = max(0, savedFlash - 1);

  if (showHelp) drawHelpScreen();
}

function createStroke() {
  return {
    points: [],
    coherence: 0,
    averageSpeed: 0,
    seed: random(1000)
  };
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

function updateMotion() {
  const rawPoint = getControlPoint();

  if (!rawPoint) {
    missingFrames++;

    if (missingFrames > 18 && currentStroke.points.length > 0) {
      finishCurrentStroke();
    }

    smoothPoint = null;
    previousPoint = null;
    return;
  }

  missingFrames = 0;

  if (!smoothPoint) {
    smoothPoint = { x: rawPoint.x, y: rawPoint.y };
    previousPoint = { x: rawPoint.x, y: rawPoint.y };
    return;
  }

  previousPoint = { x: smoothPoint.x, y: smoothPoint.y };
  smoothPoint.x = lerp(smoothPoint.x, rawPoint.x, 0.36);
  smoothPoint.y = lerp(smoothPoint.y, rawPoint.y, 0.36);

  const speed = dist(previousPoint.x, previousPoint.y, smoothPoint.x, smoothPoint.y);

  if (speed < 0.85) {
    stillFrames++;

    if (stillFrames >= PAUSE_TO_SAVE_FRAMES && currentStroke.points.length > 0) {
      finishCurrentStroke();
      stillFrames = 0;
    }

    return;
  }

  stillFrames = 0;

  if (speed > FAST_BREAK_SPEED && currentStroke.points.length > 3) {
    disperseStroke(currentStroke);
    currentStroke = createStroke();
  }

  const slowness = constrain(map(speed, 2, 18, 1, 0), 0, 1);
  currentStroke.coherence = lerp(currentStroke.coherence, slowness, 0.115);
  currentStroke.averageSpeed = lerp(currentStroke.averageSpeed, speed, 0.1);

  const lastPoint = currentStroke.points[currentStroke.points.length - 1];
  const spacing = lastPoint
    ? dist(lastPoint.x, lastPoint.y, smoothPoint.x, smoothPoint.y)
    : Infinity;

  if (spacing >= MIN_POINT_DISTANCE) {
    addStrokePoint(smoothPoint, slowness);
  }

  if (speed > 10) spawnFastParticles(smoothPoint, speed);
}

function addStrokePoint(point, slowness) {
  const disorder = lerp(22, 3, currentStroke.coherence);

  currentStroke.points.push({
    x: point.x,
    y: point.y,
    offsetX: random(-disorder, disorder),
    offsetY: random(-disorder, disorder),
    size: random(1.2, 3.4),
    alpha: lerp(45, 125, slowness),
    seed: random(1000)
  });

  if (currentStroke.points.length > 180) {
    currentStroke.points.shift();
  }
}

function finishCurrentStroke() {
  if (
    currentStroke.points.length >= MIN_STABLE_POINTS &&
    currentStroke.coherence >= STABLE_COHERENCE
  ) {
    preserveOrbit(currentStroke);
  } else {
    disperseStroke(currentStroke);
  }

  currentStroke = createStroke();
}

function preserveOrbit(stroke) {
  const points = stroke.points.map((point) => ({
    x: point.x,
    y: point.y,
    size: point.size,
    seed: point.seed
  }));

  stableOrbits.push({
    points,
    quality: stroke.coherence,
    age: 0,
    phase: random(TWO_PI),
    seed: stroke.seed
  });

  if (stableOrbits.length > MAX_ORBITS) stableOrbits.shift();

  savedPosition = points[floor(points.length / 2)];
  savedFlash = 90;
}

function disperseStroke(stroke) {
  for (let i = 0; i < stroke.points.length; i += 2) {
    const point = stroke.points[i];
    const angle = random(TWO_PI);
    const force = random(0.35, 1.8) * (1.2 - stroke.coherence);

    scatterParticles.push({
      x: point.x + point.offsetX,
      y: point.y + point.offsetY,
      vx: cos(angle) * force,
      vy: sin(angle) * force,
      life: random(0.55, 1),
      size: point.size,
      seed: point.seed
    });
  }

  if (scatterParticles.length > 700) {
    scatterParticles.splice(0, scatterParticles.length - 700);
  }
}

function spawnFastParticles(point, speed) {
  const count = floor(map(constrain(speed, 10, 30), 10, 30, 1, 4));

  for (let i = 0; i < count; i++) {
    const angle = random(TWO_PI);
    const force = random(0.8, 2.8) * map(speed, 10, 30, 0.6, 1.4);

    scatterParticles.push({
      x: point.x + random(-8, 8),
      y: point.y + random(-8, 8),
      vx: cos(angle) * force,
      vy: sin(angle) * force,
      life: random(0.45, 0.9),
      size: random(1, 3.1),
      seed: random(1000)
    });
  }
}

function drawCurrentStroke() {
  if (currentStroke.points.length === 0) return;

  const coherence = currentStroke.coherence;
  const displayPoints = currentStroke.points.map((point) => ({
    x: lerp(point.x + point.offsetX, point.x, easeOutCubic(coherence)),
    y: lerp(point.y + point.offsetY, point.y, easeOutCubic(coherence)),
    size: point.size,
    alpha: point.alpha,
    seed: point.seed
  }));

  if (coherence > 0.16 && displayPoints.length > 3) {
    drawingContext.save();
    drawingContext.shadowBlur = 12 * coherence;
    drawingContext.shadowColor = "rgba(164, 202, 172, 0.28)";
    drawOrbitCurve(displayPoints, 8 + coherence * 58, 0.55 + coherence * 0.55);
    drawingContext.restore();
  }

  noStroke();

  for (const point of displayPoints) {
    const flicker = sin(frameCount * 0.04 + point.seed) * 0.5 + 0.5;
    fill(232, 226, 191, point.alpha * (0.55 + coherence * 0.45));
    circle(point.x, point.y, point.size + flicker * 0.8);
  }
}

function drawStableOrbits() {
  for (const orbit of stableOrbits) {
    orbit.age++;
    const appear = easeOutCubic(constrain(orbit.age / 24, 0, 1));
    const breath = sin(frameCount * 0.014 + orbit.phase) * 0.5 + 0.5;

    drawingContext.save();
    drawingContext.shadowBlur = 14 + breath * 8;
    drawingContext.shadowColor = "rgba(177, 211, 180, 0.32)";
    drawOrbitCurve(orbit.points, (58 + breath * 18) * appear, 0.8);
    drawingContext.restore();

    noStroke();

    for (let i = 0; i < orbit.points.length; i += 8) {
      const point = orbit.points[i];
      const pulse = sin(frameCount * 0.025 + point.seed) * 0.5 + 0.5;
      fill(242, 232, 194, (75 + pulse * 45) * appear);
      circle(point.x, point.y, 2.2 + pulse * 1.3);
    }
  }
}

function drawOrbitCurve(points, alpha, weight) {
  if (points.length < 2) return;

  noFill();
  stroke(174, 210, 177, alpha);
  strokeWeight(weight);

  beginShape();
  curveVertex(points[0].x, points[0].y);

  for (const point of points) {
    curveVertex(point.x, point.y);
  }

  const last = points[points.length - 1];
  curveVertex(last.x, last.y);
  endShape();
}

function drawScatterParticles() {
  noStroke();

  for (let i = scatterParticles.length - 1; i >= 0; i--) {
    const particle = scatterParticles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.988;
    particle.vy *= 0.988;
    particle.life *= 0.974;

    if (particle.life < 0.025) {
      scatterParticles.splice(i, 1);
      continue;
    }

    const flicker = sin(frameCount * 0.06 + particle.seed) * 0.5 + 0.5;
    fill(223, 214, 181, particle.life * (42 + flicker * 48));
    circle(particle.x, particle.y, particle.size * particle.life);
  }
}

function drawMovementStatus() {
  let label = "";
  let progress = 0;
  let point = smoothPoint;

  if (savedFlash > 0 && savedPosition) {
    label = "ORBIT PRESERVED";
    progress = 1;
    point = savedPosition;
  } else if (currentStroke.points.length > 0) {
    progress = currentStroke.coherence;

    if (progress < 0.32) label = "SCATTERED — SLOW DOWN";
    else if (progress < STABLE_COHERENCE) label = "SETTLING";
    else label = "STABLE — PAUSE TO PRESERVE";
  }

  if (!label || !point) return;

  const x = constrain(point.x, 145, width - 145);
  const y = constrain(point.y + 72, 105, height - 72);
  const lineWidth = 150;

  textAlign(CENTER, CENTER);
  noStroke();
  fill(232, 228, 205, progress >= STABLE_COHERENCE ? 205 : 120);
  textSize(10);
  text(label, x, y);

  stroke(186, 203, 180, 35);
  strokeWeight(1);
  line(x - lineWidth / 2, y + 17, x + lineWidth / 2, y + 17);

  stroke(236, 226, 191, progress >= STABLE_COHERENCE ? 205 : 120);
  strokeWeight(1.3);
  line(x - lineWidth / 2, y + 17, x - lineWidth / 2 + lineWidth * progress, y + 17);
}

function drawBackground() {
  background(9, 19, 17);
  noStroke();

  for (let y = 0; y < height; y += 5) {
    fill(30, 45, 39, map(y, 0, height, 18, 3));
    rect(0, y, width, 5);
  }

  drawingContext.save();
  drawingContext.filter = "blur(70px)";
  fill(55, 82, 66, 11);
  ellipse(width * 0.28, height * 0.7, width * 0.58, height * 0.7);
  fill(95, 89, 63, 7);
  ellipse(width * 0.78, height * 0.26, width * 0.38, height * 0.4);
  drawingContext.restore();

  fill(240, 232, 205, 5);
  rect(34, 34, width - 68, height - 68);
}

function drawHandDisplay() {
  if (inputMode === "mouse" || hands.length === 0 || handDisplayMode === 0) return;

  const points = hands[0].keypoints;

  if (handDisplayMode === 1) {
    const tip = points[8];
    noFill();
    stroke(234, 228, 194, 90);
    strokeWeight(1);
    circle(tip.x, tip.y, 13);
    return;
  }

  stroke(230, 226, 204, 46);
  strokeWeight(0.7);

  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(240, 231, 194, 72);

  for (const point of points) circle(point.x, point.y, 3.5);
}

function drawHeader() {
  const inset = 38;
  const display = ["HIDDEN", "POINT", "SKELETON"][handDisplayMode];
  const input = modelLoading ? "LOADING" : inputMode === "mouse" ? "CAMERA" : "MOUSE";

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("SLOW ORBIT DRAWING", inset, 27);

  fill(196, 207, 188, 100);
  textSize(10);
  text("GESTURE STUDY 04 / SPEED AND COHERENCE", inset, 47);

  textAlign(RIGHT, TOP);
  fill(206, 212, 196, 120);
  textSize(11);
  text(`M ${input} · P ${display} · R RESET · ? HELP`, width - inset, 30);

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
  text("GESTURE STUDY 04", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Slow Orbit Drawing", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "A movement begins as scattered points. Sustained slowness allows those points to settle into a coherent orbit.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const gap = compact ? 42 : 54;
  drawHelpStep("01", "Move one finger slowly through the space.", left, stepsY);
  drawHelpStep("02", "Keep a steady pace until the path becomes stable.", left, stepsY + gap);
  drawHelpStep("03", "Pause briefly to preserve the orbit; speed scatters it.", left, stepsY + gap * 2);

  fill(174, 191, 166, 135);
  textSize(11);
  text("M  CAMERA / MOUSE     P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - (compact ? 31 : 40));

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
    showHelp = false;
    return false;
  }

  if (showHelp) return false;

  if (key === "m" || key === "M") {
    inputMode === "mouse" ? startHandMode() : stopHandMode();
  }

  if (key === "p" || key === "P") {
    handDisplayMode = (handDisplayMode + 1) % 3;
  }

  if (key === "r" || key === "R") resetDrawing();
}

function mousePressed() {
  if (!showHelp) return;

  const panel = getHelpPanelMetrics();
  const insideButton =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  if (insideButton) showHelp = false;
}

function resetDrawing() {
  currentStroke = createStroke();
  stableOrbits = [];
  scatterParticles = [];
  smoothPoint = null;
  previousPoint = null;
  stillFrames = 0;
  savedFlash = 0;
  savedPosition = null;
}

function startHandMode() {
  inputMode = "hand";
  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];
  smoothPoint = null;
  previousPoint = null;

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
  smoothPoint = null;
  previousPoint = null;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
  resetDrawing();
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}
