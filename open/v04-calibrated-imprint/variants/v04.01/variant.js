window.OPEN_V04_VARIANT = (() => {
  let sealIndex = 0;

  function normalisePoints(points, center) {
    let radius = 1;
    for (const point of points) radius = max(radius, dist(point.x, point.y, center.x, center.y));
    return {
      points: points.map(point => ({ x: (point.x - center.x) / radius, y: (point.y - center.y) / radius })),
      radius
    };
  }

  function createImprint(points, center) {
    const normalised = normalisePoints(points, center);
    const index = sealIndex % 8;
    sealIndex++;
    return {
      points: normalised.points,
      sourceRadius: normalised.radius,
      column: index % 4,
      row: floor(index / 4),
      sealNumber: sealIndex,
      paperTone: random(-7, 7),
      fibres: Array.from({ length: 34 }, () => ({
        x: random(-1, 1),
        y: random(-1, 1),
        length: random(0.04, 0.18),
        alpha: random(6, 20)
      }))
    };
  }

  function gridMetrics(data) {
    const left = width * 0.14;
    const right = width * 0.86;
    const top = height * 0.25;
    const bottom = height * 0.71;
    const cellWidth = (right - left) / 4;
    const cellHeight = (bottom - top) / 2;
    return {
      x: left + cellWidth * (data.column + 0.5),
      y: top + cellHeight * (data.row + 0.5),
      width: cellWidth,
      height: cellHeight,
      sealSize: min(cellWidth * 0.37, cellHeight * 0.39)
    };
  }

  function scaledPoints(localPoints, cx, cy, scale) {
    return localPoints.map(point => ({ x: cx + point.x * scale, y: cy + point.y * scale }));
  }

  function drawGroovePath(points, offsetX, offsetY, colour, weight, alpha) {
    const wrist = points[5];
    noFill();
    stroke(colour[0], colour[1], colour[2], alpha);
    strokeWeight(weight);
    strokeCap(ROUND);
    strokeJoin(ROUND);

    for (let finger = 0; finger < 5; finger++) {
      const tip = points[finger];
      const side = map(finger, 0, 4, -1, 1);
      const bend = abs(tip.y - wrist.y) * 0.06;
      beginShape();
      vertex(wrist.x + offsetX, wrist.y + offsetY);
      quadraticVertex(
        lerp(wrist.x, tip.x, 0.55) + side * bend + offsetX,
        lerp(wrist.y, tip.y, 0.55) + bend * 0.25 + offsetY,
        tip.x + offsetX,
        tip.y + offsetY
      );
      endShape();
    }

    beginShape();
    for (let finger = 0; finger < 5; finger++) {
      const point = points[finger];
      curveVertex(point.x + offsetX, point.y + offsetY);
    }
    endShape();

    const palmMidX = points.slice(0, 5).reduce((sum, point) => sum + point.x, 0) / 5;
    const palmMidY = lerp(wrist.y, points[2].y, 0.34);
    arc(palmMidX + offsetX, palmMidY + offsetY, dist(points[0].x, points[0].y, points[4].x, points[4].y) * 0.64, abs(points[2].y - wrist.y) * 0.28, 0.08, PI - 0.08);
  }

  function drawEmbossedHand(points, depth, alpha) {
    const pressure = constrain(depth, 0, 1);
    const offset = 0.7 + pressure * 3.8;
    const weight = 0.6 + pressure * 1.55;

    drawingContext.save();
    drawingContext.globalCompositeOperation = "multiply";
    drawGroovePath(points, offset, 0.35, [91, 85, 73], weight + 1.2, alpha * (0.2 + pressure * 0.42));
    drawGroovePath(points, offset * 0.4, 0.12, [124, 115, 96], weight, alpha * (0.25 + pressure * 0.3));
    drawingContext.restore();

    drawGroovePath(points, -offset * 0.72, -0.25, [250, 247, 236], weight + 0.75, alpha * (0.22 + pressure * 0.55));
    drawGroovePath(points, 0, 0, [111, 102, 86], 0.5 + pressure * 0.34, alpha * 0.34);

    noStroke();
    for (let finger = 0; finger < 5; finger++) {
      const point = points[finger];
      fill(84, 77, 64, alpha * (0.13 + pressure * 0.25));
      ellipse(point.x + offset * 0.7, point.y, 5 + pressure * 3.5, 3.5 + pressure * 2.4);
      fill(250, 247, 236, alpha * (0.25 + pressure * 0.42));
      ellipse(point.x - offset * 0.55, point.y - 0.15, 3.2 + pressure * 2.2, 2.2 + pressure * 1.5);
    }
  }

  function drawHoldPreview(metrics, progress) {
    if (!metrics || progress <= 0) return;
    const points = [4, 8, 12, 16, 20, 0].map(index => metrics.points[index]);
    const centre = {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length
    };
    const span = max(64, max(points.map(point => dist(point.x, point.y, centre.x, centre.y))));

    noStroke();
    fill(221, 216, 202, 8 + progress * 12);
    rect(centre.x - span * 1.18, centre.y - span * 1.08, span * 2.36, span * 2.16, 2);
    drawEmbossedHand(points, progress, 138 + progress * 72);
  }

  function drawHoldIndicator(points, progress) {
    const wrist = points[0];
    const palmBase = points[9];
    const cx = lerp(wrist.x, palmBase.x, 0.48);
    const cy = lerp(wrist.y, palmBase.y, 0.48);
    const radius = 34;
    const endAngle = -HALF_PI + TWO_PI * progress;

    noFill();
    stroke(102, 93, 76, 72);
    strokeWeight(1);
    circle(cx, cy, radius * 2);
    stroke(124, 88, 39, 215);
    strokeWeight(2);
    arc(cx, cy, radius * 2, radius * 2, -HALF_PI, endAngle);
    line(cx - radius - 9, cy, cx - radius + 3, cy);
    line(cx + radius - 3, cy, cx + radius + 9, cy);
    noStroke();
    fill(117, 83, 37, 235);
    circle(cx + cos(endAngle) * radius, cy + sin(endAngle) * radius, 5);
  }

  function drawImprint(imprint, fade) {
    const data = imprint.variantData;
    if (!data) return;
    const grid = gridMetrics(data);
    const locked = easeOutCubic(constrain(imprint.age / 4, 0, 1));
    const alpha = 230 * fade * locked;
    const points = scaledPoints(data.points, grid.x, grid.y, grid.sealSize * locked);

    push();
    translate(grid.x, grid.y);
    scale(0.96 + locked * 0.04);
    translate(-grid.x, -grid.y);

    noStroke();
    fill(221 + data.paperTone, 216 + data.paperTone, 202 + data.paperTone, 18 * fade);
    rect(grid.x - grid.width * 0.45, grid.y - grid.height * 0.42, grid.width * 0.9, grid.height * 0.84, 1.5);

    drawingContext.save();
    drawingContext.globalCompositeOperation = "multiply";
    noFill();
    stroke(101, 94, 79, 28 * fade);
    strokeWeight(0.65);
    rect(grid.x - grid.width * 0.45, grid.y - grid.height * 0.42, grid.width * 0.9, grid.height * 0.84, 1.5);
    for (const fibre of data.fibres) {
      const fx = grid.x + fibre.x * grid.width * 0.39;
      const fy = grid.y + fibre.y * grid.height * 0.35;
      stroke(91, 84, 70, fibre.alpha * fade);
      line(fx, fy, fx + fibre.length * grid.width, fy + 0.6);
    }
    drawingContext.restore();

    drawEmbossedHand(points, 1, alpha);

    noStroke();
    fill(112, 80, 37, 96 * fade);
    textAlign(RIGHT, BOTTOM);
    textSize(9);
    text(`SEAL ${String(data.sealNumber).padStart(2, "0")}`, grid.x + grid.width * 0.4, grid.y + grid.height * 0.36);
    pop();
  }

  return {
    id: "v04.01",
    name: "Embossed Seal",
    createImprint,
    drawImprint,
    drawHoldPreview,
    drawHoldIndicator,
    handPalette: {
      skeleton: [91, 84, 70, 86],
      points: [124, 88, 39],
      pointAlpha: [60, 170]
    }
  };
})();
