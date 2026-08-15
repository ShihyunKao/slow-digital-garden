let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let breath = 0;
let targetBreath = 0;
let previousBreath = 0;

let stars = [];
let memories = [];
let amberParticles = [];
let amberSources = null;
let amberSpawnAccumulator = 0;
let amberInputPrimed = false;
let amberActivation = 0;
let crystalSegments = [];
let crystalCaptureCounter = 0;
let crystalGrowthActive = false;
let crystalGrowthFrames = 0;

let wasOpen = false;
let memoryStep = 0;
let showHelp = false;
let handDisplayMode = 1; // Default POINTS; P cycles POINTS → SKELETON → HIDDEN

const BOTH_V03_DEFAULT_STYLE = {
  id: "v03.00",
  name: "Cosmic Memory",
  palette: {
    glowOuter: [142, 170, 135],
    glowInner: [231, 219, 181],
    bodyFrom: [26, 42, 40],
    bodyTo: [76, 92, 78],
    orbit: [220, 226, 205],
    dust: [238, 231, 198],
    returnLine: [213, 220, 196],
    memory: [238, 232, 198],
    memoryDust: [246, 238, 198],
    handSkeleton: [230, 226, 204],
    handPoint: [246, 238, 198]
  },
  ambientParticleCount: 180,
  dustSizeScale: 1,
  dustTrails: false,
  memoryGlow: 0,
  orbitalMotionScale: 1,
  orbitAlphaScale: 1,
  dustAlphaScale: 1,
  memoryAlphaScale: 1,
  facetedOrbit: false,
  orbitSampleCount: 160,
  facetedMemory: false,
  memorySampleCount: 170,
  memoryNoiseMotionScale: 1,
  memoryExpansionScale: 1,
  memorySparkleSpeedScale: 1,
  memoryFadeInFrames: 1,
  memoryFlashScale: 1,
  memoryStartScale: 1,
  memoryDustSizeScale: 1,
  responsiveFieldScale: false,
  particleSystem: false,
  particleLimit: 0,
  particleSeedCount: 0,
  particleSpawnRate: 0,
  particleLifeMin: 1200,
  particleLifeMax: 2400,
  particleGravity: 0,
  particleSwirl: 0,
  particleDrag: 1,
  memoryLife: 1400,
  memoryParticleCount: 0,
  memoryOpenThreshold: 0.82,
  memoryReturnThreshold: 0.42,
  particleCoreCount: 0,
  crystalConnections: false,
  crystalJoinedThreshold: 0.5,
  crystalCaptureInterval: 12,
  crystalSegmentsPerCapture: 2,
  crystalSegmentLimit: 2400,
  crystalProjectionScale: 1.35,
  crystalResponsiveScale: false,
  crystalGrowthFrames: 110,
  crystalLineAlpha: 24,
  crystalLineWeight: 0.65
};

const BOTH_V03_VARIANT_STYLE = window.BOTH_V03_VARIANT || {};
const BOTH_V03_STYLE = {
  ...BOTH_V03_DEFAULT_STYLE,
  ...BOTH_V03_VARIANT_STYLE,
  palette: {
    ...BOTH_V03_DEFAULT_STYLE.palette,
    ...(BOTH_V03_VARIANT_STYLE.palette || {})
  }
};

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
  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);
  pixelDensity(1);
  noiseSeed(103);
  randomSeed(103);

  for (let i = 0; i < BOTH_V03_STYLE.ambientParticleCount; i++) {
    stars.push({
      angle: random(TWO_PI),
      radius: random(20, 285),
      speed: random(0.0005, 0.0025),
      size: random(0.8, 3.2),
      alpha: random(18, 72),
      depth: random(0.4, 1.0)
    });
  }

  if (BOTH_V03_STYLE.particleSystem) {
    seedAmberParticleField(BOTH_V03_STYLE.particleSeedCount);
  }
  beginExperience();
}

function draw() {
  drawSpaceBackground();

  targetBreath = getBreathAmount();
  previousBreath = breath;
  breath = lerp(breath, targetBreath, 0.04);

  if (showHelp) {
    wasOpen = false;
    crystalGrowthActive = false;
  } else {
    detectBreathMemory();
    if (BOTH_V03_STYLE.crystalConnections) updateCrystalGrowth();
  }

  if (BOTH_V03_STYLE.particleSystem) {
    updateAmberSources();
    drawAmberParticleField(breath);
  } else {
    drawCosmicField(breath);
  }
  if (BOTH_V03_STYLE.crystalConnections) {
    drawMemoryRings();
    drawCrystalConnections();
  } else {
    drawMemoryRings();
  }
  if (BOTH_V03_STYLE.particleSystem) {
    drawAmberParticleCore(breath);
  }
  drawHandDisplay();
  drawInterface();
}

