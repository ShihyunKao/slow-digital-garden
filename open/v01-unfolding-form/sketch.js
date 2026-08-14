let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = false;
let handDisplayMode = 1; // Default POINTS; P cycles POINTS → SKELETON → HIDDEN
let openness = 0;
let targetOpenness = 0;
let backgroundPoints = [];
let lastRecognitionLabel = "";
let accumulationLayer = null;
let lastTrackedHand = null;
let lastTrackedAt = 0;

const OPEN_V01_DEFAULT_STYLE = {
  id: "v01.00",
  name: "Unfolding Form",
  palette: {
    graphite: [171, 194, 154],
    graphiteSoft: [171, 194, 154],
    warmTrace: [214, 191, 158],
    hand: [240, 231, 194],
    centre: [225, 220, 195]
  },
  lineCount: 94,
  lineWeight: [0.45, 0.8],
  traceAlpha: [14, 82],
  warmTraceInterval: 5,
  maximumLengthScale: 0.68,
  glowBlur: 0,
  glowColour: [171, 194, 154],
  compositeOperation: "source-over",
  persistentCanvas: false,
  paperColour: [0, 0, 0],
  backgroundAlpha: 0,
  vertexNoise: 0,
  vertexNoiseSpeed: 0,
  centreAlpha: [110, 85],
  handAlpha: [62, 45, 72],
  accumulationInterval: 1,
  accumulationNoiseSpeed: 0,
  accumulationAngleJitter: 0,
  accumulationLengthJitter: 0,
  accumulationCenterWander: 0,
  accumulationLineDropout: 0,
  accumulationContourWarp: 0,
  recognitionFeedback: false,
  liveLineCount: 0,
  liveTraceAlpha: [0, 0],
  opennessRange: [1.15, 2.65],
  opennessSmoothing: 0.06,
  trackingGraceMs: 0,
  curveSteps: 28,
  liveCurveSteps: 28,
  driftScale: 1,
  lengthVariation: [0.72, 0.38],
  liveDriftScale: 1,
  liveLengthVariation: [0.72, 0.38],
  liveContourWarp: 0,
  liveRoughnessScale: 0.72,
  liveLineWeight: [0.42, 0.48],
  liveColour: null,
  liveCentreAlpha: [0, 0],
  liveCentreSize: [0, 0],
  liveCompositeOperation: "source-over",
  apertureEffect: false,
  apertureRingCount: 0,
  apertureParticleCount: 0,
  apertureMaxScale: 0,
  apertureUseDiagonal: false,
  apertureGlowBlur: 0,
  aperturePulseSpeed: 1,
  apertureWaveStrength: 0,
  apertureWaveSpeed: 1
};

