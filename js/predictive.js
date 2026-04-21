export function initPredictive() {
  const canvas = document.getElementById('predictive-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const container = canvas.parentElement;

  function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = {
    prediction: '#4ade80',
    error: '#f87171',
    belief: '#60a5fa',
    node: '#22d3ee',
    nodeFill: '#151d2e',
    text: '#94a3b8',
    line: '#243049',
    bg: '#0a0e1a',
  };

  let numLevels = 4;
  let precision = 1.0;
  let speed = 200;
  let stimulusType = 'expected';
  let levels = [];
  let running = false;
  let stepTimer = null;
  let currentStep = 0;

  function initLevels() {
    levels = [];
    for (let i = 0; i < numLevels; i++) {
      levels.push({
        belief: 0.5 + Math.random() * 0.2,
        prediction: 0,
        error: 0,
        precisionWeight: 1.0,
        activity: 0,
        targetBelief: 0.5,
      });
    }
  }

  function getStimulusValue() {
    switch (stimulusType) {
      case 'expected': return levels[0].belief;
      case 'surprising': return 1 - levels[0].belief;
      case 'ambiguous': return 0.5 + (Math.random() - 0.5) * 0.1;
      case 'absent': return 0;
      default: return 0.5;
    }
  }

  function step() {
    currentStep++;

    for (let i = numLevels - 1; i >= 1; i--) {
      levels[i].prediction = levels[i].belief;
      const target = levels[i - 1].belief;
      levels[i - 1].targetBelief = levels[i].prediction;
    }

    const stimulus = getStimulusValue();
    levels[0].error = (stimulus - levels[0].targetBelief) * precision;

    for (let i = 0; i < numLevels - 1; i++) {
      const errorBelow = i === 0 ? levels[0].error : levels[i].error;
      levels[i + 1].error = errorBelow * 0.6 * precision;
    }

    for (let i = 0; i < numLevels; i++) {
      const lr = 0.15 * precision;
      levels[i].belief += lr * levels[i].error;
      levels[i].belief = Math.max(0, Math.min(1, levels[i].belief));
      levels[i].activity = Math.abs(levels[i].error);
    }
  }

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    const layerH = H / (numLevels + 1);
    const centerX = W * 0.45;
    const nodeR = 28;

    // Draw connections first
    for (let i = 0; i < numLevels; i++) {
      const y = H - (i + 1) * layerH;
      const yBelow = H - i * layerH;

      if (i < numLevels - 1) {
        const yAbove = H - (i + 2) * layerH;

        // Top-down prediction arrow
        const predStrength = Math.abs(levels[i + 1].prediction || 0);
        ctx.beginPath();
        ctx.moveTo(centerX - 40, yAbove + nodeR);
        ctx.lineTo(centerX - 40, y - nodeR);
        ctx.strokeStyle = COLORS.prediction;
        ctx.lineWidth = 2 + predStrength * 4;
        ctx.globalAlpha = 0.4 + predStrength * 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(centerX - 40, y - nodeR);
        ctx.lineTo(centerX - 46, y - nodeR - 10);
        ctx.lineTo(centerX - 34, y - nodeR - 10);
        ctx.fillStyle = COLORS.prediction;
        ctx.fill();
      }

      if (i > 0) {
        const errorStrength = Math.abs(levels[i].error);
        ctx.beginPath();
        ctx.moveTo(centerX + 40, y + nodeR);
        ctx.lineTo(centerX + 40, y + layerH - nodeR);
        ctx.strokeStyle = COLORS.error;
        ctx.lineWidth = 2 + errorStrength * 6;
        ctx.globalAlpha = 0.3 + Math.min(errorStrength, 1) * 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Arrow head
        const arrowY = y + layerH - nodeR;
        ctx.beginPath();
        ctx.moveTo(centerX + 40, y + nodeR);
        ctx.lineTo(centerX + 34, y + nodeR + 10);
        ctx.lineTo(centerX + 46, y + nodeR + 10);
        ctx.fillStyle = COLORS.error;
        ctx.fill();
      }
    }

    // Draw stimulus at bottom
    {
      const stimY = H - layerH * 0.3;
      const stimVal = getStimulusValue();
      ctx.beginPath();
      ctx.arc(centerX, stimY, 16, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(249, 115, 22, ${0.3 + stimVal * 0.7})`;
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#f97316';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Stimulus', centerX, stimY + 28);
      ctx.fillText(`(${stimVal.toFixed(2)})`, centerX, stimY + 40);

      // Line from stimulus to level 0
      const level0Y = H - layerH;
      ctx.beginPath();
      ctx.moveTo(centerX, stimY - 16);
      ctx.lineTo(centerX, level0Y + nodeR);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw nodes and info
    for (let i = 0; i < numLevels; i++) {
      const y = H - (i + 1) * layerH;
      const level = levels[i];
      const activity = Math.min(level.activity, 1);

      // Node glow
      if (activity > 0.05) {
        const gradient = ctx.createRadialGradient(centerX, y, nodeR, centerX, y, nodeR * 2.5);
        gradient.addColorStop(0, `rgba(34, 211, 238, ${activity * 0.3})`);
        gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - 70, y - 70, 140, 140);
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(centerX, y, nodeR, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.nodeFill;
      ctx.fill();
      ctx.strokeStyle = COLORS.node;
      ctx.lineWidth = 2 + activity * 2;
      ctx.stroke();

      // Level label
      ctx.fillStyle = COLORS.node;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`L${i}`, centerX, y + 4);

      // Info panel on right
      const infoX = centerX + 120;
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';

      const labels = [
        `Level ${i}${i === numLevels - 1 ? ' (Top)' : i === 0 ? ' (Bottom)' : ''}`,
      ];
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(labels[0], infoX, y - 20);

      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.fillText(`Belief: ${level.belief.toFixed(3)}`, infoX, y - 4);

      // Belief bar
      ctx.fillStyle = '#1a2235';
      ctx.fillRect(infoX, y + 4, 120, 8);
      ctx.fillStyle = COLORS.belief;
      ctx.fillRect(infoX, y + 4, 120 * level.belief, 8);

      ctx.fillStyle = COLORS.text;
      ctx.fillText(`Error: ${level.error.toFixed(3)}`, infoX, y + 26);

      // Error bar
      const errNorm = Math.min(Math.abs(level.error), 1);
      ctx.fillStyle = '#1a2235';
      ctx.fillRect(infoX, y + 32, 120, 8);
      ctx.fillStyle = level.error > 0 ? COLORS.error : COLORS.prediction;
      ctx.fillRect(infoX + 60, y + 32, (level.error > 0 ? 1 : -1) * 60 * errNorm, 8);

      // Precision indicator
      ctx.fillStyle = COLORS.text;
      ctx.fillText(`Precision: ${(levels[i].precisionWeight * precision).toFixed(2)}`, infoX, y + 52);
    }

    // Labels for arrows
    ctx.save();
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = COLORS.prediction;
    ctx.textAlign = 'center';
    ctx.translate(centerX - 65, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('← Predictions (top-down)', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = COLORS.error;
    ctx.textAlign = 'center';
    ctx.translate(centerX + 65, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Prediction Errors (bottom-up) →', 0, 0);
    ctx.restore();

    // Step counter
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Step: ${currentStep}`, 12, 20);
    ctx.fillText(`Stimulus: ${stimulusType}`, 12, 36);
  }

  function animate() {
    step();
    draw();
  }

  function startRunning() {
    if (running) return;
    running = true;
    stepTimer = setInterval(animate, speed);
  }

  function stopRunning() {
    running = false;
    if (stepTimer) clearInterval(stepTimer);
  }

  document.getElementById('predictive-inject').addEventListener('click', () => {
    if (running) {
      stopRunning();
      document.getElementById('predictive-inject').textContent = '⚡ Inject Stimulus';
    } else {
      stimulusType = document.getElementById('predictive-stimulus').value;
      startRunning();
      document.getElementById('predictive-inject').textContent = '⏸ Pause';
    }
  });

  document.getElementById('predictive-step').addEventListener('click', () => {
    stopRunning();
    document.getElementById('predictive-inject').textContent = '⚡ Inject Stimulus';
    stimulusType = document.getElementById('predictive-stimulus').value;
    animate();
  });

  document.getElementById('predictive-reset').addEventListener('click', () => {
    stopRunning();
    document.getElementById('predictive-inject').textContent = '⚡ Inject Stimulus';
    currentStep = 0;
    initLevels();
    draw();
  });

  document.getElementById('predictive-levels').addEventListener('input', e => {
    numLevels = parseInt(e.target.value);
    currentStep = 0;
    initLevels();
    draw();
  });

  document.getElementById('predictive-precision').addEventListener('input', e => {
    precision = parseFloat(e.target.value);
  });

  document.getElementById('predictive-speed').addEventListener('input', e => {
    speed = parseInt(e.target.value);
    if (running) {
      clearInterval(stepTimer);
      stepTimer = setInterval(animate, speed);
    }
  });

  document.getElementById('predictive-stimulus').addEventListener('change', e => {
    stimulusType = e.target.value;
  });

  initLevels();
  draw();
}
