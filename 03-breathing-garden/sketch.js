let handPose;
let video;
let hands = [];

let gardenStems = [];
let breath = 0;
let targetBreath = 0;

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(900, 620);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handPose.detectStart(video, gotHands);

  randomSeed(12);

  for (let i = 0; i < 100; i++) {
    gardenStems.push({
      x: random(70, width - 70),
      height: random(0.35, 1),
      phase: random(TWO_PI),
      weight: random(0.6, 1.8),
      tone: random()
    });
  }
}

function gotHands(results) {
  hands = results;
}

function draw() {
  drawBackground();

  targetBreath = 0;

  if (hands.length >= 2) {
    const leftHand = hands[0].keypoints[0];
    const rightHand = hands[1].keypoints[0];

    const handDistance = dist(
      leftHand.x,
      leftHand.y,
      rightHand.x,
      rightHand.y
    );

    targetBreath = constrain(
      map(handDistance, 70, 520, 0, 1),
      0,
      1
    );

    drawHandConnection(leftHand, rightHand);
  }

  breath = lerp(breath, targetBreath, 0.055);

  drawGarden();
  drawInterface();
}

function drawBackground() {
  background(15, 26, 24);

  noStroke();

  fill(121, 138, 108, 14 + breath * 15);
  ellipse(width / 2, height * 0.36, 600 + breath * 220, 360);

  fill(225, 209, 173, 8 + breath * 14);
  ellipse(width / 2, height * 0.18, 280 + breath * 180, 180);

  stroke(208, 214, 190, 25);
  strokeWeight(1);
  line(65, height - 74, width - 65, height - 74);
}

function drawGarden() {
  const baseY = height - 74;
  const time = frameCount * 0.018;

  for (const stem of gardenStems) {
    const stemHeight = lerp(18, 250, breath) * stem.height;
    const sway = sin(time + stem.phase) * (4 + breath * 17);

    if (stem.tone < 0.55) {
      stroke(145, 169, 126, 35 + breath * 115);
    } else {
      stroke(205, 188, 151, 22 + breath * 86);
    }

    strokeWeight(stem.weight);
    noFill();

    beginShape();

    for (let step = 0; step <= 12; step++) {
      const progress = step / 12;
      const x =
        stem.x +
        sway * progress +
        sin(time * 0.7 + stem.phase + progress * 4) * breath * 8;

      const y = baseY - stemHeight * progress;

      curveVertex(x, y);
    }

    endShape();
  }

  if (breath > 0.12) {
    drawPollen(baseY);
  }
}

function drawPollen(baseY) {
  noStroke();

  for (let i = 0; i < 36; i++) {
    const x = (i * 83 + frameCount * (0.15 + breath * 0.35)) % width;
    const y =
      baseY -
      30 -
      ((i * 47 + frameCount * 0.22) % (60 + breath * 230));

    fill(224, 214, 177, 12 + breath * 65);
    circle(x, y, 1.2 + breath * 2.2);
  }
}

function drawHandConnection(leftHand, rightHand) {
  stroke(230, 231, 213, 45);
  strokeWeight(1);
  line(leftHand.x, leftHand.y, rightHand.x, rightHand.y);

  noStroke();
  fill(230, 231, 213, 140);
  circle(leftHand.x, leftHand.y, 7);
  circle(rightHand.x, rightHand.y, 7);
}

function drawInterface() {
  textAlign(CENTER);

  fill(230, 231, 216, 215);
  textSize(18);
  text("Let the garden breathe", width / 2, 48);

  fill(230, 231, 216, 125);
  textSize(13);
  text(
    "Bring your hands together, then slowly allow them to move apart.",
    width / 2,
    74
  );

  if (hands.length < 2) {
    fill(230, 231, 216, 135);
    textSize(14);
    text("Show both hands to the camera", width / 2, height - 48);
  }
}