const OPEN_V01_VARIANT_STYLE = window.OPEN_V01_VARIANT || {};
const OPEN_V01_STYLE = {
  ...OPEN_V01_DEFAULT_STYLE,
  ...OPEN_V01_VARIANT_STYLE,
  palette: {
    ...OPEN_V01_DEFAULT_STYLE.palette,
    ...(OPEN_V01_VARIANT_STYLE.palette || {})
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

const TIP_INDICES = [4, 8, 12, 16, 20];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  randomSeed(5);
  noiseSeed(5);

  if (OPEN_V01_STYLE.persistentCanvas) initialiseAccumulationLayer();

  for (let i = 0; i < 100; i++) {
    backgroundPoints.push({
      x: random(width),
      y: random(height),
      size: random(0.5, 1.7),
      alpha: random(4, 16),
      phase: random(TWO_PI)
    });
  }

  const helpReturn = document.getElementById("open-v01-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  startHandMode();
}

function draw() {
  const freshHand = hands.length > 0 ? hands[0] : null;

  if (freshHand) {
    lastTrackedHand = freshHand;
    lastTrackedAt = millis();
  }

  const hand = freshHand ||
    (millis() - lastTrackedAt < OPEN_V01_STYLE.trackingGraceMs ? lastTrackedHand : null);
  targetOpenness = hand ? getHandOpenness(hand) : openness * 0.94;
  openness = lerp(openness, targetOpenness, OPEN_V01_STYLE.opennessSmoothing);
  syncRecognitionFeedback(hand, openness);

  if (OPEN_V01_STYLE.persistentCanvas) {
    fadeAccumulationLayer();

    if (!showHelp && frameCount % OPEN_V01_STYLE.accumulationInterval === 0) {
      drawAccumulatingForm(width / 2, height * 0.55, openness);
    }

    clear();
    image(accumulationLayer, 0, 0, width, height);

    if (!showHelp) {
      if (hand || openness > 0.025) drawLiveResponse(width / 2, height * 0.55, openness);
      drawTechnicalHand(hand);
    }
  } else {
    drawBackground();

    if (!showHelp) {
      drawUnfoldingForm(width / 2, height * 0.55, openness);
      drawTechnicalHand(hand);
    }
  }

  syncHelpOverlay();
}

function getHandOpenness(hand) {
  const points = hand.keypoints;
  const wrist = points[0];
  const palmSize = dist(points[5].x, points[5].y, points[17].x, points[17].y);

  if (palmSize < 1) return 0;

  let totalDistance = 0;

  for (const index of TIP_INDICES) {
    totalDistance += dist(wrist.x, wrist.y, points[index].x, points[index].y);
  }

  const ratio = totalDistance / TIP_INDICES.length / palmSize;
  return constrain(
    map(ratio, OPEN_V01_STYLE.opennessRange[0], OPEN_V01_STYLE.opennessRange[1], 0, 1),
    0,
    1
  );
}

function drawUnfoldingForm(centerX, centerY, amount) {
  const lineCount = OPEN_V01_STYLE.lineCount;
  const time = frameCount * 0.0035;
  const maximumLength = min(width, height) * OPEN_V01_STYLE.maximumLengthScale;
  const glowColour = OPEN_V01_STYLE.glowColour || OPEN_V01_STYLE.palette.graphite;
  const usesMultiply = OPEN_V01_STYLE.compositeOperation === "multiply";

  if (OPEN_V01_STYLE.apertureEffect) {
    drawAperturePulse(centerX, centerY, amount);
  }

  if (usesMultiply) blendMode(MULTIPLY);

  drawingContext.save();
  drawingContext.globalCompositeOperation = OPEN_V01_STYLE.compositeOperation || "source-over";
  drawingContext.shadowBlur = (OPEN_V01_STYLE.glowBlur || 0) * amount;
  drawingContext.shadowColor = `rgba(${glowColour.join(",")},${0.3 + amount * 0.55})`;

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * TWO_PI;
    const variation = noise(i * 0.13);
    const length = lerp(7, maximumLength, amount) *
      (OPEN_V01_STYLE.lengthVariation[0] + variation * OPEN_V01_STYLE.lengthVariation[1]);

    const warmTrace = i % OPEN_V01_STYLE.warmTraceInterval === 0;
    const traceColour = warmTrace
      ? OPEN_V01_STYLE.palette.warmTrace
      : (i % 3 === 0 ? OPEN_V01_STYLE.palette.graphiteSoft : OPEN_V01_STYLE.palette.graphite);
    const traceAlpha = OPEN_V01_STYLE.traceAlpha[0] + amount * OPEN_V01_STYLE.traceAlpha[1];

    if (warmTrace) {
      stroke(...traceColour, traceAlpha * 0.84);
    } else {
      stroke(...traceColour, traceAlpha);
    }

    strokeWeight(OPEN_V01_STYLE.lineWeight[0] + variation * OPEN_V01_STYLE.lineWeight[1]);
    noFill();
    beginShape();

    for (let step = 0; step <= OPEN_V01_STYLE.curveSteps; step++) {
      const progress = step / OPEN_V01_STYLE.curveSteps;
      const radius = length * progress;
      const drift =
        sin(progress * PI * 1.4 + angle * 3 + time * 4 + variation * TWO_PI) *
        (3 + amount * 28) * OPEN_V01_STYLE.driftScale *
        sin(progress * PI);

      const roughness = (OPEN_V01_STYLE.vertexNoise || 0) * (0.28 + amount * 0.72);
      const noiseTime = frameCount * (OPEN_V01_STYLE.vertexNoiseSpeed || 0);
      const roughX =
        (noise(i * 0.31 + 19, step * 0.23 + 7, noiseTime) - 0.5) *
        roughness * 2;
      const roughY =
        (noise(i * 0.29 + 73, step * 0.19 + 41, noiseTime) - 0.5) *
        roughness * 2;

      curveVertex(
        centerX + cos(angle) * radius - sin(angle) * drift + roughX,
        centerY + sin(angle) * radius + cos(angle) * drift + roughY
      );
    }

    endShape();
  }

  drawingContext.restore();
  if (usesMultiply) blendMode(BLEND);

  noStroke();
  fill(
    ...OPEN_V01_STYLE.palette.centre,
    OPEN_V01_STYLE.centreAlpha[0] + amount * OPEN_V01_STYLE.centreAlpha[1]
  );
  circle(centerX, centerY, lerp(9, 21, amount));
}

function drawAperturePulse(centerX, centerY, amount) {
  const openEase = amount * amount * (3 - 2 * amount);
  if (openEase < 0.006) return;
  const effectPresence = pow(openEase, 0.48);

  const speed = OPEN_V01_STYLE.aperturePulseSpeed;
  const cycle = (frameCount * 0.009 * speed) % 1;
  const primaryBeat = exp(-pow((cycle - 0.14) / 0.055, 2));
  const secondaryBeat = exp(-pow((cycle - 0.31) / 0.085, 2)) * 0.58;
  const breathRaw = (sin(frameCount * 0.024 * speed - HALF_PI) + 1) * 0.5;
  const breathEase = breathRaw * breathRaw * (3 - 2 * breathRaw);
  const heartbeatEase = constrain(primaryBeat + secondaryBeat, 0, 1);
  const pulse = 0.82 + breathEase * 0.12 + heartbeatEase * 0.12;
  const apertureBasis = OPEN_V01_STYLE.apertureUseDiagonal
    ? sqrt(width * width + height * height)
    : min(width, height);
  const maximumRadius = apertureBasis * OPEN_V01_STYLE.apertureMaxScale * openEase;
  const glowRadius = max(22, maximumRadius * (0.34 + pulse * 0.12));
  const glowColour = OPEN_V01_STYLE.glowColour;

  drawingContext.save();
  drawingContext.globalCompositeOperation = "lighter";

  const coreGlow = drawingContext.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    glowRadius
  );
  coreGlow.addColorStop(0, `rgba(239,253,255,${0.28 + effectPresence * 0.28})`);
  coreGlow.addColorStop(0.18, `rgba(${glowColour.join(",")},${0.18 + effectPresence * 0.24})`);
  coreGlow.addColorStop(0.55, `rgba(${glowColour.join(",")},${0.06 + effectPresence * 0.1})`);
  coreGlow.addColorStop(1, `rgba(${glowColour.join(",")},0)`);
  drawingContext.fillStyle = coreGlow;
  drawingContext.beginPath();
  drawingContext.arc(centerX, centerY, glowRadius, 0, TWO_PI);
  drawingContext.fill();

  noFill();
  drawingContext.shadowColor = `rgba(${glowColour.join(",")},${0.38 + effectPresence * 0.4})`;
  drawingContext.shadowBlur = OPEN_V01_STYLE.apertureGlowBlur * effectPresence * pulse;

  for (let ring = 0; ring < OPEN_V01_STYLE.apertureRingCount; ring++) {
    const ringPhase = (
      frameCount * 0.0025 * speed + ring / OPEN_V01_STYLE.apertureRingCount
    ) % 1;
    const easedPhase = ringPhase * ringPhase * (3 - 2 * ringPhase);
    const breathingScale = 0.985 + breathEase * 0.018 + heartbeatEase * 0.008;
    const radius = lerp(14, maximumRadius, easedPhase) * breathingScale;
    const fadeEnvelope = pow(sin(ringPhase * PI), 1.35);
    const visibilityCompensation = lerp(1.55, 1, effectPresence);
    const fade = fadeEnvelope * effectPresence * visibilityCompensation;
    const centreDrift = maximumRadius * 0.0035 * fadeEnvelope;
    const ringCenterX = centerX + sin(ring * 1.73 + frameCount * 0.0031) * centreDrift;
    const ringCenterY = centerY + cos(ring * 1.29 + frameCount * 0.0027) * centreDrift;

    stroke(...glowColour, fade * (42 + heartbeatEase * 18));
    strokeWeight(0.32 + fade * 0.58);
    noFill();
    beginShape();

    const ringSegments = 112;
    for (let segment = 0; segment < ringSegments; segment++) {
      const theta = segment / ringSegments * TWO_PI;
      const waveTime = frameCount * OPEN_V01_STYLE.apertureWaveSpeed;
      const travellingWave = sin(theta * 3 - waveTime * 0.012 + ring * 0.72);
      const crossingWave = sin(theta * 7 + waveTime * 0.006 - ring * 0.41) * 0.38;
      const broadSwell = sin(theta - waveTime * 0.003 + ring * 1.13) * 0.2;
      const waveOffset =
        (travellingWave + crossingWave + broadSwell) *
        OPEN_V01_STYLE.apertureWaveStrength *
        lerp(1.9, 1, effectPresence) *
        fadeEnvelope;
      const organicRadius = radius * (1 + waveOffset);
      vertex(
        ringCenterX + cos(theta) * organicRadius,
        ringCenterY + sin(theta) * organicRadius
      );
    }

    endShape(CLOSE);
  }

  const particleCount = OPEN_V01_STYLE.apertureParticleCount;
  drawingContext.lineCap = "round";

  for (let particle = 0; particle < particleCount; particle++) {
    const angleNoise = noise(particle * 0.137, 31) * 0.34 - 0.17;
    const angle = particle / particleCount * TWO_PI * 7 + angleNoise;
    const phase = (
      frameCount * (0.0026 + (particle % 9) * 0.00009) * speed +
      (particle * 0.61803398875) % 1
    ) % 1;
    const easedPhase = 1 - pow(1 - phase, 1.8);
    const particleBreathScale = 0.99 + breathEase * 0.015 + heartbeatEase * 0.008;
    const radius = lerp(
      8,
      maximumRadius * (0.84 + (particle % 7) * 0.022),
      easedPhase
    ) * particleBreathScale;
    const streak = lerp(2, 10, openEase) * (0.55 + heartbeatEase * 0.65);
    const x = centerX + cos(angle) * radius;
    const y = centerY + sin(angle) * radius;
    const previousX = centerX + cos(angle) * max(0, radius - streak);
    const previousY = centerY + sin(angle) * max(0, radius - streak);
    const fade = pow(1 - phase, 1.2) * effectPresence;

    stroke(...glowColour, 14 + fade * (92 + heartbeatEase * 48));
    strokeWeight(0.4 + fade * 0.8);
    line(previousX, previousY, x, y);

    if (particle % 13 === 0) {
      noStroke();
      fill(231, 250, 255, 30 + fade * 150);
      circle(x, y, 1.2 + fade * 1.6);
    }
  }

  drawingContext.restore();
}

