let handPose;
let video;
let hands = [];

let modelReady = false;
let videoReady = false;
let detectionStarted = false;
let modelLoading = false;

let showHelp = false;
let handDisplayMode = 1; // 0 hidden, 1 points, 2 skeleton

let inkLayer;
let streams = [];
let inkBlooms = [];
let electricResidue = [];
let previousPoint = null;
let backgroundPoints = [];

const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;

const TRAIL_V01_STYLE = window.TRAIL_V01_VARIANT || {
  id: "v01.00",
  name: "Hand Trail",
  palette: {
    primary: [177, 195, 153],
    secondary: [213, 190, 156],
    handTip: [234, 228, 194],
    handSkeleton: [230, 226, 204],
    handPoints: [240, 231, 194]
  },
  alphaScale: 1,
  weightScale: 1,
  wetDiffusion: false,
  diffusionAlpha: 0,
  sedimentFrequency: 0,
  sedimentGravity: [0, 0],
  sedimentGravityAgePower: 1,
  waterBloom: false,
  bloomInterval: 0,
  bloomStartRadius: 2.5,
  bloomRadius: [0, 0],
  bloomLife: [0, 0],
  bloomDilution: 0,
  bloomPaperCenterChance: 0,
  bloomScaleBands: [[1, 1]],
  bloomAspect: [0.78, 0.78],
  electricDrift: false,
  afterimageLength: 0,
  afterimageAlpha: 0,
  flickerStrength: 0,
  particleFilaments: false
};

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
  const helpReturn = document.getElementById("live-help-return");
  if (helpReturn) helpReturn.addEventListener("click", beginExperience);
  startHandMode();
}

function draw() {
  drawBackground();

  if (!showHelp) {
    updateStreams();
  }

  image(inkLayer, 0, 0);

  if (!showHelp && TRAIL_V01_STYLE.particleFilaments) {
    drawElectricFlicker();
  }

  if (!showHelp) {
    const point = getControlPoint();

    if (point) {
      releaseStreams(point);
    } else {
      previousPoint = null;
    }

    drawHandDisplay();
    drawInstruction();
  }

  syncHelpOverlay();
}

function syncHelpOverlay() {
  const overlay = document.getElementById("live-help");
  if (!overlay) return;
  overlay.hidden = !showHelp;
  overlay.setAttribute("aria-hidden", String(!showHelp));
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

    const streamAge = constrain(stream.life / stream.maxLife, 0, 1);
    const settling = pow(streamAge, TRAIL_V01_STYLE.sedimentGravityAgePower || 1);
    stream.x += (TRAIL_V01_STYLE.sedimentGravity?.[0] || 0) * settling;
    stream.y += (TRAIL_V01_STYLE.sedimentGravity?.[1] || 0) * settling;
    stream.life++;

    const remaining = 1 - stream.life / stream.maxLife;
    const alpha = remaining * 65 * TRAIL_V01_STYLE.alphaScale;
    const tone = stream.tone < 0.55
      ? TRAIL_V01_STYLE.palette.primary
      : TRAIL_V01_STYLE.palette.secondary;

    if (TRAIL_V01_STYLE.wetDiffusion) {
      inkLayer.stroke(...tone, alpha * TRAIL_V01_STYLE.diffusionAlpha * 0.34);
      inkLayer.strokeWeight(stream.weight * TRAIL_V01_STYLE.weightScale * 8.5);
      inkLayer.line(stream.previousX, stream.previousY, stream.x, stream.y);

      inkLayer.stroke(...tone, alpha * TRAIL_V01_STYLE.diffusionAlpha);
      inkLayer.strokeWeight(stream.weight * TRAIL_V01_STYLE.weightScale * 3.2);
      inkLayer.line(stream.previousX, stream.previousY, stream.x, stream.y);

      if (TRAIL_V01_STYLE.sedimentFrequency > 0 && frameCount % TRAIL_V01_STYLE.sedimentFrequency === 0 && stream.tone > 0.72) {
        inkLayer.noStroke();
        inkLayer.fill(...tone, alpha * 0.11);
        const deposit = stream.weight * random(4.5, 10.5);
        inkLayer.ellipse(stream.x, stream.y, deposit * random(0.7, 1.3), deposit);
      }
    }

    if (TRAIL_V01_STYLE.electricDrift) {
      const deltaX = stream.x - stream.previousX;
      const deltaY = stream.y - stream.previousY;
      const tailX = stream.previousX - deltaX * TRAIL_V01_STYLE.afterimageLength;
      const tailY = stream.previousY - deltaY * TRAIL_V01_STYLE.afterimageLength;
      const flicker = (sin(stream.seed * 12.9898 + frameCount * 0.13) + 1) * 0.5;
      const localBrightness = 0.42 + flicker * TRAIL_V01_STYLE.flickerStrength;

      if (TRAIL_V01_STYLE.particleFilaments) {
        const sampleOffset = floor(stream.seed * 1000) % 4;

        if ((frameCount + sampleOffset) % 4 === 0) {
          electricResidue.push({
            x: stream.x + random(-0.55, 0.55),
            y: stream.y + random(-0.55, 0.55),
            tone: [...tone],
            seed: random(1000),
            rate: random(0.035, 0.095),
            size: random() < 0.16 ? 1.7 : random(0.85, 1.25)
          });

          if (electricResidue.length > 10000) {
            electricResidue.splice(0, electricResidue.length - 10000);
          }
        }
      } else {
        inkLayer.stroke(...tone, alpha * TRAIL_V01_STYLE.afterimageAlpha * localBrightness);
        inkLayer.strokeWeight(stream.weight * TRAIL_V01_STYLE.weightScale * 4.8);
        inkLayer.line(tailX, tailY, stream.x, stream.y);

        inkLayer.stroke(...tone, alpha * TRAIL_V01_STYLE.afterimageAlpha * localBrightness * 1.7);
        inkLayer.strokeWeight(stream.weight * TRAIL_V01_STYLE.weightScale * 1.9);
        inkLayer.line(tailX, tailY, stream.x, stream.y);

        inkLayer.stroke(...tone, alpha * (0.42 + localBrightness * 0.58));
        inkLayer.strokeWeight(stream.weight * TRAIL_V01_STYLE.weightScale * 0.62);
        inkLayer.line(stream.previousX, stream.previousY, stream.x, stream.y);

        if (flicker > 0.88) {
          inkLayer.noStroke();
          inkLayer.fill(...TRAIL_V01_STYLE.palette.spark, alpha * localBrightness);
          inkLayer.circle(stream.x, stream.y, 0.9 + flicker * 1.8);
        }
      }
    }

    if (!TRAIL_V01_STYLE.particleFilaments) {
      inkLayer.stroke(...tone, stream.tone < 0.55 ? alpha : alpha * 0.75);
      inkLayer.strokeWeight(stream.weight * TRAIL_V01_STYLE.weightScale);
      inkLayer.line(
        stream.previousX,
        stream.previousY,
        stream.x,
        stream.y
      );
    }

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

  updateInkBlooms();

  if (streams.length > 850) {
    streams.splice(0, streams.length - 850);
  }
}

