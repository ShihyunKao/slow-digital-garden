let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let breath = 0;
let targetBreath = 0;
let previousBreath = 0;

let stars = [];
let memories = [];

let wasOpen = false;
let memoryStep = 0;
let showHelp = true;
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
  pixelDensity(1);
  noiseSeed(103);
  randomSeed(103);

  for (let i = 0; i < 180; i++) {
    stars.push({
      angle: random(TWO_PI),
      radius: random(20, 285),
      speed: random(0.0005, 0.0025),
      size: random(0.8, 3.2),
      alpha: random(18, 72),
      depth: random(0.4, 1.0)
    });
  }
}

function draw() {
  drawSpaceBackground();

  targetBreath = getBreathAmount();
  previousBreath = breath;
  breath = lerp(breath, targetBreath, 0.04);

  if (showHelp) {
    wasOpen = false;
  } else {
    detectBreathMemory();
  }

  drawCosmicField(breath);
  drawMemoryRings();
  drawHandDisplay();
  drawInterface();
}

function getBreathAmount() {
  if (hands.length >= 2) {
    const a = hands[0].keypoints[8];
    const b = hands[1].keypoints[8];
    const d = dist(a.x, a.y, b.x, b.y);

    return constrain(map(d, 80, 520, 0, 1), 0, 1);
  }

  return max(0, breath - 0.035);
}

function detectBreathMemory() {
  if (breath > 0.82) {
    wasOpen = true;
  }

  if (wasOpen && breath < 0.42 && previousBreath >= 0.42) {
    addMemory();
    wasOpen = false;
  }
}

function addMemory() {
  const maxSteps = 8;
  const stepT = (memoryStep % maxSteps) / (maxSteps - 1);

  const outerRadius = 330;
  const innerRadius = 115;

  const radius = lerp(outerRadius, innerRadius, stepT);

  memories.push({
    age: 0,
    life: 1400,
    radius: radius + random(-8, 8),
    aspect: random(0.48, 0.68),
    rotation: random(-0.04, 0.04),
    seed: random(1000),
    starCount: floor(random(42, 68)),
    flash: 1,
    step: memoryStep
  });

  memoryStep++;

  if (memories.length > 8) {
    memories.shift();
  }
}

function drawCosmicField(amount) {
  const cx = width / 2;
  const cy = height / 2 + 20;

  const eased = easeInOutCubic(amount);
  const radius = lerp(74, 278, eased);
  const aspect = lerp(0.36, 0.64, eased);

  drawCentralGlow(cx, cy, radius, aspect, eased);
  drawOrbitBody(cx, cy, radius, aspect, eased);
  drawOrbitLines(cx, cy, radius, aspect, eased);
  drawStarCurrent(cx, cy, radius, aspect, eased);
  drawReturnLines(cx, cy, radius, aspect, eased);
}

function drawCentralGlow(cx, cy, r, aspect, amount) {
  drawingContext.save();
  drawingContext.filter = "blur(34px)";

  noStroke();

  fill(142, 170, 135, 20 + amount * 22);
  ellipse(cx, cy, r * 2.1, r * 2.1 * aspect);

  fill(231, 219, 181, 10 + amount * 14);
  ellipse(cx, cy, r * 1.05, r * 1.05 * aspect);

  drawingContext.restore();
}

function drawOrbitBody(cx, cy, r, aspect, amount) {
  noStroke();

  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const rr = r * (1 - t * 0.78);

    fill(
      lerp(26, 76, amount),
      lerp(42, 92, amount),
      lerp(40, 78, amount),
      28 - t * 1.7
    );

    ellipse(cx, cy, rr * 2, rr * 2 * aspect);
  }
}

