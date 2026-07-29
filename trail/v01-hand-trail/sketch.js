let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = true;
let handDisplayMode = 1; // 0 hidden, 1 points, 2 skeleton

let inkLayer;
let streams = [];
let previousPoint = null;
let backgroundPoints = [];

const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;

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
  randomSeed(9);
  noiseSeed(9);

  inkLayer = createGraphics(width, height);
  inkLayer.clear();
  createBackgroundPoints();
}

function draw() {
  drawBackground();

  if (!showHelp) {
    updateStreams();
  }

  image(inkLayer, 0, 0);

  if (!showHelp) {
    const point = getControlPoint();

    if (point) {
      releaseStreams(point);
    } else {
      previousPoint = null;
    }

    drawHandDisplay();
    drawHeader();
    drawInstruction();
  } else {
    drawHelpScreen();
  }
}

function getControlPoint() {
  if (hands.length > 0) {
    return toCanvasPoint(hands[0].keypoints[8]);
  }

  return null;
}

function toCanvasPoint(point) {
  const sourceWidth = video ? video.width : CAMERA_WIDTH;
  const sourceHeight = video ? video.height : CAMERA_HEIGHT;

  return {
    x: point.x * (width / sourceWidth),
    y: point.y * (height / sourceHeight)
  };
}