function getBreathAmount() {
  if (hands.length >= 2) {
    const a = hands[0].keypoints[8];
    const b = hands[1].keypoints[8];
    const d = dist(a.x, a.y, b.x, b.y);

    return constrain(map(d, 80, 520, 0, 1), 0, 1);
  }

  return max(0, breath - 0.035);
}

function detectBreathMemory() {
  if (breath > BOTH_V03_STYLE.memoryOpenThreshold) {
    wasOpen = true;
  }

  if (
    wasOpen &&
    breath < BOTH_V03_STYLE.memoryReturnThreshold &&
    previousBreath >= BOTH_V03_STYLE.memoryReturnThreshold
  ) {
    addMemory();
    if (BOTH_V03_STYLE.crystalConnections) {
      crystalGrowthActive = true;
      crystalGrowthFrames = 0;
      captureCrystalConnections();
    }
    wasOpen = false;
  }
}

function addMemory() {
  const maxSteps = 8;
  const stepT = (memoryStep % maxSteps) / (maxSteps - 1);

  const outerRadius = 330;
  const innerRadius = 115;

  const radius = lerp(outerRadius, innerRadius, stepT);

  memories.push({
    age: 0,
    life: BOTH_V03_STYLE.memoryLife,
    radius: radius + random(-8, 8),
    aspect: random(0.48, 0.68),
    rotation: random(-0.04, 0.04),
    seed: random(1000),
    starCount: floor(random(42, 68)),
    flash: 1,
    step: memoryStep,
    particleCount: BOTH_V03_STYLE.memoryParticleCount
  });

  memoryStep++;

  if (memories.length > 8) {
    memories.shift();
  }
}

function drawCosmicField(amount) {
  const cx = width / 2;
  const cy = height / 2 + 20;
  const fieldScale = getResponsiveFieldScale();

  const eased = easeInOutCubic(amount);
  const radius = lerp(74, 278, eased) * fieldScale;
  const aspect = lerp(0.36, 0.64, eased);

  drawCentralGlow(cx, cy, radius, aspect, eased);
  drawOrbitBody(cx, cy, radius, aspect, eased);
  drawOrbitLines(cx, cy, radius, aspect, eased);
  drawStarCurrent(cx, cy, radius, aspect, eased, fieldScale);
  drawReturnLines(cx, cy, radius, aspect, eased);
}

function seedAmberParticleField(count) {
  const cx = width / 2;
  const cy = height / 2 + 20;

  for (let i = 0; i < count; i++) {
    const angle = random(TWO_PI);
    const radius = pow(random(), 0.62) * min(width, height) * 0.24;
    const particle = createAmberParticle(
      cx + cos(angle) * radius,
      cy + sin(angle) * radius * random(0.42, 0.7),
      random(0.2, 0.75),
      true
    );
    particle.age = random(0, particle.life * 0.28);
    amberParticles.push(particle);
  }
}

function updateAmberSources() {
  const fallbackGap = min(width, height) * 0.17;
  let leftTarget = { x: width / 2 - fallbackGap, y: height / 2 + 20 };
  let rightTarget = { x: width / 2 + fallbackGap, y: height / 2 + 20 };

  if (hands.length >= 2) {
    const first = hands[0].keypoints[8];
    const second = hands[1].keypoints[8];
    if (first.x <= second.x) {
      leftTarget = first;
      rightTarget = second;
    } else {
      leftTarget = second;
      rightTarget = first;
    }
  }

  if (!amberSources) {
    amberSources = {
      left: { ...leftTarget },
      right: { ...rightTarget },
      midpoint: {
        x: (leftTarget.x + rightTarget.x) / 2,
        y: (leftTarget.y + rightTarget.y) / 2
      }
    };
  }

  // The sources ease towards the hands so the nebula responds gravitationally
  // instead of sticking directly to every small tracking movement.
  const sourceEase = hands.length >= 2 ? 0.035 : 0.012;
  amberSources.left.x = lerp(amberSources.left.x, leftTarget.x, sourceEase);
  amberSources.left.y = lerp(amberSources.left.y, leftTarget.y, sourceEase);
  amberSources.right.x = lerp(amberSources.right.x, rightTarget.x, sourceEase);
  amberSources.right.y = lerp(amberSources.right.y, rightTarget.y, sourceEase);
  amberSources.midpoint.x = (amberSources.left.x + amberSources.right.x) / 2;
  amberSources.midpoint.y = (amberSources.left.y + amberSources.right.y) / 2;
}