function drawOrbitLines(cx, cy, r, aspect, amount) {
  noFill();

  const count = 15;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const rr = r * (0.16 + t * 0.94);

    const pulse = sin(frameCount * 0.015 + i * 0.5) * amount * 2.8;
    const alpha = (1 - t * 0.45) * (24 + amount * 48);

    stroke(220, 226, 205, alpha);
    strokeWeight(lerp(1.1, 0.35, t));

    beginShape();

    for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / 160) {
      const n = noise(
        cos(a) * 1.4 + i * 0.17,
        sin(a) * 1.4,
        frameCount * 0.002
      );

      const wave = map(n, 0, 1, 0.97, 1.035);

      curveVertex(
        cx + cos(a) * (rr * wave + pulse),
        cy + sin(a) * (rr * wave + pulse) * aspect
      );
    }

    endShape(CLOSE);
  }
}

function drawStarCurrent(cx, cy, r, aspect, amount) {
  noStroke();

  for (const star of stars) {
    star.angle += star.speed * (0.4 + amount * 1.8);

    const localRadius = star.radius * amount * star.depth;
    const px = cx + cos(star.angle) * localRadius;
    const py = cy + sin(star.angle) * localRadius * aspect;

    fill(238, 231, 198, star.alpha * amount * star.depth);
    circle(px, py, star.size * star.depth);
  }
}

function drawReturnLines(cx, cy, r, aspect, amount) {
  if (amount < 0.28) return;

  stroke(213, 220, 196, 28 * amount);
  strokeWeight(0.6);
  noFill();

  const lines = 12;

  for (let i = 0; i < lines; i++) {
    const a = map(i, 0, lines, 0, TWO_PI);
    const outer = r * randomSeeded(i, 0.72, 0.95);
    const inner = r * randomSeeded(i + 90, 0.28, 0.52);

    beginShape();

    for (let t = 0; t <= 1.001; t += 0.08) {
      const bend = sin(t * PI) * 24 * amount;
      const angle = a + bend * 0.006;

      const rr = lerp(outer, inner, t);

      curveVertex(
        cx + cos(angle) * rr,
        cy + sin(angle) * rr * aspect - t * 18 * amount
      );
    }

    endShape();
  }
}

function drawMemoryRings() {
  const cx = width / 2;
  const cy = height / 2 + 20;

  for (let i = memories.length - 1; i >= 0; i--) {
    const memory = memories[i];

    memory.age++;
    memory.flash *= 0.965;

    if (memory.age > memory.life) {
      memories.splice(i, 1);
      continue;
    }

    const t = memory.age / memory.life;
    const fade = 1 - easeInCubic(t);
    const expansion = easeOutCubic(constrain(t * 1.4, 0, 1));
    const flash = memory.flash;

    push();
    translate(cx, cy);
    rotate(memory.rotation);

    drawingContext.save();
    drawingContext.filter = "blur(1.4px)";

    noFill();

    for (let ring = 0; ring < 4; ring++) {
      const rt = ring / 3;
      const rr = memory.radius * (0.9 + rt * 0.18 + expansion * 0.06);

      stroke(238, 232, 198, fade * (36 - ring * 5) + flash * 40);
      strokeWeight(0.7 + flash * 0.6);

      beginShape();

      for (let a = 0; a < TWO_PI + 0.02; a += TWO_PI / 170) {
        const n = noise(
          memory.seed + cos(a) * 1.7,
          memory.seed + sin(a) * 1.7,
          ring * 0.24 + frameCount * 0.0008
        );

        const wobble = map(n, 0, 1, 0.985, 1.03);

        curveVertex(
          cos(a) * rr * wobble,
          sin(a) * rr * memory.aspect * wobble
        );
      }

      endShape(CLOSE);
    }

    drawingContext.restore();

    noStroke();

    for (let s = 0; s < memory.starCount; s++) {
      const a = (s / memory.starCount) * TWO_PI + memory.seed * 0.01;
      const rr = memory.radius * randomSeeded(s + memory.seed, 0.82, 1.15);

      const sparkle = sin(frameCount * 0.04 + s * 1.7) * 0.5 + 0.5;

      fill(
        246,
        238,
        198,
        fade * (38 + sparkle * 28) + flash * 60
      );

      circle(
        cos(a) * rr,
        sin(a) * rr * memory.aspect,
        randomSeeded(s + 200, 1.8, 4.6) + sparkle * 1.2
      );
    }

    pop();
  }
}

