let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let breath = 0;
let targetBreath = 0;
let particles = [];
const breathingCosmosVariant = window.BOTH_V02_VARIANT || null;
let mercuryExpansion = 0;
let mercuryVelocity = 0;
let mercuryLastInput = 0;
let mercuryRecentMotion = 0;
let mercuryStillFrames = 0;
let mercuryEcho = 0;
let mercuryEchoPhase = 0;
let cloudExpansion = 0;
let cloudVelocity = 0;
let cloudAfterflow = 0;
let cloudLastInput = 0;
let showHelp = false;
let handDisplayMode = 1; // Default POINTS; P cycles POINTS → SKELETON → HIDDEN

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
  noiseSeed(72);
  randomSeed(72);

  for (let i = 0; i < 120; i++) {
    particles.push({
      angle: random(TWO_PI),
      radius: random(70, 280),
      speed: random(0.0008, 0.0022),
      size: random(1.2, 3.8),
      alpha: random(18, 58)
    });
  }
  beginExperience();
}

function draw() {
  drawBackground();

  targetBreath = getBreathAmount();
  breath = lerp(breath, targetBreath, 0.045);

  if (breathingCosmosVariant?.renderMode === "mercury-basin") drawMercuryBasin(targetBreath);
  else if (breathingCosmosVariant?.renderMode === "cloud-chamber") drawCloudChamber(targetBreath);
  else drawBreathingPond(breath);
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

function drawBreathingPond(amount) {
  const cx = width / 2;
  const cy = height / 2 + 18;

  const eased = easeInOutCubic(amount);
  const pondRadius = lerp(82, 265, eased);
  const verticalScale = lerp(0.42, 0.68, eased);

  drawSoftGlow(cx, cy, pondRadius, verticalScale, eased);
  drawWaterBody(cx, cy, pondRadius, verticalScale, eased);
  drawRippleLines(cx, cy, pondRadius, verticalScale, eased);
  drawBotanicalEdges(cx, cy, pondRadius, verticalScale, eased);
  drawFloatingParticles(cx, cy, pondRadius, verticalScale, eased);
}

function drawMercuryBasin(amount) {
  const palette = breathingCosmosVariant.palette;
  const target = easeInOutCubic(amount);
  const inputChange = abs(target - mercuryLastInput);

  mercuryRecentMotion = max(inputChange, mercuryRecentMotion * 0.92);
  if (hands.length >= 2 && inputChange < 0.0045) {
    mercuryStillFrames += 1;
    if (mercuryStillFrames === 6 && mercuryRecentMotion > 0.008) {
      mercuryEcho = constrain(mercuryRecentMotion * 27, 0.55, 1);
      mercuryEchoPhase = 0;
    }
  } else {
    mercuryStillFrames = 0;
  }
  mercuryLastInput = target;

  mercuryVelocity = (mercuryVelocity + (target - mercuryExpansion) * 0.043) * 0.865;
  mercuryExpansion = constrain(mercuryExpansion + mercuryVelocity, -0.03, 1.055);

  if (mercuryEcho > 0.004) {
    mercuryEchoPhase += 0.14;
    mercuryEcho *= 0.982;
  } else {
    mercuryEcho = 0;
  }

  const expansion = constrain(mercuryExpansion, 0, 1.03);
  const cx = width / 2;
  const cy = height * 0.565;
  const radius = lerp(118, min(width * 0.46, height * 0.58), expansion);
  const verticalScale = lerp(0.24, 0.42, expansion);
  const echoWave = sin(mercuryEchoPhase) * mercuryEcho;
  const displayRadius = radius * (1 + echoWave * 0.048);
  const displayScale = verticalScale * (1 - echoWave * 0.08);
  const time = frameCount * 0.008;

  drawMercuryBody(cx, cy, displayRadius, displayScale, expansion, palette);
  drawMercuryRipples(cx, cy, displayRadius, displayScale, expansion, time, palette);
  drawMercuryHighlights(cx, cy, displayRadius, displayScale, expansion, time, palette);
  drawMercuryEcho(cx, cy, radius, verticalScale, mercuryEcho, mercuryEchoPhase, palette);
  drawMercuryParticles(cx, cy, displayRadius, displayScale, expansion, palette);
}

function drawMercuryBody(cx, cy, radius, verticalScale, expansion, palette) {
  const context = drawingContext;
  context.save();
  context.translate(cx, cy);
  context.scale(1, verticalScale);

  const body = context.createRadialGradient(0, radius * 0.08, radius * 0.08, 0, 0, radius);
  body.addColorStop(0, `rgba(${palette.abyss.join(",")},0.98)`);
  body.addColorStop(0.36, `rgba(${palette.deep.join(",")},0.94)`);
  body.addColorStop(0.72, `rgba(${palette.mercury.join(",")},${0.52 + expansion * 0.16})`);
  body.addColorStop(0.92, `rgba(${palette.deep.join(",")},0.9)`);
  body.addColorStop(1, `rgba(${palette.mercury.join(",")},0.34)`);
  context.fillStyle = body;
  context.beginPath();
  context.arc(0, 0, radius, 0, TWO_PI);
  context.fill();

  context.strokeStyle = `rgba(${palette.secondary.join(",")},${0.16 + expansion * 0.1})`;
  context.lineWidth = 1.1 / verticalScale;
  context.stroke();
  context.restore();

  noStroke();
  fill(...palette.abyss, 214);
  ellipse(cx, cy + radius * verticalScale * 0.035, radius * 0.49, radius * verticalScale * 0.24);
  fill(...palette.deep, 96);
  ellipse(cx, cy + radius * verticalScale * 0.02, radius * 0.31, radius * verticalScale * 0.13);
}

function drawMercuryRipples(cx, cy, radius, verticalScale, expansion, time, palette) {
  noFill();
  for (let ring = 0; ring < 13; ring++) {
    const progress = ring / 12;
    const rr = radius * (0.2 + progress * 0.78);
    const wobble = sin(time * 0.7 + ring * 0.63) * (0.7 + expansion * 2.2);
    stroke(...(ring % 4 === 0 ? palette.secondary : palette.mercury), 18 + (1 - progress) * 17);
    strokeWeight(ring % 5 === 0 ? 0.9 : 0.42);
    ellipse(cx, cy + wobble * verticalScale, (rr + wobble) * 2, (rr + wobble) * 2 * verticalScale);
  }
}

function drawMercuryHighlights(cx, cy, radius, verticalScale, expansion, time, palette) {
  noFill();
  strokeCap(ROUND);
  for (let highlight = 0; highlight < 7; highlight++) {
    const rr = radius * (0.28 + highlight * 0.09);
    const phase = time * (0.42 + highlight * 0.035) + highlight * 1.17;
    const span = 0.2 + (highlight % 3) * 0.08;
    const colour = highlight === 5 ? palette.warm : highlight % 2 === 0 ? palette.specular : palette.secondary;
    const alpha = highlight === 5 ? 68 : 70 + expansion * 54;
    stroke(...colour, alpha);
    strokeWeight(highlight % 3 === 0 ? 1.35 : 0.72);
    arc(cx, cy, rr * 2, rr * 2 * verticalScale, phase, phase + span);
  }
  strokeCap(SQUARE);
}

function drawMercuryEcho(cx, cy, radius, verticalScale, energy, phase, palette) {
  if (energy <= 0) return;

  noFill();
  strokeCap(ROUND);
  for (let echoIndex = 0; echoIndex < 3; echoIndex++) {
    const progress = (phase / 2.8 + echoIndex * 0.34) % 1;

    const echoRadius = radius * lerp(0.32, 1.04, progress);
    const echoAlpha = energy * pow(1 - progress, 1.3) * (echoIndex === 0 ? 150 : 92);
    stroke(...(echoIndex === 0 ? palette.specular : palette.secondary), echoAlpha);
    strokeWeight(echoIndex === 0 ? 1.4 : 0.72);
    ellipse(cx, cy, echoRadius * 2, echoRadius * 2 * verticalScale);
  }
  strokeCap(SQUARE);
}

function drawMercuryParticles(cx, cy, radius, verticalScale, expansion, palette) {
  noStroke();
  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index];
    particle.angle += particle.speed * (0.28 + expansion * 0.58);
    const surfaceRadius = min(particle.radius, radius * 0.92) * expansion;
    const px = cx + cos(particle.angle) * surfaceRadius;
    const py = cy + sin(particle.angle) * surfaceRadius * verticalScale;
    const colour = index % 29 === 0 ? palette.warm : index % 4 === 0 ? palette.specular : palette.secondary;
    fill(...colour, particle.alpha * expansion * 0.72);
    ellipse(px, py, particle.size * 0.8, max(0.55, particle.size * verticalScale));
  }
}

