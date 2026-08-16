window.OPEN_V05_VARIANT = (() => {
  let liveAngle = 0;

  function handAngle(metrics) {
    if (!metrics?.points) return liveAngle;
    const wrist = metrics.points[0];
    const palm = metrics.points[9];
    return atan2(palm.y - wrist.y, palm.x - wrist.x);
  }

  function createBloom(bloom, metrics) {
    const angle = handAngle(metrics);
    return {
      angle,
      aspect: random(0.38, 0.61),
      warningAngle: angle + random(-0.5, 0.5),
      bands: Array.from({ length: 7 }, (_, index) => ({
        scale: 0.42 + index * 0.1,
        delay: index * random(0.012, 0.024),
        weight: random(0.5, 1.45),
        phase: random(TWO_PI)
      })),
      fragments: Array.from({ length: 165 }, () => ({
        theta: random(TWO_PI),
        radial: random(0.78, 1.18),
        delay: random(0.16, 0.48),
        speed: random(0.1, 0.34),
        length: random(2, 10),
        weight: random(0.45, 1.25),
        alpha: random(40, 150),
        red: random() < 0.045,
        phase: random(TWO_PI)
      }))
    };
  }

  function drawWaveEllipse(cx, cy, radius, aspect, angle, alpha, fracture, seed, weight) {
    push();
    translate(cx, cy);
    rotate(angle);
    noFill();
    stroke(226, 227, 224, alpha);
    strokeWeight(weight);
    strokeCap(SQUARE);

    let drawing = false;
    for (let step = 0; step <= 190; step++) {
      const theta = step / 190 * TWO_PI;
      const disruption = noise(seed + cos(theta) * 1.7, seed + sin(theta) * 1.7, frameCount * 0.0015);
      const visible = fracture <= 0.02 || disruption > fracture * 0.61;
      const wobble = 1 + (disruption - 0.5) * (0.018 + fracture * 0.06);
      const x = cos(theta) * radius * wobble;
      const y = sin(theta) * radius * aspect * wobble;

      if (visible && !drawing) {
        beginShape();
        vertex(x, y);
        drawing = true;
      } else if (visible) {
        vertex(x, y);
      } else if (drawing) {
        endShape();
        drawing = false;
      }
    }
    if (drawing) endShape();
    pop();
  }

  function drawScanSlice(cx, cy, radius, aspect, angle, alpha, density) {
    push();
    translate(cx, cy);
    rotate(angle);
    stroke(198, 200, 199, alpha);
    strokeWeight(0.45);
    const verticalRadius = radius * aspect;
    const spacing = max(4, 13 - density * 7);
    for (let y = -verticalRadius; y <= verticalRadius; y += spacing) {
      const normalized = y / max(verticalRadius, 1);
      const halfWidth = radius * sqrt(max(0, 1 - normalized * normalized));
      const skip = noise(y * 0.06, frameCount * 0.009) > 0.72;
      if (skip) {
        line(-halfWidth, y, -halfWidth * 0.16, y);
        line(halfWidth * 0.12, y, halfWidth, y);
      } else {
        line(-halfWidth, y, halfWidth, y);
      }
    }
    pop();
  }

  function drawWarningLine(cx, cy, radius, aspect, angle, alpha) {
    push();
    translate(cx, cy);
    rotate(angle);
    stroke(183, 34, 30, alpha);
    strokeWeight(1.05);
    line(radius * 0.62, -radius * aspect * 0.08, radius * 0.96, -radius * aspect * 0.08);
    strokeWeight(2.2);
    point(radius * 1.01, -radius * aspect * 0.08);
    pop();
  }

  function drawLiveField(point, openness, allBlooms, metrics) {
    const targetAngle = handAngle(metrics);
    liveAngle = lerp(liveAngle, targetAngle, 0.18);
    const compression = easeOutCubic(openness);
    const radius = lerp(18, min(width, height) * 0.105, compression);
    const aspect = lerp(0.23, 0.48, compression);

    drawScanSlice(point.x, point.y, radius * 0.91, aspect, liveAngle, 12 + compression * 38, compression);
    for (let band = 0; band < 5; band++) {
      const scale = 0.42 + band * 0.145;
      const pulse = sin(frameCount * 0.04 - band * 0.72) * 0.5 + 0.5;
      drawWaveEllipse(point.x, point.y, radius * scale, aspect, liveAngle, (22 + pulse * 42) * compression, 0, band * 11.3, band === 4 ? 1.25 : 0.62);
    }
    drawWarningLine(point.x, point.y, radius, aspect, liveAngle, 38 + compression * 110);
  }

  function drawFragments(bloom, radius, aspect, t, alpha) {
    const data = bloom.variantData;
    push();
    translate(bloom.x, bloom.y);
    rotate(data.angle);
    strokeCap(SQUARE);

    for (const fragment of data.fragments) {
      const local = constrain((t - fragment.delay) / max(0.08, 1 - fragment.delay), 0, 1);
      if (local <= 0) continue;
      const fragmentFade = (1 - local) * alpha;
      const r = radius * (fragment.radial + local * fragment.speed);
      const theta = fragment.theta + sin(frameCount * 0.004 + fragment.phase) * 0.018;
      const x = cos(theta) * r;
      const y = sin(theta) * r * aspect;
      const tangentX = -sin(theta) * fragment.length;
      const tangentY = cos(theta) * fragment.length * aspect;
      stroke(fragment.red ? 183 : 204, fragment.red ? 34 : 206, fragment.red ? 30 : 205, fragment.alpha * fragmentFade);
      strokeWeight(fragment.weight);
      line(x - tangentX * 0.5, y - tangentY * 0.5, x + tangentX * 0.5, y + tangentY * 0.5);
    }
    pop();
  }

  function drawBloom(bloom) {
    const data = bloom.variantData;
    if (!data) return;
    const t = constrain(bloom.age / bloom.life, 0, 1);
    const release = easeOutCubic(constrain((t - 0.015) / 0.44, 0, 1));
    const fade = 1 - easeInCubic(t);
    const flash = 1 - constrain(t / 0.1, 0, 1);
    const fracture = constrain((t - 0.22) / 0.5, 0, 1);
    const radius = bloom.radius * (0.18 + release * 1.22);
    const aspect = lerp(data.aspect * 0.7, data.aspect, release);

    if (flash > 0) {
      noStroke();
      fill(238, 239, 235, flash * 34);
      push();
      translate(bloom.x, bloom.y);
      rotate(data.angle);
      ellipse(0, 0, radius * 1.5, radius * aspect * 1.5);
      pop();
    }

    drawScanSlice(bloom.x, bloom.y, radius * 0.92, aspect, data.angle, (15 + flash * 88) * fade, 1 - fracture);

    for (const band of data.bands) {
      const localRelease = easeOutCubic(constrain((t - band.delay) / 0.42, 0, 1));
      const bandRadius = bloom.radius * (0.12 + localRelease * (0.86 + band.scale * 0.34));
      const bandAlpha = (24 + flash * 162) * fade * (1 - fracture * 0.48);
      drawWaveEllipse(bloom.x, bloom.y, bandRadius, aspect, data.angle, bandAlpha, fracture, bloom.seed + band.phase, band.weight);
    }

    drawWarningLine(bloom.x, bloom.y, radius, aspect, data.warningAngle, (30 + flash * 182) * fade * (1 - fracture * 0.35));
    drawFragments(bloom, radius, aspect, t, fade);
  }

  return {
    id: "v05.02",
    name: "Acoustic Compression",
    createBloom,
    drawLiveField,
    drawBloom,
    handPalette: {
      skeleton: [210, 211, 208, 66],
      points: [229, 229, 225],
      pointAlpha: 88
    }
  };
})();
