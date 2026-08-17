let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let helpVisible = false;
let handDisplay = 1;

let nodes = [];
let smoothPoint = null;
let lastNodePoint = null;
let dwellFrames = 0;
let lastAnchorFrame = -1000;
let anchorCounter = 0;
let paperMarks = [];

const VARIANT = window.TRAIL_V03_SURVEY_VARIANT;
const MAX_NODES = 120;
const NODE_SPACING = 29;
const DWELL_FRAMES = 7;
const STILL_SPEED = 2.1;
const ANCHOR_COOLDOWN = 60;
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  randomSeed(603);
  noiseSeed(603);
  createPaperMarks();

  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);

  startHandMode();
}

function draw() {
  drawSurveyPaper();
  drawPath();

  if (!helpVisible) {
    updatePath();
    drawHandDisplay();
  }

  syncHelpOverlay();
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !helpVisible;
  overlay.setAttribute("aria-hidden", String(!helpVisible));
}

// Smoothing, point spacing, dwell time and anchor cooldown match v03.00.
function updatePath() {
  const rawPoint = getControlPoint();

  if (!rawPoint) {
    smoothPoint = null;
    lastNodePoint = null;
    dwellFrames = 0;
    return;
  }

  if (smoothPoint === null) {
    smoothPoint = { x: rawPoint.x, y: rawPoint.y };
    lastNodePoint = { x: rawPoint.x, y: rawPoint.y };
    return;
  }

  const previous = { x: smoothPoint.x, y: smoothPoint.y };
  smoothPoint.x = lerp(smoothPoint.x, rawPoint.x, 0.34);
  smoothPoint.y = lerp(smoothPoint.y, rawPoint.y, 0.34);

  const speed = dist(previous.x, previous.y, smoothPoint.x, smoothPoint.y);
  const slowRange = constrain(map(speed, 0.7, 12, 1, 0), 0, 1);
  const slowness = lerp(0.06, 1, pow(slowRange, 1.75));
  const distanceFromLastNode = dist(
    smoothPoint.x,
    smoothPoint.y,
    lastNodePoint.x,
    lastNodePoint.y
  );

  const spacing = lerp(NODE_SPACING + 8, NODE_SPACING - 7, slowness);

  if (distanceFromLastNode > spacing) {
    addNode(smoothPoint, slowness, false);
    dwellFrames = 0;
  } else if (speed < STILL_SPEED) {
    dwellFrames++;

    if (
      dwellFrames >= DWELL_FRAMES &&
      frameCount - lastAnchorFrame > ANCHOR_COOLDOWN &&
      distanceFromLastNode > 10
    ) {
      addNode(smoothPoint, 1, true);
      lastAnchorFrame = frameCount;
      dwellFrames = 0;
    }
  } else {
    dwellFrames = 0;
  }
}

function getControlPoint() {
  if (hands.length > 0) {
    const tip = hands[0].keypoints[8];
    return { x: tip.x, y: tip.y };
  }

  return null;
}

function addNode(point, slowness, anchor) {
  const contourTotal = anchor
    ? floor(random(VARIANT.contourCount[0], VARIANT.contourCount[1] + 1))
    : 0;
  const contours = [];

  for (let i = 0; i < contourTotal; i++) {
    contours.push({
      radius: 18 + i * random(7, 11),
      aspect: random(0.55, 0.92),
      rotation: random(-0.65, 0.65),
      offsetX: random(-5, 5),
      offsetY: random(-4, 4),
      seed: random(1000)
    });
  }

  if (anchor) anchorCounter++;

  nodes.push({
    x: point.x,
    y: point.y,
    size: anchor ? random(8.5, 11.5) : lerp(1.5, 6.3, slowness),
    alpha: anchor ? 225 : lerp(24, 190, slowness),
    slowness,
    anchor,
    anchorNumber: anchor ? anchorCounter : null,
    born: frameCount,
    seed: random(1000),
    tickAngle: random(TWO_PI),
    contours
  });

  lastNodePoint = { x: point.x, y: point.y };

  if (nodes.length > MAX_NODES) {
    nodes.shift();
  }
}

function drawPath() {
  drawConnections();

  for (const node of nodes) {
    const appear = constrain((frameCount - node.born) / 15, 0, 1);
    drawSurveyNode(node, appear);
  }
}

