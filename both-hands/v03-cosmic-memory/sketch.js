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
let previousBreath = 0;

let stars = [];
let memories = [];

let wasOpen = false;
let memoryStep = 0;

function setup() {
  createCanvas(900, 620);
  pixelDensity(1);
  noiseSeed(103);
  randomSeed(103);

  for (let i = 0; i < 180; i++) {
    stars.push({
      angle: random(TWO_PI),
      radius: random(20, 285),
      speed: random(0.0005, 0.0025),
      size: random(0.8, 3.2),
      alpha: random(18, 72),
      depth: random(0.4, 1.0)
    });
  }
}

function draw() {
  drawSpaceBackground();

  targetBreath = getBreathAmount();
  previousBreath = breath;
  breath = lerp(breath, targetBreath, 0.04);

  detectBreathMemory();

  drawCosmicField(breath);
  drawMemoryRings();
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

  return breath * 0.985;
}

function detectBreathMemory() {
  if (breath > 0.82) {
    wasOpen = true;
  }

  if (wasOpen && breath < 0.42 && previousBreath >= 0.42) {
    addMemory();
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
    life: 1400,
    radius: radius + random(-8, 8),
    aspect: random(0.48, 0.68),
    rotation: random(-0.04, 0.04),
    seed: random(1000),
    starCount: floor(random(42, 68)),
    flash: 1,
    step: memoryStep
  });

  memoryStep++;

  if (memories.length > 8) {
    memories.shift();
  }
}

function drawCosmicField(amount) {
  const cx = width / 2;
  const cy = height / 2 + 20;

  const eased = easeInOutCubic(amount);
  const radius = lerp(74, 278, eased);
  const aspect = lerp(0.36, 0.64, eased);

  drawCentralGlow(cx, cy, radius, aspect, eased);
  drawOrbitBody(cx, cy, radius, aspect, eased);
  drawOrbitLines(cx, cy, radius, aspect, eased);
  drawStarCurrent(cx, cy, radius, aspect, eased);
  drawReturnLines(cx, cy, radius, aspect, eased);
}

function drawCentralGlow(cx, cy, r, aspect, amount) {
  drawingContext.save();
  drawingContext.filter = "blur(34px)";

  noStroke();

  fill(142, 170, 135, 20 + amount * 22);
  ellipse(cx, cy, r * 2.1, r * 2.1 * aspect);

  fill(231, 219, 181, 10 + amount * 14);
  ellipse(cx, cy, r * 1.05, r * 1.05 * aspect);

  drawingContext.restore();
}

function drawOrbitBody(cx, cy, r, aspect, amount) {
  noStroke();

  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const rr = r * (1 - t * 0.78);

    fill(
      lerp(26, 76, amount),
      lerp(42, 92, amount),
      lerp(40, 78, amount),
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

    const pulse = sin(frameCount * 0.015 + i * 0.5) * amount * 2.8;
    const alpha = (1 - t * 0.45) * (24 + amount * 48);

    stroke(220, 226, 205, alpha);
    strokeWeight(lerp(1.1, 0.35, t));

    beginShape();

    for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / 160) {
      const n = noise(
        cos(a) * 1.4 + i * 0.17,
        sin(a) * 1.4,
        frameCount * 0.002
      );

      const wave = map(n, 0, 1, 0.97, 1.035);

      curveVertex(
        cx + cos(a) * (rr * wave + pulse),
        cy + sin(a) * (rr * wave + pulse) * aspect
      );
    }

    endShape(CLOSE);
  }
}

function drawStarCurrent(cx, cy, r, aspect, amount) {
  noStroke();

  for (const star of stars) {
    star.angle += star.speed * (0.4 + amount * 1.8);

    const localRadius = star.radius * amount * star.depth;
    const px = cx + cos(star.angle) * localRadius;
    const py = cy + sin(star.angle) * localRadius * aspect;

    fill(238, 231, 198, star.alpha * amount * star.depth);
    circle(px, py, star.size * star.depth);
  }
}

