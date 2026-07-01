let handPose;
let video;
let hands = [];

let inputMode = "mouse";
let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let breath = 0;
let targetBreath = 0;
let particles = [];

function setup() {
  createCanvas(900, 620);
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
}

function draw() {
  drawBackground();

  targetBreath = getBreathAmount();
  breath = lerp(breath, targetBreath, 0.045);

  drawBreathingPond(breath);
  drawHandsPreview();
  drawInterface();
}

function getBreathAmount() {
  if (inputMode === "mouse") {
    return constrain(map(mouseX, 120, width - 120, 0, 1), 0, 1);
  }

  if (hands.length >= 2) {
    const a = hands[0].keypoints[8];
    const b = hands[1].keypoints[8];

    const d = dist(a.x, a.y, b.x, b.y);
    return constrain(map(d, 80, 520, 0, 1), 0, 1);
  }

  return breath * 0.98;
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
  background(12, 22, 20);

  noStroke();

  for (let y = 0; y < height; y += 4) {
    const a = map(y, 0, height, 18, 4);
    fill(34, 48, 42, a);
    rect(0, y, width, 4);
  }

  fill(240, 232, 205, 5);
  rect(34, 34, width - 68, height - 68);
}

function drawHandsPreview() {
  if (inputMode !== "hand" || hands.length === 0) return;

  noFill();
  stroke(230, 226, 204, 90);
  strokeWeight(1);

  for (const hand of hands) {
    const tip = hand.keypoints[8];
    circle(tip.x, tip.y, 15);
  }

  if (hands.length >= 2) {
    const a = hands[0].keypoints[8];
    const b = hands[1].keypoints[8];

    stroke(230, 226, 204, 35);
    line(a.x, a.y, b.x, b.y);
  }
}

function drawInterface() {
  textAlign(LEFT);
  noStroke();
  fill(232, 229, 210, 155);
  textSize(13);
  text("BOTH HANDS / V02 / BREATHING POND", 38, 42);

  textAlign(RIGHT);
  fill(232, 229, 210, 115);
  textSize(12);

  if (inputMode === "mouse") {
    text("M  SWITCH TO HANDPOSE", width - 38, 42);
  } else if (modelLoading) {
    text("LOADING HANDPOSE...", width - 38, 42);
  } else {
    text("M  SWITCH TO MOUSE", width - 38, 42);
  }

  textAlign(CENTER);
  fill(232, 229, 210, 95);
  textSize(12);

  if (inputMode === "mouse") {
    text("Move the mouse horizontally to open and close the pond.", width / 2, height - 28);
  } else if (!modelLoading && hands.length < 2) {
    text("Show both hands to the camera.", width / 2, height - 28);
  } else if (!modelLoading) {
    text("Move both hands apart and together slowly.", width / 2, height - 28);
  }
}

function keyPressed() {
  if (key === "m" || key === "M") {
    if (inputMode === "mouse") {
      startHandMode();
    } else {
      stopHandMode();
    }
  }
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
        width: 900,
        height: 620
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