function createAmberParticle(x, y, amount, seeded = false) {
  const angle = random(TWO_PI);
  const initialSpeed = seeded ? random(0.06, 0.22) : random(0.12, 0.42 + amount * 0.18);
  const life = random(BOTH_V03_STYLE.particleLifeMin, BOTH_V03_STYLE.particleLifeMax);

  return {
    x: x + randomGaussian() * (seeded ? 4 : 2.2),
    y: y + randomGaussian() * (seeded ? 3 : 1.6),
    vx: cos(angle) * initialSpeed,
    vy: sin(angle) * initialSpeed,
    age: 0,
    life,
    size: random(0.8, 2),
    tone: random(),
    alpha: random(0.5, 1),
    direction: random() > 0.18 ? 1 : -1
  };
}

function primeAmberParticleResponse(midpoint) {
  const count = min(320, max(0, BOTH_V03_STYLE.particleLimit - amberParticles.length));
  const radiusLimit = min(width, height) * 0.13;

  for (let i = 0; i < count; i++) {
    const angle = random(TWO_PI);
    const radius = pow(random(), 0.72) * radiusLimit;
    const particle = createAmberParticle(
      midpoint.x + cos(angle) * radius,
      midpoint.y + sin(angle) * radius * random(0.45, 0.72),
      0.7
    );
    const tangentSpeed = random(0.18, 0.5) * particle.direction;
    particle.vx = -sin(angle) * tangentSpeed;
    particle.vy = cos(angle) * tangentSpeed * 0.72;
    particle.age = random(95, 240);
    particle.alpha = random(0.72, 1);
    amberParticles.push(particle);
  }
}

function addAmberForce(particle, source, strength) {
  const dx = source.x - particle.x;
  const dy = source.y - particle.y;
  const distanceSquared = dx * dx + dy * dy + 2600;
  const distanceValue = sqrt(distanceSquared);
  const acceleration = strength / distanceSquared;

  particle.vx += dx * acceleration;
  particle.vy += dy * acceleration;

  return { dx, dy, distanceValue };
}

function drawAmberParticleField(amount) {
  if (!amberSources) return;

  const midpoint = amberSources.midpoint;
  const eased = easeInOutCubic(amount);

  if (hands.length >= 2 && !amberInputPrimed) {
    amberInputPrimed = true;
    amberActivation = 1;
    primeAmberParticleResponse(midpoint);
  }

  amberActivation = max(eased, amberActivation * 0.975);

  if (hands.length >= 2 && eased > 0.025) {
    amberSpawnAccumulator += BOTH_V03_STYLE.particleSpawnRate * (0.22 + eased * 0.78);
    while (amberSpawnAccumulator >= 1 && amberParticles.length < BOTH_V03_STYLE.particleLimit) {
      amberParticles.push(createAmberParticle(midpoint.x, midpoint.y, eased));
      amberSpawnAccumulator--;
    }
  }

  blendMode(ADD);
  noStroke();

  for (let i = amberParticles.length - 1; i >= 0; i--) {
    const particle = amberParticles[i];
    particle.age++;

    if (
      particle.age > particle.life ||
      particle.x < -180 || particle.x > width + 180 ||
      particle.y < -180 || particle.y > height + 180
    ) {
      amberParticles.splice(i, 1);
      continue;
    }

    addAmberForce(particle, amberSources.left, BOTH_V03_STYLE.particleGravity * (0.62 + eased * 0.62));
    addAmberForce(particle, amberSources.right, BOTH_V03_STYLE.particleGravity * (0.62 + eased * 0.62));
    const centreForce = addAmberForce(particle, midpoint, BOTH_V03_STYLE.particleGravity * 0.72);

    const tangentStrength = BOTH_V03_STYLE.particleSwirl * particle.direction;
    particle.vx += (-centreForce.dy / centreForce.distanceValue) * tangentStrength;
    particle.vy += (centreForce.dx / centreForce.distanceValue) * tangentStrength;

    particle.vx *= BOTH_V03_STYLE.particleDrag;
    particle.vy *= BOTH_V03_STYLE.particleDrag;
    particle.x += particle.vx;
    particle.y += particle.vy;

    const lifeProgress = particle.age / particle.life;
    const fadeIn = constrain(particle.age / 90, 0, 1);
    const fadeOut = constrain((1 - lifeProgress) / 0.16, 0, 1);
    const alpha = 215 * particle.alpha * fadeIn * fadeOut * (0.9 + amberActivation * 0.22);

    if (particle.tone < 0.36) {
      fill(...BOTH_V03_STYLE.palette.bodyTo, alpha * 0.58);
    } else if (particle.tone < 0.88) {
      fill(...BOTH_V03_STYLE.palette.dust, alpha);
    } else {
      fill(...BOTH_V03_STYLE.palette.memoryDust, alpha * 0.9);
    }
    circle(particle.x, particle.y, particle.size);
  }

  blendMode(BLEND);
}

