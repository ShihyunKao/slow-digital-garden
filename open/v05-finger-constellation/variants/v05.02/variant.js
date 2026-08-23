window.OPEN_V05_VARIANT = (() => {
  const STRATA_COORDS = [
    [0.24, 0.19], [0.24, 0.38], [0.24, 0.58], [0.24, 0.78],
    [0.50, 0.24], [0.50, 0.44], [0.50, 0.64], [0.50, 0.82],
    [0.76, 0.18], [0.76, 0.38], [0.76, 0.58], [0.76, 0.78]
  ];

  const ICE = [183, 220, 232];
  const VIOLET = [133, 118, 151];
  const GREY = [154, 164, 174];
  const WHITE = [228, 234, 237];
  const NIGHT = [8, 10, 19];

  function hash(seed) {
    return Math.abs(Math.sin(seed * 91.731 + 17.413) * 43758.5453) % 1;
  }

  function ease(value) {
    const t = constrain(value, 0, 1);
    return 1 - pow(1 - t, 3);
  }

  function makeCrystalData(seed) {
    const count = 7 + Math.floor(hash(seed + 1.1) * 3);
    const baseAngle = hash(seed + 2.3) * Math.PI * 2;
    const shards = [];

    for (let index = 0; index < count; index++) {
      shards.push({
        angle: baseAngle + index / count * Math.PI * 2 + (hash(seed + index * 4.17) - 0.5) * 0.35,
        radius: 0.62 + hash(seed + index * 7.31) * 0.62,
        facet: Math.floor(hash(seed + index * 2.71) * 3),
        highlight: hash(seed + index * 5.19) > 0.67,
        crack: 0.28 + hash(seed + index * 3.83) * 0.48
      });
    }

    return {
      shards,
      rotation: (hash(seed + 19.2) - 0.5) * 0.55,
      flatten: 0.82 + hash(seed + 28.4) * 0.3,
      size: 0.82 + hash(seed + 37.9) * 0.34
    };
  }

  const liveCrystals = Array.from({ length: 5 }, (_, index) => makeCrystalData(index * 31.7 + 8.06));

  function facetColour(index) {
    return [VIOLET, GREY, ICE][index % 3];
  }

  function crystalVertices(point, crystal, size, growth) {
    return crystal.shards.map((shard, index) => {
      const delayedGrowth = ease(constrain(growth * 1.28 - index / crystal.shards.length * 0.16, 0, 1));
      const radius = size * crystal.size * shard.radius * delayedGrowth;
      const angle = shard.angle + crystal.rotation;
      return {
        x: point.x + cos(angle) * radius,
        y: point.y + sin(angle) * radius * crystal.flatten,
        delayedGrowth
      };
    });
  }

  function drawCrystal(point, crystal, size, growth, alpha, frozen) {
    const vertices = crystalVertices(point, crystal, size, growth);
    if (vertices.length < 3) return;

    drawingContext.save();
    drawingContext.shadowBlur = frozen ? 3 : 7;
    drawingContext.shadowColor = "rgba(183, 220, 232, 0.42)";

    for (let index = 0; index < vertices.length; index++) {
      const current = vertices[index];
      const next = vertices[(index + 1) % vertices.length];
      const colour = facetColour(crystal.shards[index].facet);
      noStroke();
      fill(colour[0], colour[1], colour[2], alpha * (index % 2 === 0 ? 0.25 : 0.12));
      triangle(point.x, point.y, current.x, current.y, next.x, next.y);
    }

    noFill();
    stroke(GREY[0], GREY[1], GREY[2], alpha * 0.78);
    strokeWeight(1.05);
    beginShape();
    for (const outlineVertex of vertices) vertex(outlineVertex.x, outlineVertex.y);
    endShape(CLOSE);

    if (growth > 0.38) {
      const inner = ease((growth - 0.38) / 0.62);
      noFill();
      stroke(VIOLET[0], VIOLET[1], VIOLET[2], alpha * 0.48 * inner);
      strokeWeight(0.72);
      beginShape();
      for (let index = 0; index < vertices.length; index++) {
        const inset = 0.43 + (index % 3) * 0.08;
        vertex(lerp(point.x, vertices[index].x, inset), lerp(point.y, vertices[index].y, inset));
      }
      endShape(CLOSE);
    }

    for (let index = 0; index < vertices.length; index++) {
      const vertexPoint = vertices[index];
      const shard = crystal.shards[index];
      const crackEnd = {
        x: lerp(point.x, vertexPoint.x, shard.crack),
        y: lerp(point.y, vertexPoint.y, shard.crack)
      };

      stroke(
        shard.highlight ? ICE[0] : VIOLET[0],
        shard.highlight ? ICE[1] : VIOLET[1],
        shard.highlight ? ICE[2] : VIOLET[2],
        alpha * (shard.highlight ? 1 : 0.52)
      );
      strokeWeight(shard.highlight ? 1.35 : 0.72);
      line(point.x, point.y, crackEnd.x, crackEnd.y);

      if (shard.highlight && vertexPoint.delayedGrowth > 0.75) {
        const next = vertices[(index + 1) % vertices.length];
        stroke(WHITE[0], WHITE[1], WHITE[2], alpha);
        strokeWeight(1.15);
        line(vertexPoint.x, vertexPoint.y, lerp(vertexPoint.x, next.x, 0.42), lerp(vertexPoint.y, next.y, 0.42));
      }
    }

    const core = 2.5 + growth * 3.8;
    noStroke();
    fill(ICE[0], ICE[1], ICE[2], alpha * 0.86);
    quad(point.x, point.y - core, point.x + core * 0.72, point.y, point.x, point.y + core, point.x - core * 0.72, point.y);
    fill(NIGHT[0], NIGHT[1], NIGHT[2], alpha * 0.72);
    quad(point.x, point.y - core * 0.32, point.x + core * 0.23, point.y, point.x, point.y + core * 0.32, point.x - core * 0.23, point.y);
    drawingContext.restore();
  }

  function drawMineralVein(a, b, alpha, seed, growth) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = max(1, sqrt(dx * dx + dy * dy));
    const nx = -dy / length;
    const ny = dx / length;
    const steps = 11;
    const points = [];

    for (let index = 0; index <= steps; index++) {
      const t = index / steps;
      const irregularity = (hash(seed + index * 5.73) - 0.5) * min(8, length * 0.045) * growth;
      points.push({
        x: lerp(a.x, b.x, t) + nx * irregularity,
        y: lerp(a.y, b.y, t) + ny * irregularity
      });
    }

    stroke(GREY[0], GREY[1], GREY[2], alpha * 0.23);
    strokeWeight(0.55);
    for (let index = 0; index < points.length - 1; index++) {
      if (hash(seed + index * 13.1) < 0.19) continue;
      line(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y);
    }

    const brightIndex = Math.floor(hash(seed + 92.4) * (points.length - 2));
    stroke(ICE[0], ICE[1], ICE[2], alpha * 0.48);
    strokeWeight(0.78);
    line(points[brightIndex].x, points[brightIndex].y, points[brightIndex + 1].x, points[brightIndex + 1].y);
  }

  function configureConstellation(constellation, index) {
    const center = constellation.center;
    let radius = 1;
    const localPoints = constellation.points.map((point) => {
      const local = { x: point.x - center.x, y: point.y - center.y };
      radius = max(radius, sqrt(local.x * local.x + local.y * local.y));
      return local;
    });

    return {
      coordinate: STRATA_COORDS[index % STRATA_COORDS.length],
      layer: index % 4,
      column: Math.floor(index / 4) % 3,
      label: `MA-${String(index + 1).padStart(2, "0")}`,
      mapScale: 0.88 + hash(index * 7.4 + 1.2) * 0.22,
      normalizedPoints: localPoints.map((point) => ({ x: point.x / radius, y: point.y / radius })),
      crystals: constellation.points.map((_, nodeIndex) => makeCrystalData(index * 59.3 + nodeIndex * 17.8 + 4.2)),
      veinSeeds: constellation.links.map((_, linkIndex) => index * 71.4 + linkIndex * 9.7 + 2.6)
    };
  }

  function drawLiveConstellation(points, links, amount, holdProgress, locked) {
    const growth = locked ? 1 : ease(0.24 + holdProgress * 0.76);
    const alpha = 82 + amount * 158;

    for (let index = 0; index < links.length; index++) {
      const link = links[index];
      drawMineralVein(points[link.from], points[link.to], alpha, index * 19.7 + 3.1, growth);
    }

    for (let index = 0; index < points.length; index++) {
      drawCrystal(points[index], liveCrystals[index], 52, growth, alpha, false);
    }
  }

  function archivePoint(coordinate) {
    return { x: width * coordinate[0], y: height * coordinate[1] };
  }

  function drawStratum(center, radius, data, alpha) {
    stroke(GREY[0], GREY[1], GREY[2], alpha * 0.2);
    strokeWeight(0.55);
    line(center.x - radius * 1.42, center.y + radius * 0.94, center.x + radius * 1.42, center.y + radius * 0.94);

    stroke(VIOLET[0], VIOLET[1], VIOLET[2], alpha * 0.34);
    line(center.x - radius * 1.42, center.y + radius * 0.94, center.x - radius * 0.84, center.y + radius * 0.94);

    noStroke();
    fill(GREY[0], GREY[1], GREY[2], alpha * 0.48);
    textAlign(LEFT, TOP);
    textSize(8);
    text(`${data.label}  /  STRATUM ${String(data.layer + 1).padStart(2, "0")}`, center.x - radius * 1.42, center.y + radius * 0.94 + 6);
  }

  function drawConstellationMemory(constellation) {
    const data = constellation.variantData;
    if (!data) return;

    const travel = ease(constellation.age / 70);
    const appear = ease(constellation.age / 16);
    const target = archivePoint(data.coordinate);
    const center = {
      x: lerp(constellation.center.x, target.x, travel),
      y: lerp(constellation.center.y, target.y, travel)
    };
    const radius = min(width, height) * 0.077 * data.mapScale;
    const points = data.normalizedPoints.map((point) => ({
      x: center.x + point.x * radius,
      y: center.y + point.y * radius
    }));
    const alpha = (106 + constellation.flash * 120) * appear;

    drawStratum(center, radius, data, alpha);

    for (let index = 0; index < constellation.links.length; index++) {
      const link = constellation.links[index];
      drawMineralVein(points[link.from], points[link.to], alpha, data.veinSeeds[index], 1);
    }

    for (let index = 0; index < points.length; index++) {
      drawCrystal(points[index], data.crystals[index], 31, 1, alpha, true);
    }
  }

  return {
    id: "v05.02",
    name: "Mineral Archive",
    configureConstellation,
    drawLiveConstellation,
    drawConstellationMemory,
    handPalette: {
      skeleton: [139, 157, 181, 18],
      points: [194, 226, 235],
      pointAlpha: 34,
      skeletonPointAlpha: 26
    }
  };
})();