function initialiseAccumulationLayer() {
  accumulationLayer = createGraphics(width, height);
  accumulationLayer.pixelDensity(1);
  accumulationLayer.background(...OPEN_V01_STYLE.paperColour);
}

function fadeAccumulationLayer() {
  if (!accumulationLayer) initialiseAccumulationLayer();

  accumulationLayer.push();
  accumulationLayer.blendMode(BLEND);
  accumulationLayer.noStroke();
  accumulationLayer.fill(...OPEN_V01_STYLE.paperColour, OPEN_V01_STYLE.backgroundAlpha);
  accumulationLayer.rect(0, 0, accumulationLayer.width, accumulationLayer.height);
  accumulationLayer.pop();
}

function drawAccumulatingForm(centerX, centerY, amount) {
  const layer = accumulationLayer;
  const lineCount = OPEN_V01_STYLE.lineCount;
  const time = frameCount * 0.0035;
  const accumulationTime = frameCount * OPEN_V01_STYLE.accumulationNoiseSpeed;
  const maximumLength = min(width, height) * OPEN_V01_STYLE.maximumLengthScale;
  const wanderingCenterX = centerX +
    (noise(811, accumulationTime) - 0.5) * OPEN_V01_STYLE.accumulationCenterWander;
  const wanderingCenterY = centerY +
    (noise(977, accumulationTime) - 0.5) * OPEN_V01_STYLE.accumulationCenterWander;
  const rotationDrift =
    (noise(613, accumulationTime * 0.72) - 0.5) *
    OPEN_V01_STYLE.accumulationAngleJitter;

  layer.push();
  layer.blendMode(MULTIPLY);
  layer.noFill();

  for (let i = 0; i < lineCount; i++) {
    if (random() < OPEN_V01_STYLE.accumulationLineDropout) continue;

    const baseAngle = (i / lineCount) * TWO_PI;
    const angleNoise =
      (noise(i * 0.31 + 347, accumulationTime * 1.13) - 0.5) *
      OPEN_V01_STYLE.accumulationAngleJitter;
    const angle = baseAngle + rotationDrift + angleNoise;
    const variation = noise(i * 0.13);
    const contourScale = getOrganicContourScale(
      baseAngle,
      OPEN_V01_STYLE.accumulationContourWarp
    );
    const temporalLength = 1 +
      (noise(i * 0.19 + 521, accumulationTime * 0.84) - 0.5) *
      OPEN_V01_STYLE.accumulationLengthJitter;
    const length = lerp(7, maximumLength, amount) *
      (OPEN_V01_STYLE.lengthVariation[0] + variation * OPEN_V01_STYLE.lengthVariation[1]) *
      contourScale *
      temporalLength;
    const warmTrace = i % OPEN_V01_STYLE.warmTraceInterval === 0;
    const traceColour = warmTrace
      ? OPEN_V01_STYLE.palette.warmTrace
      : (i % 3 === 0 ? OPEN_V01_STYLE.palette.graphiteSoft : OPEN_V01_STYLE.palette.graphite);
    const traceAlpha = OPEN_V01_STYLE.traceAlpha[0] + amount * OPEN_V01_STYLE.traceAlpha[1];

    layer.stroke(...traceColour, warmTrace ? traceAlpha * 0.84 : traceAlpha);
    layer.strokeWeight(OPEN_V01_STYLE.lineWeight[0] + variation * OPEN_V01_STYLE.lineWeight[1]);
    layer.beginShape();

    for (let step = 0; step <= OPEN_V01_STYLE.curveSteps; step++) {
      const progress = step / OPEN_V01_STYLE.curveSteps;
      const radius = length * progress;
      const drift =
        sin(progress * PI * 1.4 + angle * 3 + time * 4 + variation * TWO_PI) *
        (3 + amount * 28) * OPEN_V01_STYLE.driftScale *
        sin(progress * PI);
      const roughness = OPEN_V01_STYLE.vertexNoise * (0.28 + amount * 0.72);
      const noiseTime = frameCount * OPEN_V01_STYLE.vertexNoiseSpeed;
      const roughX =
        (noise(i * 0.31 + 19, step * 0.23 + 7, noiseTime) - 0.5) * roughness * 2;
      const roughY =
        (noise(i * 0.29 + 73, step * 0.19 + 41, noiseTime) - 0.5) * roughness * 2;

      layer.curveVertex(
        wanderingCenterX + cos(angle) * radius - sin(angle) * drift + roughX,
        wanderingCenterY + sin(angle) * radius + cos(angle) * drift + roughY
      );
    }

    layer.endShape();
  }

  layer.noStroke();
  layer.fill(
    ...OPEN_V01_STYLE.palette.centre,
    OPEN_V01_STYLE.centreAlpha[0] + amount * OPEN_V01_STYLE.centreAlpha[1]
  );
  layer.circle(wanderingCenterX, wanderingCenterY, lerp(9, 21, amount));
  layer.pop();
}

