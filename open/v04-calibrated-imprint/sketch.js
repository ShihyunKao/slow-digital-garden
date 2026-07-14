let handPose, video;
let hands = [];
let inputMode = "mouse";
let modelReady = false, videoReady = false, detectionStarted = false, modelLoading = false;

let showHelp = true;
let handDisplayMode = 1;
let imprints = [], driftStars = [];
let openness = 0, targetOpenness = 0;
let canStamp = true, openHoldFrames = 0, stampProgress = 0;

const OPEN_RATIO = 2.12;
const TRIGGER_RATIO = 1.66;
const RESET_RATIO = 1.43;
const HOLD_FRAMES = 18;

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
  randomSeed(531); noiseSeed(531);
  for (let i = 0; i < 95; i++) {
    driftStars.push({ x: random(width), y: random(height), size: random(0.7, 2.1), alpha: random(9, 31), speed: random(0.03, 0.13) });
  }
}

function draw() {
  drawBackground();
  const metrics = inputMode === "hand" && hands.length > 0 ? getHandMetrics(hands[0]) : null;

  targetOpenness = getOpenness(metrics);
  openness = lerp(openness, targetOpenness, 0.16);

  if (!showHelp) updateStamp(metrics);

  drawImprints();
  drawHandDisplay(metrics);
  drawInterface();
}

function getHandMetrics(hand) {
  const points = hand.keypoints;
  const wrist = points[0];
  const palmWidth = dist(points[5].x, points[5].y, points[17].x, points[17].y);
  if (palmWidth < 1) return null;

  const tipIndexes = [4, 8, 12, 16, 20];
  let tipDistance = 0;
  for (const index of tipIndexes) tipDistance += dist(wrist.x, wrist.y, points[index].x, points[index].y);

  return {
    hand,
    points,
    ratio: tipDistance / tipIndexes.length / palmWidth
  };
}

function getOpenness(metrics) {
  if (inputMode === "mouse") {
    const padding = min(width * 0.12, 145);
    return constrain(map(mouseX, padding, width - padding, 0, 1), 0, 1);
  }
  if (!metrics) return openness * 0.95;
  return constrain(map(metrics.ratio, RESET_RATIO, OPEN_RATIO, 0, 1), 0, 1);
}

function updateStamp(metrics) {
  if (inputMode === "mouse") {
    if (openness > 0.72 && canStamp) {
      addMouseImprint();
      canStamp = false;
    }
    if (openness < 0.3) canStamp = true;
    stampProgress = 0;
    return;
  }

  if (!metrics) {
    openHoldFrames = 0;
    stampProgress = 0;
    return;
  }

  if (metrics.ratio > TRIGGER_RATIO && canStamp) {
    openHoldFrames++;
    stampProgress = constrain(openHoldFrames / HOLD_FRAMES, 0, 1);
    if (openHoldFrames >= HOLD_FRAMES) {
      addHandImprint(metrics.hand);
      canStamp = false;
      openHoldFrames = 0;
      stampProgress = 0;
    }
  } else if (metrics.ratio < RESET_RATIO) {
    canStamp = true;
    openHoldFrames = 0;
    stampProgress = 0;
  } else {
    openHoldFrames = 0;
    stampProgress = 0;
  }
}

function addMouseImprint() {
  const cx = width / 2, cy = height / 2 + 24;
  const spread = min(width * 0.11, 105);
  const lift = min(height * 0.25, 160);
  addImprint([
    { x: cx - spread, y: cy - lift * 0.54 }, { x: cx - spread * 0.54, y: cy - lift * 0.86 },
    { x: cx, y: cy - lift }, { x: cx + spread * 0.54, y: cy - lift * 0.86 },
    { x: cx + spread, y: cy - lift * 0.54 }, { x: cx, y: cy }
  ]);
}

function addHandImprint(hand) {
  const points = [4, 8, 12, 16, 20, 0].map(index => ({ x: hand.keypoints[index].x, y: hand.keypoints[index].y }));
  addImprint(points);
}

