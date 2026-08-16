window.OPEN_V04_VARIANT = (() => {
  let liveRadius = 0;
  let liveVelocity = 0;
  let liveSeed = 381.7;

  function createBloom(bloom) {
    return {
      tilt: random(-0.16, 0.16),
      phase: random(TWO_PI),
      innerOffsetX: random(-0.18, 0.18),
      innerOffsetY: random(-0.16, 0.16),
      caustics: Array.from({ length: 7 }, (_, index) => ({
        angle: random(TWO_PI),
        span: random(0.34, 0.92),
        radius: random(0.32, 0.88),
        width: random(0.55, 1.45),
        phase: index * 0.83 + random(TWO_PI)
      }))
    };
  }

  function elasticExpansion(t) {
    const progress = constrain(t, 0, 1);
    return 1 - exp(-6.2 * progress) * cos(progress * 12.5);
  }

  function bloomRadius(bloom) {
    const t = constrain(bloom.age / bloom.life, 0, 1);
    const rebound = elasticExpansion(constrain(t * 1.9, 0, 1));
    const lateSettle = 1 - easeInCubic(t) * 0.13;
    return bloom.radius * (0.26 + rebound * 0.86) * lateSettle;
  }

  function angleDifference(a, b) {
    return atan2(sin(a - b), cos(a - b));
  }

  function membranePoints(lens, radius, aspect, allBlooms, time) {
    const points = [];
    const neighbours = (allBlooms || []).filter(other => other !== lens && other.seed !== lens.seed);
    for (let step = 0; step < 150; step++) {
      const angle = step / 150 * TWO_PI;
      let rr = radius * (1 + (noise(lens.seed + cos(angle) * 0.72, lens.seed + sin(angle) * 0.72, time) - 0.5) * 0.055);

      for (const neighbour of neighbours) {
        const neighbourRadius = bloomRadius(neighbour);
        const dx = neighbour.x - lens.x;
        const dy = neighbour.y - lens.y;
        const distance = max(1, sqrt(dx * dx + dy * dy));
        const overlap = constrain((radius + neighbourRadius - distance) / max(radius + neighbourRadius, 1), 0, 1);
        if (overlap <= 0) continue;
        const direction = atan2(dy, dx);
        const facing = max(0, cos(angleDifference(angle, direction)));
        rr *= 1 - overlap * pow(facing, 5) * 0.38;
      }

      points.push({
        x: lens.x + cos(angle) * rr,
        y: lens.y + sin(angle) * rr * aspect
      });
    }
    return points;
  }

  function makePath(points) {
    const path = new Path2D();
    if (!points.length) return path;
    path.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index++) path.lineTo(points[index].x, points[index].y);
    path.closePath();
    return path;
  }

  function drawCaustics(lens, radius, aspect, alpha, data) {
    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    noFill();
    strokeCap(ROUND);

    for (const caustic of data.caustics) {
      const drift = sin(frameCount * 0.009 + caustic.phase) * 0.055;
      const angle = caustic.angle + drift;
      const arcRadius = radius * caustic.radius;
      const cx = lens.x + cos(angle) * radius * 0.16;
      const cy = lens.y + sin(angle) * radius * aspect * 0.13;
      stroke(220, 232, 221, alpha * (0.12 + caustic.radius * 0.18));
      strokeWeight(caustic.width);
      arc(cx, cy, arcRadius * 2, arcRadius * 2 * aspect, angle - caustic.span, angle + caustic.span);
      stroke(116, 173, 169, alpha * 0.1);
      strokeWeight(max(0.45, caustic.width * 0.45));
      arc(cx + 2, cy - 1, arcRadius * 1.74, arcRadius * 1.74 * aspect, angle - caustic.span * 0.7, angle + caustic.span * 0.7);
    }

    drawingContext.restore();
  }

  function drawLens(lens, radius, aspect, alpha, allBlooms, data) {
    const points = membranePoints(lens, radius, aspect, allBlooms, frameCount * 0.0011);
    const path = makePath(points);
    const innerX = lens.x + radius * data.innerOffsetX;
    const innerY = lens.y + radius * aspect * data.innerOffsetY;

    drawingContext.save();
    drawingContext.clip(path);

    const fillGradient = drawingContext.createRadialGradient(innerX, innerY, radius * 0.04, lens.x, lens.y, radius * 1.08);
    fillGradient.addColorStop(0, `rgba(222,230,219,${0.15 * alpha})`);
    fillGradient.addColorStop(0.22, `rgba(117,155,161,${0.16 * alpha})`);
    fillGradient.addColorStop(0.58, `rgba(73,113,105,${0.12 * alpha})`);
    fillGradient.addColorStop(0.84, `rgba(26,61,66,${0.21 * alpha})`);
    fillGradient.addColorStop(1, `rgba(4,18,22,${0.34 * alpha})`);
    drawingContext.fillStyle = fillGradient;
    drawingContext.fillRect(lens.x - radius * 1.4, lens.y - radius * aspect * 1.4, radius * 2.8, radius * aspect * 2.8);

    const refraction = drawingContext.createLinearGradient(lens.x - radius, lens.y - radius, lens.x + radius, lens.y + radius);
    refraction.addColorStop(0, `rgba(210,224,219,${0.075 * alpha})`);
    refraction.addColorStop(0.44, "rgba(210,224,219,0)");
    refraction.addColorStop(0.68, `rgba(111,145,102,${0.105 * alpha})`);
    refraction.addColorStop(1, "rgba(111,145,102,0)");
    drawingContext.fillStyle = refraction;
    drawingContext.fillRect(lens.x - radius, lens.y - radius * aspect, radius * 2, radius * 2 * aspect);
    drawingContext.restore();

    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    drawingContext.strokeStyle = `rgba(200,220,216,${0.34 * alpha})`;
    drawingContext.lineWidth = 2.2;
    drawingContext.stroke(path);
    drawingContext.strokeStyle = `rgba(92,151,145,${0.48 * alpha})`;
    drawingContext.lineWidth = 0.75;
    drawingContext.stroke(path);
    drawingContext.restore();

    drawingContext.save();
    drawingContext.globalCompositeOperation = "multiply";
    drawingContext.strokeStyle = `rgba(2,17,21,${0.48 * alpha})`;
    drawingContext.lineWidth = 7;
    drawingContext.stroke(path);
    drawingContext.restore();

    drawCaustics(lens, radius, aspect, alpha * 255, data);

    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    const pearl = drawingContext.createRadialGradient(
      lens.x - radius * 0.34,
      lens.y - radius * aspect * 0.32,
      0,
      lens.x - radius * 0.34,
      lens.y - radius * aspect * 0.32,
      radius * 0.42
    );
    pearl.addColorStop(0, `rgba(238,239,224,${0.28 * alpha})`);
    pearl.addColorStop(0.24, `rgba(174,211,207,${0.13 * alpha})`);
    pearl.addColorStop(1, "rgba(174,211,207,0)");
    drawingContext.fillStyle = pearl;
    drawingContext.beginPath();
    drawingContext.arc(lens.x - radius * 0.34, lens.y - radius * aspect * 0.32, radius * 0.42, 0, TWO_PI);
    drawingContext.fill();
    drawingContext.restore();
  }

  function drawLiveField(point, openness, allBlooms) {
    const target = lerp(16, min(width, height) * 0.095, easeOutCubic(openness));
    liveVelocity += (target - liveRadius) * 0.095;
    liveVelocity *= 0.82;
    liveRadius += liveVelocity;
    liveSeed += 0.0003;

    const liveLens = { x: point.x, y: point.y, seed: liveSeed };
    const data = {
      innerOffsetX: -0.12,
      innerOffsetY: -0.1,
      caustics: [
        { angle: -1.1, span: 0.7, radius: 0.72, width: 1.15, phase: 0.3 },
        { angle: 1.9, span: 0.48, radius: 0.44, width: 0.75, phase: 2.4 },
        { angle: 0.4, span: 0.36, radius: 0.83, width: 0.6, phase: 4.1 }
      ]
    };
    drawLens(liveLens, max(8, liveRadius), 0.9 + openness * 0.1, 0.46 + openness * 0.44, allBlooms, data);
  }

  function drawBloom(bloom, allBlooms) {
    const t = constrain(bloom.age / bloom.life, 0, 1);
    const fade = 1 - easeInCubic(t);
    const radius = bloomRadius(bloom);
    const aspect = lerp(bloom.aspect, 1, easeOutCubic(t) * 0.48);
    const driftX = sin(frameCount * 0.0024 + bloom.seed) * 4;
    const driftY = cos(frameCount * 0.0019 + bloom.seed) * 3;
    const lens = {
      ...bloom,
      x: bloom.x + driftX,
      y: bloom.y + driftY
    };
    drawLens(lens, radius, aspect, fade * bloom.strength * 0.84, allBlooms, bloom.variantData);
  }

  return {
    id: "v04.01",
    name: "Liquid Lens",
    createBloom,
    drawLiveField,
    drawBloom,
    handPalette: {
      skeleton: [166, 205, 201, 64],
      points: [218, 228, 214],
      pointAlpha: 86
    }
  };
})();