function drawAmberParticleCore(amount) {
  if (!amberSources || BOTH_V03_STYLE.particleCoreCount <= 0) return;

  const midpoint = amberSources.midpoint;
  const eased = easeInOutCubic(amount);
  const count = BOTH_V03_STYLE.particleCoreCount;
  const coreRadius = lerp(28, 76, eased);
  const rotation = frameCount * 0.0065;
  const goldenAngle = PI * (3 - sqrt(5));

  blendMode(ADD);
  noStroke();

  for (let i = 0; i < count; i++) {
    const normalized = (i + 0.5) / count;
    const radius = sqrt(normalized) * coreRadius;
    const depth = 1 - normalized;
    const direction = i % 9 === 0 ? -1 : 1;
    const angle = i * goldenAngle + rotation * direction * (0.45 + depth * 1.4);
    const flutter = sin(frameCount * 0.011 + i * 0.73) * (1.2 + eased * 2.4);
    const x = midpoint.x + cos(angle) * (radius + flutter);
    const y = midpoint.y + sin(angle) * (radius + flutter) * lerp(0.58, 0.78, eased);
    const sparkle = sin(frameCount * 0.032 + i * 1.31) * 0.5 + 0.5;
    const alpha = 78 + depth * 116 + sparkle * 44;

    if (i % 7 === 0) {
      fill(...BOTH_V03_STYLE.palette.bodyTo, alpha * 0.58);
    } else if (i % 11 === 0) {
      fill(...BOTH_V03_STYLE.palette.memoryDust, alpha);
    } else {
      fill(...BOTH_V03_STYLE.palette.dust, alpha * 0.88);
    }

    circle(x, y, 0.9 + sparkle * 0.9);
  }

  blendMode(BLEND);
}

function drawCentralGlow(cx, cy, r, aspect, amount) {
  drawingContext.save();
  drawingContext.filter = "blur(34px)";

  noStroke();

  fill(...BOTH_V03_STYLE.palette.glowOuter, 20 + amount * 22);
  ellipse(cx, cy, r * 2.1, r * 2.1 * aspect);

  fill(...BOTH_V03_STYLE.palette.glowInner, 10 + amount * 14);
  ellipse(cx, cy, r * 1.05, r * 1.05 * aspect);

  drawingContext.restore();
}

function drawOrbitBody(cx, cy, r, aspect, amount) {
  noStroke();

  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const rr = r * (1 - t * 0.78);

    fill(
      lerp(BOTH_V03_STYLE.palette.bodyFrom[0], BOTH_V03_STYLE.palette.bodyTo[0], amount),
      lerp(BOTH_V03_STYLE.palette.bodyFrom[1], BOTH_V03_STYLE.palette.bodyTo[1], amount),
      lerp(BOTH_V03_STYLE.palette.bodyFrom[2], BOTH_V03_STYLE.palette.bodyTo[2], amount),
      28 - t * 1.7
    );

    ellipse(cx, cy, rr * 2, rr * 2 * aspect);
  }
}

function drawOrbitLines(cx, cy, r, aspect, amount) {
  noFill();

  const count = 15;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const rr = r * (0.16 + t * 0.94);

    const pulse = sin(frameCount * 0.015 * BOTH_V03_STYLE.orbitalMotionScale + i * 0.5) * amount * 2.8;
    const alpha = (1 - t * 0.45) * (24 + amount * 48) * BOTH_V03_STYLE.orbitAlphaScale;

    stroke(...BOTH_V03_STYLE.palette.orbit, alpha);
    strokeWeight(lerp(1.1, 0.35, t));

    beginShape();

    for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / BOTH_V03_STYLE.orbitSampleCount) {
      const n = noise(
        cos(a) * 1.4 + i * 0.17,
        sin(a) * 1.4,
        frameCount * 0.002 * BOTH_V03_STYLE.orbitalMotionScale
      );

      const wave = map(n, 0, 1, 0.97, 1.035);

      const px = cx + cos(a) * (rr * wave + pulse);
      const py = cy + sin(a) * (rr * wave + pulse) * aspect;
      if (BOTH_V03_STYLE.facetedOrbit) vertex(px, py);
      else curveVertex(px, py);
    }

    endShape(CLOSE);
  }
}