function drawLiveResponse(centerX, centerY, amount) {
  const lineCount = OPEN_V01_STYLE.liveLineCount;
  const time = frameCount * 0.0035;
  const maximumLength = min(width, height) * OPEN_V01_STYLE.maximumLengthScale;
  const liveColour = OPEN_V01_STYLE.liveColour || OPEN_V01_STYLE.palette.graphiteSoft;
  const usesMultiply = OPEN_V01_STYLE.liveCompositeOperation === "multiply";
  const traceAlpha = OPEN_V01_STYLE.liveTraceAlpha[0] +
    amount * OPEN_V01_STYLE.liveTraceAlpha[1];

  blendMode(usesMultiply ? MULTIPLY : BLEND);
  drawingContext.save();
  drawingContext.globalCompositeOperation = OPEN_V01_STYLE.liveCompositeOperation;
  noFill();

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * TWO_PI;
    const variation = noise(i * 0.13);
    const contourScale = getOrganicContourScale(angle, OPEN_V01_STYLE.liveContourWarp);
    const length = lerp(7, maximumLength, amount) *
      (OPEN_V01_STYLE.liveLengthVariation[0] +
        variation * OPEN_V01_STYLE.liveLengthVariation[1]) *
      contourScale;

    stroke(...liveColour, traceAlpha);
    strokeWeight(
      OPEN_V01_STYLE.liveLineWeight[0] + variation * OPEN_V01_STYLE.liveLineWeight[1]
    );
    beginShape();

    for (let step = 0; step <= OPEN_V01_STYLE.liveCurveSteps; step++) {
      const progress = step / OPEN_V01_STYLE.liveCurveSteps;
      const radius = length * progress;
      const drift =
        sin(progress * PI * 1.4 + angle * 3 + time * 4 + variation * TWO_PI) *
        (3 + amount * 28) * OPEN_V01_STYLE.liveDriftScale *
        sin(progress * PI);
      const roughness = OPEN_V01_STYLE.vertexNoise * OPEN_V01_STYLE.liveRoughnessScale;
      const noiseTime = frameCount * OPEN_V01_STYLE.vertexNoiseSpeed;
      const roughX =
        (noise(i * 0.31 + 113, step * 0.23 + 37, noiseTime) - 0.5) * roughness * 2;
      const roughY =
        (noise(i * 0.29 + 173, step * 0.19 + 81, noiseTime) - 0.5) * roughness * 2;

      curveVertex(
        centerX + cos(angle) * radius - sin(angle) * drift + roughX,
        centerY + sin(angle) * radius + cos(angle) * drift + roughY
      );
    }

    endShape();
  }

  drawingContext.restore();
  blendMode(BLEND);

  if (OPEN_V01_STYLE.liveCentreSize[1] > 0) {
    noStroke();
    fill(
      ...liveColour,
      OPEN_V01_STYLE.liveCentreAlpha[0] + amount * OPEN_V01_STYLE.liveCentreAlpha[1]
    );
    circle(
      centerX,
      centerY,
      lerp(OPEN_V01_STYLE.liveCentreSize[0], OPEN_V01_STYLE.liveCentreSize[1], amount)
    );
  }
}