function drawConnections() {
  if (nodes.length < 2) return;

  const green = VARIANT.palette.green;
  const graphite = VARIANT.palette.graphite;
  noFill();

  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1];
    const b = nodes[i];
    const linkAge = frameCount - b.born - VARIANT.linkDelay;
    if (linkAge <= 0) continue;

    const appear = constrain(linkAge / 20, 0, 1);
    const linkStrength = (a.slowness + b.slowness) * 0.5;
    const dashLength = 3 + linkStrength * 4;

    drawingContext.save();
    drawingContext.setLineDash([dashLength, 2.5]);
    stroke(green[0], green[1], green[2], (48 + linkStrength * 80) * appear);
    strokeWeight(0.55 + linkStrength * 0.28);
    line(a.x, a.y, b.x, b.y);
    drawingContext.restore();

    if (i % 4 === 0) {
      const mx = lerp(a.x, b.x, 0.5);
      const my = lerp(a.y, b.y, 0.5);
      const angle = atan2(b.y - a.y, b.x - a.x) + HALF_PI;
      stroke(graphite[0], graphite[1], graphite[2], 62 * appear);
      strokeWeight(0.45);
      line(mx + cos(angle) * 3, my + sin(angle) * 3, mx - cos(angle) * 3, my - sin(angle) * 3);
    }
  }
}

function drawSurveyNode(node, appear) {
  if (node.anchor) {
    drawLocalContours(node, appear);
    drawAnchorMarker(node, appear);
    return;
  }

  const green = VARIANT.palette.green;
  const graphite = VARIANT.palette.graphite;
  const red = VARIANT.palette.red;
  const radius = lerp(1.2, 3.1, node.slowness) * appear;

  stroke(green[0], green[1], green[2], node.alpha * appear * 0.68);
  strokeWeight(0.55);
  line(node.x - radius * 2.2, node.y, node.x + radius * 2.2, node.y);
  line(node.x, node.y - radius * 2.2, node.x, node.y + radius * 2.2);

  noFill();
  stroke(graphite[0], graphite[1], graphite[2], node.alpha * appear * 0.54);
  circle(node.x, node.y, radius * 2.4);

  noStroke();
  const accent = floor(node.seed) % 11 === 0;
  fill(
    accent ? red[0] : green[0],
    accent ? red[1] : green[1],
    accent ? red[2] : green[2],
    node.alpha * appear * 0.86
  );
  circle(node.x, node.y, max(1.2, radius * 0.8));
}

function drawLocalContours(node, appear) {
  const green = VARIANT.palette.greenLight;
  noFill();

  for (let contourIndex = 0; contourIndex < node.contours.length; contourIndex++) {
    const contour = node.contours[contourIndex];
    const contourAppear = constrain(
      (frameCount - node.born - 8 - contourIndex * 5) / 18,
      0,
      1
    ) * appear;
    if (contourAppear <= 0) continue;

    stroke(green[0], green[1], green[2], (50 - contourIndex * 4) * contourAppear);
    strokeWeight(0.48);
    beginShape();

    for (let angle = 0; angle < TWO_PI + 0.01; angle += TWO_PI / 52) {
      const uneven = map(
        noise(contour.seed + cos(angle) * 1.8, contour.seed + sin(angle) * 1.8),
        0,
        1,
        0.82,
        1.18
      );
      const px = cos(angle) * contour.radius * uneven;
      const py = sin(angle) * contour.radius * contour.aspect * uneven;
      const rotatedX = px * cos(contour.rotation) - py * sin(contour.rotation);
      const rotatedY = px * sin(contour.rotation) + py * cos(contour.rotation);

      curveVertex(
        node.x + contour.offsetX + rotatedX,
        node.y + contour.offsetY + rotatedY
      );
    }

    endShape(CLOSE);
  }
}

function drawAnchorMarker(node, appear) {
  const green = VARIANT.palette.green;
  const graphite = VARIANT.palette.graphite;
  const red = VARIANT.palette.red;
  const markerRadius = node.size * 1.45 * appear;

  noFill();
  stroke(graphite[0], graphite[1], graphite[2], 180 * appear);
  strokeWeight(0.8);
  circle(node.x, node.y, markerRadius * 2.5);
  circle(node.x, node.y, markerRadius * 1.2);

  stroke(green[0], green[1], green[2], 160 * appear);
  strokeWeight(0.55);
  line(node.x - markerRadius * 2, node.y, node.x + markerRadius * 2, node.y);
  line(node.x, node.y - markerRadius * 2, node.x, node.y + markerRadius * 2);

  stroke(red[0], red[1], red[2], 205 * appear);
  strokeWeight(1.15);
  line(
    node.x + markerRadius * 0.9,
    node.y - markerRadius * 1.25,
    node.x + markerRadius * 1.55,
    node.y - markerRadius * 1.9
  );

  noStroke();
  fill(red[0], red[1], red[2], 220 * appear);
  circle(node.x, node.y, 2.8 * appear);

  const labelX = constrain(node.x + markerRadius * 2.2, 24, width - 130);
  const labelY = constrain(node.y - markerRadius * 2.4, 96, height - 70);
  textAlign(LEFT, BOTTOM);
  textSize(9);
  fill(graphite[0], graphite[1], graphite[2], 175 * appear);
  const anchorLabel = `P-${String(node.anchorNumber).padStart(2, "0")}`;
  text(anchorLabel, labelX, labelY);

  fill(green[0], green[1], green[2], 118 * appear);
  textSize(8);
  text(`X${round(node.x)} / Y${round(node.y)}`, labelX, labelY + 12);
}

