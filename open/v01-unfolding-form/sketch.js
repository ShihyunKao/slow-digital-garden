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
  drawBackground();

  const hand = hands.length > 0 ? hands[0] : null;
  targetOpenness = hand ? getHandOpenness(hand) : openness * 0.94;
  openness = lerp(openness, targetOpenness, 0.06);

  if (!showHelp) {
    drawUnfoldingForm(width / 2, height * 0.55, openness);
    drawTechnicalHand(hand);
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
  return constrain(map(ratio, 1.15, 2.65, 0, 1), 0, 1);
}

function drawUnfoldingForm(centerX, centerY, amount) {
  const lineCount = 94;
  const time = frameCount * 0.0035;
  const maximumLength = min(width, height) * 0.287;

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * TWO_PI;
    const variation = noise(i * 0.13);
    const length = lerp(7, maximumLength, amount) * (0.72 + variation * 0.38);

    if (i % 5 === 0) {
      stroke(214, 191, 158, 12 + amount * 68);
    } else {
      stroke(171, 194, 154, 14 + amount * 82);
    }

    strokeWeight(0.45 + variation * 0.8);
    noFill();
    beginShape();

    for (let step = 0; step <= 28; step++) {
      const progress = step / 28;
      const radius = length * progress;
      const drift =
        sin(progress * PI * 1.4 + angle * 3 + time * 4 + variation * TWO_PI) *
        (3 + amount * 28) *
        sin(progress * PI);

      curveVertex(
        centerX + cos(angle) * radius - sin(angle) * drift,
        centerY + sin(angle) * radius + cos(angle) * drift
      );
    }

    endShape();
  }

  noStroke();
  fill(225, 220, 195, 110 + amount * 85);
  circle(centerX, centerY, lerp(9, 21, amount));
}

function drawTechnicalHand(hand) {
  if (!hand || handDisplayMode === 0) return;

  const points = hand.keypoints;

  if (handDisplayMode === 1) {
    noStroke();
    fill(240, 231, 194, 62);

    for (const index of TIP_INDICES) {
      circle(points[index].x, points[index].y, 3.5);
    }

    return;
  }

  noFill();
  stroke(230, 226, 204, 45);
  strokeWeight(0.7);

  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(240, 231, 194, 72);

  for (const point of points) {
    circle(point.x, point.y, 3.5);
  }
}

function drawBackground() {
  clear();
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
  if (video) video.size(width, height);
}