function drawCloudChamber(amount) {
  const palette = breathingCosmosVariant.palette;
  const target = easeInOutCubic(amount);
  const inputChange = abs(target - cloudLastInput);

  cloudVelocity = (cloudVelocity + (target - cloudExpansion) * 0.034) * 0.88;
  cloudExpansion = constrain(cloudExpansion + cloudVelocity, 0, 1.04);
  cloudAfterflow = max(
    cloudAfterflow * 0.978,
    inputChange * 7.5,
    abs(cloudVelocity) * 2.4
  );
  cloudAfterflow = constrain(cloudAfterflow, 0, 1);
  cloudLastInput = target;

  const expansion = constrain(cloudExpansion, 0, 1);
  const visualExpansion = constrain(expansion + cloudAfterflow * 0.18, 0, 1.06);
  const cx = width * 0.54;
  const cy = height * 0.46;
  // Let the chamber occupy the stage more decisively, especially on a
  // widescreen display, while keeping the same hand-distance mapping.
  const spread = lerp(205, min(width * 0.54, height * 0.78), visualExpansion);
  const tilt = -0.18;
  const time = frameCount * 0.006;

  drawCloudShadow(cx, cy, spread, tilt, visualExpansion, palette);
  drawCloudSideLight(cx, cy, spread, tilt, visualExpansion, palette);
  drawCloudMist(cx, cy, spread, tilt, visualExpansion, cloudAfterflow, time, palette);
  drawCloudParticles(cx, cy, spread, tilt, visualExpansion, cloudAfterflow, time, palette);
}

