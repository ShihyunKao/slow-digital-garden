let handPose;
let video;
let hands = [];

let inputMode = "mouse";
let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = true;
let handDisplayMode = 0; // 0 hidden, 1 point, 2 skeleton
let openness = 0;
let targetOpenness = 0;
let canRelease = true;
let blooms = [];
let paperGrain = [];

const OPEN_RATIO = 2.12;
const RESET_RATIO = 1.43;
const TRIGGER_RATIO = 1.66;
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
  randomSeed(705);
  noiseSeed(705);

  for (let i = 0; i < 260; i++) {
    paperGrain.push({
      x: random(width),
      y: random(height),
      size: random(0.4, 1.4),
      alpha: random(2, 9)
    });
  }
}

function draw() {
  drawBackground();

  const metrics = inputMode === "hand" && hands.length > 0
    ? getHandMetrics(hands[0])
    : null;

  targetOpenness = getOpenness(metrics);
  openness = lerp(openness, targetOpenness, 0.15);

  const source = getSourcePoint(metrics);

  if (!showHelp) {
    updateRelease(metrics);
    drawLiveField(source);
    drawHandDisplay(metrics);
    drawHeader();
  }

  drawBloomMemories();

  if (showHelp) drawHelpScreen();
}

function getHandMetrics(hand) {
  const points = hand.keypoints;
  const wrist = points[0];
  const palmWidth = dist(points[5].x, points[5].y, points[17].x, points[17].y);

  if (palmWidth < 1) return null;

  const tips = [4, 8, 12, 16, 20];
  let total = 0;

  for (const index of tips) {
    total += dist(wrist.x, wrist.y, points[index].x, points[index].y);
  }

  return {
    hand,
    points,
    ratio: total / tips.length / palmWidth,
    palm: {
      x: lerp(points[0].x, points[9].x, 0.58),
      y: lerp(points[0].y, points[9].y, 0.58)
    }
  };
}

function getOpenness(metrics) {
  if (inputMode === "mouse") {
    const padding = min(width * 0.12, 145);
    return constrain(map(mouseX, padding, width - padding, 0, 1), 0, 1);
  }

  if (!metrics) return openness * 0.94;

  return constrain(map(metrics.ratio, RESET_RATIO, OPEN_RATIO, 0, 1), 0, 1);
}

function getSourcePoint(metrics) {
  if (inputMode === "mouse") return { x: mouseX, y: mouseY };
  if (metrics) return metrics.palm;
  return null;
}

function updateRelease(metrics) {
  const source = getSourcePoint(metrics);

  if (!source) return;

  const isOpen = inputMode === "mouse"
    ? openness > 0.68
    : metrics && metrics.ratio > TRIGGER_RATIO;

  const isReset = inputMode === "mouse"
    ? openness < 0.32
    : metrics && metrics.ratio < RESET_RATIO;

  if (isOpen && canRelease) {
    addBloom(source.x, source.y);
    canRelease = false;
  }

  if (isReset) canRelease = true;
}

function addBloom(x, y) {
  blooms.push({
    x,
    y,
    age: 0,
    life: random(460, 620),
    radius: random(92, 148),
    aspect: random(0.78, 1.18),
    seed: random(1000),
    strength: random(0.78, 1.12)
  });

  if (blooms.length > 8) blooms.shift();
}

function drawLiveField(point) {
  if (!point || openness < 0.04) return;

  const amount = easeOutCubic(openness);
  const radius = lerp(14, min(width, height) * 0.085, amount);

  drawThermalField(point.x, point.y, radius * 2.15, 165 * amount, 1);
  drawBreathingRings(point.x, point.y, radius, amount, 1, 0);
}

function drawBloomMemories() {
  for (let i = blooms.length - 1; i >= 0; i--) {
    const bloom = blooms[i];
    bloom.age++;

    if (bloom.age > bloom.life) {
      blooms.splice(i, 1);
      continue;
    }

    drawSingleBloom(bloom);
  }
}

