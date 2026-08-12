let handPose;
let video;
let hands = [];

let breath = 0;
let targetBreath = 0;
const MIN_HAND_DISTANCE = 28;
const MAX_HAND_DISTANCE = 440;

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;
let showHelp = false;
let handDisplayMode = 1; // Default POINTS; P cycles POINTS → SKELETON → HIDDEN

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
  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);
  beginExperience();
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

  }

  breath = lerp(breath, targetBreath, 0.1);

  drawContourGarden();
  drawHandDisplay();
  drawInterface();
}

function drawBackground() {
  clear();
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (video) video.size(width, height);
}

function drawHandDisplay() {
  if (handDisplayMode === 0 || hands.length === 0) return;

  for (const hand of hands) {
    const points = hand.keypoints;

    if (handDisplayMode === 2) {
      stroke(230, 226, 204, 58);
      strokeWeight(0.75);
      noFill();

      for (const [a, b] of HAND_CONNECTIONS) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    noStroke();
    fill(246, 238, 198, 92);
    const visible = handDisplayMode === 1 ? [8] : points.map((_, index) => index);

    for (const index of visible) {
      circle(points[index].x, points[index].y, handDisplayMode === 1 ? 7 : 3.5);
    }
  }
}

function drawInterface() {
  syncHelpOverlay();
  if (!showHelp) cursor(ARROW);
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
}

function drawExhibitionCaption() {
  cursor(ARROW);
  const inset = 28;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("BREATHING GARDEN", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 01.00 / CONTOUR BREATHING FIELD", inset, 47);

  textAlign(RIGHT, TOP);
  fill(211, 216, 198, 128);
  textSize(10);
  text(`${modelLoading ? "CAMERA LOADING · " : ""}P ${display}   ·   R RESET   ·   ? HELP`, width - inset, 32);

  stroke(199, 210, 188, 25);
  strokeWeight(1);
  line(inset, 66, width - inset, 66);
}

function getHelpPanelMetrics() {
  const panelWidth = min(840, width - 40);
  const panelHeight = min(540, height - 40);
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
  const compact = panel.width < 740 || panel.height < 500;
  const left = panel.x + (compact ? 34 : 56);
  const rightEdge = panel.x + panel.width - (compact ? 34 : 56);

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
  text("GESTURE STUDY 01.00", left, panel.y + (compact ? 24 : 36));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Breathing Garden", left, panel.y + (compact ? 46 : 65));

  if (compact) {
    drawCompactHelp(panel, left, rightEdge - left);
  } else {
    drawEditorialHelp(panel, left, rightEdge);
  }

  const hovering =
    mouseX >= panel.buttonX && mouseX <= panel.buttonX + panel.buttonWidth &&
    mouseY >= panel.buttonY && mouseY <= panel.buttonY + panel.buttonHeight;

  cursor(hovering ? HAND : ARROW);
  noStroke();
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

function drawEditorialHelp(panel, left, rightEdge) {
  const dividerX = panel.x + panel.width * 0.59;
  const right = dividerX + 38;
  const rightWidth = rightEdge - right;

  fill(201, 207, 191, 175);
  textAlign(LEFT, TOP);
  textSize(15);
  textLeading(22);
  text(
    "A two-hand opening gesture grows a live contour field through slow expansion and return.",
    left,
    panel.y + 118,
    dividerX - left - 46
  );

  const stepsY = panel.y + 198;
  const gap = 58;
  drawHelpStep("01", "Select Begin, allow the camera, and touch index fingertips.", left, stepsY);
  drawHelpStep("02", "Open both hands slowly to expand the contour field.", left, stepsY + gap);
  drawHelpStep("03", "Return to the centre and begin another cycle.", left, stepsY + gap * 2);

  stroke(178, 193, 169, 35);
  strokeWeight(1);
  line(dividerX, panel.y + 112, dividerX, panel.buttonY - 42);

  noStroke();
  fill(174, 191, 166, 120);
  textAlign(LEFT, TOP);
  textSize(10);
  text("READING THE ARCHIVE", right, panel.y + 120);

  fill(201, 207, 191, 145);
  textSize(12);
  textLeading(18);
  text(
    "This first study does not save individual traces yet. It establishes the near-closed centre and slow expansion that later versions turn into memory.",
    right,
    panel.y + 146,
    rightWidth
  );

  const legendY = panel.y + 246;
  const legendGap = 40;
  drawArchiveLegendRow("01", "DISTANCE", "index fingertips", right, legendY, rightWidth);
  drawArchiveLegendRow("02", "SCALE", "field expansion", right, legendY + legendGap, rightWidth);
  drawArchiveLegendRow("03", "CONTOURS", "layered response", right, legendY + legendGap * 2, rightWidth);
  drawArchiveLegendRow("04", "RETURN", "near-closed centre", right, legendY + legendGap * 3, rightWidth);

  textAlign(LEFT, TOP);
  fill(174, 191, 166, 125);
  textSize(10);
  text("P  HAND DISPLAY     R  RESET FIELD     ?  HELP", left, panel.buttonY - 37);
}

function drawCompactHelp(panel, left, contentWidth) {
  fill(201, 207, 191, 165);
  textAlign(LEFT, TOP);
  textSize(12);
  textLeading(17);
  text(
    "A live two-hand contour field. This first study does not save individual traces yet.",
    left,
    panel.y + 86,
    contentWidth
  );

  const stepsY = panel.y + 126;
  const gap = 39;
  drawHelpStep("01", "Begin with index fingertips together.", left, stepsY);
  drawHelpStep("02", "Open slowly to expand the field.", left, stepsY + gap);
  drawHelpStep("03", "Return and repeat the cycle.", left, stepsY + gap * 2);

  const keyY = stepsY + gap * 3 + 5;
  fill(174, 191, 166, 115);
  textSize(10);
  text("DISTANCE / FINGERTIPS     SCALE / FIELD EXPANSION", left, keyY);
  text("CONTOURS / LAYERED RESPONSE     RETURN / CLOSED CENTRE", left, keyY + 18);

  fill(174, 191, 166, 120);
  textSize(9);
  text("P  HAND DISPLAY     R  RESET     ?  HELP", left, panel.buttonY - 28);
}

function drawArchiveLegendRow(number, label, description, x, y, rowWidth) {
  stroke(178, 193, 169, 30);
  strokeWeight(1);
  line(x, y - 10, x + rowWidth, y - 10);

  noStroke();
  textAlign(LEFT, TOP);
  fill(174, 191, 166, 90);
  textSize(9);
  text(number, x, y + 2);

  fill(230, 229, 211, 205);
  textSize(11);
  text(label, x + 34, y);

  fill(184, 195, 179, 145);
  textSize(10);
  textAlign(RIGHT, TOP);
  text(description, x + rowWidth, y + 1);
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
    if (showHelp) beginExperience();
    else showHelp = true;
    return false;
  }

  if (showHelp && (keyCode === ENTER || key === " " || keyCode === ESCAPE)) {
    beginExperience();
    return false;
  }

  if (showHelp) return false;

  if (key === "p" || key === "P") handDisplayMode = (handDisplayMode + 1) % 3;
  if (key === "r" || key === "R") resetBreathingField();
}

function mousePressed() {
  if (showHelp) return false;
}

function beginExperience() {
  showHelp = false;
  syncHelpOverlay();
  cursor(ARROW);
  startHandMode();
}

function resetBreathingField() {
  breath = 0;
  targetBreath = 0;
}

function startHandMode() {
  if (video || modelLoading || detectionStarted) return;

  modelLoading = true;
  modelReady = false;
  videoReady = false;
  detectionStarted = false;
  hands = [];

  video = createCapture(
    {
      video: {
        width,
        height
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

function smoothstep(edge0, edge1, value) {
  const t = constrain((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - pow(-2 * t + 2, 3) / 2;
}