function drawCloudShadow(cx, cy, spread, tilt, expansion, palette) {
  const context = drawingContext;
  context.save();
  context.translate(cx, cy + spread * 0.025);
  context.rotate(tilt);
  context.scale(1, 0.48);
  context.filter = `blur(${lerp(18, 30, expansion)}px)`;

  const haze = context.createRadialGradient(
    -spread * 0.12,
    0,
    spread * 0.06,
    0,
    0,
    spread
  );
  haze.addColorStop(0, `rgba(${palette.shadow.join(",")},${0.2 + expansion * 0.07})`);
  haze.addColorStop(0.52, `rgba(${palette.shadow.join(",")},${0.11 + expansion * 0.04})`);
  haze.addColorStop(0.82, `rgba(${palette.mist.join(",")},0.025)`);
  haze.addColorStop(1, `rgba(${palette.background.join(",")},0)`);
  context.fillStyle = haze;
  context.beginPath();
  context.ellipse(0, 0, spread, spread, 0, 0, TWO_PI);
  context.fill();
  context.restore();
}

function drawCloudSideLight(cx, cy, spread, tilt, expansion, palette) {
  const light = getCloudStageLightGeometry(cx, cy, spread);
  const context = drawingContext;

  // One continuous off-screen beam keeps the source out of the composition.
  // Wide blur and curved sides prevent visible bands or a theatrical triangle.
  context.save();
  context.globalCompositeOperation = "screen";
  context.filter = `blur(${lerp(42, 54, expansion)}px)`;
  const beam = context.createLinearGradient(0, light.sourceY, 0, light.landingY);
  beam.addColorStop(0, `rgba(${palette.light.join(",")},0.055)`);
  beam.addColorStop(0.34, `rgba(${palette.light.join(",")},${0.035 + expansion * 0.012})`);
  beam.addColorStop(0.72, `rgba(${palette.light.join(",")},${0.055 + expansion * 0.018})`);
  beam.addColorStop(1, `rgba(${palette.light.join(",")},0)`);
  context.fillStyle = beam;
  context.beginPath();
  context.moveTo(light.sourceX - light.topHalf, light.sourceY);
  context.bezierCurveTo(
    light.sourceX - spread * 0.08,
    lerp(light.sourceY, light.landingY, 0.38),
    light.landingX - light.bottomHalf * 0.66,
    lerp(light.sourceY, light.landingY, 0.76),
    light.landingX - light.bottomHalf,
    light.landingY
  );
  context.quadraticCurveTo(
    light.landingX,
    light.landingY + spread * 0.055,
    light.landingX + light.bottomHalf,
    light.landingY
  );
  context.bezierCurveTo(
    light.landingX + light.bottomHalf * 0.66,
    lerp(light.sourceY, light.landingY, 0.76),
    light.sourceX + spread * 0.08,
    lerp(light.sourceY, light.landingY, 0.38),
    light.sourceX + light.topHalf,
    light.sourceY
  );
  context.closePath();
  context.fill();
  context.restore();

  // The pool of light remains concentrated where the cone meets the fog.
  context.save();
  context.globalCompositeOperation = "screen";
  context.filter = `blur(${lerp(26, 38, expansion)}px)`;
  const pool = context.createRadialGradient(
    light.landingX,
    cy + spread * 0.04,
    spread * 0.03,
    light.landingX,
    cy + spread * 0.04,
    spread * 0.57
  );
  pool.addColorStop(0, `rgba(${palette.light.join(",")},${0.1 + expansion * 0.045})`);
  pool.addColorStop(0.38, `rgba(${palette.light.join(",")},${0.035 + expansion * 0.02})`);
  pool.addColorStop(1, `rgba(${palette.light.join(",")},0)`);
  context.fillStyle = pool;
  context.beginPath();
  context.ellipse(light.landingX, cy + spread * 0.04, spread * 0.58, spread * 0.34, tilt, 0, TWO_PI);
  context.fill();
  context.restore();
}