function drawSingleBloom(bloom) {
  const t = bloom.age / bloom.life;
  const expand = easeOutCubic(constrain(t * 1.45, 0, 1));
  const fade = 1 - easeInCubic(t);
  const radius = bloom.radius * (0.24 + expand * 0.92);
  const driftX = sin(frameCount * 0.003 + bloom.seed) * 5;
  const driftY = cos(frameCount * 0.002 + bloom.seed) * 3;

  drawThermalField(bloom.x + driftX, bloom.y + driftY, radius * 2.35, 94 * fade * bloom.strength, bloom.aspect);
  drawBreathingRings(bloom.x + driftX, bloom.y + driftY, radius, fade * bloom.strength, bloom.aspect, bloom.seed);
}

function drawBreathingRings(x, y, radius, amount, aspect, seed) {
  noFill();

  for (let ring = 0; ring < 3; ring++) {
    const ringT = ring / 2;
    const phase = frameCount * 0.016 + seed * 0.007 + ring * 1.7;
    const breath = sin(phase) * 0.5 + 0.5;
    const rr = radius * (0.24 + ringT * 0.78) + breath * (3 + ring * 2.2) * amount;
    const alpha = (88 - ring * 18) * amount * (0.74 + breath * 0.26);

    drawingContext.save();
    drawingContext.shadowBlur = ring === 0 ? 16 : 10;
    drawingContext.shadowColor = ring === 0
      ? "rgba(247, 233, 188, 0.52)"
      : "rgba(167, 205, 173, 0.32)";

    stroke(ring === 0 ? color(244, 233, 194, alpha) : color(179, 214, 181, alpha));
    strokeWeight(ring === 0 ? 1.05 : 0.72);

    beginShape();

    for (let angle = 0; angle < TWO_PI + 0.02; angle += TWO_PI / 140) {
      const n = noise(
        seed + cos(angle) * 1.4,
        seed + sin(angle) * 1.4,
        ring * 0.22 + frameCount * 0.0012
      );
      const wobble = map(n, 0, 1, 0.978, 1.022);

      curveVertex(
        x + cos(angle) * rr * wobble,
        y + sin(angle) * rr * aspect * wobble
      );
    }

    endShape(CLOSE);

    drawingContext.restore();
  }
}

function getPressureSources(livePoint) {
  const sources = blooms.map((bloom) => {
    const t = bloom.age / bloom.life;
    const expand = easeOutCubic(constrain(t * 1.45, 0, 1));

    return {
      x: bloom.x,
      y: bloom.y,
      radius: bloom.radius * (0.3 + expand * 0.8),
      strength: (1 - easeInCubic(t)) * 0.55
    };
  });

  if (livePoint && openness > 0.04 && !showHelp) {
    sources.push({
      x: livePoint.x,
      y: livePoint.y,
      radius: lerp(45, min(width, height) * 0.25, openness),
      strength: easeOutCubic(openness)
    });
  }

  return sources;
}

function drawThermalField(x, y, radius, alpha, aspect) {
  drawingContext.save();

  drawingContext.translate(x, y);
  drawingContext.scale(1, aspect);

  const gradient = drawingContext.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, `rgba(244, 224, 164, ${alpha * 0.64 / 255})`);
  gradient.addColorStop(0.13, `rgba(191, 211, 151, ${alpha * 0.5 / 255})`);
  gradient.addColorStop(0.42, `rgba(105, 155, 121, ${alpha * 0.34 / 255})`);
  gradient.addColorStop(1, "rgba(29, 57, 47, 0)");

  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(-radius, -radius, radius * 2, radius * 2);
  drawingContext.restore();
}