function drawElectricFlicker() {
  push();
  blendMode(ADD);

  for (const particle of electricResidue) {
    const pulse =
      (sin(particle.seed * 31.17 + frameCount * particle.rate) + 1) *
      0.5;
    const sparkle = pow(pulse, 1.15);
    const tone = sparkle > 0.78
      ? TRAIL_V01_STYLE.palette.spark
      : particle.tone;

    stroke(...tone, lerp(42, 205, sparkle));
    strokeWeight(particle.size + sparkle * 0.55);
    point(particle.x, particle.y);
  }

  strokeWeight(1.25);
  for (const stream of streams) {
    const headPulse =
      (sin(stream.seed * 19.43 + frameCount * 0.15) + 1) * 0.5;

    if (headPulse < 0.58) continue;

    const tone = headPulse > 0.9
      ? TRAIL_V01_STYLE.palette.spark
      : stream.tone < 0.55
        ? TRAIL_V01_STYLE.palette.primary
        : TRAIL_V01_STYLE.palette.secondary;

    stroke(...tone, map(headPulse, 0.58, 1, 34, 220));
    point(stream.x, stream.y);
  }

  pop();
}

function updateInkBlooms() {
  if (!TRAIL_V01_STYLE.waterBloom) return;

  const interval = max(1, TRAIL_V01_STYLE.bloomInterval || 24);

  if (frameCount % interval === 0 && streams.length > 16) {
    const source = streams[floor(random(streams.length))];
    const tone = source.tone < 0.55
      ? TRAIL_V01_STYLE.palette.primary
      : TRAIL_V01_STYLE.palette.secondary;
    const scaleBands = TRAIL_V01_STYLE.bloomScaleBands || [[1, 1]];
    const bandRoll = random();
    const bandIndex = min(
      scaleBands.length - 1,
      bandRoll < 0.34 ? 0 : bandRoll < 0.82 ? 1 : 2
    );
    const sizeScale = random(...scaleBands[bandIndex]);
    const startRadius = Array.isArray(TRAIL_V01_STYLE.bloomStartRadius)
      ? random(...TRAIL_V01_STYLE.bloomStartRadius)
      : TRAIL_V01_STYLE.bloomStartRadius || 2.5;
    const aspectRange = TRAIL_V01_STYLE.bloomAspect || [0.78, 0.78];

    inkBlooms.push({
      x: source.x,
      y: source.y,
      tone,
      life: 0,
      maxLife: random(...TRAIL_V01_STYLE.bloomLife),
      startRadius: startRadius * sqrt(sizeScale),
      maxRadius:
        random(...TRAIL_V01_STYLE.bloomRadius) *
        sizeScale *
        (0.78 + source.weight * 0.18),
      aspect: random(...aspectRange),
      rotation: random(TWO_PI),
      paperCenter: random() < (TRAIL_V01_STYLE.bloomPaperCenterChance || 0),
      seed: random(1000)
    });

    if (inkBlooms.length > 22) inkBlooms.shift();
  }

  for (let i = inkBlooms.length - 1; i >= 0; i--) {
    const bloom = inkBlooms[i];
    const age = constrain(bloom.life / bloom.maxLife, 0, 1);
    const expansion = 1 - pow(1 - age, 2.35);
    const radius = lerp(bloom.startRadius, bloom.maxRadius, expansion);
    const fade = pow(1 - age, 0.72);
    const gravity = TRAIL_V01_STYLE.sedimentGravity?.[1] || 0;

    bloom.y += gravity * (0.12 + age * 0.16);

    inkLayer.push();
    inkLayer.translate(bloom.x, bloom.y);
    inkLayer.rotate(bloom.rotation);
    inkLayer.noStroke();
    inkLayer.fill(...bloom.tone, fade * 0.72);
    inkLayer.ellipse(0, 0, radius * 1.14, radius * bloom.aspect);

    if (
      TRAIL_V01_STYLE.bloomDilution > 0 &&
      bloom.paperCenter &&
      age < 0.82 &&
      frameCount % 3 === 0
    ) {
      inkLayer.erase(TRAIL_V01_STYLE.bloomDilution * fade, 0);
      inkLayer.noStroke();
      inkLayer.beginShape();
      for (let point = 0; point <= 26; point++) {
        const angle = point / 26 * TWO_PI;
        const dilutionEdge =
          0.82 + noise(bloom.seed + 40, point * 0.2, bloom.life * 0.01) * 0.24;
        inkLayer.vertex(
          cos(angle) * radius * 0.23 * dilutionEdge,
          sin(angle) * radius * bloom.aspect * 0.2 * dilutionEdge
        );
      }
      inkLayer.endShape(CLOSE);
      inkLayer.noErase();
    }

    inkLayer.noFill();
    for (let ring = 0; ring < 3; ring++) {
      const ringScale = 0.72 + ring * 0.145;
      inkLayer.stroke(...bloom.tone, fade * (5.8 - ring * 1.15));
      inkLayer.strokeWeight(0.45 + ring * 0.38);
      inkLayer.beginShape();
      for (let point = 0; point <= 34; point++) {
        const angle = point / 34 * TWO_PI;
        const irregularity =
          0.86 +
          noise(bloom.seed + ring * 7.3, point * 0.18, bloom.life * 0.012) * 0.25;
        const ringRadius = radius * ringScale * irregularity;
        inkLayer.vertex(
          cos(angle) * ringRadius,
          sin(angle) * ringRadius * bloom.aspect
        );
      }
      inkLayer.endShape(CLOSE);
    }
    inkLayer.pop();

    bloom.life++;
    if (bloom.life > bloom.maxLife) inkBlooms.splice(i, 1);
  }
}

