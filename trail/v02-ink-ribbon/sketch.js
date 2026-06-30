let handPose;
let video;
let hands = [];

let inputMode = "mouse";
let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let blooms = [];
let previousPoint = null;

function setup() {
  createCanvas(900, 620);
  pixelDensity(1);
  noiseSeed(12);
  randomSeed(12);
}

function draw() {
  drawWarmPaper();

  const point = getInputPoint();

  if (point) {
    updateInk(point);
  } else {
    previousPoint = null;
  }

  drawBlooms();
  drawCursor(point);
  drawInterface();
}

function getInputPoint() {
  if (inputMode === "mouse") {
    return { x: mouseX, y: mouseY };
  }

  if (hands.length > 0) {
    const fingertip = hands[0].keypoints[8];
    return { x: fingertip.x, y: fingertip.y };
  }

  return null;
}

function updateInk(point) {
  if (!insideCanvas(point.x, point.y)) return;

  if (previousPoint === null) {
    previousPoint = { x: point.x, y: point.y };
    addBloom(point.x, point.y, 0.7);
    return;
  }

  const movement = dist(point.x, point.y, previousPoint.x, previousPoint.y);

  if (movement > 18) {
    const slowness = constrain(map(movement, 0, 80, 1, 0.22), 0.22, 1);

    addBloom(
      lerp(previousPoint.x, point.x, 0.55),
      lerp(previousPoint.y, point.y, 0.55),
      slowness
    );

    previousPoint = { x: point.x, y: point.y };
  }
}

function addBloom(x, y, slowness) {
  blooms.push({
    x: x + random(-4, 4),
    y: y + random(-4, 4),
    age: 0,
    life: random(420, 680),
    startRadius: random(4, 10),
    endRadius: random(70, 135) * slowness,
    strength: random(0.35, 0.72) * slowness,
    aspect: random(0.72, 1.18),
    seed: random(1000)
  });

  if (blooms.length > 45) {
    blooms.shift();
  }
}

function drawBlooms() {
  for (let i = blooms.length - 1; i >= 0; i--) {
    const bloom = blooms[i];
    bloom.age++;

    if (bloom.age > bloom.life) {
      blooms.splice(i, 1);
      continue;
    }

    drawMistBloom(bloom);
  }
}

function drawMistBloom(bloom) {
  const t = bloom.age / bloom.life;
  const grow = easeOutQuart(constrain(t * 2.4, 0, 1));
  const fade = 1 - easeInCubic(constrain(t, 0, 1));

  const radius = lerp(bloom.startRadius, bloom.endRadius, grow);
  const alpha = 34 * bloom.strength * fade;

  drawingContext.save();
  drawingContext.filter = "blur(14px)";

  noStroke();

  for (let i = 0; i < 8; i++) {
    const layer = i / 7;
    const r = radius * (0.18 + layer * 1.08);
    const a = alpha * pow(1 - layer, 1.7);

    fill(72, 76, 72, a);

    beginShape();

    for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 80) {
      const n = noise(
        bloom.seed + cos(angle) * 1.2,
        bloom.seed + sin(angle) * 1.2,
        i * 0.13 + frameCount * 0.0015
      );

      const uneven = map(n, 0, 1, 0.88, 1.12);

      curveVertex(
        bloom.x + cos(angle) * r * uneven,
        bloom.y + sin(angle) * r * uneven * bloom.aspect
      );
    }

    endShape(CLOSE);
  }

  drawingContext.restore();

  drawQuietEdge(bloom, radius, alpha);
}

function drawQuietEdge(bloom, radius, alpha) {
  noFill();
  stroke(72, 76, 72, alpha * 0.18);
  strokeWeight(0.55);

  beginShape();

  for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 96) {
    const n = noise(
      bloom.seed * 0.8 + cos(angle) * 1.8,
      bloom.seed * 0.8 + sin(angle) * 1.8,
      frameCount * 0.001
    );

    const uneven = map(n, 0, 1, 0.94, 1.08);

    curveVertex(
      bloom.x + cos(angle) * radius * uneven,
      bloom.y + sin(angle) * radius * uneven * bloom.aspect
    );
  }

  endShape(CLOSE);
}

function drawWarmPaper() {
  background(241, 238, 226);

  noStroke();

  for (let y = 0; y < height; y += 4) {
    const a = map(y, 0, height, 10, 0);
    fill(255, 252, 241, a);
    rect(0, y, width, 4);
  }

  fill(215, 207, 188, 16);
  rect(28, 28, width - 56, height - 56);
}

function drawCursor(point) {
  if (!point) return;

  noFill();
  stroke(70, 74, 68, 80);
  strokeWeight(1);
  circle(point.x, point.y, 14);
}

function drawInterface() {
  textAlign(LEFT);
  noStroke();
  fill(74, 76, 67, 150);
  textSize(13);
  text("TRAIL / V02 / SOFT INK WASH", 38, 42);

  textAlign(RIGHT);
  fill(74, 76, 67, 115);
  textSize(12);

  if (inputMode === "mouse") {
    text("M  SWITCH TO HANDPOSE    R  RESET", width - 38, 42);
  } else if (modelLoading) {
    text("LOADING HANDPOSE...", width - 38, 42);
  } else {
    text("M  SWITCH TO MOUSE    R  RESET", width - 38, 42);
  }

  textAlign(CENTER);
  fill(74, 76, 67, 95);
  textSize(12);

  if (inputMode === "mouse") {
    text("Move slowly and pause. The wash expands after the gesture.", width / 2, height - 28);
  } else if (!modelLoading && hands.length === 0) {
    text("Show one hand to the camera.", width / 2, height - 28);
  } else if (!modelLoading) {
    text("Move your index finger slowly, then pause.", width / 2, height - 28);
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
    blooms = [];
    previousPoint = null;
  }
}

function startHandMode() {
  inputMode = "hand";
  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];
  previousPoint = null;

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
  previousPoint = null;
}

function insideCanvas(x, y) {
  return x >= 0 && x <= width && y >= 0 && y <= height;
}

function easeOutQuart(t) {
  return 1 - pow(1 - t, 4);
}

function easeInCubic(t) {
  return t * t * t;
}