function drawPressureSurface(sources) {
  if (sources.length === 0) return;

  const spacing = 46;
  const margin = 42;

  for (let y = margin; y < height - margin; y += spacing) {
    const intensity = fieldIntensity(width * 0.5, y, sources);
    stroke(182, 204, 180, 5 + intensity * 17);
    strokeWeight(0.45);
    noFill();
    beginShape();

    for (let x = margin; x <= width - margin; x += 14) {
      const offset = fieldOffset(x, y, sources);
      curveVertex(x + offset.x, y + offset.y);
    }

    endShape();
  }

  for (let x = margin; x < width - margin; x += spacing) {
    const intensity = fieldIntensity(x, height * 0.5, sources);
    stroke(182, 204, 180, 4 + intensity * 14);
    strokeWeight(0.4);
    noFill();
    beginShape();

    for (let y = margin; y <= height - margin; y += 14) {
      const offset = fieldOffset(x, y, sources);
      curveVertex(x + offset.x, y + offset.y);
    }

    endShape();
  }
}

function fieldIntensity(x, y, sources) {
  let total = 0;

  for (const source of sources) {
    const d = dist(x, y, source.x, source.y);
    total += exp(-(d * d) / (source.radius * source.radius)) * source.strength;
  }

  return constrain(total, 0, 1);
}

function fieldOffset(x, y, sources) {
  let offsetX = 0;
  let offsetY = 0;

  for (const source of sources) {
    const dx = x - source.x;
    const dy = y - source.y;
    const d = max(sqrt(dx * dx + dy * dy), 1);
    const influence = exp(-(d * d) / (source.radius * source.radius)) * source.strength;
    const pressure = influence * 20;

    offsetX += (dx / d) * pressure;
    offsetY += (dy / d) * pressure;
  }

  return { x: offsetX, y: offsetY };
}

function drawHandDisplay(metrics) {
  if (inputMode === "mouse" || !metrics || handDisplayMode === 0) return;

  const points = metrics.points;

  if (handDisplayMode === 2) {
    noFill();
    stroke(230, 226, 204, 58);
    strokeWeight(0.75);

    for (const [a, b] of HAND_CONNECTIONS) {
      line(points[a].x, points[a].y, points[b].x, points[b].y);
    }
  }

  const visible = handDisplayMode === 1 ? [9] : points.map((_, index) => index);
  noStroke();
  fill(246, 238, 198, 78);

  for (const index of visible) {
    circle(points[index].x, points[index].y, handDisplayMode === 1 ? 7 : 4);
  }
}

function drawBackground() {
  background(9, 19, 17);
  noStroke();

  for (let y = 0; y < height; y += 5) {
    fill(30, 45, 39, map(y, 0, height, 18, 3));
    rect(0, y, width, 5);
  }

  for (const grain of paperGrain) {
    fill(210, 213, 190, grain.alpha);
    circle(grain.x, grain.y, grain.size);
  }

  fill(240, 232, 205, 5);
  rect(34, 34, width - 68, height - 68);
}

function drawHeader() {
  const inset = 38;
  const display = ["HIDDEN", "POINT", "SKELETON"][handDisplayMode];
  const input = modelLoading ? "LOADING" : inputMode === "mouse" ? "CAMERA" : "MOUSE";

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("PRESSURE BLOOM", inset, 27);

  fill(196, 207, 188, 100);
  textSize(10);
  text("GESTURE STUDY 05 / OPEN PALM PRESSURE FIELD", inset, 47);

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
  text("GESTURE STUDY 05", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Pressure Bloom", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "An opening palm becomes a soft pressure field. Each release leaves a circular memory that slowly dissipates.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const gap = compact ? 42 : 54;
  drawHelpStep("01", "Press M to enable the camera.", left, stepsY);
  drawHelpStep("02", "Open one palm slowly to create a pressure field.", left, stepsY + gap);
  drawHelpStep("03", "Close, then open again to leave another memory.", left, stepsY + gap * 2);

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

  if (key === "r" || key === "R") {
    blooms = [];
    canRelease = true;
  }
}

function mousePressed() {
  if (!showHelp) return;

  const panel = getHelpPanelMetrics();
  const insideButton =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  if (insideButton) showHelp = false;
}

function startHandMode() {
  inputMode = "hand";
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
