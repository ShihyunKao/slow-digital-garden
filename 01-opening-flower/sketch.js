let handPose;
let video;
let hands = [];

let openness = 0;
let targetOpenness = 0;
let grain = [];

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(900, 620);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handPose.detectStart(video, gotHands);

  randomSeed(5);

  for (let i = 0; i < 380; i++) {
    grain.push({
      x: random(width),
      y: random(height),
      alpha: random(4, 16)
    });
  }
}

function gotHands(results) {
  hands = results;
}

function draw() {
  drawBackground();

  targetOpenness = 0;

  if (hands.length > 0) {
    const hand = hands[0];
    targetOpenness = getHandOpenness(hand);

    const palm = hand.keypoints[0];

    noStroke();
    fill(231, 228, 209, 100);
    circle(palm.x, palm.y, 7);
  }

  openness = lerp(openness, targetOpenness, 0.06);

  drawUnfoldingForm(width / 2, height * 0.55, openness);
  drawInstruction();
}

function drawBackground() {
  background(15, 24, 22);

  noStroke();

  for (const dot of grain) {
    fill(212, 216, 193, dot.alpha);
    circle(dot.x, dot.y, 1);
  }

  stroke(205, 210, 189, 24);
  strokeWeight(1);
  line(58, height - 55, width - 58, height - 55);
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

  const fingertipIndexes = [4, 8, 12, 16, 20];
  let distanceTotal = 0;

  for (const index of fingertipIndexes) {
    distanceTotal += dist(
      wrist.x,
      wrist.y,
      points[index].x,
      points[index].y
    );
  }

  const averageDistance = distanceTotal / fingertipIndexes.length;
  const ratio = averageDistance / palmSize;

  return constrain(map(ratio, 1.15, 2.65, 0, 1), 0, 1);
}

function drawUnfoldingForm(centerX, centerY, amount) {
  const lineCount = 94;
  const time = frameCount * 0.0035;

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * TWO_PI;
    const variation = noise(i * 0.13);
    const length = lerp(7, 178, amount) * (0.72 + variation * 0.38);

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
        sin(
          progress * PI * 1.4 +
            angle * 3 +
            time * 4 +
            variation * TWO_PI
        ) *
        (3 + amount * 28) *
        sin(progress * PI);

      const x =
        centerX +
        cos(angle) * radius -
        sin(angle) * drift;

      const y =
        centerY +
        sin(angle) * radius +
        cos(angle) * drift;

      curveVertex(x, y);
    }

    endShape();
  }

  noStroke();
  fill(225, 220, 195, 110 + amount * 85);
  circle(centerX, centerY, lerp(9, 21, amount));
}

function drawInstruction() {
  textAlign(CENTER);

  fill(228, 228, 213, 170);
  textSize(15);
  text("Unfold slowly", width / 2, 42);

  fill(228, 228, 213, 95);
  textSize(12);

  if (hands.length === 0) {
    text("Show one hand to the camera", width / 2, height - 26);
  } else {
    text(
      "Allow your palm to open at its own pace",
      width / 2,
      height - 26
    );
  }
}