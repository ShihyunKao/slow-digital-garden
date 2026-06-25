let handPose;
let video;
let hands = [];

let inkLayer;
let streams = [];
let previousPoint = null;
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

  inkLayer = createGraphics(width, height);
  inkLayer.clear();

  randomSeed(9);

  for (let i = 0; i < 420; i++) {
    grain.push({
      x: random(width),
      y: random(height),
      alpha: random(5, 18)
    });
  }
}

function gotHands(results) {
  hands = results;
}

function draw() {
  drawBackground();
  updateStreams();
  image(inkLayer, 0, 0);

  if (hands.length > 0) {
    const point = hands[0].keypoints[8];
    releaseStreams(point);

    noStroke();
    fill(229, 226, 204, 115);
    circle(point.x, point.y, 6);
  } else {
    previousPoint = null;
  }

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

function releaseStreams(point) {
  if (previousPoint === null) {
    previousPoint = { x: point.x, y: point.y };
    return;
  }

  const speed = dist(
    point.x,
    point.y,
    previousPoint.x,
    previousPoint.y
  );

  if (speed < 42 && frameCount % 2 === 0) {
    const calmness = map(speed, 0, 42, 1, 0);
    const amount = floor(lerp(1, 4, calmness));

    for (let i = 0; i < amount; i++) {
      streams.push({
        x: point.x + random(-4, 4),
        y: point.y + random(-4, 4),
        previousX: point.x,
        previousY: point.y,
        seed: random(1000),
        life: 0,
        maxLife: random(75, 175),
        speed: random(0.45, 1.15),
        weight: random(0.45, 1.6),
        tone: random()
      });
    }
  }

  previousPoint = { x: point.x, y: point.y };
}

function updateStreams() {
  for (let i = streams.length - 1; i >= 0; i--) {
    const stream = streams[i];

    stream.previousX = stream.x;
    stream.previousY = stream.y;

    const flowAngle =
      noise(
        stream.x * 0.003,
        stream.y * 0.003,
        frameCount * 0.002 + stream.seed
      ) *
      TWO_PI *
      2.2;

    stream.x += cos(flowAngle) * stream.speed;
    stream.y += sin(flowAngle) * stream.speed;
    stream.life++;

    const remaining = 1 - stream.life / stream.maxLife;
    const alpha = remaining * 65;

    if (stream.tone < 0.55) {
      inkLayer.stroke(177, 195, 153, alpha);
    } else {
      inkLayer.stroke(213, 190, 156, alpha * 0.75);
    }

    inkLayer.strokeWeight(stream.weight);
    inkLayer.line(
      stream.previousX,
      stream.previousY,
      stream.x,
      stream.y
    );

    if (
      stream.life > stream.maxLife ||
      stream.x < 0 ||
      stream.x > width ||
      stream.y < 0 ||
      stream.y > height
    ) {
      streams.splice(i, 1);
    }
  }

  if (streams.length > 850) {
    streams.splice(0, streams.length - 850);
  }
}

function drawInstruction() {
  textAlign(CENTER);

  fill(228, 228, 213, 170);
  textSize(15);
  text("Move slowly to leave a trace", width / 2, 42);

  fill(228, 228, 213, 95);
  textSize(12);

  if (hands.length === 0) {
    text("Show one hand to the camera", width / 2, height - 26);
  } else {
    text("Press R to begin again", width / 2, height - 26);
  }
}

function keyPressed() {
  if (key === "r" || key === "R") {
    inkLayer.clear();
    streams = [];
  }
}