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
let grain = [];

function setup() {
  createCanvas(900, 620);
  noiseSeed(12);
  randomSeed(12);

  for (let i = 0; i < 420; i++) {
    grain.push({
      x: random(width),
      y: random(height),
      alpha: random(4, 15)
    });
  }
}

function draw() {
  drawBackground();

  if (inputMode === "mouse") {
    targetOpenness = constrain(mouseX / width, 0, 1);
  } else if (hands.length > 0) {
    targetOpenness = getHandOpenness(hands[0]);
  } else {
    targetOpenness = 0.04;
  }

  openness = lerp(openness, targetOpenness, 0.055);

  drawLayeredBloom(width / 2, height * 0.53, openness);
  drawInterface();
}

function drawBackground() {
  background(15, 24, 22);
  noStroke();

  for (const dot of grain) {
    fill(211, 215, 194, dot.alpha);
    circle(dot.x, dot.y, 1);
  }

  stroke(205, 210, 189, 22);
  line(58, height - 55, width - 58, height - 55);
}

function drawLayeredBloom(cx, cy, amount) {
  const totalLayers = 46;
  const time = frameCount * 0.0018;

  push();
  translate(cx, cy);

  for (let layer = totalLayers; layer >= 1; layer--) {
    const layerAmount = layer / totalLayers;

    const closedRadius = 5 + layerAmount * 13;
    const openRadius = 22 + pow(layerAmount, 0.88) * 218;
    const radius = lerp(closedRadius, openRadius, amount);

    const irregularity =
      amount * (3 + layerAmount * 22);

    const lineColour =
      layer % 6 === 0
        ? color(215, 192, 160)
        : color(169, 192, 154);

    lineColour.setAlpha(18 + amount * 58);
    stroke(lineColour);
    strokeWeight(0.45 + layerAmount * 0.75);

    if (layer % 8 === 0) {
      fill(184, 197, 164, 3 + amount * 5);
    } else {
      noFill();
    }

    beginShape();

    const pointCount = 150;

    for (let point = 0; point <= pointCount; point++) {
      const angle = map(point, 0, pointCount, 0, TWO_PI);

      const noiseValue = noise(
        cos(angle) * 0.75 + 2.5,
        sin(angle) * 0.75 + 2.5,
        layer * 0.075 + time
      );

      const wave =
        sin(angle * 3 + layer * 0.13 + time * 8) *
        irregularity *
        0.25;

      const distortedRadius =
        radius +
        map(noiseValue, 0, 1, -irregularity, irregularity) +
        wave;

      const x = cos(angle) * distortedRadius;
      const y =
        sin(angle) *
        distortedRadius *
        (0.88 + layerAmount * 0.08);

      vertex(x, y);
    }

    endShape(CLOSE);
  }

  noStroke();
  fill(226, 221, 197, 110 + amount * 70);
  circle(0, 0, lerp(7, 15, amount));

  pop();
}

function getHandOpenness(hand) {
  const points = hand.keypoints;
  const wrist = points[0];
  const indexBase = points[5];
  const pinkyBase = points[17];

  const palmSize = dist(
    indexBase.x,
    indexBase.y,
    pinkyBase.x,
    pinkyBase.y
  );

  if (palmSize === 0) return 0;

  const fingertips = [4, 8, 12, 16, 20];
  let totalDistance = 0;

  for (const index of fingertips) {
    totalDistance += dist(
      wrist.x,
      wrist.y,
      points[index].x,
      points[index].y
    );
  }

  const averageDistance = totalDistance / fingertips.length;
  const ratio = averageDistance / palmSize;

  return constrain(map(ratio, 1.15, 2.65, 0, 1), 0, 1);
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

function drawInterface() {
  textAlign(LEFT);

  fill(228, 228, 213, 155);
  textSize(13);
  text("OPEN / V02", 38, 40);

  textAlign(RIGHT);

  fill(228, 228, 213, 110);
  textSize(12);

  if (inputMode === "mouse") {
    text("M  SWITCH TO HANDPOSE", width - 38, 40);
  } else if (modelLoading) {
    text("LOADING HANDPOSE...", width - 38, 40);
  } else {
    text("M  SWITCH TO MOUSE", width - 38, 40);
  }

  textAlign(CENTER);
  fill(228, 228, 213, 92);
  textSize(12);

  if (inputMode === "mouse") {
    text(
      "Move the mouse horizontally to unfold",
      width / 2,
      height - 26
    );
  } else if (!modelLoading && hands.length === 0) {
    text(
      "Show one hand to the camera",
      width / 2,
      height - 26
    );
  } else if (!modelLoading) {
    text(
      "Open and close your hand slowly",
      width / 2,
      height - 26
    );
  }
}