function addImprint(points) {
  const center = {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
  const particles = [];
  for (let i = 0; i < 145; i++) {
    const source = random(points), angle = random(TWO_PI), distance = random(4, 68);
    particles.push({
      x: source.x + cos(angle) * distance * random(0.15, 1), y: source.y + sin(angle) * distance * random(0.15, 0.78),
      vx: random(-0.09, 0.09), vy: random(-0.14, 0.02), size: random(0.8, 3.3), alpha: random(28, 88), seed: random(1000)
    });
  }
  imprints.push({ points, center, particles, age: 0, life: 760, rotation: random(-0.04, 0.04), scale: random(0.96, 1.04), flash: 1 });
  if (imprints.length > 7) imprints.shift();
}

function drawImprints() {
  for (let i = imprints.length - 1; i >= 0; i--) {
    const imprint = imprints[i]; imprint.age++; imprint.flash *= 0.94;
    if (imprint.age > imprint.life) { imprints.splice(i, 1); continue; }
    const t = imprint.age / imprint.life;
    const fade = 1 - easeInCubic(t);
    const appear = easeOutCubic(constrain(t * 5, 0, 1));
    push(); translate(imprint.center.x, imprint.center.y); rotate(imprint.rotation); scale(imprint.scale); translate(-imprint.center.x, -imprint.center.y);
    drawPalmAura(imprint, fade, appear);
    drawPalmLines(imprint, fade, appear);
    drawPalmParticles(imprint, fade, appear);
    pop();
  }
}

function drawPalmAura(imprint, fade, appear) {
  const pts = imprint.points;
  drawingContext.save(); drawingContext.filter = "blur(24px)";
  noStroke(); fill(103, 134, 112, 22 * fade * appear + imprint.flash * 22);
  beginShape();
  for (let i = 0; i < 5; i++) curveVertex(pts[i].x, pts[i].y);
  curveVertex(pts[5].x, pts[5].y + 26); curveVertex(pts[0].x, pts[0].y); endShape(CLOSE);
  drawingContext.restore();
}

function drawPalmLines(imprint, fade, appear) {
  const pts = imprint.points, wrist = pts[5];
  noFill(); stroke(230, 226, 204, 28 * fade * appear + imprint.flash * 42); strokeWeight(0.65);
  for (let i = 0; i < 5; i++) {
    const tip = pts[i]; beginShape();
    for (let t = 0; t <= 1.001; t += 0.12) {
      const bend = sin(t * PI) * 18, side = map(i, 0, 4, -1, 1);
      curveVertex(lerp(wrist.x, tip.x, t) + bend * side * 0.32, lerp(wrist.y, tip.y, t) - bend * 0.18);
    }
    endShape();
  }
  stroke(230, 226, 204, 16 * fade * appear); strokeWeight(0.5);
  beginShape(); for (let i = 0; i < 5; i++) curveVertex(pts[i].x, pts[i].y); endShape();
}

function drawPalmParticles(imprint, fade, appear) {
  noStroke();
  for (const particle of imprint.particles) {
    particle.x += particle.vx; particle.y += particle.vy;
    const flicker = sin(frameCount * 0.04 + particle.seed) * 0.5 + 0.5;
    drawingContext.save(); drawingContext.shadowBlur = 10; drawingContext.shadowColor = "rgba(246, 238, 198, 0.32)";
    fill(246, 238, 198, particle.alpha * fade * appear * (0.55 + flicker * 0.45));
    circle(particle.x, particle.y, particle.size * (0.8 + flicker * 0.5));
    drawingContext.restore();
  }
}

function drawHandDisplay(metrics) {
  if (inputMode === "mouse") return;
  if (!metrics || handDisplayMode === 0) return;
  const points = metrics.points;
  if (handDisplayMode === 2) {
    noFill(); stroke(230, 226, 204, 75); strokeWeight(1);
    for (const [a, b] of HAND_CONNECTIONS) line(points[a].x, points[a].y, points[b].x, points[b].y);
  }
  noStroke(); fill(246, 238, 198, 70 + openness * 100);
  const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);
  for (const index of visible) circle(points[index].x, points[index].y, handDisplayMode === 1 ? 8 : 4);

  if (canStamp && metrics.ratio > TRIGGER_RATIO) {
    drawStampHalo(points);
  }
}