function getCloudStageLightGeometry(cx, cy, spread) {
  return {
    // Keep the stage light attached to the chamber's visual centre.  The
    // earlier fixed, right-biased source made the cone drift away from the
    // cloud as the hand-controlled spread grew.
    sourceX: cx,
    sourceY: -height * 0.18,
    landingX: cx,
    landingY: cy + spread * 0.08,
    topHalf: spread * 0.045,
    bottomHalf: spread * 0.34
  };
}

function drawCloudMist(cx, cy, spread, tilt, expansion, afterflow, time, palette) {
  push();
  translate(cx, cy);
  rotate(tilt);

  // Build the chamber from suspended volume, never from directional strokes.
  // A broad, softly blurred pass joins the motes into one continuous cloud.
  drawingContext.save();
  drawingContext.filter = `blur(${lerp(9, 16, expansion)}px)`;
  drawingContext.globalCompositeOperation = "screen";
  noStroke();

  for (let mote = 0; mote < 190; mote++) {
    const seed = mote * 0.137;
    const baseX = (noise(seed + 2.1) - 0.5) * spread * 1.72;
    const baseY = (noise(seed + 8.4) - 0.5) * spread * 0.78;
    const normX = baseX / (spread * 0.89);
    const normY = baseY / (spread * 0.41);
    const radius = sqrt(normX * normX + normY * normY);
    if (radius >= 1) continue;

    const edgeFade = pow(1 - radius, 0.72);
    const driftStrength = 0.28 + expansion * 0.44 + afterflow * 0.7;
    const driftX = (noise(seed + 13.2, time * 0.13) - 0.5) * spread * 0.16 * driftStrength;
    const driftY = (noise(seed + 19.6, time * 0.11) - 0.5) * spread * 0.12 * driftStrength;
    const lingeringX = sin(time * 0.7 + seed * 17) * spread * 0.018 * afterflow;
    const colour = mote % 8 === 0
      ? palette.secondary
      : mote % 21 === 0
        ? palette.shadow
        : palette.mist;
    const alpha = (2.2 + expansion * 4.7 + afterflow * 2.6) * edgeFade;
    const size = spread * (0.035 + noise(seed + 25.7) * 0.105) * (0.66 + edgeFade * 0.58);

    fill(...colour, alpha);
    circle(baseX + driftX + lingeringX, baseY + driftY, size);
  }
  drawingContext.restore();

  // A finer pass supplies suspended mist without introducing visible paths.
  drawingContext.save();
  drawingContext.filter = `blur(${lerp(2.2, 4.8, expansion)}px)`;
  drawingContext.globalCompositeOperation = "screen";
  noStroke();

  for (let mote = 0; mote < 320; mote++) {
    const seed = mote * 0.091;
    const baseX = (noise(seed + 31.4) - 0.5) * spread * 1.76;
    const baseY = (noise(seed + 37.9) - 0.5) * spread * 0.8;
    const normX = baseX / (spread * 0.9);
    const normY = baseY / (spread * 0.42);
    const radius = sqrt(normX * normX + normY * normY);
    if (radius >= 1) continue;

    const edgeFade = pow(1 - radius, 0.9);
    const driftStrength = 0.22 + expansion * 0.5 + afterflow * 0.78;
    const driftX = (noise(seed + 43.3, time * 0.2) - 0.5) * spread * 0.12 * driftStrength;
    const driftY = (noise(seed + 49.8, time * 0.17) - 0.5) * spread * 0.09 * driftStrength;
    const colour = mote % 7 === 0 ? palette.secondary : palette.mist;
    const alpha = (3.5 + expansion * 8.2 + afterflow * 3.5) * edgeFade;
    const size = spread * (0.007 + noise(seed + 55.2) * 0.026);

    fill(...colour, alpha);
    circle(baseX + driftX, baseY + driftY, size);
  }
  drawingContext.restore();
  pop();
}

