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
let magneticLines = [];
let metalDust = [];

const VARIANT = window.TRAIL_V04_MAGNETIC_VARIANT;
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
  createMagneticField();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  startHandMode();
}

function draw() {
  drawMagneticBackground();

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
    tilt: VARIANT.fieldTilt + random(-0.09, 0.09),
    centreBiasX: cos(seed) * random(28, 64),
    centreBiasY: sin(seed * 1.7) * random(18, 42)
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
    size: random(2.2, 5.4),
    length: random(5.5, 13.5),
    thickness: random(0.8, 2.2),
    alpha: lerp(45, 125, slowness),
    rotation: random(TWO_PI),
    angularSpeed: random(-0.07, 0.07),
    depth: random(0.45, 1),
    band: floor(random(-1, 2)),
    polarity: random() > 0.5 ? 1 : -1,
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
  const layout = createMagneticLayout(stroke, 1);
  const points = layout.points.map(point => ({ ...point }));
  const orbiters = [];
  const orbiterCount = constrain(floor(points.length * 0.18), 3, 18);

  for (let i = 0; i < orbiterCount; i++) {
    orbiters.push({
      angle: random(TWO_PI),
      band: random([-2, 2]),
      speed: random(0.0018, 0.0048) * random([-1, 1]),
      length: random(2.4, 5.4),
      thickness: random(0.5, 1.1),
      alpha: random(36, 82),
      seed: random(1000)
    });
  }

  stableOrbits.push({
    points,
    centre: layout.centre,
    radiusX: layout.radiusX,
    radiusY: layout.radiusY,
    tilt: stroke.tilt,
    quality: stroke.coherence,
    age: 0,
    phase: random(TWO_PI),
    seed: stroke.seed,
    orbiters
  });

  if (stableOrbits.length > MAX_ORBITS) stableOrbits.shift();

  savedPosition = points[floor(points.length / 2)];
  savedFlash = 90;
}

function disperseStroke(stroke) {
  const layout = createMagneticLayout(stroke, stroke.coherence);

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
      length: point.length,
      thickness: point.thickness,
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
      length: random(4.5, 11.5),
      thickness: random(0.65, 1.8),
      rotation: random(TWO_PI),
      angularSpeed: random(-0.12, 0.12),
      depth: random(0.4, 1),
      seed: random(1000)
    });
  }
}

function createMagneticLayout(stroke, coherence) {
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

  const radiusX = constrain(max(78, extent * 0.72), 78, min(width * 0.3, 270));
  const radiusY = radiusX * VARIANT.fieldAspect;
  const marginX = min(radiusX + 46, width * 0.47);
  const marginY = min(radiusY + 104, height * 0.47);
  const centre = {
    x: constrain(centroid.x + stroke.centreBiasX, marginX, width - marginX),
    y: constrain(centroid.y + stroke.centreBiasY, marginY, height - marginY)
  };
  const alignment = easeOutBack(constrain(coherence, 0, 1));
  const speedEnergy = constrain(map(stroke.averageSpeed || 0, 2, 25, 0, 1), 0, 1);
  const vibration = (1 - coherence) * (1.5 + speedEnergy * 14);
  const points = stroke.points.map((point, index) => {
    const angle = stroke.seed + index / max(1, stroke.points.length - 1) * TWO_PI * 1.12;
    const bandRadiusX = radiusX + point.band * VARIANT.bandGap;
    const bandRadiusY = radiusY + point.band * VARIANT.bandGap * 0.46;
    const ellipseX = cos(angle) * bandRadiusX;
    const ellipseY = sin(angle) * bandRadiusY;
    const targetX = centre.x + ellipseX * cos(stroke.tilt) - ellipseY * sin(stroke.tilt);
    const targetY = centre.y + ellipseX * sin(stroke.tilt) + ellipseY * cos(stroke.tilt);
    const tangent = atan2(bandRadiusY * cos(angle), -bandRadiusX * sin(angle)) + stroke.tilt;
    const tremorX = sin(frameCount * 0.31 + point.seed * 7.2) * vibration;
    const tremorY = cos(frameCount * 0.27 + point.seed * 5.4) * vibration * 0.72;

    return {
      x: lerp(point.x + point.offsetX, targetX, alignment) + tremorX,
      y: lerp(point.y + point.offsetY, targetY, alignment) + tremorY,
      size: point.size,
      length: point.length,
      thickness: point.thickness,
      alpha: point.alpha,
      rotation: lerpAngle(point.rotation + frameCount * point.angularSpeed, tangent, alignment),
      depth: point.depth,
      band: point.band,
      polarity: point.polarity,
      seed: point.seed
    };
  });

  return { points, centre, radiusX, radiusY };
}

