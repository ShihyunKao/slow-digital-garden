let handPose;
let video;
let hands = [];

let inputMode = "mouse";
let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let openness = 0;
let targetOpenness = 0;

let canStamp = true;
let imprints = [];
let driftStars = [];
let showHelp = true;
let handDisplayMode = 1;

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
  randomSeed(451);
  noiseSeed(451);

  for (let i = 0; i < 80; i++) {
    driftStars.push({
      x: random(width),
      y: random(height),
      size: random(0.8, 2.2),
      alpha: random(10, 34),
      speed: random(0.04, 0.16)
    });
  }
}

function draw() {
  drawBackground();

  targetOpenness = getOpenness();
  openness = lerp(openness, targetOpenness, 0.16);

  if (showHelp) {
    canStamp = true;
  } else {
    detectImprint();
  }

  drawImprints();
  drawHandDisplay();
  drawInterface();
}

function getOpenness() {
  if (inputMode === "mouse") {
    const sidePadding = min(width * 0.12, 145);
    return constrain(map(mouseX, sidePadding, width - sidePadding, 0, 1), 0, 1);
  }

  if (hands.length > 0) {
    return getHandOpenness(hands[0]);
  }

  return openness * 0.98;
}

function getHandOpenness(hand) {
  const points = hand.keypoints;
  const wrist = points[0];
  const palmWidth = dist(points[5].x, points[5].y, points[17].x, points[17].y);

  if (palmWidth < 1) return 0;

  const tips = [4, 8, 12, 16, 20];
  let totalDistance = 0;

  for (const index of tips) {
    totalDistance += dist(wrist.x, wrist.y, points[index].x, points[index].y);
  }

  const opennessRatio = totalDistance / tips.length / palmWidth;

  // The ratio stays stable even when the hand moves nearer to or further from the camera.
  return constrain(map(opennessRatio, 1.15, 2.25, 0, 1), 0, 1);
}

function detectImprint() {
  if (openness > 0.6 && canStamp) {
    addImprint();
    canStamp = false;
  }

  if (openness < 0.42) {
    canStamp = true;
  }
}

function addImprint() {
  if (inputMode === "hand" && hands.length > 0) {
    addHandImprint(hands[0]);
  } else {
    addMouseImprint();
  }

  if (imprints.length > 7) {
    imprints.shift();
  }
}

function addMouseImprint() {
  const cx = width / 2;
  const cy = height / 2 + 20;

  const syntheticPoints = [
    { x: cx - 90, y: cy - 95 },
    { x: cx - 48, y: cy - 140 },
    { x: cx, y: cy - 160 },
    { x: cx + 48, y: cy - 138 },
    { x: cx + 90, y: cy - 92 },
    { x: cx, y: cy }
  ];

  imprints.push(createImprint(syntheticPoints));
}

function addHandImprint(hand) {
  const indices = [4, 8, 12, 16, 20, 0];

  const points = indices.map((index) => {
    const point = hand.keypoints[index];

    return {
      x: point.x,
      y: point.y
    };
  });

  imprints.push(createImprint(points));
}

function createImprint(points) {
  const cx =
    points.reduce((sum, point) => sum + point.x, 0) / points.length;

  const cy =
    points.reduce((sum, point) => sum + point.y, 0) / points.length;

  const particles = [];

  for (let i = 0; i < 130; i++) {
    const source = random(points);
    const angle = random(TWO_PI);
    const distance = random(4, 62);

    particles.push({
      x: source.x + cos(angle) * distance * random(0.15, 1.0),
      y: source.y + sin(angle) * distance * random(0.15, 0.75),
      vx: random(-0.08, 0.08),
      vy: random(-0.12, 0.02),
      size: random(0.8, 3.2),
      alpha: random(28, 86),
      seed: random(1000)
    });
  }

  return {
    points,
    center: { x: cx, y: cy },
    age: 0,
    life: 720,
    particles,
    rotation: random(-0.04, 0.04),
    scale: random(0.96, 1.04),
    flash: 1
  };
}