function drawCloudParticles(cx, cy, spread, tilt, expansion, afterflow, time, palette) {
  const light = getCloudStageLightGeometry(cx, cy, spread);
  const cosTilt = cos(tilt);
  const sinTilt = sin(tilt);
  const driftStrength = 0.24 + expansion * 0.7 + afterflow * 0.8;
  noStroke();

  for (let index = 0; index < 240; index++) {
    const seed = index * 0.119;
    const lane = noise(seed + 2.7) - 0.5;
    const sourceX = (noise(seed, 1.9) - 0.5) * spread * 1.72;
    const sourceY = lane * spread * 0.76;
    const driftX = (noise(seed + 5.1, time * 0.19) - 0.5) * spread * 0.24 * driftStrength;
    const driftY = (noise(seed + 9.6, time * 0.16) - 0.5) * spread * 0.17 * driftStrength;
    const localX = sourceX + driftX + sin(time * 0.8 + seed * 9) * spread * 0.018 * afterflow;
    const localY = sourceY + driftY;
    const px = cx + localX * cosTilt - localY * sinTilt;
    const py = cy + localX * sinTilt + localY * cosTilt;
    const beamProgress = constrain((py - light.sourceY) / (light.landingY - light.sourceY), 0, 1);
    const beamCentreX = lerp(light.sourceX, light.landingX, beamProgress);
    const beamWidth = lerp(light.topHalf, light.bottomHalf, pow(beamProgress, 0.86));
    const beamAmount = pow(constrain(1 - abs(px - beamCentreX) / beamWidth, 0, 1), 1.45)
      * pow(beamProgress, 0.42);
    const baseColour = index % 4 === 0 ? palette.secondary : palette.mist;
    const litColour = index % 5 === 0 ? palette.light : palette.highlight;
    const colour = baseColour.map((channel, channelIndex) =>
      lerp(channel, litColour[channelIndex], beamAmount)
    );
    const edgeFade = constrain(1 - abs(localX) / (spread * 1.02), 0, 1);
    const alpha = (22 + expansion * 28 + beamAmount * 36) * edgeFade * (0.72 + afterflow * 0.3);
    const size = 0.7 + noise(seed + 14.1) * 1.7 + beamAmount * 0.9;

    fill(...colour, alpha);
    ellipse(px, py, size * (1 + beamAmount * 0.18), size);
  }
}

