let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = false;
let handDisplayMode = 1;

let smoothPoint = null;
let previousPoint = null;
let currentStroke;
let stableOrbits = [];
let scatterParticles = [];
let stillFrames = 0;
let missingFrames = 0;
let savedFlash = 0;
let savedPosition = null;
let stoneSeams = [];
let stoneDust = [];

const VARIANT = window.TRAIL_V04_MINERAL_VARIANT;
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
  createStoneField();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  startHandMode();
}

function draw() {
  drawStoneBackground();

  if (!showHelp) updateMotion();

  drawStableOrbits();
  drawScatterParticles();
  drawCurrentStroke();

  if (!showHelp) {
    drawHandDisplay();
    drawMovementStatus();
  }

  savedFlash = max(0, savedFlash - 1);
  syncHelpOverlay();
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
}

function createStroke() {
  const seed = random(1000);
  return {
    points: [],
    coherence: 0,
    averageSpeed: 0,
    seed,
    tilt: VARIANT.orbitTilt + random(-0.14, 0.14),
    centreBiasX: cos(seed) * random(24, 58),
    centreBiasY: sin(seed * 1.7) * random(15, 38)
  };
}

function getControlPoint() {
  if (hands.length > 0) {
    const tip = hands[0].keypoints[8];
    return { x: tip.x, y: tip.y };
  }

  return null;
}