function drawImprints() {
  for (let i = imprints.length - 1; i >= 0; i--) {
    const imprint = imprints[i];

    imprint.age++;
    imprint.flash *= 0.94;

    if (imprint.age > imprint.life) {
      imprints.splice(i, 1);
      continue;
    }

    drawSingleImprint(imprint);
  }
}

function drawSingleImprint(imprint) {
  const t = imprint.age / imprint.life;
  const fade = 1 - easeInCubic(t);
  const appear = easeOutCubic(constrain(t * 5, 0, 1));

  push();
  translate(imprint.center.x, imprint.center.y);
  rotate(imprint.rotation);
  scale(imprint.scale);
  translate(-imprint.center.x, -imprint.center.y);

  drawPalmAura(imprint, fade, appear);
  drawPalmLines(imprint, fade, appear);
  drawPalmParticles(imprint, fade, appear);

  pop();
}

function drawPalmAura(imprint, fade, appear) {
  const pts = imprint.points;

  drawingContext.save();
  drawingContext.filter = "blur(24px)";

  noStroke();
  fill(103, 134, 112, 22 * fade * appear + imprint.flash * 22);

  beginShape();

  for (let i = 0; i < 5; i++) {
    const point = pts[i];
    curveVertex(point.x, point.y);
  }

  curveVertex(pts[5].x, pts[5].y + 26);
  curveVertex(pts[0].x, pts[0].y);
  endShape(CLOSE);

  drawingContext.restore();
}

function drawPalmLines(imprint, fade, appear) {
  const pts = imprint.points;
  const wrist = pts[5];

  noFill();

  stroke(230, 226, 204, 28 * fade * appear + imprint.flash * 42);
  strokeWeight(0.65);

  for (let i = 0; i < 5; i++) {
    const tip = pts[i];

    beginShape();

    for (let t = 0; t <= 1.001; t += 0.12) {
      const bend = sin(t * PI) * 18;
      const side = map(i, 0, 4, -1, 1);

      curveVertex(
        lerp(wrist.x, tip.x, t) + bend * side * 0.32,
        lerp(wrist.y, tip.y, t) - bend * 0.18
      );
    }

    endShape();
  }

  stroke(230, 226, 204, 16 * fade * appear);
  strokeWeight(0.5);

  beginShape();
  curveVertex(pts[0].x, pts[0].y);
  curveVertex(pts[1].x, pts[1].y);
  curveVertex(pts[2].x, pts[2].y);
  curveVertex(pts[3].x, pts[3].y);
  curveVertex(pts[4].x, pts[4].y);
  endShape();

  beginShape();
  curveVertex(pts[0].x, pts[0].y);
  curveVertex(
    lerp(pts[0].x, pts[4].x, 0.25),
    lerp(pts[0].y, pts[4].y, 0.65)
  );
  curveVertex(
    lerp(pts[0].x, pts[4].x, 0.62),
    lerp(pts[0].y, pts[4].y, 0.72)
  );
  curveVertex(pts[4].x, pts[4].y);
  endShape();
}

function drawPalmParticles(imprint, fade, appear) {
  noStroke();

  for (const p of imprint.particles) {
    p.x += p.vx;
    p.y += p.vy;

    const flicker = sin(frameCount * 0.04 + p.seed) * 0.5 + 0.5;

    drawingContext.save();
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = "rgba(246, 238, 198, 0.32)";

    fill(
      246,
      238,
      198,
      p.alpha * fade * appear * (0.55 + flicker * 0.45)
    );

    circle(p.x, p.y, p.size * (0.8 + flicker * 0.5));

    drawingContext.restore();
  }
}

function drawHandDisplay() {
  if (inputMode === "mouse") {
    drawMousePreview();
    return;
  }

  if (hands.length === 0 || handDisplayMode === 0) return;

  const hand = hands[0];
  const points = hand.keypoints;

  if (handDisplayMode === 2) {
    noFill();
    stroke(230, 226, 204, 75);
    strokeWeight(1);

    for (const [a, b] of HAND_CONNECTIONS) {
      line(points[a].x, points[a].y, points[b].x, points[b].y);
    }
  }

  noStroke();
  fill(246, 238, 198, 55 + openness * 105);
  const displayPoints = handDisplayMode === 1 ? [8] : points.map((_, index) => index);

  for (const index of displayPoints) {
    circle(points[index].x, points[index].y, handDisplayMode === 1 ? 8 : 4);
  }
}