function drawBackground() {
  clear();
}

function drawHandDisplay() {
  if (hands.length === 0 || handDisplayMode === 0) return;

  const points = hands[0].keypoints.map(toCanvasPoint);

  if (handDisplayMode === 1) {
    const tip = points[8];
    noFill();
    stroke(...TRAIL_V01_STYLE.palette.handTip, 90);
    strokeWeight(1);
    circle(tip.x, tip.y, 13);
    return;
  }

  stroke(...TRAIL_V01_STYLE.palette.handSkeleton, 46);
  strokeWeight(0.7);

  for (const [a, b] of HAND_CONNECTIONS) {
    line(points[a].x, points[a].y, points[b].x, points[b].y);
  }

  noStroke();
  fill(...TRAIL_V01_STYLE.palette.handPoints, 72);

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
  text("GESTURE STUDY 01.00 / FLOW FIELD TRACE", inset, 47);

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
  text("GESTURE STUDY 01.00", left, panel.y + (compact ? 25 : 38));

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
    inkBlooms = [];
    electricResidue = [];
    previousPoint = null;
  }
}

function mousePressed() {
  if (showHelp) return false;
}

function beginExperience() {
  showHelp = false;
  syncHelpOverlay();
  cursor(ARROW);

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
  inkBlooms = [];
  electricResidue = [];
  previousPoint = null;
  createBackgroundPoints();
}