function releaseStreams(point) {
  if (previousPoint === null) {
    previousPoint = { x: point.x, y: point.y };
    return;
  }

  const speed = dist(point.x, point.y, previousPoint.x, previousPoint.y);

  if (speed < 42 && frameCount % 2 === 0) {
    const calmness = constrain(map(speed, 0, 42, 1, 0), 0, 1);
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

function drawBackground() {
  background(9, 19, 17);
  noStroke();

  for (let y = 0; y < height; y += 5) {
    fill(30, 45, 39, map(y, 0, height, 18, 3));
    rect(0, y, width, 5);
  }

  for (const point of backgroundPoints) {
    const flicker = sin(frameCount * 0.012 + point.phase) * 0.5 + 0.5;
    fill(222, 219, 194, point.alpha * (0.65 + flicker * 0.35));
    circle(point.x, point.y, point.size);
  }

  fill(240, 232, 205, 5);
  rect(34, 34, width - 68, height - 68);
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplayMode === 0) return;

  const points = hands[0].keypoints.map(toCanvasPoint);

  if (handDisplayMode === 1) {
    const tip = points[8];
    noFill();
    stroke(234, 228, 194, 90);
    strokeWeight(1);
    circle(tip.x, tip.y, 13);
    return;
  }

  stroke(230, 226, 204, 46);
  strokeWeight(0.7);

  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(240, 231, 194, 72);

  for (const point of points) {
    circle(point.x, point.y, 3.5);
  }
}

function drawHeader() {
  const inset = 38;

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("HAND TRAIL", inset, 27);

  fill(196, 207, 188, 100);
  textSize(10);
  text("GESTURE STUDY 01 / FLOW FIELD TRACE", inset, 47);

  textAlign(RIGHT, TOP);
  fill(206, 212, 196, 120);
  textSize(11);
  const controls = modelLoading
    ? `CAMERA LOADING · P ${handDisplayLabel()} · R RESET · ? HELP`
    : `P ${handDisplayLabel()} · R RESET · ? HELP`;
  text(controls, width - inset, 30);

  stroke(232, 229, 210, 20);
  strokeWeight(1);
  line(inset, 70, width - inset, 70);
}

function drawInstruction() {
  textAlign(CENTER);
  noStroke();
  fill(228, 228, 213, 95);
  textSize(12);

  if (!modelLoading && hands.length === 0) {
    text("Show one hand to the camera.", width / 2, height - 28);
  } else if (!modelLoading) {
    text("Move your index finger slowly through the space.", width / 2, height - 28);
  }
}

function handDisplayLabel() {
  if (handDisplayMode === 0) return "HIDDEN";
  if (handDisplayMode === 1) return "POINTS";
  return "SKELETON";
}

function getHelpPanelMetrics() {
  const panelWidth = min(620, width - 40);
  const panelHeight = min(510, height - 40);

  return {
    x: (width - panelWidth) / 2,
    y: (height - panelHeight) / 2,
    width: panelWidth,
    height: panelHeight,
    buttonX: width / 2 - 92,
    buttonY: (height - panelHeight) / 2 + panelHeight - 78,
    buttonWidth: 184,
    buttonHeight: 42
  };
}

function drawHelpScreen() {
  const panel = getHelpPanelMetrics();
  const compact = panel.height < 440;
  const left = panel.x + (compact ? 34 : 54);
  const contentWidth = panel.width - (compact ? 68 : 108);

  noStroke();
  fill(5, 12, 11, 205);
  rect(0, 0, width, height);

  drawingContext.save();
  drawingContext.shadowBlur = 40;
  drawingContext.shadowColor = "rgba(0, 0, 0, 0.45)";
  fill(15, 29, 25, 246);
  stroke(177, 192, 167, 52);
  strokeWeight(1);
  rect(panel.x, panel.y, panel.width, panel.height, 4);
  drawingContext.restore();

  noStroke();
  textAlign(LEFT, TOP);
  fill(174, 191, 166, 180);
  textSize(11);
  text("GESTURE STUDY 01", left, panel.y + (compact ? 25 : 38));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Hand Trail", left, panel.y + (compact ? 48 : 68));

  fill(201, 207, 191, 175);
  textSize(compact ? 13 : 15);
  textLeading(compact ? 19 : 22);
  text(
    "A moving fingertip releases fine streams that follow an invisible flow field and gradually form a layered drawing.",
    left,
    panel.y + (compact ? 90 : 120),
    contentWidth
  );

  const stepsY = panel.y + (compact ? 128 : 174);
  const gap = compact ? 42 : 54;
  drawHelpStep("01", "Select Begin to activate the camera.", left, stepsY);
  drawHelpStep("02", "Move one index finger slowly through the space.", left, stepsY + gap);
  drawHelpStep("03", "Let the flow field carry each trace onwards.", left, stepsY + gap * 2);

  fill(174, 191, 166, 135);
  textSize(11);
  text("P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - (compact ? 31 : 40));

  const hovering =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  cursor(hovering ? HAND : ARROW);
  fill(hovering ? color(220, 224, 203, 235) : color(188, 202, 178, 210));
  rect(panel.buttonX, panel.buttonY, panel.buttonWidth, panel.buttonHeight, 2);

  fill(18, 31, 27, 245);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("BEGIN", width / 2, panel.buttonY + panel.buttonHeight / 2);

  fill(205, 210, 194, 105);
  textSize(10);
  text("or press Enter / Space", width / 2, panel.buttonY + panel.buttonHeight + 16);
}

function drawHelpStep(number, label, x, y) {
  fill(174, 191, 166, 125);
  textAlign(LEFT, TOP);
  textSize(10);
  text(number, x, y + 2);

  fill(229, 228, 211, 205);
  textSize(13);
  text(label, x + 38, y);
}

function keyPressed() {
  if (key === "?" || keyCode === 191) {
    if (showHelp) {
      beginExperience();
    } else {
      showHelp = true;
    }
    return false;
  }

  if (showHelp && (keyCode === ENTER || key === " " || keyCode === ESCAPE)) {
    beginExperience();
    return false;
  }

  if (showHelp) return false;

  if (key === "p" || key === "P") {
    handDisplayMode = (handDisplayMode + 1) % 3;
  }

  if (key === "r" || key === "R") {
    inkLayer.clear();
    streams = [];
    previousPoint = null;
  }
}

function mousePressed() {
  if (!showHelp) return;

  const panel = getHelpPanelMetrics();
  const insideButton =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  if (insideButton) beginExperience();
}

function beginExperience() {
  showHelp = false;

  if (!video && !modelLoading) {
    startHandMode();
  }
}

function startHandMode() {
  if (video || modelLoading) return;

  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];
  previousPoint = null;

  video = createCapture(
    {
      video: {
        width: { ideal: CAMERA_WIDTH },
        height: { ideal: CAMERA_HEIGHT },
        frameRate: { ideal: 30, max: 30 }
      },
      audio: false
    },
    () => {
      videoReady = true;
      tryStartDetection();
    }
  );

  video.size(CAMERA_WIDTH, CAMERA_HEIGHT);
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

function createBackgroundPoints() {
  backgroundPoints = [];

  for (let i = 0; i < 100; i++) {
    backgroundPoints.push({
      x: random(width),
      y: random(height),
      size: random(0.5, 1.7),
      alpha: random(4, 16),
      phase: random(TWO_PI)
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  inkLayer = createGraphics(width, height);
  inkLayer.clear();
  streams = [];
  previousPoint = null;
  createBackgroundPoints();
}
