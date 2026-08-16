window.OPEN_V03_VARIANT = (() => {
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
    const axisLength = max(70, dist(wrist.x, wrist.y, middleTip.x, middleTip.y));
    const angle = atan2(middleTip.y - wrist.y, middleTip.x - wrist.x);
    const ux = cos(angle);
    const uy = sin(angle);
    const vx = -uy;
    const vy = ux;
    const palmCentre = {
      x: wrist.x + ux * axisLength * 0.33,
      y: wrist.y + uy * axisLength * 0.33
    };
    const handWidth = max(axisLength * 0.5, dist(points[0].x, points[0].y, points[4].x, points[4].y) * 0.66);
    return { wrist, axisLength, ux, uy, vx, vy, palmCentre, handWidth };
  }

  function isInsideHand(x, y, points, geometry) {
    const { wrist, axisLength, ux, uy, vx, vy, palmCentre, handWidth } = geometry;
    const palmDx = x - palmCentre.x;
    const palmDy = y - palmCentre.y;
    const palmForward = (palmDx * ux + palmDy * uy) / (axisLength * 0.42);
    const palmSide = (palmDx * vx + palmDy * vy) / (handWidth * 0.57);
    if (palmForward * palmForward + palmSide * palmSide < 1) return true;

    for (let finger = 0; finger < 5; finger++) {
      const tip = points[finger];
      const baseOffset = map(finger, 0, 4, -0.42, 0.42) * handWidth;
      const baseX = wrist.x + ux * axisLength * 0.36 + vx * baseOffset;
      const baseY = wrist.y + uy * axisLength * 0.36 + vy * baseOffset;
      const fingerWidth = axisLength * (finger === 0 || finger === 4 ? 0.082 : 0.07);
      if (distanceToSegment(x, y, baseX, baseY, tip.x, tip.y) < fingerWidth) return true;
    }

    return distanceToSegment(x, y, wrist.x, wrist.y, palmCentre.x, palmCentre.y) < handWidth * 0.36;
  }

  function createImprint(points, center) {
    const geometry = handGeometry(points);
    const pad = geometry.axisLength * 0.2;
    const bounds = {
      minX: min(points.map(point => point.x)) - pad,
      maxX: max(points.map(point => point.x)) + pad,
      minY: min(points.map(point => point.y)) - pad,
      maxY: max(points.map(point => point.y)) + pad
    };
    const grains = [];
    let attempts = 0;

    while (grains.length < 760 && attempts < 12000) {
      attempts++;
      const x = random(bounds.minX, bounds.maxX);
      const y = random(bounds.minY, bounds.maxY);
      if (!isInsideHand(x, y, points, geometry)) continue;

      const centreDistance = dist(x, y, geometry.palmCentre.x, geometry.palmCentre.y) / geometry.axisLength;
      grains.push({
        x,
        y,
        size: random(0.65, 3.2),
        heatBias: constrain(1.08 - centreDistance * 0.6 + random(-0.12, 0.12), 0.38, 1.05),
        coolRate: random(0.82, 1.2),
        phase: random(TWO_PI),
        alpha: random(72, 188)
      });
    }

    const moltenEdges = Array.from({ length: 30 }, () => ({
      finger: floor(random(5)),
      t: random(0.08, 0.98),
      offset: random(-4, 4),
      size: random(1.4, 4.5),
      coolRate: random(0.78, 1.18)
    }));

    return { center, bounds, geometry, grains, moltenEdges };
  }

  function temperatureColour(temperature, alpha) {
    const t = constrain(temperature, 0, 1);
    let from;
    let to;
    let local;
    if (t < 0.28) {
      from = [22, 1, 1];
      to = [121, 12, 4];
      local = t / 0.28;
    } else if (t < 0.62) {
      from = [121, 12, 4];
      to = [239, 101, 10];
      local = (t - 0.28) / 0.34;
    } else if (t < 0.86) {
      from = [239, 101, 10];
      to = [255, 190, 65];
      local = (t - 0.62) / 0.24;
    } else {
      from = [255, 190, 65];
      to = [255, 244, 212];
      local = (t - 0.86) / 0.14;
    }
    return [
      lerp(from[0], to[0], local),
      lerp(from[1], to[1], local),
      lerp(from[2], to[2], local),
      alpha
    ];
  }

  function drawThermalBones(points, temperature, alpha) {
    const wrist = points[5];
    const heat = constrain(temperature, 0, 1);
    const outer = temperatureColour(max(0.08, heat * 0.56), alpha * 0.58);
    const middle = temperatureColour(max(0.12, heat * 0.8), alpha * 0.76);
    const core = temperatureColour(heat, alpha);

    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    strokeCap(ROUND);
    for (let finger = 0; finger < 5; finger++) {
      const tip = points[finger];
      stroke(...outer); strokeWeight(10 + heat * 5); line(wrist.x, wrist.y, tip.x, tip.y);
      stroke(...middle); strokeWeight(5 + heat * 3); line(wrist.x, wrist.y, tip.x, tip.y);
      stroke(...core); strokeWeight(1.2 + heat * 1.7); line(wrist.x, wrist.y, tip.x, tip.y);
    }

    const palmX = points.slice(0, 5).reduce((sum, point) => sum + point.x, 0) / 5;
    const palmY = lerp(wrist.y, points[2].y, 0.32);
    noStroke();
    fill(...outer); ellipse(palmX, palmY, abs(points[4].x - points[0].x) * 0.54 + 26, abs(points[2].y - wrist.y) * 0.52 + 34);
    fill(...middle); ellipse(palmX, palmY, abs(points[4].x - points[0].x) * 0.34 + 18, abs(points[2].y - wrist.y) * 0.34 + 24);
    if (heat > 0.72) {
      fill(...core); ellipse(palmX, palmY, 8 + heat * 15, 10 + heat * 18);
    }
    drawingContext.restore();
  }

  function drawHoldPreview(metrics, progress) {
    if (!metrics || progress <= 0) return;
    const points = [4, 8, 12, 16, 20, 0].map(index => metrics.points[index]);
    const temperature = pow(constrain(progress, 0, 1), 0.86);
    drawThermalBones(points, temperature, 95 + temperature * 145);

    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    noStroke();
    for (let finger = 0; finger < 5; finger++) {
      const tip = points[finger];
      const wrist = points[5];
      for (let sample = 1; sample < 13; sample++) {
        const t = sample / 13;
        const flicker = noise(finger * 12.7, sample * 0.43, frameCount * 0.018);
        const x = lerp(wrist.x, tip.x, t) + (flicker - 0.5) * 5;
        const y = lerp(wrist.y, tip.y, t) + (noise(sample, finger, frameCount * 0.014) - 0.5) * 5;
        fill(...temperatureColour(temperature * (0.72 + flicker * 0.28), 55 + temperature * 120));
        circle(x, y, 1 + flicker * 2.4);
      }
    }
    drawingContext.restore();
  }

  function drawHoldIndicator(points, progress) {
    const wrist = points[0];
    const palmBase = points[9];
    const cx = lerp(wrist.x, palmBase.x, 0.48);
    const cy = lerp(wrist.y, palmBase.y, 0.48);
    const radius = 34;
    const endAngle = -HALF_PI + TWO_PI * progress;
    const ringColour = temperatureColour(progress, 230);

    noFill();
    stroke(92, 15, 5, 112);
    strokeWeight(1);
    circle(cx, cy, radius * 2);
    stroke(...ringColour);
    strokeWeight(2.2);
    arc(cx, cy, radius * 2, radius * 2, -HALF_PI, endAngle);
    noStroke();
    fill(...ringColour);
    circle(cx + cos(endAngle) * radius, cy + sin(endAngle) * radius, 5.5);
  }

  function drawImprint(imprint, fade, appear) {
    const data = imprint.variantData;
    if (!data) return;
    const cooling = constrain(1 - imprint.age / (imprint.life * 0.88), 0, 1);
    const temperature = pow(cooling, 0.72);
    const alpha = fade * appear;

    drawThermalBones(imprint.points, temperature, 118 * alpha);

    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    noStroke();
    for (const grain of data.grains) {
      const localTemperature = constrain(temperature * grain.heatBias - (1 - cooling) * (grain.coolRate - 0.78) * 0.28, 0, 1);
      if (localTemperature < 0.025) continue;
      const flicker = 0.88 + sin(frameCount * 0.025 + grain.phase) * 0.08;
      const colour = temperatureColour(localTemperature, grain.alpha * alpha * flicker);
      fill(...colour);
      circle(grain.x, grain.y, grain.size * (0.72 + localTemperature * 0.62));
    }

    const wrist = imprint.points[5];
    for (const edge of data.moltenEdges) {
      const tip = imprint.points[edge.finger];
      const localTemperature = constrain(temperature * edge.coolRate, 0, 1);
      const colour = temperatureColour(localTemperature, 120 * alpha * localTemperature);
      fill(...colour);
      circle(lerp(wrist.x, tip.x, edge.t) + edge.offset, lerp(wrist.y, tip.y, edge.t), edge.size * (0.5 + localTemperature));
    }
    drawingContext.restore();

    noFill();
    stroke(...temperatureColour(max(0.08, temperature * 0.72), 82 * alpha));
    strokeWeight(0.55);
    rect(data.bounds.minX, data.bounds.minY, data.bounds.maxX - data.bounds.minX, data.bounds.maxY - data.bounds.minY, 2);
  }

  return {
    id: "v03.02",
    name: "Thermal Plate",
    createImprint,
    drawImprint,
    drawHoldPreview,
    drawHoldIndicator,
    handPalette: {
      skeleton: [211, 72, 17, 86],
      points: [246, 141, 27],
      pointAlpha: [62, 188]
    }
  };
})();