function drawStampHalo(points) {
  const wrist = points[0];
  const palmBase = points[9];
  const cx = lerp(wrist.x, palmBase.x, 0.48);
  const cy = lerp(wrist.y, palmBase.y, 0.48);
  const radius = 34;
  const endAngle = -HALF_PI + TWO_PI * stampProgress;

  drawingContext.save();
  drawingContext.shadowBlur = 16;
  drawingContext.shadowColor = "rgba(246, 238, 198, 0.42)";

  noFill();
  stroke(183, 204, 177, 48);
  strokeWeight(1);
  circle(cx, cy, radius * 2);

  stroke(246, 238, 198, 220);
  strokeWeight(2);
  arc(cx, cy, radius * 2, radius * 2, -HALF_PI, endAngle);

  const markerX = cx + cos(endAngle) * radius;
  const markerY = cy + sin(endAngle) * radius;
  noStroke();
  fill(250, 241, 203, 235);
  circle(markerX, markerY, 6);

  drawingContext.restore();
}

function drawBackground() {
  background(9, 19, 17); noStroke();
  for (let y = 0; y < height; y += 4) { fill(30, 45, 39, map(y, 0, height, 18, 3)); rect(0, y, width, 4); }
  for (const star of driftStars) {
    star.y -= star.speed;
    if (star.y < -10) { star.y = height + 10; star.x = random(width); }
    fill(246, 238, 198, star.alpha); circle(star.x, star.y, star.size);
  }
  fill(240, 232, 205, 5); rect(22, 22, width - 44, height - 44);
}

function drawInterface() {
  if (showHelp) { drawHelpScreen(); return; }
  cursor(ARROW);
  const inset = 28;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];
  const input = modelLoading ? "LOADING" : inputMode === "mouse" ? "CAMERA" : "MOUSE";
  noStroke(); textAlign(LEFT, TOP); fill(239, 236, 217, 220); textSize(14); text("HELD IMPRINT", inset, 27);
  fill(168, 187, 163, 130); textSize(10); text("GESTURE STUDY 04  /  OPEN PALM MEMORY", inset, 47);
  textAlign(RIGHT, TOP); fill(211, 216, 198, 128); textSize(10);
  text(`M ${input}   ·   P ${display}   ·   R RESET   ·   ? HELP`, width - inset, 32);
  stroke(199, 210, 188, 25); strokeWeight(1); line(inset, 66, width - inset, 66);
}

function getHelpPanelMetrics() {
  const panelWidth = min(620, width - 40), panelHeight = min(510, height - 40);
  return { x: (width - panelWidth) / 2, y: (height - panelHeight) / 2, width: panelWidth, height: panelHeight, buttonX: width / 2 - 92, buttonY: (height - panelHeight) / 2 + panelHeight - 78, buttonWidth: 184, buttonHeight: 42 };
}

