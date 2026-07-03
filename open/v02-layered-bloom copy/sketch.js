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

function setup() {
  createCanvas(900, 620);
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
  openness = lerp(openness, targetOpenness, 0.075);

  detectImprint();

  drawImprints();
  drawCurrentPalmPreview();
  drawInterface();
}

function getOpenness() {
  if (inputMode === "mouse") {
    return constrain(map(mouseX, 120, width - 120, 0, 1), 0, 1);
  }

  if (hands.length > 0) {
    return getHandOpenness(hands[0]);
  }

  return openness * 0.98;
}

function getHandOpenness(hand) {
  const wrist = hand.keypoints[0];
  const tips = [
    hand.keypoints[4],
    hand.keypoints[8],
    hand.keypoints[12],
    hand.keypoints[16],
    hand.keypoints[20]
  ];

  let total = 0;

  for (const tip of tips) {
    total += dist(wrist.x, wrist.y, tip.x, tip.y);
  }

  return constrain(map(total / tips.length, 72, 210, 0, 1), 0, 1);
}

function detectImprint() {
  if (openness > 0.84 && canStamp) {
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

function drawCurrentPalmPreview() {
  if (inputMode === "mouse") {
    drawMousePreview();
    return;
  }

  if (hands.length === 0) return;

  const hand = hands[0];
  const pts = [4, 8, 12, 16, 20, 0].map((index) => hand.keypoints[index]);

  noFill();
  stroke(230, 226, 204, 35 + openness * 70);
  strokeWeight(0.7);

  for (let i = 0; i < 5; i++) {
    line(pts[5].x, pts[5].y, pts[i].x, pts[i].y);
  }

  noStroke();

  for (let i = 0; i < 5; i++) {
    fill(246, 238, 198, 45 + openness * 80);
    circle(pts[i].x, pts[i].y, 4 + openness * 3);
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
  rect(34, 34, width - 68, height - 68);
}

function drawInterface() {
  textAlign(LEFT);
  noStroke();
  fill(232, 229, 210, 155);
  textSize(13);
  text("OPEN / V03 / PALM IMPRINT", 38, 42);

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
    text("Open the palm shape fully to leave an imprint.", width / 2, height - 28);
  } else if (!modelLoading && hands.length === 0) {
    text("Show one hand to the camera.", width / 2, height - 28);
  } else if (!modelLoading) {
    text("Open your palm fully to leave an imprint.", width / 2, height - 28);
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
    imprints = [];
    canStamp = true;
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

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}