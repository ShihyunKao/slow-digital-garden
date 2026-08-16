window.OPEN_V02_VARIANT = (() => {
  const opennessHistory = [];
  const membraneCount = 58;
  const palette = [
    [99, 111, 255],
    [205, 52, 154],
    [142, 101, 231],
    [218, 231, 255]
  ];

  function smooth(value) {
    const t = constrain(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function membranePoint(angle, radius, layer, amount, time) {
    const ripple = sin(angle * 10 + layer * 0.41 - time * 2.4) * radius * 0.009 * amount;
    const refraction = sin(angle * 4 - layer * 0.17 + time) * radius * 0.006 * amount;
    const r = radius + ripple + refraction;
    return { x: cos(angle) * r, y: sin(angle) * r * 0.82 };
  }

  function drawMembrane(layer, ratio, amount, scale, time) {
    const direction = -0.64;
    const phaseFamily = layer % 4;
    const spread = lerp(0.05, 1.34 + phaseFamily * 0.018, amount);
    const radius = lerp(5 + ratio * 5, scale * (0.11 + ratio * 0.46), amount);
    const innerRadius = max(2, radius - lerp(2, scale * (0.012 + ratio * 0.009), amount));
    const start = direction - spread * 0.54;
    const end = direction + spread * 0.46;
    const colour = palette[phaseFamily];
    const edgeAlpha = 24 + amount * (38 + ratio * 52);
    const filmAlpha = 1.5 + amount * (3 + ratio * 5);

    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    drawingContext.shadowBlur = 4 + amount * 15;
    drawingContext.shadowColor = `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, ${0.12 + amount * 0.24})`;

    fill(colour[0], colour[1], colour[2], filmAlpha);
    stroke(colour[0], colour[1], colour[2], edgeAlpha);
    strokeWeight(0.35 + ratio * 0.8);

    beginShape();
    vertex(0, 0);
    for (let point = 0; point <= 68; point++) {
      const angle = map(point, 0, 68, start, end);
      const vertexPoint = membranePoint(angle, radius, layer, amount, time);
      vertex(vertexPoint.x, vertexPoint.y);
    }
    for (let point = 68; point >= 0; point--) {
      const angle = map(point, 0, 68, start, end);
      const vertexPoint = membranePoint(angle, innerRadius, layer + 3, amount, time + 0.12);
      vertex(vertexPoint.x, vertexPoint.y);
    }
    endShape(CLOSE);

    if (layer % 3 === 0 && amount > 0.08) {
      noFill();
      stroke(222, 234, 255, 12 + amount * 38);
      strokeWeight(0.42);
      beginShape();
      for (let point = 0; point <= 82; point++) {
        const angle = map(point, 0, 82, start, end);
        const meshRadius = radius - scale * 0.004 * (1 + sin(point * 0.78 + layer));
        const vertexPoint = membranePoint(angle, meshRadius, layer, amount, time);
        vertex(vertexPoint.x, vertexPoint.y);
      }
      endShape();
    }

    if (layer % 7 === 0 && amount > 0.12) {
      stroke(colour[0], colour[1], colour[2], 9 + amount * 25);
      strokeWeight(0.34);
      for (let ray = 1; ray <= 4; ray++) {
        const angle = lerp(start, end, ray / 5);
        const innerPoint = membranePoint(angle, radius * 0.18, layer, amount, time);
        const outerPoint = membranePoint(angle, radius, layer, amount, time);
        line(innerPoint.x, innerPoint.y, outerPoint.x, outerPoint.y);
      }
    }

    drawingContext.restore();
  }

  function drawPhaseEchoes(amount, scale, time) {
    if (amount < 0.035) return;

    drawingContext.save();
    drawingContext.globalCompositeOperation = "screen";
    noFill();

    for (let echo = 0; echo < 7; echo++) {
      const delay = 12 + echo * 15;
      const echoAmount = smooth(opennessHistory[min(delay, opennessHistory.length - 1)] ?? amount);
      const echoRadius = scale * (0.08 + echo * 0.055) * echoAmount;
      const direction = -0.64;
      const alpha = (8 + echoAmount * 18) * (1 - echo / 8);
      const colour = palette[echo % 3];
      stroke(colour[0], colour[1], colour[2], alpha);
      strokeWeight(0.55);
      drawingContext.shadowBlur = 8;
      drawingContext.shadowColor = `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, 0.22)`;
      arc(0, 0, echoRadius * 2, echoRadius * 1.64, direction - 0.72, direction + 0.64);
    }

    drawingContext.restore();
  }

  function drawBloom(cx, cy, amount) {
    opennessHistory.unshift(amount);
    if (opennessHistory.length > 176) opennessHistory.pop();

    const scale = min(width, height) * 1.18;
    const time = frameCount * 0.008;

    push();
    translate(cx - width * 0.12, cy + height * 0.11);

    for (let layer = membraneCount - 1; layer >= 0; layer--) {
      const ratio = layer / (membraneCount - 1);
      const phaseFamily = layer % 4;
      const delay = floor(ratio * 92 + phaseFamily * 8);
      const delayedAmount = opennessHistory[min(delay, opennessHistory.length - 1)] ?? amount;
      const phaseSpeed = [0.9, 1.02, 1.12, 0.96][phaseFamily];
      const phaseAmount = constrain(smooth(delayedAmount) * phaseSpeed, 0, 1);
      drawMembrane(layer, ratio, phaseAmount, scale, time);
    }

    drawPhaseEchoes(amount, scale, time);

    drawingContext.save();
    drawingContext.shadowBlur = 28;
    drawingContext.shadowColor = "rgba(89, 77, 205, 0.34)";
    noStroke();
    fill(3, 5, 23, 245);
    circle(0, 0, lerp(13, 31, smooth(amount)));
    fill(225, 235, 255, 135 + amount * 70);
    circle(-1, -1, lerp(2.5, 4.5, amount));
    drawingContext.restore();
    pop();
  }

  return {
    id: "v02.02",
    name: "Phase Bloom",
    drawBloom,
    handPalette: {
      points: [216, 226, 255, 84],
      pointsStrong: [224, 232, 255, 96],
      skeleton: [142, 111, 238, 66]
    }
  };
})();
