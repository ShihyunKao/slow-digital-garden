window.OPEN_V03_VARIANT = (() => {
  let specimenIndex = 0;

  function distanceToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return dist(px, py, ax, ay);
    const t = constrain(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
    return dist(px, py, ax + dx * t, ay + dy * t);
  }

  function handGeometry(points) {
    const wrist = points[5];
    const middleTip = points[2];
    const axisLength = max(72, dist(wrist.x, wrist.y, middleTip.x, middleTip.y));
    const angle = atan2(middleTip.y - wrist.y, middleTip.x - wrist.x);
    const ux = cos(angle);
    const uy = sin(angle);
    const vx = -uy;
    const vy = ux;
    const palmCentre = {
      x: wrist.x + ux * axisLength * 0.32,
      y: wrist.y + uy * axisLength * 0.32
    };
    const handWidth = max(axisLength * 0.5, dist(points[0].x, points[0].y, points[4].x, points[4].y) * 0.64);
    return { wrist, axisLength, ux, uy, vx, vy, palmCentre, handWidth };
  }

  function isInsideHand(x, y, points, geometry) {
    const { wrist, axisLength, ux, uy, vx, vy, palmCentre, handWidth } = geometry;
    const palmDx = x - palmCentre.x;
    const palmDy = y - palmCentre.y;
    const palmForward = (palmDx * ux + palmDy * uy) / (axisLength * 0.4);
    const palmSide = (palmDx * vx + palmDy * vy) / (handWidth * 0.56);
    if (palmForward * palmForward + palmSide * palmSide < 1) return true;

    for (let finger = 0; finger < 5; finger++) {
      const tip = points[finger];
      const baseOffset = map(finger, 0, 4, -0.42, 0.42) * handWidth;
      const baseX = wrist.x + ux * axisLength * 0.36 + vx * baseOffset;
      const baseY = wrist.y + uy * axisLength * 0.36 + vy * baseOffset;
      const fingerWidth = axisLength * (finger === 0 || finger === 4 ? 0.078 : 0.067);
      if (distanceToSegment(x, y, baseX, baseY, tip.x, tip.y) < fingerWidth) return true;
    }

    return distanceToSegment(x, y, wrist.x, wrist.y, palmCentre.x, palmCentre.y) < handWidth * 0.35;
  }

  function createImprint(points, center) {
    const geometry = handGeometry(points);
    const pad = geometry.axisLength * 0.3;
    const bounds = {
      minX: min(points.map(point => point.x)) - pad,
      maxX: max(points.map(point => point.x)) + pad,
      minY: min(points.map(point => point.y)) - pad,
      maxY: max(points.map(point => point.y)) + pad
    };
    const grains = [];
    let attempts = 0;

    while (grains.length < 1080 && attempts < 16000) {
      attempts++;
      const x = random(bounds.minX, bounds.maxX);
      const y = random(bounds.minY, bounds.maxY);
      if (!isInsideHand(x, y, points, geometry)) continue;

      grains.push({
        x,
        y,
        delay: random(0, 118),
        size: random(0.55, 2.65),
        alpha: random(42, 126),
        tone: random() < 0.22 ? 1 : random() < 0.18 ? 2 : 0,
        drain: random(8, 46),
        phase: random(TWO_PI)
      });
    }

    const paperGrain = Array.from({ length: 220 }, () => ({
      x: random(bounds.minX, bounds.maxX),
      y: random(bounds.minY, bounds.maxY),
      alpha: random(5, 24),
      size: random(0.35, 1.2)
    }));

    const stains = Array.from({ length: 7 }, (_, index) => ({
      x: random(bounds.minX, bounds.maxX),
      y: random(bounds.minY, bounds.maxY),
      w: random(geometry.axisLength * 0.18, geometry.axisLength * 0.7),
      h: random(geometry.axisLength * 0.12, geometry.axisLength * 0.5),
      phase: index * 0.8 + random(TWO_PI)
    }));

    specimenIndex++;
    return { center, bounds, grains, paperGrain, stains, specimenIndex };
  }

  function drawExposureFlash(data, age) {
    const flash = 1 - constrain(age / 24, 0, 1);
    if (flash <= 0) return;

    const radius = max(data.bounds.maxX - data.bounds.minX, data.bounds.maxY - data.bounds.minY) * 0.72;
    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    const glow = drawingContext.createRadialGradient(data.center.x, data.center.y, 0, data.center.x, data.center.y, radius);
    glow.addColorStop(0, `rgba(237,246,220,${0.46 * flash})`);
    glow.addColorStop(0.25, `rgba(157,228,226,${0.28 * flash})`);
    glow.addColorStop(1, "rgba(82,176,197,0)");
    drawingContext.fillStyle = glow;
    drawingContext.fillRect(data.bounds.minX, data.bounds.minY, data.bounds.maxX - data.bounds.minX, data.bounds.maxY - data.bounds.minY);
    drawingContext.restore();
  }

  function drawImprint(imprint, fade) {
    const data = imprint.variantData;
    if (!data) return;

    const age = imprint.age;
    const develop = smoothstep(constrain((age - 18) / 148, 0, 1));
    const wash = smoothstep(constrain((age - 455) / 225, 0, 1));
    const visibility = develop * (1 - wash * 0.96) * fade;
    const plateWidth = data.bounds.maxX - data.bounds.minX;
    const plateHeight = data.bounds.maxY - data.bounds.minY;

    drawExposureFlash(data, age);

    noStroke();
    fill(3, 42, 76, 24 * develop * fade);
    rect(data.bounds.minX, data.bounds.minY, plateWidth, plateHeight, 2);

    noFill();
    stroke(150, 215, 214, 22 * visibility);
    strokeWeight(0.6);
    rect(data.bounds.minX, data.bounds.minY, plateWidth, plateHeight, 2);

    for (const stain of data.stains) {
      const wobble = sin(frameCount * 0.006 + stain.phase) * 3;
      stroke(88, 181, 197, 5 + visibility * 15);
      strokeWeight(0.5);
      ellipse(stain.x, stain.y, stain.w + wobble, stain.h - wobble * 0.5);
      stroke(210, 233, 218, visibility * 5);
      ellipse(stain.x + 2, stain.y - 1, stain.w * 0.84, stain.h * 0.82);
    }

    noStroke();
    for (const grain of data.paperGrain) {
      fill(128, 205, 207, grain.alpha * visibility * 0.5);
      circle(grain.x, grain.y, grain.size);
    }

    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";

    for (const grain of data.grains) {
      const localDevelop = smoothstep(constrain((age - 18 - grain.delay) / 92, 0, 1));
      if (localDevelop <= 0) continue;

      const grainAlpha = grain.alpha * localDevelop * (1 - wash * 0.97) * fade;
      const driftX = sin(age * 0.006 + grain.phase) * wash * 2.5;
      const y = grain.y + wash * grain.drain;

      if (grain.tone === 1) {
        fill(137, 216, 216, grainAlpha);
      } else if (grain.tone === 2) {
        fill(244, 242, 220, grainAlpha * 0.92);
      } else {
        fill(197, 232, 220, grainAlpha);
      }

      circle(grain.x + driftX, y, grain.size * (0.86 + localDevelop * 0.28));

      if (wash > 0.08 && grain.size > 2.1) {
        stroke(141, 211, 211, grainAlpha * 0.25);
        strokeWeight(0.45);
        line(grain.x + driftX, y, grain.x + driftX * 1.2, y + wash * 13);
        noStroke();
      }
    }

    drawingContext.restore();

    for (let point = 0; point < 5; point++) {
      const pointDevelop = smoothstep(constrain((age - 58 - point * 11) / 92, 0, 1));
      const alpha = 92 * pointDevelop * (1 - wash) * fade;
      noFill();
      stroke(231, 241, 221, alpha);
      strokeWeight(0.7);
      circle(imprint.points[point].x, imprint.points[point].y, 6 + pointDevelop * 5);
      noStroke();
      fill(244, 242, 220, alpha * 0.82);
      circle(imprint.points[point].x, imprint.points[point].y, 2.2);
    }
  }

  function smoothstep(value) {
    return value * value * (3 - 2 * value);
  }

  return {
    id: "v03.02",
    name: "Cyanotype Exposure",
    createImprint,
    drawImprint,
    handPalette: {
      skeleton: [156, 220, 218, 74],
      points: [223, 238, 220],
      pointAlpha: [48, 148],
      previewSkeleton: [145, 209, 211],
      previewPoints: [221, 237, 218]
    }
  };
})();
