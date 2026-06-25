let handPose;
let video;
let hands = [];

let breath = 0;
let targetBreath = 0;
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

  randomSeed(18);

  for (let i = 0; i < 320; i++) {
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

  targetBreath = 0;

  if (hands.length >= 2) {
    const firstHand = hands[0].keypoints[0];
    const secondHand = hands[1].keypoints[0];

    const handDistance = dist(
      firstHand.x,
      firstHand.y,
      secondHand.x,
      secondHand.y
    );

    targetBreath = constrain(
      map(handDistance, 70, 540, 0, 1),
      0,
      1
    );

    drawHandMarkers(firstHand, secondHand);
  }

  breath = lerp(breath, targetBreath, 0.045);

  drawContourGarden();
  drawInstruction();
}

function drawBackground() {
  background(15, 24, 22);

  noStroke();

  for (const dot of grain) {
    fill(211, 215, 194, dot.alpha);
    circle(dot.x, dot.y, 1);
  }

  stroke(205, 210, 189, 24);
  strokeWeight(1);
  line(58, height - 55, width - 58, height - 55);
}

function drawContourGarden() {
  const centerX = width / 2;
  const centerY = height * 0.56;
  const spread = lerp(10, 210, breath);
  const widthScale = lerp(65, width * 0.88, breath);
  const time = frameCount * 0.004;

  noFill();

  for (let i = 0; i < 78; i++) {
    const band = map(i, 0, 77, -1, 1);
    const verticalPosition = centerY + band * spread;
    const curveWidth =
      widthScale * (0.58 + 0.42 * (1 - abs(band)));

    const warmTone = noise(i * 0.14) > 0.62;

    if (warmTone) {
      stroke(214, 193, 158, 18 + breath * 45);
    } else {
      stroke(169, 192, 154, 22 + breath * 64);
    }

    strokeWeight(0.55 + (1 - abs(band)) * 0.75);

    beginShape();

    for (let step = 0; step <= 80; step++) {
      const u = map(step, 0, 80, -1, 1);
      const edge = 1 - u * u;

      const wave =
        sin(u * 6 + i * 0.19 + time * 5) *
        (1.5 + breath * 4.5);

      const subtleNoise =
        noise(
          step * 0.075,
          i * 0.08,
          time + i * 0.01
        ) *
          5 -
        2.5;

      const x = centerX + u * curveWidth;
      const y =
        verticalPosition +
        wave * edge +
        subtleNoise * edge +
        band * edge * breath * 18;

      curveVertex(x, y);
    }

    endShape();
  }
}

function drawHandMarkers(firstHand, secondHand) {
  noStroke();

  fill(231, 228, 209, 110);
  circle(firstHand.x, firstHand.y, 7);
  circle(secondHand.x, secondHand.y, 7);

  stroke(231, 228, 209, 24);
  strokeWeight(1);
  line(firstHand.x, firstHand.y, secondHand.x, secondHand.y);
}

function drawInstruction() {
  textAlign(CENTER);

  fill(228, 228, 213, 170);
  textSize(15);
  text("Let the field expand", width / 2, 42);

  fill(228, 228, 213, 95);
  textSize(12);

  if (hands.length < 2) {
    text("Show both hands to the camera", width / 2, height - 26);
  } else {
    text(
      "Bring your hands close, then slowly allow them to move apart",
      width / 2,
      height - 26
    );
  }
}