function drawSoftGlow(cx, cy, r, sy, amount) {
  drawingContext.save();
  drawingContext.filter = "blur(28px)";

  noStroke();
  fill(196, 210, 181, 24 + amount * 18);
  ellipse(cx, cy, r * 2.1, r * 2.1 * sy);

  fill(236, 221, 184, 14 + amount * 10);
  ellipse(cx, cy, r * 1.25, r * 1.25 * sy);

  drawingContext.restore();
}

function drawWaterBody(cx, cy, r, sy, amount) {
  noStroke();

  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const rr = r * (1 - t * 0.72);

    fill(
      lerp(28, 78, amount),
      lerp(47, 93, amount),
      lerp(43, 74, amount),
      34 - t * 2
    );

    ellipse(cx, cy, rr * 2, rr * 2 * sy);
  }
}

function drawRippleLines(cx, cy, r, sy, amount) {
  noFill();

  const count = 12;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const rr = r * (0.18 + t * 0.9);
    const alpha = (1 - t * 0.55) * (32 + amount * 34);

    stroke(225, 226, 207, alpha);
    strokeWeight(lerp(0.35, 1.2, 1 - t));

    beginShape();

    for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / 150) {
      const n = noise(
        cos(a) * 1.4 + i * 0.16,
        sin(a) * 1.4,
        frameCount * 0.003
      );

      const wave = map(n, 0, 1, 0.965, 1.035);
      const pulse = sin(frameCount * 0.018 + i * 0.55) * 2.5 * amount;

      curveVertex(
        cx + cos(a) * (rr * wave + pulse),
        cy + sin(a) * (rr * wave + pulse) * sy
      );
    }

    endShape(CLOSE);
  }
}

function drawBotanicalEdges(cx, cy, r, sy, amount) {
  const stems = floor(lerp(8, 22, amount));

  for (let i = 0; i < stems; i++) {
    const angle = map(i, 0, stems, -PI * 0.92, PI * 0.92);
    const side = i % 2 === 0 ? -1 : 1;

    const baseX = cx + cos(angle) * r * 0.88;
    const baseY = cy + sin(angle) * r * sy * 0.88;

    const length = lerp(18, 68, amount) * randomSeeded(i, 0.75, 1.15);
    const curve = side * lerp(8, 28, amount);

    stroke(171, 193, 158, 36 + amount * 55);
    strokeWeight(0.8);
    noFill();

    beginShape();
    curveVertex(baseX, baseY);
    curveVertex(baseX, baseY);
    curveVertex(
      baseX + cos(angle - HALF_PI) * curve,
      baseY - length * 0.45
    );
    curveVertex(
      baseX + cos(angle - HALF_PI) * curve * 1.4,
      baseY - length
    );
    endShape();

    noStroke();
    fill(210, 205, 172, 26 + amount * 38);
    ellipse(
      baseX + cos(angle - HALF_PI) * curve * 1.4,
      baseY - length,
      5 + amount * 8,
      2.5 + amount * 5
    );
  }
}

function drawFloatingParticles(cx, cy, r, sy, amount) {
  noStroke();

  for (const p of particles) {
    p.angle += p.speed * (0.6 + amount);

    const px = cx + cos(p.angle) * p.radius * amount;
    const py = cy + sin(p.angle) * p.radius * sy * amount;

    fill(238, 229, 196, p.alpha * amount);
    circle(px, py, p.size);
  }
}