function getOrganicContourScale(angle, strength) {
  if (!strength) return 1;

  const contourNoise = noise(
    43 + cos(angle) * 0.92,
    71 + sin(angle) * 0.92
  );
  const broadShape = constrain(map(contourNoise, 0.32, 0.68, -1, 1), -1, 1);
  const lobes =
    sin(angle * 2 - 0.72) * 0.44 +
    sin(angle * 3 + 1.56) * 0.27 +
    sin(angle * 5 - 0.18) * 0.12;

  return constrain(1 + (broadShape * 0.72 + lobes) * strength, 0.58, 1.42);
}

function drawTechnicalHand(hand) {
  if (!hand || handDisplayMode === 0) return;

  const points = hand.keypoints;

  if (handDisplayMode === 1) {
    noStroke();
    fill(...OPEN_V01_STYLE.palette.hand, OPEN_V01_STYLE.handAlpha[0]);

    for (const index of TIP_INDICES) {
      circle(points[index].x, points[index].y, 3.5);
    }

    return;
  }

  noFill();
  stroke(...OPEN_V01_STYLE.palette.hand, OPEN_V01_STYLE.handAlpha[1]);
  strokeWeight(0.7);

  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(...OPEN_V01_STYLE.palette.hand, OPEN_V01_STYLE.handAlpha[2]);

  for (const point of points) {
    circle(point.x, point.y, 3.5);
  }
}

