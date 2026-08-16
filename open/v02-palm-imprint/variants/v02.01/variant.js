window.OPEN_V02_VARIANT = (() => {
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
    const handWidth = max(axisLength * 0.48, dist(points[0].x, points[0].y, points[4].x, points[4].y) * 0.62);

    return { wrist, axisLength, ux, uy, vx, vy, palmCentre, handWidth };
  }

  function isInsideHand(x, y, points, geometry) {
    const { wrist, axisLength, ux, uy, vx, vy, palmCentre, handWidth } = geometry;
    const palmDx = x - palmCentre.x;
    const palmDy = y - palmCentre.y;
    const palmForward = (palmDx * ux + palmDy * uy) / (axisLength * 0.38);
    const palmSide = (palmDx * vx + palmDy * vy) / (handWidth * 0.54);

    if (palmForward * palmForward + palmSide * palmSide < 1) return true;

    for (let finger = 0; finger < 5; finger++) {
      const tip = points[finger];
      const baseOffset = map(finger, 0, 4, -0.42, 0.42) * handWidth;
      const base = {
        x: wrist.x + ux * axisLength * 0.36 + vx * baseOffset,
        y: wrist.y + uy * axisLength * 0.36 + vy * baseOffset
      };
      const fingerWidth = axisLength * (finger === 0 || finger === 4 ? 0.072 : 0.062);
      if (distanceToSegment(x, y, base.x, base.y, tip.x, tip.y) < fingerWidth) return true;
    }

    return distanceToSegment(x, y, wrist.x, wrist.y, palmCentre.x, palmCentre.y) < handWidth * 0.34;
  }

  function createImprint(points, center) {
    const geometry = handGeometry(points);
    const pad = geometry.axisLength * 0.58;
    const minX = min(points.map(point => point.x)) - pad;
    const maxX = max(points.map(point => point.x)) + pad;
    const minY = min(points.map(point => point.y)) - pad;
    const maxY = max(points.map(point => point.y)) + pad;
    const dust = [];

    for (let index = 0; index < 1520; index++) {
      const homeX = random(minX, maxX);
      const homeY = random(minY, maxY);
      const inside = isInsideHand(homeX, homeY, points, geometry);
      const dx = homeX - geometry.palmCentre.x;
      const dy = homeY - geometry.palmCentre.y;
      const directionLength = max(1, sqrt(dx * dx + dy * dy));
      const tone = random() < 0.14 ? 1 : random() < 0.3 ? 2 : 0;

      dust.push({
        homeX,
        homeY,
        inside,
        dirX: dx / directionLength,
        dirY: dy / directionLength,
        force: random(geometry.axisLength * 0.24, geometry.axisLength * 0.68),
        drift: random(-0.12, 0.12),
        fall: random(0.018, 0.105),
        size: random(0.65, inside ? 3.05 : 2.35),
        alpha: random(34, inside ? 132 : 102),
        tone,
        phase: random(TWO_PI)
      });
    }

    return {
      center,
      bounds: { minX, maxX, minY, maxY },
      dust
    };
  }

  function drawImprint(imprint, fade, appear) {
    const data = imprint.variantData;
    if (!data) return;

    const burst = easeOutCubic(constrain(imprint.age / 74, 0, 1));
    const refill = easeInOutCubic(constrain((imprint.age - 175) / 365, 0, 1));
    const fallAge = max(0, imprint.age - 46);
    const width = max(1, data.bounds.maxX - data.bounds.minX);

    noStroke();

    for (const particle of data.dust) {
      if (particle.inside && burst < 0.055) continue;

      const displacement = particle.inside ? particle.force * burst * (1 - refill) : 0;
      const sideDrift = sin(imprint.age * 0.009 + particle.phase) * 3.2;
      const fall = fallAge * particle.fall * (1 - refill * 0.62);
      const x = particle.homeX + particle.dirX * displacement + sideDrift * particle.drift;
      const y = particle.homeY + particle.dirY * displacement * 0.72 + fall;
      const light = constrain(map(particle.homeX, data.bounds.minX, data.bounds.maxX, 1.38, 0.18), 0.18, 1.38);
      const flicker = 0.82 + 0.18 * sin(frameCount * 0.026 + particle.phase);
      const alpha = particle.alpha * fade * appear * light * flicker * 1.18;

      if (particle.tone === 1) {
        fill(148, 75, 54, alpha * 0.88);
      } else if (particle.tone === 2) {
        fill(96, 79, 70, alpha * 0.76);
      } else {
        fill(205, 185, 165, alpha);
      }

      const litSize = particle.size * (0.84 + light * 0.46);
      circle(x, y, litSize);

      if (particle.inside && particle.size > 2.05 && light > 0.62) {
        fill(225, 202, 179, alpha * 0.36);
        circle(x - width * 0.0015, y - width * 0.0008, litSize * 2.2);
      }
    }
  }

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - pow(-2 * value + 2, 3) / 2;
  }

  return {
    id: "v02.01",
    name: "Dust Negative",
    createImprint,
    drawImprint,
    handPalette: {
      skeleton: [184, 157, 134, 82],
      points: [216, 185, 158],
      pointAlpha: [62, 174],
      previewSkeleton: [181, 151, 129],
      previewPoints: [211, 179, 151]
    }
  };
})();
