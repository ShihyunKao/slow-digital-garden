let handPose;
let video;
let hands = [];

let flowerOpen = 0;
let targetOpen = 0;

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(800, 600);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handPose.detectStart(video, gotHands);
}

function gotHands(results) {
  hands = results;
}

function draw() {
  background(30, 43, 40);

  drawCameraBackground();
  drawGardenBackground();

  targetOpen = 0;

  if (hands.length > 0) {
    const hand = hands[0];
    const openness = getHandOpenness(hand);

    targetOpen = openness;
    drawHandPoints(hand);
  }

  flowerOpen = lerp(flowerOpen, targetOpen, 0.08);

  drawFlower(width / 2, height / 2 + 40, flowerOpen);
  drawText();
}

function drawCameraBackground() {
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(185, 205, 190, 60);
  image(video, 0, 0, width, height);
  pop();

  fill(20, 35, 31, 150);
  rect(0, 0, width, height);
}

function drawGardenBackground() {
  noStroke();

  for (let i = 0; i < 18; i++) {
    const x = (i * 71) % width;
    const y = height - 40 - (i % 4) * 28;

    fill(82, 112, 82, 45);
    ellipse(x, y, 90, 40);
  }
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

  const tipIndexes = [4, 8, 12, 16, 20];
  let totalDistance = 0;

  for (let index of tipIndexes) {
    totalDistance += dist(
      wrist.x,
      wrist.y,
      points[index].x,
      points[index].y
    );
  }

  const averageDistance = totalDistance / tipIndexes.length;
  const opennessRatio = averageDistance / palmSize;

  // Closed hand = 0, open palm = 1
  return constrain(map(opennessRatio, 1.15, 2.65, 0, 1), 0, 1);
}

function drawFlower(x, y, openness) {
  const petalLength = lerp(12, 128, openness);
  const petalWidth = lerp(8, 54, openness);
  const petalCount = 8;

  // Stem
  stroke(105, 151, 102);
  strokeWeight(7);
  line(x, y + 25, x, height);

  // Leaves
  noStroke();
  fill(105, 151, 102, 190);
  ellipse(x - 35, y + 115, 72, 25);
  ellipse(x + 35, y + 150, 72, 25);

  // Petals
  push();
  translate(x, y);

  for (let i = 0; i < petalCount; i++) {
    push();
    rotate((TWO_PI / petalCount) * i);

    fill(230, 169 + openness * 45, 176, 220);
    ellipse(petalLength * 0.48, 0, petalLength, petalWidth);

    pop();
  }

  fill(235, 190, 98);
  ellipse(0, 0, lerp(16, 44, openness));

  pop();
}

function drawHandPoints(hand) {
  const points = hand.keypoints;

  noStroke();
  fill(239, 237, 220, 180);

  for (let point of points) {
    circle(point.x, point.y, 7);
  }
}

function drawText() {
  fill(239, 237, 220);
  textAlign(CENTER);

  textSize(22);
  text("Open your hand slowly", width / 2, 48);

  textSize(14);
  fill(239, 237, 220, 180);
  text("The flower grows with a gentle, open palm.", width / 2, 75);

  if (hands.length === 0) {
    textSize(16);
    fill(239, 237, 220, 220);
    text("Show one hand to the camera", width / 2, height - 32);
  }
}