function drawStarCurrent(cx, cy, r, aspect, amount, fieldScale = 1) {
  noStroke();

  for (const star of stars) {
    star.angle += star.speed * (0.4 + amount * 1.8) * BOTH_V03_STYLE.orbitalMotionScale;

    const localRadius = star.radius * amount * star.depth * fieldScale;
    const px = cx + cos(star.angle) * localRadius;
    const py = cy + sin(star.angle) * localRadius * aspect;

    if (BOTH_V03_STYLE.dustTrails && amount > 0.08) {
      const previousAngle = star.angle - star.speed * (10 + amount * 24);
      stroke(...BOTH_V03_STYLE.palette.dust, star.alpha * amount * star.depth * 0.24 * BOTH_V03_STYLE.dustAlphaScale);
      strokeWeight(max(0.35, star.size * star.depth * 0.32));
      line(
        cx + cos(previousAngle) * localRadius,
        cy + sin(previousAngle) * localRadius * aspect,
        px,
        py
      );
    }

    noStroke();
    fill(...BOTH_V03_STYLE.palette.dust, star.alpha * amount * star.depth * BOTH_V03_STYLE.dustAlphaScale);
    circle(px, py, star.size * star.depth * BOTH_V03_STYLE.dustSizeScale);
  }
}

function drawReturnLines(cx, cy, r, aspect, amount) {
  if (amount < 0.28) return;

  stroke(...BOTH_V03_STYLE.palette.returnLine, 28 * amount);
  strokeWeight(0.6);
  noFill();

  const lines = 12;

  for (let i = 0; i < lines; i++) {
    const a = map(i, 0, lines, 0, TWO_PI);
    const outer = r * randomSeeded(i, 0.72, 0.95);
    const inner = r * randomSeeded(i + 90, 0.28, 0.52);

    beginShape();

    for (let t = 0; t <= 1.001; t += 0.08) {
      const bend = sin(t * PI) * 24 * amount;
      const angle = a + bend * 0.006;

      const rr = lerp(outer, inner, t);

      curveVertex(
        cx + cos(angle) * rr,
        cy + sin(angle) * rr * aspect - t * 18 * amount
      );
    }

    endShape();
  }
}

function captureCrystalConnections() {
  if (showHelp || hands.length < 2) return;

  const fingertipIndices = [4, 8, 12, 16, 20];
  const orderedHands = hands
    .slice(0, 2)
    .map(hand => ({
      hand,
      centreX: hand.keypoints.reduce((sum, point) => sum + point.x, 0) / hand.keypoints.length
    }))
    .sort((a, b) => a.centreX - b.centreX)
    .map(item => item.hand);

  const leftTips = fingertipIndices.map(index => orderedHands[0].keypoints[index]);
  const rightTips = fingertipIndices.map(index => orderedHands[1].keypoints[index]);
  const allTips = [...leftTips, ...rightTips];
  const handCentre = allTips.reduce((centre, point) => ({
    x: centre.x + point.x / allTips.length,
    y: centre.y + point.y / allTips.length
  }), { x: 0, y: 0 });
  const fieldCentre = { x: width / 2, y: height / 2 + 20 };
  const viewportProjection = BOTH_V03_STYLE.crystalResponsiveScale
    ? map(constrain(min(width, height), 700, 1800), 700, 1800, 1, 1.22)
    : 1;
  const projectionScale = BOTH_V03_STYLE.crystalProjectionScale * viewportProjection;
  const project = point => ({
    x: fieldCentre.x + (point.x - handCentre.x) * projectionScale,
    y: fieldCentre.y + (point.y - handCentre.y) * projectionScale
  });

  for (let link = 0; link < BOTH_V03_STYLE.crystalSegmentsPerCapture; link++) {
    const leftIndex = (crystalCaptureCounter * 2 + link) % leftTips.length;
    const rightIndex = (crystalCaptureCounter * 3 + link * 2 + 1) % rightTips.length;
    const start = project(leftTips[leftIndex]);
    const end = project(rightTips[rightIndex]);
    crystalSegments.push({
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      born: frameCount,
      alpha: BOTH_V03_STYLE.crystalLineAlpha * randomSeeded(
        crystalCaptureCounter * 17 + link * 31 + 503,
        0.62,
        1
      )
    });
  }
  crystalCaptureCounter++;

  if (crystalSegments.length > BOTH_V03_STYLE.crystalSegmentLimit) {
    crystalSegments.splice(0, crystalSegments.length - BOTH_V03_STYLE.crystalSegmentLimit);
  }
}

function updateCrystalGrowth() {
  if (!crystalGrowthActive) return;

  if (hands.length < 2 || targetBreath > BOTH_V03_STYLE.crystalJoinedThreshold) {
    crystalGrowthActive = false;
    crystalGrowthFrames = 0;
    return;
  }

  crystalGrowthFrames++;
  if (crystalGrowthFrames % BOTH_V03_STYLE.crystalCaptureInterval === 0) {
    captureCrystalConnections();
  }
}