function drawCurrentStroke() {
  if (currentStroke.points.length === 0) return;

  const coherence = currentStroke.coherence;
  const layout = createMagneticLayout(currentStroke, coherence);

  if (coherence > 0.16 && layout.points.length > 3) {
    drawBrokenBands(layout.centre, layout.radiusX, layout.radiusY, currentStroke.tilt, coherence * 0.66, currentStroke.seed);
  }

  for (const point of layout.points) {
    drawMagneticDebris(point, 0.48 + coherence * 0.52, false);
  }
}

function drawStableOrbits() {
  for (const orbit of stableOrbits) {
    orbit.age++;
    const appear = easeOutCubic(constrain(orbit.age / 24, 0, 1));
    drawBrokenBands(orbit.centre, orbit.radiusX, orbit.radiusY, orbit.tilt, 0.82 * appear, orbit.seed);

    for (const point of orbit.points) {
      drawMagneticDebris(point, appear, true);
    }

    drawPeripheralDebris(orbit, appear);
  }
}

function drawBrokenBands(centre, radiusX, radiusY, tilt, alpha, seed) {
  const iron = VARIANT.palette.iron;
  const rust = VARIANT.palette.rust;
  noFill();

  for (let band = -1; band <= 1; band++) {
    const bandRadiusX = radiusX + band * VARIANT.bandGap;
    const bandRadiusY = radiusY + band * VARIANT.bandGap * 0.46;
    stroke(
      band === 0 ? rust[0] : iron[0],
      band === 0 ? rust[1] : iron[1],
      band === 0 ? rust[2] : iron[2],
      (band === 0 ? 28 : 38) * alpha
    );
    strokeWeight(band === 0 ? 0.48 : 0.62);

    for (let segment = 0; segment < 24; segment++) {
      if (noise(seed + band * 9.1, segment * 0.43) < 0.43) continue;
      const start = segment / 24 * TWO_PI;
      const end = start + TWO_PI / 24 * 0.58;
      beginShape();
      for (let angle = start; angle <= end + 0.01; angle += 0.035) {
        const ellipseX = cos(angle) * bandRadiusX;
        const ellipseY = sin(angle) * bandRadiusY;
        vertex(
          centre.x + ellipseX * cos(tilt) - ellipseY * sin(tilt),
          centre.y + ellipseX * sin(tilt) + ellipseY * cos(tilt)
        );
      }
      endShape();
    }
  }
}

function drawMagneticDebris(point, alphaScale, preserved) {
  const iron = VARIANT.palette.iron;
  const dark = VARIANT.palette.ironDark;
  const rust = VARIANT.palette.rust;
  const coldWhite = VARIANT.palette.coldWhite;
  const length = point.length * (preserved ? 1.04 : 1);
  const thickness = point.thickness * (preserved ? 1.05 : 1);
  const alpha = (point.alpha || 118) * alphaScale;
  const reflection = pow(max(0, sin(frameCount * 0.021 + point.seed * 2.3)), 24);

  push();
  translate(point.x, point.y);
  rotate(point.rotation);

  fill(
    lerp(dark[0], iron[0], point.depth),
    lerp(dark[1], iron[1], point.depth),
    lerp(dark[2], iron[2], point.depth),
    alpha * 0.94
  );
  stroke(
    point.polarity < 0 ? rust[0] : iron[0],
    point.polarity < 0 ? rust[1] : iron[1],
    point.polarity < 0 ? rust[2] : iron[2],
    alpha * (point.polarity < 0 ? 0.68 : 0.78)
  );
  strokeWeight(0.48);
  rectMode(CENTER);
  rect(0, 0, length, thickness);

  noStroke();
  fill(rust[0], rust[1], rust[2], alpha * 0.5);
  triangle(-length * .52, -thickness * .56, -length * .28, 0, -length * .52, thickness * .56);

  if (reflection > 0.025) {
    stroke(coldWhite[0], coldWhite[1], coldWhite[2], 225 * reflection * alphaScale);
    strokeWeight(0.72);
    line(-length * .42, -thickness * .58, length * .28, -thickness * .58);
  }

  pop();
}

