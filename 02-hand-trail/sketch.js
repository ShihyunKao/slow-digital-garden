let handPose;
let video;
let hands = [];

let gardenLayer;
let previousPoint = null;
let lastLeafFrame = 0;

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(900, 620);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handPose.detectStart(video, gotHands);

  gardenLayer = createGraphics(width, height);
  gardenLayer.clear();
}

function gotHands(results) {
  hands = results;
}

function draw() {
  drawBackground();
  image(gardenLayer, 0, 0);

  if (hands.length > 0) {
    const indexTip = hands[0].keypoints[8];
    growTrail(indexTip);

    noStroke();
    fill(224, 228, 204, 170);
    circle(indexTip.x, indexTip.y, 8);
  } else {
    previousPoint = null;
  }

  drawInterface();
}

function drawBackground() {
  background(16, 28, 25);

  noStroke();
  fill(78, 99, 80, 20);
  ellipse(width * 0.2, height * 0.82, 580, 230);

  fill(157, 169, 130, 12);
  ellipse(width * 0.78, height * 0.2, 500, 320);

  stroke(207, 213, 188, 24);
  strokeWeight(1);
  line(70, height - 92, width - 70, height - 92);
}

function growTrail(point) {
  if (previousPoint === null) {
    previousPoint = { x: point.x, y: point.y };
    return;
  }

  const speed = dist(point.x, point.y, previousPoint.x, previousPoint.y);

  if (speed < 52) {
    const calmness = map(speed, 0, 52, 1, 0);
    const strokeSize = lerp(1.1, 3.8, calmness);

    gardenLayer.stroke(177, 191, 145, 70 + calmness * 95);
    gardenLayer.strokeWeight(strokeSize);
    gardenLayer.line(
      previousPoint.x,
      previousPoint.y,
      point.x,
      point.y
    );

    const leafInterval = floor(lerp(34, 12, calmness));

    if (frameCount - lastLeafFrame > leafInterval) {
      const angle = atan2(
        point.y - previousPoint.y,
        point.x - previousPoint.x
      );

      drawLeaf(point.x, point.y, angle, calmness);
      lastLeafFrame = frameCount;
    }
  }

  previousPoint = { x: point.x, y: point.y };
}

function drawLeaf(x, y, angle, calmness) {
  const size = lerp(7, 18, calmness);
  const side = random() > 0.5 ? 1 : -1;

  gardenLayer.push();
  gardenLayer.translate(x, y);
  gardenLayer.rotate(angle + side * HALF_PI);

  gardenLayer.noStroke();
  gardenLayer.fill(195, 202, 159, 75 + calmness * 100);
  gardenLayer.ellipse(size * 0.45, 0, size * 1.8, size * 0.48);

  gardenLayer.fill(223, 190, 155, 48 + calmness * 55);
  gardenLayer.ellipse(size * 0.8, 0, size * 0.62, size * 0.25);

  gardenLayer.pop();
}

function drawInterface() {
  textAlign(CENTER);

  fill(230, 231, 216, 215);
  textSize(18);
  text("Leave a trace slowly", width / 2, 48);

  fill(230, 231, 216, 125);
  textSize(13);
  text(
    "Move one index finger through the space. Slow movement lets the garden grow.",
    width / 2,
    74
  );

  if (hands.length === 0) {
    fill(230, 231, 216, 135);
    textSize(14);
    text("Show one hand to the camera", width / 2, height - 48);
  }
}

function keyPressed() {
  if (key === "r" || key === "R") {
    gardenLayer.clear();
  }
}