function drawCrystalConnections() {
  if (crystalSegments.length === 0) return;

  push();
  blendMode(BLEND);
  strokeWeight(BOTH_V03_STYLE.crystalLineWeight);
  noFill();

  for (const segment of crystalSegments) {
    const growth = easeOutCubic(constrain(
      (frameCount - segment.born) / BOTH_V03_STYLE.crystalGrowthFrames,
      0,
      1
    ));
    const endX = lerp(segment.x1, segment.x2, growth);
    const endY = lerp(segment.y1, segment.y2, growth);

    stroke(...BOTH_V03_STYLE.palette.memory, segment.alpha * (0.72 + growth * 0.28));
    line(segment.x1, segment.y1, endX, endY);

    if (growth >= 1) {
      noStroke();
      fill(...BOTH_V03_STYLE.palette.memoryDust, segment.alpha * 0.42);
      circle(segment.x1, segment.y1, 1.25);
      circle(segment.x2, segment.y2, 1.25);
      strokeWeight(BOTH_V03_STYLE.crystalLineWeight);
      noFill();
    }
  }

  pop();
}

function drawMemoryRings() {
  if (BOTH_V03_STYLE.particleSystem) {
    drawAmberMemoryParticles();
    return;
  }

  const cx = width / 2;
  const cy = height / 2 + 20;

  for (let i = memories.length - 1; i >= 0; i--) {
    const memory = memories[i];

    memory.age++;
    memory.flash *= 0.965;

    if (memory.age > memory.life) {
      memories.splice(i, 1);
      continue;
    }

    const t = memory.age / memory.life;
    const fade = 1 - easeInCubic(t);
    const expansion = easeOutCubic(constrain(t * 1.4, 0, 1));
    const flash = memory.flash;
    const displayRadius = memory.radius * getResponsiveFieldScale();
    const formation = easeInOutCubic(constrain(
      memory.age / BOTH_V03_STYLE.memoryFadeInFrames,
      0,
      1
    ));
    const formationScale = lerp(BOTH_V03_STYLE.memoryStartScale, 1, formation);

    push();
    translate(cx, cy);
    rotate(memory.rotation);

    drawingContext.save();
    drawingContext.filter = "blur(1.4px)";
    drawingContext.shadowBlur = BOTH_V03_STYLE.memoryGlow * (0.4 + flash * 0.6);
    drawingContext.shadowColor = `rgba(${BOTH_V03_STYLE.palette.memory.join(",")},0.55)`;

    noFill();

    for (let ring = 0; ring < 4; ring++) {
      const rt = ring / 3;
      const rr = displayRadius
        * (0.9 + rt * 0.18 + expansion * 0.06 * BOTH_V03_STYLE.memoryExpansionScale)
        * formationScale;

      stroke(
        ...BOTH_V03_STYLE.palette.memory,
        (fade * (36 - ring * 5) + flash * 40 * BOTH_V03_STYLE.memoryFlashScale)
          * BOTH_V03_STYLE.memoryAlphaScale
          * formation
      );
      strokeWeight(0.7 + flash * 0.6 * BOTH_V03_STYLE.memoryFlashScale);

      beginShape();

      for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / BOTH_V03_STYLE.memorySampleCount) {
        const n = noise(
          memory.seed + cos(a) * 1.7,
          memory.seed + sin(a) * 1.7,
          ring * 0.24 + frameCount * 0.0008 * BOTH_V03_STYLE.memoryNoiseMotionScale
        );

        const wobble = map(n, 0, 1, 0.985, 1.03);

        const px = cos(a) * rr * wobble;
        const py = sin(a) * rr * memory.aspect * wobble;
        if (BOTH_V03_STYLE.facetedMemory) vertex(px, py);
        else curveVertex(px, py);
      }

      endShape(CLOSE);
    }

    drawingContext.restore();

    noStroke();

    for (let s = 0; s < memory.starCount; s++) {
      const a = (s / memory.starCount) * TWO_PI + memory.seed * 0.01;
      const rr = displayRadius
        * randomSeeded(s + memory.seed, 0.82, 1.15)
        * formationScale;

      const sparkle = sin(frameCount * 0.04 * BOTH_V03_STYLE.memorySparkleSpeedScale + s * 1.7) * 0.5 + 0.5;

      fill(
        ...BOTH_V03_STYLE.palette.memoryDust,
        (fade * (38 + sparkle * 28) + flash * 60 * BOTH_V03_STYLE.memoryFlashScale)
          * BOTH_V03_STYLE.memoryAlphaScale
          * formation
      );

      circle(
        cos(a) * rr,
        sin(a) * rr * memory.aspect,
        (randomSeeded(s + 200, 1.8, 4.6) + sparkle * 1.2)
          * BOTH_V03_STYLE.memoryDustSizeScale
      );
    }

    pop();
  }
}

function getResponsiveFieldScale() {
  if (!BOTH_V03_STYLE.responsiveFieldScale) return 1;
  return map(constrain(min(width, height), 700, 1800), 700, 1800, 1, 1.45);
}