// All motion thresholds and state transitions are preserved from v04.00.
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
    size: random(2.4, 6.8),
    alpha: lerp(45, 125, slowness),
    sides: floor(random(VARIANT.shardSides[0], VARIANT.shardSides[1] + 1)),
    rotation: random(TWO_PI),
    angularSpeed: random(-0.018, 0.018),
    depth: random(0.45, 1),
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
  const layout = createMineralLayout(stroke, 1);
  const points = layout.points.map(point => ({ ...point }));

  stableOrbits.push({
    points,
    centre: layout.centre,
    radiusX: layout.radiusX,
    radiusY: layout.radiusY,
    tilt: stroke.tilt,
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
  const layout = createMineralLayout(stroke, stroke.coherence);

  for (let i = 0; i < layout.points.length; i += 2) {
    const point = layout.points[i];
    const angle = random(TWO_PI);
    const force = random(0.35, 1.8) * (1.2 - stroke.coherence);

    scatterParticles.push({
      x: point.x,
      y: point.y,
      vx: cos(angle) * force,
      vy: sin(angle) * force,
      life: random(0.55, 1),
      size: point.size,
      sides: point.sides,
      rotation: point.rotation,
      angularSpeed: random(-0.04, 0.04),
      depth: point.depth,
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
      size: random(2.2, 6.2),
      sides: floor(random(VARIANT.shardSides[0], VARIANT.shardSides[1] + 1)),
      rotation: random(TWO_PI),
      angularSpeed: random(-0.05, 0.05),
      depth: random(0.4, 1),
      seed: random(1000)
    });
  }
}

function createMineralLayout(stroke, coherence) {
  if (stroke.points.length === 0) {
    return { points: [], centre: { x: width * 0.5, y: height * 0.5 }, radiusX: 0, radiusY: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  for (const point of stroke.points) {
    sumX += point.x;
    sumY += point.y;
  }

  const centroid = {
    x: sumX / stroke.points.length,
    y: sumY / stroke.points.length
  };
  let extent = 0;
  for (const point of stroke.points) {
    extent = max(extent, dist(point.x, point.y, centroid.x, centroid.y));
  }

  const radiusX = constrain(max(72, extent * 0.72), 72, min(width * 0.29, 260));
  const radiusY = radiusX * VARIANT.orbitAspect;
  const centre = {
    x: constrain(centroid.x + stroke.centreBiasX, radiusX + 42, width - radiusX - 42),
    y: constrain(centroid.y + stroke.centreBiasY, radiusY + 100, height - radiusY - 90)
  };
  const alignment = easeOutCubic(coherence);
  const points = stroke.points.map((point, index) => {
    const angle = stroke.seed + index / max(1, stroke.points.length - 1) * TWO_PI * 1.12;
    const ellipseX = cos(angle) * radiusX;
    const ellipseY = sin(angle) * radiusY;
    const targetX = centre.x + ellipseX * cos(stroke.tilt) - ellipseY * sin(stroke.tilt);
    const targetY = centre.y + ellipseX * sin(stroke.tilt) + ellipseY * cos(stroke.tilt);

    return {
      x: lerp(point.x + point.offsetX, targetX, alignment),
      y: lerp(point.y + point.offsetY, targetY, alignment),
      size: point.size,
      alpha: point.alpha,
      sides: point.sides,
      rotation: lerp(point.rotation + frameCount * point.angularSpeed, angle + stroke.tilt, alignment),
      depth: point.depth,
      seed: point.seed
    };
  });

  return { points, centre, radiusX, radiusY };
}

function drawCurrentStroke() {
  if (currentStroke.points.length === 0) return;

  const coherence = currentStroke.coherence;
  const layout = createMineralLayout(currentStroke, coherence);

  if (coherence > 0.16 && layout.points.length > 3) {
    drawBrokenOrbit(layout.centre, layout.radiusX, layout.radiusY, currentStroke.tilt, coherence * 0.62, currentStroke.seed);
  }

  for (const point of layout.points) {
    drawMineralShard(point, 0.5 + coherence * 0.5, false);
  }
}

function drawStableOrbits() {
  for (const orbit of stableOrbits) {
    orbit.age++;
    const appear = easeOutCubic(constrain(orbit.age / 24, 0, 1));
    drawBrokenOrbit(orbit.centre, orbit.radiusX, orbit.radiusY, orbit.tilt, 0.82 * appear, orbit.seed);

    for (const point of orbit.points) {
      drawMineralShard(point, appear, true);
    }
  }
}

function drawBrokenOrbit(centre, radiusX, radiusY, tilt, alpha, seed) {
  const green = VARIANT.palette.mineralGreen;
  noFill();
  stroke(green[0], green[1], green[2], 44 * alpha);
  strokeWeight(0.55);

  for (let segment = 0; segment < 18; segment++) {
    if (noise(seed, segment * 0.4) < 0.32) continue;
    const start = segment / 18 * TWO_PI;
    const end = start + TWO_PI / 18 * 0.64;
    beginShape();
    for (let angle = start; angle <= end + 0.01; angle += 0.04) {
      const ellipseX = cos(angle) * radiusX;
      const ellipseY = sin(angle) * radiusY;
      vertex(
        centre.x + ellipseX * cos(tilt) - ellipseY * sin(tilt),
        centre.y + ellipseX * sin(tilt) + ellipseY * cos(tilt)
      );
    }
    endShape();
  }
}

function drawMineralShard(point, alphaScale, preserved) {
  const graphite = VARIANT.palette.graphite;
  const dark = VARIANT.palette.graphiteDark;
  const green = VARIANT.palette.mineralGreen;
  const light = VARIANT.palette.mineralLight;
  const metallic = VARIANT.palette.metallic;
  const size = point.size * (preserved ? 1.08 : 1);
  const alpha = (point.alpha || 118) * alphaScale;
  const reflection = pow(max(0, sin(frameCount * 0.018 + point.seed * 2.1)), 18);

  push();
  translate(point.x, point.y);
  rotate(point.rotation);

  fill(
    lerp(dark[0], graphite[0], point.depth),
    lerp(dark[1], graphite[1], point.depth),
    lerp(dark[2], graphite[2], point.depth),
    alpha * 0.92
  );
  stroke(green[0], green[1], green[2], alpha * 0.62);
  strokeWeight(0.45);
  beginShape();
  for (let side = 0; side < point.sides; side++) {
    const angle = side / point.sides * TWO_PI;
    const uneven = map(noise(point.seed, side * 0.73), 0, 1, 0.68, 1.22);
    vertex(cos(angle) * size * uneven, sin(angle) * size * uneven * 0.72);
  }
  endShape(CLOSE);

  stroke(light[0], light[1], light[2], alpha * 0.48);
  strokeWeight(0.38);
  line(-size * 0.55, size * 0.12, size * 0.46, -size * 0.38);

  if (reflection > 0.02) {
    stroke(metallic[0], metallic[1], metallic[2], 210 * reflection * alphaScale);
    strokeWeight(0.75);
    line(-size * 0.5, -size * 0.33, size * 0.18, -size * 0.46);
  }

  pop();
}

function drawScatterParticles() {
  for (let i = scatterParticles.length - 1; i >= 0; i--) {
    const particle = scatterParticles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.rotation += particle.angularSpeed;
    particle.vx *= 0.988;
    particle.vy *= 0.988;
    particle.life *= 0.974;

    if (particle.life < 0.025) {
      scatterParticles.splice(i, 1);
      continue;
    }

    drawMineralShard({
      ...particle,
      alpha: 105 * particle.life,
      size: particle.size * particle.life
    }, particle.life, false);
  }
}

function drawMovementStatus() {
  let label = "";
  let progress = 0;
  let point = smoothPoint;

  if (savedFlash > 0 && savedPosition) {
    label = "SPECIMEN PRESERVED";
    progress = 1;
    point = savedPosition;
  } else if (currentStroke.points.length > 0) {
    progress = currentStroke.coherence;
    if (progress < 0.32) label = "FRACTURED — SLOW DOWN";
    else if (progress < STABLE_COHERENCE) label = "CRYSTALLISING";
    else label = "STABLE — PAUSE TO PRESERVE";
  }

  if (!label || !point) return;

  const light = VARIANT.palette.mineralLight;
  const metallic = VARIANT.palette.metallic;
  const x = constrain(point.x, 145, width - 145);
  const y = constrain(point.y + 72, 105, height - 72);
  const lineWidth = 150;

  textAlign(CENTER, CENTER);
  noStroke();
  fill(metallic[0], metallic[1], metallic[2], progress >= STABLE_COHERENCE ? 178 : 92);
  textSize(10);
  text(label, x, y);

  stroke(light[0], light[1], light[2], 34);
  strokeWeight(1);
  line(x - lineWidth / 2, y + 17, x + lineWidth / 2, y + 17);
  stroke(metallic[0], metallic[1], metallic[2], progress >= STABLE_COHERENCE ? 172 : 96);
  line(x - lineWidth / 2, y + 17, x - lineWidth / 2 + lineWidth * progress, y + 17);
}

function createStoneField() {
  stoneSeams = [];
  stoneDust = [];
  randomSeed(4101);

  for (let i = 0; i < VARIANT.stoneSeams; i++) {
    stoneSeams.push({
      x: random(width),
      y: random(height),
      length: random(35, 180),
      angle: random(TWO_PI),
      bend: random(-18, 18),
      alpha: random(4, 15)
    });
  }

  for (let i = 0; i < 180; i++) {
    stoneDust.push({
      x: random(width),
      y: random(height),
      size: random(0.3, 1.2),
      alpha: random(3, 13)
    });
  }
}

function drawStoneBackground() {
  const stone = VARIANT.palette.stone;
  const graphite = VARIANT.palette.graphite;
  const green = VARIANT.palette.mineralGreen;
  background(stone[0], stone[1], stone[2]);

  noFill();
  for (const seam of stoneSeams) {
    const endX = seam.x + cos(seam.angle) * seam.length;
    const endY = seam.y + sin(seam.angle) * seam.length;
    stroke(green[0], green[1], green[2], seam.alpha);
    strokeWeight(0.42);
    beginShape();
    vertex(seam.x, seam.y);
    quadraticVertex(
      (seam.x + endX) * 0.5 + cos(seam.angle + HALF_PI) * seam.bend,
      (seam.y + endY) * 0.5 + sin(seam.angle + HALF_PI) * seam.bend,
      endX,
      endY
    );
    endShape();
  }

  noStroke();
  for (const dust of stoneDust) {
    fill(graphite[0], graphite[1], graphite[2], dust.alpha);
    circle(dust.x, dust.y, dust.size);
  }
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplayMode === 0) return;

  const points = hands[0].keypoints;
  const light = VARIANT.palette.mineralLight;
  const metallic = VARIANT.palette.metallic;

  if (handDisplayMode === 1) {
    const tip = points[8];
    noFill();
    stroke(light[0], light[1], light[2], 84);
    strokeWeight(0.85);
    beginShape();
    for (let side = 0; side < 6; side++) {
      const angle = side / 6 * TWO_PI;
      vertex(tip.x + cos(angle) * 7, tip.y + sin(angle) * 7);
    }
    endShape(CLOSE);
    return;
  }

  stroke(light[0], light[1], light[2], 42);
  strokeWeight(0.65);
  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(metallic[0], metallic[1], metallic[2], 64);
  for (const point of points) circle(point.x, point.y, 3.2);
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

  if (key === "p" || key === "P") {
    handDisplayMode = (handDisplayMode + 1) % 3;
  }

  if (key === "r" || key === "R") resetDrawing();
}

function mousePressed() {
  if (showHelp) return false;
}

function beginExperience() {
  showHelp = false;
  syncHelpOverlay();
  cursor(ARROW);

  if (!video && !modelLoading) startHandMode();
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
  if (video || modelLoading) return;

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
  createStoneField();
  if (video) video.size(width, height);
  resetDrawing();
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}