function drawBackground() {
  clear();
}

function syncRecognitionFeedback(hand, amount) {
  if (!OPEN_V01_STYLE.recognitionFeedback) return;

  const input = document.querySelector(".live-input");
  if (!input) return;

  let state = "searching";
  let label = "LIVE FIELD · SEARCHING FOR PALM · P HAND DISPLAY · ? HELP";
  let level = 0;

  if (modelLoading || !modelReady || !videoReady) {
    state = "loading";
    label = "LIVE FIELD · CAMERA LOADING · P HAND DISPLAY · ? HELP";
  } else if (hand) {
    state = "active";
    level = Math.round(amount * 20) * 5;
    label = `LIVE FIELD · PALM DETECTED · OPENNESS ${level}% · P HAND DISPLAY · ? HELP`;
  }

  if (label !== lastRecognitionLabel) {
    input.textContent = label;
    lastRecognitionLabel = label;
  }

  input.dataset.recognition = state;
  input.style.setProperty("--recognition-level", `${level}%`);
}

function drawHeader() {
  const inset = 38;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("UNFOLDING FORM", inset, 27);

  fill(196, 207, 188, 100);
  textSize(10);
  text("GESTURE STUDY 01.00 / OPEN PALM RADIANCE", inset, 47);

  textAlign(RIGHT, TOP);
  fill(206, 212, 196, 120);
  textSize(11);
  text(`${modelLoading ? "CAMERA LOADING · " : ""}P ${display} · ? HELP`, width - inset, 30);

  stroke(232, 229, 210, 20);
  strokeWeight(1);
  line(inset, 70, width - inset, 70);
}

function syncHelpOverlay() {
  const overlay = document.getElementById("open-v01-help");
  if (!overlay) return;

  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
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

  if ((key === "r" || key === "R") && OPEN_V01_STYLE.persistentCanvas) {
    initialiseAccumulationLayer();
    return false;
  }

  if (key === "p" || key === "P") {
    handDisplayMode = (handDisplayMode + 1) % 3;
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
  if (OPEN_V01_STYLE.persistentCanvas) initialiseAccumulationLayer();
  if (video) video.size(width, height);
}
