window.OPEN_V01_LAYERED_VARIANT = (() => {
  const history = [];
  const totalLayers = 42;
  const paperPalette = [
    [220, 214, 195],
    [176, 181, 153],
    [163, 145, 116]
  ];

  function smooth(value) {
    const t = constrain(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function drawContour(layer, layerRatio, amount, scale, time) {
    const closedWidth = 6 + layerRatio * 8;
    const closedHeight = 9 + layerRatio * 12;
    const openWidth = scale * (0.105 + layerRatio * 0.14);
    const openHeight = scale * (0.18 + layerRatio * 0.245);
    const contourWidth = lerp(closedWidth, openWidth, amount);
    const contourHeight = lerp(closedHeight, openHeight, amount);
    const depthOffsetX = lerp(0, (layerRatio - 0.42) * scale * 0.11 + scale * 0.018, amount);
    const depthOffsetY = lerp(0, (layerRatio - 0.5) * scale * 0.028, amount);
    const irregularity = amount * (2.5 + layerRatio * 13);
    const paper = paperPalette[layer % paperPalette.length];

    push();
    translate(depthOffsetX, depthOffsetY);

    drawingContext.save();
    drawingContext.shadowBlur = 3 + amount * 7;
    drawingContext.shadowOffsetX = 2.5 + layerRatio * 4;
    drawingContext.shadowOffsetY = 1.5 + layerRatio * 2.5;
    drawingContext.shadowColor = `rgba(71, 61, 48, ${0.06 + amount * 0.13})`;

    fill(paper[0], paper[1], paper[2], 7 + amount * 14);
    if (layer % 5 === 0) {
      stroke(119, 126, 99, 48 + amount * 44);
    } else if (layer % 7 === 0) {
      stroke(131, 105, 79, 42 + amount * 42);
    } else {
      stroke(218, 211, 191, 50 + amount * 40);
    }
    strokeWeight(0.45 + layerRatio * 0.78);

    beginShape();
    for (let point = 0; point <= 124; point++) {
      const angle = map(point, 0, 124, 0, TWO_PI);
      const texture = noise(
        cos(angle) * 0.7 + 7.1,
        sin(angle) * 0.7 + 4.4,
        layer * 0.065 + time
      );
      const grain = map(texture, 0, 1, -irregularity, irregularity);
      const cutWave = sin(angle * 2 + layer * 0.19) * irregularity * 0.38;
      const edgeWeight = 0.68 + 0.32 * pow(abs(sin(angle)), 0.7);

      vertex(
        cos(angle) * contourWidth * edgeWeight + grain + cutWave,
        sin(angle) * contourHeight + grain * 0.42
      );
    }
    endShape(CLOSE);
    drawingContext.restore();
    pop();
  }

  function drawFibres(scale, amount, time) {
    if (amount < 0.04) return;

    const spreadX = scale * 0.19 * amount;
    const spreadY = scale * 0.34 * amount;
    strokeWeight(0.45);

    for (let fibre = 0; fibre < 92; fibre++) {
      const nx = noise(fibre * 0.083, 13.2);
      const ny = noise(fibre * 0.071, 27.6);
      const x = map(nx, 0, 1, -spreadX, spreadX) + scale * 0.018;
      const y = map(ny, 0, 1, -spreadY, spreadY);
      const ellipseDistance = sq(x / max(1, spreadX)) + sq(y / max(1, spreadY));
      if (ellipseDistance > 0.94) continue;

      const warm = fibre % 6 === 0;
      stroke(warm ? 127 : 139, warm ? 106 : 145, warm ? 82 : 112, 5 + amount * 18);
      const length = 4 + noise(fibre * 0.12, time * 0.1) * 12;
      line(x - length * 0.5, y, x + length * 0.5, y + sin(fibre * 1.7) * 1.5);
    }
  }

  function drawBloom(cx, cy, amount) {
    history.unshift(amount);
    if (history.length > 84) history.pop();

    const scale = min(width, height) * 1.1;
    const time = frameCount * 0.00115;

    push();
    translate(cx - width * 0.04, cy - height * 0.015);

    for (let layer = totalLayers - 1; layer >= 0; layer--) {
      const layerRatio = layer / (totalLayers - 1);
      const delay = floor(layerRatio * 52);
      const delayedAmount = history[min(delay, history.length - 1)] ?? amount;
      drawContour(layer, layerRatio, smooth(delayedAmount), scale, time);
    }

    drawFibres(scale, smooth(amount), time);

    noStroke();
    fill(108, 96, 75, 92 + amount * 42);
    ellipse(scale * 0.018, 0, lerp(6, 11, amount), lerp(9, 17, amount));
    pop();
  }

  return {
    id: "v01.04",
    name: "Topographic Tissue",
    drawBloom,
    handPalette: {
      points: [104, 94, 75, 72],
      pointsStrong: [104, 94, 75, 82],
      skeleton: [112, 122, 94, 54]
    }
  };
})();