function createPaperMarks() {
  paperMarks = [];
  randomSeed(3101);

  for (let i = 0; i < 170; i++) {
    paperMarks.push({
      x: random(width),
      y: random(height),
      length: random(2, 12),
      alpha: random(4, 13),
      angle: random(-0.18, 0.18)
    });
  }
}

function drawSurveyPaper() {
  const paper = VARIANT.palette.paper;
  const paperShadow = VARIANT.palette.paperShadow;
  const green = VARIANT.palette.green;
  const graphite = VARIANT.palette.graphite;
  const liveInset = constrain(windowWidth * 0.032, 24, 52);
  background(paper[0], paper[1], paper[2]);

  stroke(green[0], green[1], green[2], 17);
  strokeWeight(0.45);
  for (let x = VARIANT.gridSize; x < width; x += VARIANT.gridSize) {
    line(x, 0, x, height);
  }
  for (let y = VARIANT.gridSize; y < height; y += VARIANT.gridSize) {
    line(0, y, width, y);
  }

  stroke(green[0], green[1], green[2], 31);
  strokeWeight(0.7);
  for (let x = VARIANT.gridSize * 4; x < width; x += VARIANT.gridSize * 4) {
    line(x, 82, x, 90);
    line(x, height - 90, x, height - 82);
  }

  for (const mark of paperMarks) {
    stroke(paperShadow[0], paperShadow[1], paperShadow[2], mark.alpha);
    strokeWeight(0.5);
    line(
      mark.x,
      mark.y,
      mark.x + cos(mark.angle) * mark.length,
      mark.y + sin(mark.angle) * mark.length
    );
  }

  textAlign(LEFT, TOP);
  noStroke();
  fill(graphite[0], graphite[1], graphite[2], 66);
  textSize(8);
  text("DATUM 03 / BODY POSITION SURVEY", liveInset, 92);
  text("SCALE 1:1 / LIVE COORDINATES", liveInset, 106);

  textAlign(RIGHT, TOP);
  fill(green[0], green[1], green[2], 64);
  text(`FIELD ${width} × ${height}`, width - liveInset, 92);
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplay === 0) return;

  const points = hands[0].keypoints;
  const green = VARIANT.palette.green;
  const red = VARIANT.palette.red;

  if (handDisplay === 1) {
    const tip = points[8];
    noFill();
    stroke(red[0], red[1], red[2], 112);
    strokeWeight(0.9);
    circle(tip.x, tip.y, 13);
    line(tip.x - 9, tip.y, tip.x + 9, tip.y);
    line(tip.x, tip.y - 9, tip.x, tip.y + 9);
    return;
  }

  stroke(green[0], green[1], green[2], 58);
  strokeWeight(0.7);
  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(green[0], green[1], green[2], 88);
  for (const point of points) {
    circle(point.x, point.y, 3.5);
  }
}

function keyPressed() {
  if (key === "?" || keyCode === 191) {
    if (helpVisible) {
      beginExperience();
    } else {
      helpVisible = true;
    }
    return false;
  }

  if (helpVisible && (keyCode === ENTER || key === " " || keyCode === ESCAPE)) {
    beginExperience();
    return false;
  }

  if (helpVisible) return false;

  if (key === "p" || key === "P") {
    handDisplay = (handDisplay + 1) % 3;
  }

  if (key === "r" || key === "R") {
    resetPath();
  }
}

function mousePressed() {
  if (helpVisible) return false;
}

function beginExperience() {
  helpVisible = false;
  syncHelpOverlay();
  cursor(ARROW);

  if (!video && !modelLoading) {
    startHandMode();
  }
}

function resetPath() {
  nodes = [];
  smoothPoint = null;
  lastNodePoint = null;
  dwellFrames = 0;
  lastAnchorFrame = -1000;
  anchorCounter = 0;
}

function startHandMode() {
  if (video || modelLoading) return;

  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];
  smoothPoint = null;
  lastNodePoint = null;

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
  if (modelReady && videoReady && !detectionStarted) {
    handPose.detectStart(video, gotHands);
    detectionStarted = true;
  }
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createPaperMarks();
  resetPath();
}