function drawHelpScreen() {
  const panel = getHelpPanelMetrics(), compact = panel.height < 440;
  const left = panel.x + (compact ? 34 : 54), contentWidth = panel.width - (compact ? 68 : 108);
  noStroke(); fill(5, 12, 11, 205); rect(0, 0, width, height);
  drawingContext.save(); drawingContext.shadowBlur = 40; drawingContext.shadowColor = "rgba(0, 0, 0, 0.45)";
  fill(15, 29, 25, 246); stroke(177, 192, 167, 52); strokeWeight(1); rect(panel.x, panel.y, panel.width, panel.height, 4); drawingContext.restore();
  noStroke(); textAlign(LEFT, TOP); fill(174, 191, 166, 180); textSize(11); text("GESTURE STUDY 04", left, panel.y + (compact ? 25 : 38));
  fill(238, 235, 216, 240); textSize(compact ? 28 : 36); text("Held Imprint", left, panel.y + (compact ? 48 : 68));
  fill(201, 207, 191, 175); textSize(compact ? 13 : 15); textLeading(compact ? 19 : 22);
  text("A briefly held open palm leaves a deliberate, temporary constellation-like imprint.", left, panel.y + (compact ? 90 : 120), contentWidth);
  const stepsY = panel.y + (compact ? 128 : 174), gap = compact ? 42 : 54;
  drawHelpStep("01", "Press M to enable the camera.", left, stepsY);
  drawHelpStep("02", "Relax your hand, then open your palm slowly.", left, stepsY + gap);
  drawHelpStep("03", "Hold until the small ring closes to leave an imprint.", left, stepsY + gap * 2);
  fill(174, 191, 166, 135); textSize(11); text("M  CAMERA / MOUSE     P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - (compact ? 31 : 40));
  const hovering = mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth && mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;
  cursor(hovering ? HAND : ARROW); fill(hovering ? color(220, 224, 203, 235) : color(188, 202, 178, 210)); rect(panel.buttonX, panel.buttonY, panel.buttonWidth, panel.buttonHeight, 2);
  fill(18, 31, 27, 245); textAlign(CENTER, CENTER); textSize(12); text("BEGIN", width / 2, panel.buttonY + panel.buttonHeight / 2);
  fill(205, 210, 194, 105); textSize(10); text("or press Enter / Space", width / 2, panel.buttonY + panel.buttonHeight + 16);
}

function drawHelpStep(number, label, x, y) {
  fill(174, 191, 166, 125); textAlign(LEFT, TOP); textSize(10); text(number, x, y + 2);
  fill(229, 228, 211, 205); textSize(13); text(label, x + 38, y);
}

function keyPressed() {
  if (key === "?" || keyCode === 191) { showHelp = !showHelp; return false; }
  if (showHelp && (keyCode === ENTER || key === " " || keyCode === ESCAPE)) { showHelp = false; return false; }
  if (showHelp) return false;
  if (key === "m" || key === "M") inputMode === "mouse" ? startHandMode() : stopHandMode();
  if (key === "p" || key === "P") handDisplayMode = (handDisplayMode + 1) % 3;
  if (key === "r" || key === "R") { imprints = []; canStamp = true; openHoldFrames = 0; stampProgress = 0; }
}

function mousePressed() {
  if (!showHelp) return;
  const panel = getHelpPanelMetrics();
  if (mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth && mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight) showHelp = false;
}

function startHandMode() {
  inputMode = "hand"; modelLoading = true; modelReady = false; videoReady = false; detectionStarted = false; hands = [];
  video = createCapture({ video: { width, height }, audio: false }, () => { videoReady = true; tryStartDetection(); });
  video.size(width, height); video.hide();
  handPose = ml5.handPose({ flipped: true }, () => { modelReady = true; modelLoading = false; tryStartDetection(); });
}

function tryStartDetection() {
  if (inputMode === "hand" && modelReady && videoReady && !detectionStarted) { handPose.detectStart(video, gotHands); detectionStarted = true; }
}
function gotHands(results) { hands = results; }

function stopHandMode() {
  if (handPose && detectionStarted && handPose.detectStop) handPose.detectStop();
  if (video) { const stream = video.elt.srcObject; if (stream) stream.getTracks().forEach(track => track.stop()); video.remove(); }
  handPose = null; video = null; hands = []; modelReady = false; videoReady = false; detectionStarted = false; modelLoading = false; inputMode = "mouse";
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); if (video) video.size(width, height); }
function easeOutCubic(t) { return 1 - pow(1 - t, 3); }
function easeInCubic(t) { return t * t * t; }
