window.OPEN_V05_VARIANT = (() => {
  const ARCHIVE_COORDS = [
    [0.075, 0.285], [0.27, 0.205], [0.48, 0.255], [0.70, 0.195], [0.925, 0.295],
    [0.16, 0.485], [0.38, 0.435], [0.61, 0.475], [0.82, 0.455],
    [0.065, 0.665], [0.27, 0.685], [0.50, 0.645], [0.76, 0.695], [0.935, 0.665],
    [0.31, 0.835], [0.51, 0.865], [0.71, 0.835]
  ];

  const BONE = [227, 223, 207];
  const TEAL = [109, 156, 149];
  const DEEP_TEAL = [58, 92, 91];

  function clamp01(value) {
    return constrain(value, 0, 1);
  }

  function ease(value) {
    const t = clamp01(value);
    return 1 - pow(1 - t, 3);
  }

  function pointOnQuadratic(a, control, b, t) {
    const inverse = 1 - t;
    return {
      x: inverse * inverse * a.x + 2 * inverse * t * control.x + t * t * b.x,
      y: inverse * inverse * a.y + 2 * inverse * t * control.y + t * t * b.y
    };
  }

  function controlPoint(a, b, sag, side) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = max(1, sqrt(dx * dx + dy * dy));
    const normalX = -dy / length;
    const normalY = dx / length;
    const sidePull = side * min(length * 0.045, 5.5);

    return {
      x: (a.x + b.x) * 0.5 + normalX * sidePull,
      y: (a.y + b.y) * 0.5 + normalY * sidePull + sag
    };
  }

  function sampledThread(a, b, control, start, end, colour, alpha, weight) {
    noFill();
    stroke(colour[0], colour[1], colour[2], alpha);
    strokeWeight(weight);
    strokeCap(ROUND);
    beginShape();
    const steps = max(4, ceil((end - start) * 26));
    for (let index = 0; index <= steps; index++) {
      const t = lerp(start, end, index / steps);
      const point = pointOnQuadratic(a, control, b, t);
      vertex(point.x, point.y);
    }
    endShape();
  }

  function drawStitch(a, control, b, t, alpha, size) {
    const point = pointOnQuadratic(a, control, b, t);
    const before = pointOnQuadratic(a, control, b, max(0, t - 0.015));
    const after = pointOnQuadratic(a, control, b, min(1, t + 0.015));
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = max(1, sqrt(dx * dx + dy * dy));
    const nx = -dy / length;
    const ny = dx / length;

    stroke(BONE[0], BONE[1], BONE[2], alpha);
    strokeWeight(0.72);
    line(point.x - nx * size, point.y - ny * size, point.x + nx * size, point.y + ny * size);
  }

  function drawWeightedThread(a, b, options) {
    const sag = options.sag;
    const side = options.side || 1;
    const alpha = options.alpha;
    const control = controlPoint(a, b, sag, side);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = max(1, sqrt(dx * dx + dy * dy));
    const nx = -dy / length;
    const ny = dx / length;
    const fibres = options.fibres || 3;

    for (let index = 0; index < fibres; index++) {
      const offset = (index - (fibres - 1) * 0.5) * 0.9;
      const fibreA = { x: a.x + nx * offset, y: a.y + ny * offset };
      const fibreB = { x: b.x + nx * offset, y: b.y + ny * offset };
      const fibreControl = { x: control.x + nx * offset, y: control.y + ny * offset };
      sampledThread(
        fibreA,
        fibreB,
        fibreControl,
        0,
        1,
        index === 1 ? TEAL : DEEP_TEAL,
        alpha * (index === 1 ? 0.76 : 0.42),
        index === 1 ? 0.78 : 0.48
      );
    }

    sampledThread(
      a,
      b,
      control,
      options.litStart,
      options.litEnd,
      BONE,
      alpha * 0.9,
      0.72
    );

    for (const stitch of options.stitches || []) {
      drawStitch(a, control, b, stitch, alpha * 0.72, options.stitchSize || 2.2);
    }
  }

  function drawPinhole(point, alpha, strength, size) {
    noFill();
    stroke(TEAL[0], TEAL[1], TEAL[2], alpha * 0.82);
    strokeWeight(0.8);
    circle(point.x, point.y, size + strength * 3.2);

    noStroke();
    fill(BONE[0], BONE[1], BONE[2], alpha);
    circle(point.x, point.y, 2.15 + strength * 1.6);

    fill(4, 15, 20, alpha * 0.9);
    circle(point.x, point.y, 0.8 + strength * 0.5);
  }

  function configureConstellation(constellation, index) {
    const center = constellation.center;
    let radius = 1;
    const localPoints = constellation.points.map((point) => {
      const local = { x: point.x - center.x, y: point.y - center.y };
      radius = max(radius, sqrt(local.x * local.x + local.y * local.y));
      return local;
    });
    const normalizedPoints = localPoints.map((point) => ({
      x: point.x / radius,
      y: point.y / radius
    }));
    const coordinate = ARCHIVE_COORDS[index % ARCHIVE_COORDS.length];

    return {
      coordinate,
      normalizedPoints,
      mapScale: random(0.86, 1.12),
      label: `FC-${String(index + 1).padStart(2, "0")}`,
      linkData: constellation.links.map((link, linkIndex) => {
        const litStart = random(0.08, 0.48);
        return {
          sag: random(7, 17),
          side: linkIndex % 2 === 0 ? 1 : -1,
          fibres: floor(random(2.5, 4.5)),
          litStart,
          litEnd: min(0.94, litStart + random(0.15, 0.34)),
          stitches: Array.from({ length: floor(random(2, 5)) }, () => random(0.15, 0.85))
        };
      })
    };
  }

  function drawLiveConstellation(points, links, amount, holdProgress, locked) {
    const tension = locked ? 1 : ease(holdProgress);
    const opacity = 30 + amount * 145;

    for (let index = 0; index < links.length; index++) {
      const link = links[index];
      const litStart = 0.1 + ((index * 0.19 + 0.08) % 0.46);
      drawWeightedThread(points[link.from], points[link.to], {
        sag: lerp(22, 1.4, tension),
        side: index % 2 === 0 ? 1 : -1,
        alpha: opacity,
        fibres: 3,
        litStart,
        litEnd: min(0.95, litStart + 0.18 + tension * 0.2),
        stitches: [0.26, 0.58, 0.81],
        stitchSize: 1.7 + tension * 0.7
      });
    }

    for (let index = 0; index < points.length; index++) {
      const pulse = sin(frameCount * 0.025 + index * 1.37) * 0.5 + 0.5;
      drawPinhole(points[index], opacity + tension * 50, tension + pulse * 0.16, 7.2);
    }
  }

  function archivePoint(coordinate) {
    return {
      x: width * coordinate[0],
      y: height * coordinate[1]
    };
  }

  function drawArchiveCoordinate(center, radius, label, alpha) {
    const tick = min(12, radius * 0.12);
    stroke(TEAL[0], TEAL[1], TEAL[2], alpha * 0.28);
    strokeWeight(0.6);
    line(center.x - radius, center.y - radius * 0.72, center.x - radius + tick, center.y - radius * 0.72);
    line(center.x - radius, center.y - radius * 0.72, center.x - radius, center.y - radius * 0.72 + tick);
    line(center.x + radius, center.y + radius * 0.72, center.x + radius - tick, center.y + radius * 0.72);
    line(center.x + radius, center.y + radius * 0.72, center.x + radius, center.y + radius * 0.72 - tick);

    noStroke();
    fill(TEAL[0], TEAL[1], TEAL[2], alpha * 0.54);
    textAlign(LEFT, TOP);
    textSize(8);
    text(label, center.x - radius, center.y + radius * 0.72 + 6);
  }

  function drawConstellationMemory(constellation) {
    const data = constellation.variantData;
    if (!data) return;

    const travel = ease(constellation.age / 76);
    const appear = ease(constellation.age / 18);
    const settle = ease(constellation.age / 110);
    const target = archivePoint(data.coordinate);
    const center = {
      x: lerp(constellation.center.x, target.x, travel),
      y: lerp(constellation.center.y, target.y, travel)
    };
    const radius = min(width, height) * 0.073 * data.mapScale;
    const points = data.normalizedPoints.map((point) => ({
      x: center.x + point.x * radius,
      y: center.y + point.y * radius
    }));
    const alpha = (68 + constellation.flash * 110) * appear;

    drawArchiveCoordinate(center, radius * 1.16, data.label, alpha);

    for (let index = 0; index < constellation.links.length; index++) {
      const link = constellation.links[index];
      const linkData = data.linkData[index];
      drawWeightedThread(points[link.from], points[link.to], {
        sag: lerp(1.2, linkData.sag, settle),
        side: linkData.side,
        alpha,
        fibres: linkData.fibres,
        litStart: linkData.litStart,
        litEnd: linkData.litEnd,
        stitches: linkData.stitches,
        stitchSize: 1.5
      });
    }

    for (let index = 0; index < points.length; index++) {
      drawPinhole(points[index], alpha + 34, 0.22 + constellation.flash * 0.7, 5.8);
    }
  }

  return {
    id: "v05.01",
    name: "Thread Cartography",
    configureConstellation,
    drawLiveConstellation,
    drawConstellationMemory,
    handPalette: {
      skeleton: [103, 147, 141, 54],
      points: [227, 223, 207],
      pointAlpha: 76,
      skeletonPointAlpha: 70
    }
  };
})();