function drawAmberMemoryParticles() {
  const cx = width / 2;
  const cy = height / 2 + 20;

  blendMode(ADD);
  noStroke();

  for (let i = memories.length - 1; i >= 0; i--) {
    const memory = memories[i];
    memory.age++;
    memory.flash *= 0.965;

    if (memory.age > memory.life) {
      memories.splice(i, 1);
      continue;
    }

    const t = memory.age / memory.life;
    const fadeIn = constrain(memory.age / 18, 0, 1);
    const fadeOut = constrain((1 - t) / 0.18, 0, 1);
    const fade = fadeIn * fadeOut;
    const rotation = memory.rotation + memory.age * 0.00011 * (memory.step % 2 === 0 ? 1 : -1);
    const count = memory.particleCount || 130;

    for (let particleIndex = 0; particleIndex < count; particleIndex++) {
      const phase = randomSeeded(memory.seed + particleIndex * 7.31, 0, TWO_PI);
      const radialScatter = randomSeeded(memory.seed + particleIndex * 11.73, 0.78, 1.2);
      const slowDrift = sin(memory.age * 0.0014 + particleIndex * 0.61) * memory.radius * 0.012;
      const radius = memory.radius * radialScatter + slowDrift;
      const angle = phase + rotation;
      const x = cx + cos(angle) * radius;
      const y = cy + sin(angle) * radius * memory.aspect;
      const tone = randomSeeded(memory.seed + particleIndex * 3.17, 0, 1);
      const particleAlpha = fade * (
        randomSeeded(memory.seed + particleIndex * 5.43, 46, 138) +
        memory.flash * 105
      );

      if (tone < 0.38) {
        fill(...BOTH_V03_STYLE.palette.bodyTo, particleAlpha * 0.7);
      } else if (tone < 0.9) {
        fill(...BOTH_V03_STYLE.palette.memory, particleAlpha);
      } else {
        fill(...BOTH_V03_STYLE.palette.memoryDust, particleAlpha);
      }

      circle(
        x,
        y,
        randomSeeded(memory.seed + particleIndex * 13.19, 0.8, 1.9)
      );
    }
  }

  blendMode(BLEND);
}

function drawSpaceBackground() {
  clear();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
}

function drawHandDisplay() {
  if (handDisplayMode === 0 || hands.length === 0) return;

  for (const hand of hands) {
    const points = hand.keypoints;

    if (handDisplayMode === 2) {
      stroke(...BOTH_V03_STYLE.palette.handSkeleton, 58);
      strokeWeight(0.75);
      noFill();

      for (const [a, b] of HAND_CONNECTIONS) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    noStroke();
    fill(...BOTH_V03_STYLE.palette.handPoint, 92);
    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);

    for (const index of visible) {
      circle(points[index].x, points[index].y, handDisplayMode === 1 ? 7 : 3.5);
    }
  }
}

function drawInterface() {
  syncHelpOverlay();
  if (!showHelp) cursor(ARROW);
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
}