function drawPeripheralDebris(orbit, appear) {
  for (const particle of orbit.orbiters) {
    particle.angle += particle.speed;
    const bandRadiusX = orbit.radiusX + particle.band * VARIANT.bandGap;
    const bandRadiusY = orbit.radiusY + particle.band * VARIANT.bandGap * 0.46;
    const ellipseX = cos(particle.angle) * bandRadiusX;
    const ellipseY = sin(particle.angle) * bandRadiusY;
    const x = orbit.centre.x + ellipseX * cos(orbit.tilt) - ellipseY * sin(orbit.tilt);
    const y = orbit.centre.y + ellipseX * sin(orbit.tilt) + ellipseY * cos(orbit.tilt);
    const tangent = atan2(bandRadiusY * cos(particle.angle), -bandRadiusX * sin(particle.angle)) + orbit.tilt;

    drawMagneticDebris({
      x,
      y,
      length: particle.length,
      thickness: particle.thickness,
      alpha: particle.alpha,
      rotation: tangent,
      depth: 0.62,
      polarity: 1,
      seed: particle.seed
    }, appear * 0.72, false);
  }
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

    drawMagneticDebris({
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
    label = "MAGNETIC FIELD SAVED";
    progress = 1;
    point = savedPosition;
  } else if (currentStroke.points.length > 0) {
    progress = currentStroke.coherence;
    if (progress < 0.32) label = "TURBULENT — SLOW DOWN";
    else if (progress < STABLE_COHERENCE) label = "ALIGNING FIELD";
    else label = "LOCKED — PAUSE TO SAVE";
  }

  if (!label || !point) return;

  const light = VARIANT.palette.iron;
  const metallic = VARIANT.palette.coldWhite;
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

function createMagneticField() {
  magneticLines = [];
  metalDust = [];
  randomSeed(4202);

  for (let i = 0; i < VARIANT.backgroundBands; i++) {
    magneticLines.push({
      x: random(width * 0.25, width * 0.78),
      y: random(height * 0.3, height * 0.7),
      radiusX: random(width * 0.16, width * 0.42),
      radiusY: random(height * 0.08, height * 0.24),
      tilt: VARIANT.fieldTilt + random(-0.18, 0.18),
      phase: random(TWO_PI),
      alpha: random(4, 13)
    });
  }

  for (let i = 0; i < 210; i++) {
    metalDust.push({
      x: random(width),
      y: random(height),
      length: random(0.6, 2.6),
      angle: random(TWO_PI),
      alpha: random(3, 14)
    });
  }
}

function drawMagneticBackground() {
  const field = VARIANT.palette.field;
  const iron = VARIANT.palette.iron;
  const rust = VARIANT.palette.rust;
  background(field[0], field[1], field[2]);

  noFill();
  for (let i = 0; i < magneticLines.length; i++) {
    const band = magneticLines[i];
    stroke(
      i % 4 === 0 ? rust[0] : iron[0],
      i % 4 === 0 ? rust[1] : iron[1],
      i % 4 === 0 ? rust[2] : iron[2],
      band.alpha
    );
    strokeWeight(0.38);
    for (let segment = 0; segment < 12; segment++) {
      if ((segment + i) % 4 === 1) continue;
      const start = band.phase + segment / 12 * TWO_PI;
      const end = start + TWO_PI / 12 * 0.48;
      beginShape();
      for (let angle = start; angle <= end + 0.01; angle += 0.05) {
        const ellipseX = cos(angle) * band.radiusX;
        const ellipseY = sin(angle) * band.radiusY;
        vertex(
          band.x + ellipseX * cos(band.tilt) - ellipseY * sin(band.tilt),
          band.y + ellipseX * sin(band.tilt) + ellipseY * cos(band.tilt)
        );
      }
      endShape();
    }
  }

  for (const dust of metalDust) {
    stroke(iron[0], iron[1], iron[2], dust.alpha);
    strokeWeight(0.45);
    line(
      dust.x - cos(dust.angle) * dust.length,
      dust.y - sin(dust.angle) * dust.length,
      dust.x + cos(dust.angle) * dust.length,
      dust.y + sin(dust.angle) * dust.length
    );
  }
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplayMode === 0) return;

  const points = hands[0].keypoints;
  const light = VARIANT.palette.iron;
  const metallic = VARIANT.palette.coldWhite;

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
  createMagneticField();
  if (video) video.size(width, height);
  resetDrawing();
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}

function lerpAngle(from, to, amount) {
  const difference = atan2(sin(to - from), cos(to - from));
  return from + difference * amount;
}