function drawReturnLines(cx, cy, r, aspect, amount) {
  if (amount < 0.28) return;

  stroke(213, 220, 196, 28 * amount);
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

function drawMemoryRings() {
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

    push();
    translate(cx, cy);
    rotate(memory.rotation);

    drawingContext.save();
    drawingContext.filter = "blur(1.4px)";

    noFill();

    for (let ring = 0; ring < 4; ring++) {
      const rt = ring / 3;
      const rr = memory.radius * (0.9 + rt * 0.18 + expansion * 0.06);

      stroke(238, 232, 198, fade * (36 - ring * 5) + flash * 40);
      strokeWeight(0.7 + flash * 0.6);

      beginShape();

      for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / 170) {
        const n = noise(
          memory.seed + cos(a) * 1.7,
          memory.seed + sin(a) * 1.7,
          ring * 0.24 + frameCount * 0.0008
        );

        const wobble = map(n, 0, 1, 0.985, 1.03);

        curveVertex(
          cos(a) * rr * wobble,
          sin(a) * rr * memory.aspect * wobble
        );
      }

      endShape(CLOSE);
    }

    drawingContext.restore();

    noStroke();

    for (let s = 0; s < memory.starCount; s++) {
      const a = (s / memory.starCount) * TWO_PI + memory.seed * 0.01;
      const rr = memory.radius * randomSeeded(s + memory.seed, 0.82, 1.15);

      const sparkle = sin(frameCount * 0.04 + s * 1.7) * 0.5 + 0.5;

      fill(
        246,
        238,
        198,
        fade * (38 + sparkle * 28) + flash * 60
      );

      circle(
        cos(a) * rr,
        sin(a) * rr * memory.aspect,
        randomSeeded(s + 200, 1.8, 4.6) + sparkle * 1.2
      );
    }

    pop();
  }
}

function drawSpaceBackground() {
  background(9, 19, 17);

  noStroke();

  for (let y = 0; y < height; y += 4) {
    const a = map(y, 0, height, 20, 3);
    fill(30, 45, 39, a);
    rect(0, y, width, 4);
  }

  drawingContext.save();
  drawingContext.filter = "blur(40px)";
  fill(57, 74, 61, 28);
  ellipse(width / 2, height / 2 + 30, 620, 360);
  drawingContext.restore();

  fill(240, 232, 205, 5);
  rect(34, 34, width - 68, height - 68);
}

function drawHandsPreview() {
  if (inputMode !== "hand" || hands.length === 0) return;

  noFill();
  stroke(230, 226, 204, 85);
  strokeWeight(1);

  for (const hand of hands) {
    const tip = hand.keypoints[8];
    circle(tip.x, tip.y, 15);
  }

  if (hands.length >= 2) {
    const a = hands[0].keypoints[8];
    const b = hands[1].keypoints[8];

    stroke(230, 226, 204, 30);
    line(a.x, a.y, b.x, b.y);
  }
}

function drawInterface() {
  textAlign(LEFT);
  noStroke();
  fill(232, 229, 210, 155);
  textSize(13);
  text("BOTH HANDS / V03 / COSMIC MEMORY", 38, 42);

  textAlign(RIGHT);
  fill(232, 229, 210, 115);
  textSize(12);

  if (inputMode === "mouse") {
    text("M  SWITCH TO HANDPOSE    R  RESET", width - 38, 42);
  } else if (modelLoading) {
    text("LOADING HANDPOSE...", width - 38, 42);
  } else {
    text("M  SWITCH TO MOUSE    R  RESET", width - 38, 42);
  }

  textAlign(CENTER);
  fill(232, 229, 210, 95);
  textSize(12);

  if (inputMode === "mouse") {
    text("Open fully, then close. Each breath leaves a memory ring.", width / 2, height - 28);
  } else if (!modelLoading && hands.length < 2) {
    text("Show both hands to the camera.", width / 2, height - 28);
  } else if (!modelLoading) {
    text("Move both hands apart, then slowly return them.", width / 2, height - 28);
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

  if (key === "r" || key === "R") {
    memories = [];
    wasOpen = false;
    memoryStep = 0;
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