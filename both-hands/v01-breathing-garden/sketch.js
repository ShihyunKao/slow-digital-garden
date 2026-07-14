let handPose;
let video;
let hands = [];

let breath = 0;
let targetBreath = 0;
let grain = [];
const MIN_HAND_DISTANCE = 28;
const MAX_HAND_DISTANCE = 440;

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
    // Index fingertips make the gesture map to what the visitor feels:
    // when fingertips touch, the field can fully close.
    const firstHand = hands[0].keypoints[8];
    const secondHand = hands[1].keypoints[8];

    const handDistance = dist(
      firstHand.x,
      firstHand.y,
      secondHand.x,
      secondHand.y
    );

    const rawBreath = constrain(
      map(handDistance, MIN_HAND_DISTANCE, MAX_HAND_DISTANCE, 0, 1),
      0,
      1
    );

    // Keep the centre closed for a little longer, then open smoothly.
    targetBreath = smoothstep(0.06, 0.9, rawBreath);

    drawHandMarkers(firstHand, secondHand);
  }

  breath = lerp(breath, targetBreath, 0.1);

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
  const easedBreath = easeInOutCubic(breath);
  const activeBands = max(1, floor(lerp(1, 54, easedBreath)));
  const spread = lerp(2, height * 0.27, easedBreath);
  const widthScale = lerp(5, width * 0.64, easedBreath);
  const time = frameCount * 0.004;

  noFill();

  for (let i = 0; i < activeBands; i++) {
    const band = activeBands === 1 ? 0 : map(i, 0, activeBands - 1, -1, 1);
    const verticalPosition = centerY + band * spread;
    const curveWidth =
      widthScale * (0.58 + 0.42 * (1 - abs(band)));

    const warmTone = noise(i * 0.14) > 0.62;

    if (warmTone) {
      stroke(214, 193, 158, 10 + easedBreath * 45);
    } else {
      stroke(169, 192, 154, 12 + easedBreath * 64);
    }

    strokeWeight(0.4 + (1 - abs(band)) * 0.65);

    beginShape();

    for (let step = 0; step <= 80; step++) {
      const u = map(step, 0, 80, -1, 1);
      const edge = 1 - u * u;

      const wave =
        sin(u * 6 + i * 0.19 + time * 5) *
        (1.5 + easedBreath * 4.8);

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
        band * edge * easedBreath * 14;

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
      "Touch your index fingertips, then slowly allow them to move apart",
      width / 2,
      height - 26
    );
  }
}

function smoothstep(edge0, edge1, value) {
  const t = constrain((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - pow(-2 * t + 2, 3) / 2;
}