function drawBackground() {
  if (breathingCosmosVariant) {
    background(...breathingCosmosVariant.palette.background);
    return;
  }
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
      if (breathingCosmosVariant) stroke(...breathingCosmosVariant.palette.handLine, 72);
      else stroke(230, 226, 204, 58);
      strokeWeight(0.75);
      noFill();

      for (const [a, b] of HAND_CONNECTIONS) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    noStroke();
    if (breathingCosmosVariant) fill(...breathingCosmosVariant.palette.handPoint, 112);
    else fill(246, 238, 198, 92);
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
  text("BREATHING COSMOS", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 02.00 / BREATHING FIELD", inset, 47);

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
  text("GESTURE STUDY 02.00", left, panel.y + (compact ? 24 : 36));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Breathing Cosmos", left, panel.y + (compact ? 46 : 65));

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
    "A two-hand gesture creates a live field of expansion, contraction and return.",
    left,
    panel.y + 118,
    dividerX - left - 46
  );

  const stepsY = panel.y + 198;
  const gap = 58;
  drawHelpStep("01", "Select Begin, allow the camera, and bring hands together.", left, stepsY);
  drawHelpStep("02", "Open both hands slowly to expand the breathing field.", left, stepsY + gap);
  drawHelpStep("03", "Return to the centre and begin another cycle.", left, stepsY + gap * 2);

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
    "This early study does not save individual traces yet. It establishes the live breathing system that later versions turn into memory.",
    right,
    panel.y + 146,
    rightWidth
  );

  const legendY = panel.y + 246;
  const legendGap = 40;
  drawArchiveLegendRow("01", "DISTANCE", "hands apart", right, legendY, rightWidth);
  drawArchiveLegendRow("02", "SCALE", "field expansion", right, legendY + legendGap, rightWidth);
  drawArchiveLegendRow("03", "RIPPLES", "breathing contours", right, legendY + legendGap * 2, rightWidth);
  drawArchiveLegendRow("04", "PARTICLES", "slow orbital drift", right, legendY + legendGap * 3, rightWidth);

  textAlign(LEFT, TOP);
  fill(174, 191, 166, 125);
  textSize(10);
  text("P  HAND DISPLAY     R  RESET FIELD     ?  HELP", left, panel.buttonY - 37);
}

function drawCompactHelp(panel, left, contentWidth) {
  fill(201, 207, 191, 165);
  textAlign(LEFT, TOP);
  textSize(12);
  textLeading(17);
  text(
    "A live two-hand breathing field. This early study does not save individual traces yet.",
    left,
    panel.y + 86,
    contentWidth
  );

  const stepsY = panel.y + 126;
  const gap = 39;
  drawHelpStep("01", "Begin with both hands together.", left, stepsY);
  drawHelpStep("02", "Open slowly to expand the field.", left, stepsY + gap);
  drawHelpStep("03", "Return and repeat the cycle.", left, stepsY + gap * 2);

  const keyY = stepsY + gap * 3 + 5;
  fill(174, 191, 166, 115);
  textSize(10);
  text("DISTANCE / HANDS APART     SCALE / FIELD EXPANSION", left, keyY);
  text("RIPPLES / BREATHING        PARTICLES / ORBITAL DRIFT", left, keyY + 18);

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
  if (key === "r" || key === "R") resetBreathingField();
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

function resetBreathingField() {
  breath = 0;
  targetBreath = 0;
  mercuryExpansion = 0;
  mercuryVelocity = 0;
  mercuryLastInput = 0;
  mercuryRecentMotion = 0;
  mercuryStillFrames = 0;
  mercuryEcho = 0;
  mercuryEchoPhase = 0;
  cloudExpansion = 0;
  cloudVelocity = 0;
  cloudAfterflow = 0;
  cloudLastInput = 0;
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

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }

  return 1 - pow(-2 * t + 2, 3) / 2;
}