function drawMousePreview() {
  const cx = width / 2;
  const cy = height / 2 + 20;

  const spread = lerp(25, 96, openness);
  const lift = lerp(30, 155, openness);

  const pts = [
    { x: cx - spread, y: cy - lift * 0.52 },
    { x: cx - spread * 0.54, y: cy - lift * 0.86 },
    { x: cx, y: cy - lift },
    { x: cx + spread * 0.54, y: cy - lift * 0.86 },
    { x: cx + spread, y: cy - lift * 0.52 },
    { x: cx, y: cy }
  ];

  noFill();
  stroke(230, 226, 204, 30 + openness * 60);
  strokeWeight(0.7);

  for (let i = 0; i < 5; i++) {
    line(pts[5].x, pts[5].y, pts[i].x, pts[i].y);
  }

  noStroke();
  fill(246, 238, 198, 42 + openness * 78);

  for (let i = 0; i < 5; i++) {
    circle(pts[i].x, pts[i].y, 3.5 + openness * 3);
  }
}

function drawBackground() {
  background(9, 19, 17);

  noStroke();

  for (let y = 0; y < height; y += 4) {
    const a = map(y, 0, height, 18, 3);
    fill(30, 45, 39, a);
    rect(0, y, width, 4);
  }

  for (const star of driftStars) {
    star.y -= star.speed;

    if (star.y < -10) {
      star.y = height + 10;
      star.x = random(width);
    }

    fill(246, 238, 198, star.alpha);
    circle(star.x, star.y, star.size);
  }

  fill(240, 232, 205, 5);
  rect(22, 22, width - 44, height - 44);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
}

function drawInterface() {
  if (showHelp) {
    drawHelpScreen();
  } else {
    drawExhibitionCaption();
  }
}

function drawExhibitionCaption() {
  cursor(ARROW);
  const inset = 28;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];
  const input = modelLoading ? "LOADING" : inputMode === "mouse" ? "CAMERA" : "MOUSE";

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("PALM IMPRINT", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 03  /  OPEN PALM MEMORY", inset, 47);

  textAlign(RIGHT, TOP);
  fill(211, 216, 198, 128);
  textSize(10);
  text(`M ${input}   ·   P ${display}   ·   R RESET   ·   ? HELP`, width - inset, 32);

  stroke(199, 210, 188, 25);
  strokeWeight(1);
  line(inset, 66, width - inset, 66);
}

function getHelpPanelMetrics() {
  const panelWidth = min(620, width - 40);
  const panelHeight = min(500, height - 40);

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
  text("GESTURE STUDY 03", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Palm Imprint", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "Each fully opened palm leaves a temporary constellation-like imprint.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const stepGap = compact ? 42 : 54;
  drawHelpStep("01", "Press M to switch from mouse to camera input.", left, stepsY);
  drawHelpStep("02", "Show one hand and open your palm slowly.", left, stepsY + stepGap);
  drawHelpStep("03", "Relax your hand, then open again to leave another imprint.", left, stepsY + stepGap * 2);

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

  if (key === "m" || key === "M") {
    if (inputMode === "mouse") {
      startHandMode();
    } else {
      stopHandMode();
    }
  }

  if (key === "r" || key === "R") {
    imprints = [];
    canStamp = true;
  }

  if (key === "p" || key === "P") {
    handDisplayMode = (handDisplayMode + 1) % 3;
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
  if (
    inputMode === "hand" &&
    modelReady &&
    videoReady &&
    !detectionStarted
  ) {
    handPose.detectStart(video, gotHands);
    detectionStarted = true;
  }
}

function gotHands(results) {
  hands = results;
}

function stopHandMode() {
  if (handPose && detectionStarted && handPose.detectStop) {
    handPose.detectStop();
  }

  if (video) {
    const stream = video.elt.srcObject;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

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

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}