function drawSpaceBackground() {
  background(9, 19, 17);

  noStroke();

  for (let y = 0; y < height; y += 5) {
    const a = map(y, 0, height, 16, 2);
    fill(30, 45, 39, a);
    rect(0, y, width, 5);
  }

  fill(240, 232, 205, 5);
  rect(22, 22, width - 44, height - 44);
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
  if (showHelp) {
    drawHelpScreen();
    return;
  }

  drawExhibitionCaption();
}

function drawExhibitionCaption() {
  cursor(ARROW);
  const inset = 28;
  const display = ["HIDDEN", "POINTS", "SKELETON"][handDisplayMode];

  noStroke();
  textAlign(LEFT, TOP);
  fill(239, 236, 217, 220);
  textSize(14);
  text("COSMIC MEMORY", inset, 27);

  fill(168, 187, 163, 130);
  textSize(10);
  text("GESTURE STUDY 03 / BREATHING MEMORY RINGS", inset, 47);

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
  text("GESTURE STUDY 03", left, panel.y + (compact ? 24 : 36));

  fill(238, 235, 216, 240);
  textSize(compact ? 28 : 36);
  text("Cosmic Memory", left, panel.y + (compact ? 46 : 65));

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
    "A two-hand breathing gesture becomes a memory of expansion and return.",
    left,
    panel.y + 118,
    dividerX - left - 46
  );

  const stepsY = panel.y + 198;
  const gap = 58;
  drawHelpStep("01", "Select Begin, allow the camera, and bring hands together.", left, stepsY);
  drawHelpStep("02", "Open both hands fully until the field expands.", left, stepsY + gap);
  drawHelpStep("03", "Return to the centre to leave one memory ring.", left, stepsY + gap * 2);

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
    "Each completed breath becomes an orbit-like memory. Across eight cycles, the rings move from the outer field towards the centre.",
    right,
    panel.y + 146,
    rightWidth
  );

  const legendY = panel.y + 246;
  const legendGap = 40;
  drawArchiveLegendRow("01", "CYCLE", "wide stretch + return", right, legendY, rightWidth);
  drawArchiveLegendRow("02", "RADIUS", "outer-to-inner order", right, legendY + legendGap, rightWidth);
  drawArchiveLegendRow("03", "RINGS", "one breath memory", right, legendY + legendGap * 2, rightWidth);
  drawArchiveLegendRow("04", "STARS", "surrounding constellation", right, legendY + legendGap * 3, rightWidth);

  textAlign(LEFT, TOP);
  fill(174, 191, 166, 125);
  textSize(10);
  text("P  HAND DISPLAY     R  RESET ARCHIVE     ?  HELP", left, panel.buttonY - 37);
}

function drawCompactHelp(panel, left, contentWidth) {
  fill(201, 207, 191, 165);
  textAlign(LEFT, TOP);
  textSize(12);
  textLeading(17);
  text(
    "Each breath leaves one memory ring in an eight-cycle archive.",
    left,
    panel.y + 86,
    contentWidth
  );

  const stepsY = panel.y + 126;
  const gap = 39;
  drawHelpStep("01", "Begin with both hands together.", left, stepsY);
  drawHelpStep("02", "Open fully, then return.", left, stepsY + gap);
  drawHelpStep("03", "Repeat eight times.", left, stepsY + gap * 2);

  const keyY = stepsY + gap * 3 + 5;
  fill(174, 191, 166, 115);
  textSize(10);
  text("CYCLE / WIDE STRETCH + RETURN     RADIUS / OUTER TO INNER", left, keyY);
  text("RINGS / BREATH MEMORY             STARS / CONSTELLATION", left, keyY + 18);

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
  if (key === "r" || key === "R") {
    memories = [];
    wasOpen = false;
    memoryStep = 0;
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
  startHandMode();
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

function gotHands(results) {
  hands = results;
}

function randomSeeded(seed, minValue, maxValue) {
  const n = noise(seed * 0.31, 4.7);
  return map(n, 0, 1, minValue, maxValue);
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }

  return 1 - pow(-2 * t + 2, 3) / 2;
}