function drawExhibitionCaption() {
  cursor(ARROW);
  const inset = 28;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("COSMIC MEMORY", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 03.00 / BREATHING MEMORY RINGS", inset, 47);

  textAlign(RIGHT, TOP);
  fill(211, 216, 198, 128);
  textSize(10);
  text(`${modelLoading ? "CAMERA LOADING · " : ""}P ${display}   ·   R RESET   ·   ? HELP`, width - inset, 32);

  stroke(199, 210, 188, 25);
  strokeWeight(1);
  line(inset, 66, width - inset, 66);
}

function getHelpPanelMetrics() {
  const panelWidth = min(840, width - 40);
  const panelHeight = min(540, height - 40);
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
  const compact = panel.width < 740 || panel.height < 500;
  const left = panel.x + (compact ? 34 : 56);
  const rightEdge = panel.x + panel.width - (compact ? 34 : 56);

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
  text("GESTURE STUDY 03.00", left, panel.y + (compact ? 24 : 36));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Cosmic Memory", left, panel.y + (compact ? 46 : 65));

  if (compact) {
    drawCompactHelp(panel, left, rightEdge - left);
  } else {
    drawEditorialHelp(panel, left, rightEdge);
  }

  const hovering =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  cursor(hovering ? HAND : ARROW);
  noStroke();
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

function drawEditorialHelp(panel, left, rightEdge) {
  const dividerX = panel.x + panel.width * 0.59;
  const right = dividerX + 38;
  const rightWidth = rightEdge - right;

  fill(201, 207, 191, 175);
  textAlign(LEFT, TOP);
  textSize(15);
  textLeading(22);
  text(
    "A two-hand breathing gesture becomes a memory of expansion and return.",
    left,
    panel.y + 118,
    dividerX - left - 46
  );

  const stepsY = panel.y + 198;
  const gap = 58;
  drawHelpStep("01", "Select Begin, allow the camera, and bring hands together.", left, stepsY);
  drawHelpStep("02", "Open both hands fully until the field expands.", left, stepsY + gap);
  drawHelpStep("03", "Return to the centre to leave one memory ring.", left, stepsY + gap * 2);

  stroke(178, 193, 169, 35);
  strokeWeight(1);
  line(dividerX, panel.y + 112, dividerX, panel.buttonY - 42);

  noStroke();
  fill(174, 191, 166, 120);
  textAlign(LEFT, TOP);
  textSize(10);
  text("READING THE ARCHIVE", right, panel.y + 120);

  fill(201, 207, 191, 145);
  textSize(12);
  textLeading(18);
  text(
    "Each completed breath becomes an orbit-like memory. Across eight cycles, the rings move from the outer field towards the centre.",
    right,
    panel.y + 146,
    rightWidth
  );

  const legendY = panel.y + 246;
  const legendGap = 40;
  drawArchiveLegendRow("01", "CYCLE", "wide stretch + return", right, legendY, rightWidth);
  drawArchiveLegendRow("02", "RADIUS", "outer-to-inner order", right, legendY + legendGap, rightWidth);
  drawArchiveLegendRow("03", "RINGS", "one breath memory", right, legendY + legendGap * 2, rightWidth);
  drawArchiveLegendRow("04", "STARS", "surrounding constellation", right, legendY + legendGap * 3, rightWidth);

  textAlign(LEFT, TOP);
  fill(174, 191, 166, 125);
  textSize(10);
  text("P  HAND DISPLAY     R  RESET ARCHIVE     ?  HELP", left, panel.buttonY - 37);
}

function drawCompactHelp(panel, left, contentWidth) {
  fill(201, 207, 191, 165);
  textAlign(LEFT, TOP);
  textSize(12);
  textLeading(17);
  text(
    "Each breath leaves one memory ring in an eight-cycle archive.",
    left,
    panel.y + 86,
    contentWidth
  );

  const stepsY = panel.y + 126;
  const gap = 39;
  drawHelpStep("01", "Begin with both hands together.", left, stepsY);
  drawHelpStep("02", "Open fully, then return.", left, stepsY + gap);
  drawHelpStep("03", "Repeat eight times.", left, stepsY + gap * 2);

  const keyY = stepsY + gap * 3 + 5;
  fill(174, 191, 166, 115);
  textSize(10);
  text("CYCLE / WIDE STRETCH + RETURN     RADIUS / OUTER TO INNER", left, keyY);
  text("RINGS / BREATH MEMORY             STARS / CONSTELLATION", left, keyY + 18);

  fill(174, 191, 166, 120);
  textSize(9);
  text("P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - 28);
}

function drawArchiveLegendRow(number, label, description, x, y, rowWidth) {
  stroke(178, 193, 169, 30);
  strokeWeight(1);
  line(x, y - 10, x + rowWidth, y - 10);

  noStroke();
  textAlign(LEFT, TOP);
  fill(174, 191, 166, 90);
  textSize(9);
  text(number, x, y + 2);

  fill(230, 229, 211, 205);
  textSize(11);
  text(label, x + 34, y);

  fill(184, 195, 179, 145);
  textSize(10);
  textAlign(RIGHT, TOP);
  text(description, x + rowWidth, y + 1);
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
  if (key === "r" || key === "R") {
    memories = [];
    wasOpen = false;
    memoryStep = 0;
    if (BOTH_V03_STYLE.crystalConnections) {
      crystalSegments = [];
      crystalCaptureCounter = 0;
      crystalGrowthActive = false;
      crystalGrowthFrames = 0;
    }
    if (BOTH_V03_STYLE.particleSystem) {
      amberParticles = [];
      amberSpawnAccumulator = 0;
      amberInputPrimed = false;
      amberActivation = 0;
      seedAmberParticleField(floor(BOTH_V03_STYLE.particleSeedCount * 0.45));
    }
  }
}

function mousePressed() {
  if (showHelp) return false;
}

function beginExperience() {
  showHelp = false;
  syncHelpOverlay();
  cursor(ARROW);
  startHandMode();
}

function startHandMode() {
  if (video || modelLoading || detectionStarted) return;

  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];

  video = createCapture(
    {
      video: {
        width,
        height
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

function randomSeeded(seed, minValue, maxValue) {
  const n = noise(seed * 0.31, 4.7);
  return map(n, 0, 1, minValue, maxValue);
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }

  return 1 - pow(-2 * t + 2, 3) / 2;
}
